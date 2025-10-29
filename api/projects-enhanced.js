require('dotenv').config();
const { Pool } = require('pg');
const { verifyToken, requireAdmin, requireAdminOrManager } = require('./auth');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication for all Project operations
  verifyToken(req, res, async () => {
    await handleProjectRequest(req, res);
  });
};

async function handleProjectRequest(req, res) {
  const { method, url } = req;
  
  try {
    // Parse URL to get endpoint and project ID
    // Remove leading slash and split
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const urlParts = cleanUrl.split('?')[0].split('/').filter(part => part !== '');
    const lastPart = urlParts[urlParts.length - 1];
    const secondLastPart = urlParts[urlParts.length - 2];
    
    // Check if last part is a number (project ID)
    const projectId = !isNaN(lastPart) ? lastPart : null;
    const endpoint = projectId ? secondLastPart : lastPart;
    
    console.log('URL parsing:', { url, cleanUrl, urlParts, projectId, endpoint });

    switch (method) {
      case 'GET':
        if (endpoint === 'projects' && !projectId) {
          await getAllProjects(req, res);
        } else if (projectId && !isNaN(projectId)) {
          await getProjectById(req, res, projectId);
        } else if (endpoint === 'tasks' && projectId) {
          await getProjectTasks(req, res, projectId);
        } else if (endpoint === 'members' && projectId) {
          await getProjectMembers(req, res, projectId);
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
        
      case 'POST':
        if (endpoint === 'projects') {
          requireAdminOrManager(req, res, () => createProject(req, res));
        } else if (endpoint === 'members' && projectId) {
          requireAdminOrManager(req, res, () => addProjectMember(req, res, projectId));
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
        
      case 'PUT':
        if (projectId && !isNaN(projectId)) {
          requireAdminOrManager(req, res, () => updateProject(req, res, projectId));
        } else {
          res.status(404).json({ error: 'Project ID required' });
        }
        break;
        
      case 'DELETE':
        console.log('DELETE request:', { projectId, endpoint, isNaN: isNaN(projectId), url, urlParts });
        if (projectId && !isNaN(projectId)) {
          if (endpoint === 'members') {
            requireAdminOrManager(req, res, () => removeProjectMember(req, res, projectId));
          } else {
            console.log('Calling deleteProject with ID:', projectId);
            console.log('Checking admin/manager permission for user:', req.user);
            requireAdminOrManager(req, res, () => deleteProject(req, res, projectId));
          }
        } else {
          console.log('DELETE failed - Project ID required:', { projectId, endpoint, url, urlParts });
          res.status(404).json({ error: 'Project ID required' });
        }
        break;
        
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Project API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all Projects
async function getAllProjects(req, res) {
  try {
    const client = await pool.connect();
    
    const { okr_id, status, priority, health } = req.query;
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (okr_id || status || priority || health) {
      const conditions = [];
      
      if (okr_id) {
        paramCount++;
        conditions.push(`p.okr_id = $${paramCount}`);
        queryParams.push(parseInt(okr_id));
      }
      
      if (status) {
        paramCount++;
        conditions.push(`p.status = $${paramCount}`);
        queryParams.push(status);
      }
      
      if (priority) {
        paramCount++;
        conditions.push(`p.priority = $${paramCount}`);
        queryParams.push(priority);
      }
      
      if (health) {
        paramCount++;
        conditions.push(`project_health.health = $${paramCount}`);
        queryParams.push(health);
      }
      
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // First, ensure health column exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS health VARCHAR(20) DEFAULT 'good';
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_manager INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_health_check;
        ALTER TABLE projects ADD CONSTRAINT projects_health_check 
          CHECK (health IN ('excellent', 'good', 'warning', 'critical'));
      END $$;
    `);

    const query = `
      WITH project_stats AS (
        SELECT 
          p.id,
          p.project_name,
          p.description,
          p.status,
          p.priority,
          p.start_date,
          p.end_date,
          p.target_value,
          p.current_value,
          p.budget,
          p.created_at,
          p.updated_at,
          p.project_manager,
          o.objective as okr_objective,
          u.full_name as created_by_name,
          pm.full_name as project_manager_name,
          COALESCE(task_stats.task_count, 0) as task_count,
          COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
          CASE 
            WHEN COALESCE(task_stats.task_count, 0) > 0 THEN 
              ROUND((COALESCE(task_stats.completed_tasks, 0)::DECIMAL / task_stats.task_count) * 100, 2)
            ELSE 0 
          END as completion_percentage
        FROM projects p
        LEFT JOIN okrs o ON p.okr_id = o.id
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN users pm ON p.project_manager = pm.id
        LEFT JOIN (
          SELECT 
            project_id,
            COUNT(*) as task_count,
            COUNT(CASE WHEN status IN ('Done', 'completed', 'done') THEN 1 END) as completed_tasks
          FROM tasks 
          GROUP BY project_id
        ) task_stats ON p.id = task_stats.project_id
      ),
      project_health AS (
        SELECT 
          *,
          CASE 
            -- Excellent: High completion, not overdue, good progress
            WHEN completion_percentage >= 90 
                 AND (end_date IS NULL OR end_date >= CURRENT_DATE)
                 AND (target_value IS NULL OR target_value = 0 OR ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) >= 80)
            THEN 'excellent'
            
            -- Critical: Low completion, overdue, or very low progress
            WHEN completion_percentage < 50 
                 OR (end_date IS NOT NULL AND end_date < CURRENT_DATE)
                 OR (end_date IS NOT NULL AND (end_date - CURRENT_DATE) < 7)
                 OR (target_value IS NOT NULL AND target_value > 0 AND ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) < 30)
            THEN 'critical'
            
            -- Warning: Medium completion or approaching deadline
            WHEN completion_percentage < 70 
                 OR (end_date IS NOT NULL AND (end_date - CURRENT_DATE) < 14)
                 OR (target_value IS NOT NULL AND target_value > 0 AND ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) < 50)
            THEN 'warning'
            
            -- Good: Default good status
            ELSE 'good'
          END as health
        FROM project_stats
      )
      SELECT 
        ph.*,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = ph.id) as member_count
      FROM project_health ph
      ${whereClause}
      ORDER BY ph.created_at DESC
    `;
    
    const result = await client.query(query, queryParams);
    
    // Update projects table with calculated health
    for (const project of result.rows) {
      await client.query(
        'UPDATE projects SET health = $1 WHERE id = $2',
        [project.health, project.id]
      );
    }
    
    client.release();
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách dự án' });
  }
}

// Get Project by ID
async function getProjectById(req, res, projectId) {
  try {
    const client = await pool.connect();
    
    // Ensure health column exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS health VARCHAR(20) DEFAULT 'good';
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_manager INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_health_check;
        ALTER TABLE projects ADD CONSTRAINT projects_health_check 
          CHECK (health IN ('excellent', 'good', 'warning', 'critical'));
      END $$;
    `);
    
    const query = `
      WITH project_stats AS (
        SELECT 
          p.*,
          o.objective as okr_objective,
          u.full_name as created_by_name,
          pm.full_name as project_manager_name,
          COALESCE(task_stats.task_count, 0) as task_count,
          COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
          CASE 
            WHEN COALESCE(task_stats.task_count, 0) > 0 THEN 
              ROUND((COALESCE(task_stats.completed_tasks, 0)::DECIMAL / task_stats.task_count) * 100, 2)
            ELSE 0 
          END as completion_percentage
        FROM projects p
        LEFT JOIN okrs o ON p.okr_id = o.id
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN users pm ON p.project_manager = pm.id
        LEFT JOIN (
          SELECT 
            project_id,
            COUNT(*) as task_count,
            COUNT(CASE WHEN status IN ('Done', 'completed', 'done') THEN 1 END) as completed_tasks
          FROM tasks 
          WHERE project_id = $1
          GROUP BY project_id
        ) task_stats ON p.id = task_stats.project_id
        WHERE p.id = $1
      ),
      project_health AS (
        SELECT 
          *,
          CASE 
            -- Excellent: High completion, not overdue, good progress
            WHEN completion_percentage >= 90 
                 AND (end_date IS NULL OR end_date >= CURRENT_DATE)
                 AND (target_value IS NULL OR target_value = 0 OR ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) >= 80)
            THEN 'excellent'
            
            -- Critical: Low completion, overdue, or very low progress
            WHEN completion_percentage < 50 
                 OR (end_date IS NOT NULL AND end_date < CURRENT_DATE)
                 OR (end_date IS NOT NULL AND (end_date - CURRENT_DATE) < 7)
                 OR (target_value IS NOT NULL AND target_value > 0 AND ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) < 30)
            THEN 'critical'
            
            -- Warning: Medium completion or approaching deadline
            WHEN completion_percentage < 70 
                 OR (end_date IS NOT NULL AND (end_date - CURRENT_DATE) < 14)
                 OR (target_value IS NOT NULL AND target_value > 0 AND ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) < 50)
            THEN 'warning'
            
            -- Good: Default good status
            ELSE 'good'
          END as health
        FROM project_stats
      )
      SELECT 
        ph.*,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = ph.id) as member_count
      FROM project_health ph
    `;
    
    const result = await client.query(query, [projectId]);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }
    
    // Update project with calculated health
    const project = result.rows[0];
    await client.query(
      'UPDATE projects SET health = $1 WHERE id = $2',
      [project.health, project.id]
    );
    
    client.release();
    
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Lỗi khi lấy dự án' });
  }
}

// Get Project Tasks
async function getProjectTasks(req, res, projectId) {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        t.*,
        u.full_name as assignee_name,
        u.username as assignee_username,
        u.email as assignee_email
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `;
    
    const result = await client.query(query, [projectId]);
    client.release();
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ error: 'Lỗi khi lấy tasks của dự án' });
  }
}

// Get Project Members
async function getProjectMembers(req, res, projectId) {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        pm.*,
        u.full_name,
        u.username,
        u.email
      FROM project_members pm
      LEFT JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at ASC
    `;
    
    const result = await client.query(query, [projectId]);
    client.release();
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thành viên dự án' });
  }
}

// Create new Project
async function createProject(req, res) {
  try {
    console.log('createProject called with body:', req.body);
    
    const {
      okr_id,
      project_name,
      description,
      priority,
      status,
      start_date,
      end_date,
      deadline,
      target_value,
      unit,
      budget
    } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: 'Tên dự án là bắt buộc' });
    }

    const client = await pool.connect();
    
    // Generate project_code automatically using simple sequential approach
    const countQuery = 'SELECT COUNT(*) as count FROM projects';
    const countResult = await client.query(countQuery);
    const projectCount = parseInt(countResult.rows[0].count) + 1;
    const project_code = `P${String(projectCount).padStart(4, '0')}`;
    
    console.log('Generated project_code:', project_code);
    console.log('User ID:', req.user.id);
    console.log('Project name:', project_name);
    console.log('Priority:', priority);
    console.log('Status:', status);
    console.log('Description:', description);
    console.log('Start date:', start_date);
    console.log('End date:', end_date);
    console.log('Target value:', target_value);
    console.log('Unit:', unit);
    console.log('Budget:', budget);
    console.log('OKR ID:', okr_id);
    
    // Ensure health column exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS health VARCHAR(20) DEFAULT 'good';
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_health_check;
        ALTER TABLE projects ADD CONSTRAINT projects_health_check 
          CHECK (health IN ('excellent', 'good', 'warning', 'critical'));
      END $$;
    `);

    const query = `
      INSERT INTO projects (
        okr_id, project_code, project_name, description, priority, status,
        start_date, end_date, target_value, unit, budget, created_by, health,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'good', NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      okr_id || null,
      project_code,
      project_name,
      description || null,
      priority || 'Medium',
      status || 'active',
      start_date || null,
      end_date || null,
      target_value || null,
      unit || '%',
      budget || null,
      req.user.id
    ];
    
    console.log('Executing query with values:', values);
    
    const result = await client.query(query, values);
    
    // Add creator as project owner
    const addOwnerQuery = `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'owner')
      ON CONFLICT (project_id, user_id) DO NOTHING
    `;
    await client.query(addOwnerQuery, [result.rows[0].id, req.user.id]);
    
    client.release();
    
    res.status(201).json({
      message: 'Tạo dự án thành công',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Mã dự án đã tồn tại' });
    } else {
      res.status(500).json({ error: 'Lỗi khi tạo dự án' });
    }
  }
}

// Update Project
async function updateProject(req, res, projectId) {
  try {
    console.log('updateProject called with:', { projectId, body: req.body });
    
    const {
      okr_id,
      project_code,
      project_name,
      description,
      status,
      priority,
      start_date,
      end_date,
      target_value,
      unit,
      current_value,
      budget
    } = req.body;

    const client = await pool.connect();
    
    // Ensure health column exists
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS health VARCHAR(20) DEFAULT 'good';
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_health_check;
        ALTER TABLE projects ADD CONSTRAINT projects_health_check 
          CHECK (health IN ('excellent', 'good', 'warning', 'critical'));
      END $$;
    `);
    
    const query = `
      UPDATE projects
      SET
        okr_id = COALESCE($2, okr_id),
        project_code = COALESCE($3, project_code),
        project_name = COALESCE($4, project_name),
        description = COALESCE($5, description),
        status = COALESCE($6, status),
        priority = COALESCE($7, priority),
        start_date = COALESCE($8, start_date),
        end_date = COALESCE($9, end_date),
        target_value = COALESCE($10, target_value),
        unit = COALESCE($11, unit),
        current_value = COALESCE($12, current_value),
        budget = COALESCE($13, budget),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      projectId,
      okr_id,
      project_code,
      project_name,
      description,
      status,
      priority,
      start_date,
      end_date,
      target_value,
      unit,
      current_value,
      budget
    ];
    
    console.log('Executing update query with values:', values);
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }
    
    // Recalculate health status after update
    const project = result.rows[0];
    const healthQuery = `
      WITH project_stats AS (
        SELECT 
          p.*,
          COALESCE(task_stats.task_count, 0) as task_count,
          COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
          CASE 
            WHEN COALESCE(task_stats.task_count, 0) > 0 THEN 
              ROUND((COALESCE(task_stats.completed_tasks, 0)::DECIMAL / task_stats.task_count) * 100, 2)
            ELSE 0 
          END as completion_percentage
        FROM projects p
        LEFT JOIN (
          SELECT 
            project_id,
            COUNT(*) as task_count,
            COUNT(CASE WHEN status IN ('Done', 'completed', 'done') THEN 1 END) as completed_tasks
          FROM tasks 
          WHERE project_id = $1
          GROUP BY project_id
        ) task_stats ON p.id = task_stats.project_id
        WHERE p.id = $1
      )
      SELECT 
        CASE 
          -- Excellent: High completion, not overdue, good progress
          WHEN completion_percentage >= 90 
               AND (end_date IS NULL OR end_date >= CURRENT_DATE)
               AND (target_value IS NULL OR target_value = 0 OR ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) >= 80)
          THEN 'excellent'
          
          -- Critical: Low completion, overdue, or very low progress
          WHEN completion_percentage < 50 
               OR (end_date IS NOT NULL AND end_date < CURRENT_DATE)
               OR (end_date IS NOT NULL AND (end_date - CURRENT_DATE) < 7)
               OR (target_value IS NOT NULL AND target_value > 0 AND ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) < 30)
          THEN 'critical'
          
          -- Warning: Medium completion or approaching deadline
          WHEN completion_percentage < 70 
               OR (end_date IS NOT NULL AND (end_date - CURRENT_DATE) < 14)
               OR (target_value IS NOT NULL AND target_value > 0 AND ROUND((COALESCE(current_value, 0) / target_value) * 100, 2) < 50)
          THEN 'warning'
          
          -- Good: Default good status
          ELSE 'good'
        END as health
      FROM project_stats
    `;
    
    const healthResult = await client.query(healthQuery, [projectId]);
    const newHealth = healthResult.rows[0]?.health || 'good';
    
    // Update health in database
    await client.query(
      'UPDATE projects SET health = $1 WHERE id = $2',
      [newHealth, projectId]
    );
    
    // Update project object with new health
    project.health = newHealth;
    
    client.release();
    
    res.status(200).json({
      message: 'Cập nhật dự án thành công',
      project: project
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật dự án' });
  }
}

// Delete Project
async function deleteProject(req, res, projectId) {
  try {
    console.log('deleteProject called with:', { projectId, user: req.user });
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // First, unlink related tasks (set project_id to NULL instead of deleting)
      await client.query('UPDATE tasks SET project_id = NULL WHERE project_id = $1', [projectId]);
      console.log('Unlinked related tasks for project:', projectId);
      
      // Then delete the project
      const query = 'DELETE FROM projects WHERE id = $1 RETURNING *';
      const result = await client.query(query, [projectId]);
      
      if (result.rows.length === 0) {
        console.log('Project not found:', projectId);
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Dự án không tồn tại' });
      }
      
      await client.query('COMMIT');
      console.log('Project deleted successfully:', result.rows[0]);
      
      res.status(200).json({
        message: 'Xóa dự án thành công',
        project: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Lỗi khi xóa dự án: ' + error.message });
  }
}

// Add Project Member
async function addProjectMember(req, res, projectId) {
  try {
    const { user_id, role = 'member' } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID là bắt buộc' });
    }

    const client = await pool.connect();
    
    const query = `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, user_id) 
      DO UPDATE SET role = $3, joined_at = NOW()
      RETURNING *
    `;
    
    const result = await client.query(query, [projectId, user_id, role]);
    
    client.release();
    
    res.status(201).json({
      message: 'Thêm thành viên thành công',
      member: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ error: 'Lỗi khi thêm thành viên' });
  }
}

// Remove Project Member
async function removeProjectMember(req, res, projectId) {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID là bắt buộc' });
    }

    const client = await pool.connect();
    
    const query = 'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *';
    const result = await client.query(query, [projectId, user_id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Thành viên không tồn tại trong dự án' });
    }
    
    res.status(200).json({
      message: 'Xóa thành viên thành công',
      member: result.rows[0]
    });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ error: 'Lỗi khi xóa thành viên' });
  }
}

