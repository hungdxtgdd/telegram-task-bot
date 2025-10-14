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
    // Parse URL to get endpoint
    const urlParts = url.split('?')[0].split('/');
    const endpoint = urlParts[urlParts.length - 1];
    const projectId = urlParts[urlParts.length - 2];

    switch (method) {
      case 'GET':
        if (endpoint === 'projects') {
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
        if (projectId && !isNaN(projectId)) {
          if (endpoint === 'members') {
            requireAdminOrManager(req, res, () => removeProjectMember(req, res, projectId));
          } else {
            requireAdmin(req, res, () => deleteProject(req, res, projectId));
          }
        } else {
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
    
    const { okr_id, status, priority } = req.query;
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (okr_id || status || priority) {
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
      
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        p.*,
        o.objective as okr_objective,
        u.full_name as created_by_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'Done') as completed_tasks,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN okrs o ON p.okr_id = o.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;
    
    const result = await client.query(query, queryParams);
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
    
    const query = `
      SELECT 
        p.*,
        o.objective as okr_objective,
        u.full_name as created_by_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'Done') as completed_tasks,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN okrs o ON p.okr_id = o.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `;
    
    const result = await client.query(query, [projectId]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }
    
    res.status(200).json(result.rows[0]);
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
    const {
      okr_id,
      project_code,
      project_name,
      description,
      priority,
      start_date,
      end_date,
      deadline,
      target_value,
      unit,
      budget
    } = req.body;

    if (!project_code || !project_name) {
      return res.status(400).json({ error: 'Mã dự án và tên dự án là bắt buộc' });
    }

    const client = await pool.connect();
    
    const query = `
      INSERT INTO projects (
        okr_id, project_code, project_name, description, priority,
        start_date, end_date, deadline, target_value, unit, budget, created_by,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await client.query(query, [
      okr_id || null,
      project_code,
      project_name,
      description || null,
      priority || 'Medium',
      start_date || null,
      end_date || null,
      deadline || null,
      target_value || null,
      unit || '%',
      budget || null,
      req.user.id
    ]);
    
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
    const {
      okr_id,
      project_code,
      project_name,
      description,
      status,
      priority,
      start_date,
      end_date,
      deadline,
      target_value,
      unit,
      current_value,
      budget
    } = req.body;

    const client = await pool.connect();
    
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
        deadline = COALESCE($10, deadline),
        target_value = COALESCE($11, target_value),
        unit = COALESCE($12, unit),
        current_value = COALESCE($13, current_value),
        budget = COALESCE($14, budget),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, [
      projectId,
      okr_id,
      project_code,
      project_name,
      description,
      status,
      priority,
      start_date,
      end_date,
      deadline,
      target_value,
      unit,
      current_value,
      budget
    ]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }
    
    res.status(200).json({
      message: 'Cập nhật dự án thành công',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật dự án' });
  }
}

// Delete Project
async function deleteProject(req, res, projectId) {
  try {
    const client = await pool.connect();
    
    const query = 'DELETE FROM projects WHERE id = $1 RETURNING *';
    const result = await client.query(query, [projectId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dự án không tồn tại' });
    }
    
    res.status(200).json({
      message: 'Xóa dự án thành công',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Lỗi khi xóa dự án' });
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

