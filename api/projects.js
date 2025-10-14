require('dotenv').config();
const { Pool } = require('pg');
const { verifyToken } = require('./auth');

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

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện hành động này' });
  }
  next();
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication for all project operations
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
    
    // Handle different endpoints
    if (endpoint === 'projects') {
      switch (method) {
        case 'GET':
          await getAllProjects(req, res);
          break;
        case 'POST':
          // Create new project - require admin
          requireAdmin(req, res, () => {
            createProject(req, res);
          });
          break;
        default:
          res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
      }
    } else if (endpoint.match(/^\d+$/)) {
      const projectId = parseInt(endpoint);
      switch (method) {
        case 'GET':
          await getProjectById(req, res, projectId);
          break;
        case 'PUT':
          // Update project - require admin
          requireAdmin(req, res, () => {
            updateProject(req, res, projectId);
          });
          break;
        case 'DELETE':
          // Delete project - require admin
          requireAdmin(req, res, () => {
            deleteProject(req, res, projectId);
          });
          break;
        default:
          res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
      }
    } else if (endpoint === 'okrs') {
      // Handle OKR endpoints
      const projectId = req.query.project_id;
      switch (method) {
        case 'GET':
          await getOKRs(req, res, projectId);
          break;
        case 'POST':
          requireAdmin(req, res, () => {
            createOKR(req, res, projectId);
          });
          break;
        case 'PUT':
          requireAdmin(req, res, () => {
            updateOKRProgress(req, res);
          });
          break;
        default:
          res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
      }
    } else {
      res.status(404).json({ error: 'Endpoint không tìm thấy' });
    }
    
  } catch (error) {
    console.error('Projects API error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// Get all projects
async function getAllProjects(req, res) {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        p.id,
        p.project_code,
        p.project_name,
        p.description,
        p.status,
        p.start_date,
        p.end_date,
        p.created_at,
        p.updated_at,
        u.full_name as created_by_name,
        COUNT(DISTINCT t.task_id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'Done' THEN t.task_id END) as completed_tasks,
        COUNT(DISTINCT o.id) as total_okrs
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN okrs o ON p.id = o.project_id
      GROUP BY p.id, p.project_code, p.project_name, p.description, p.status, 
               p.start_date, p.end_date, p.created_at, p.updated_at, u.full_name
      ORDER BY p.created_at DESC
    `;
    
    const result = await client.query(query);
    client.release();
    
    res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách dự án' });
  }
}

// Get project by ID with detailed information
async function getProjectById(req, res, projectId) {
  try {
    const client = await pool.connect();
    
    // Get project details
    const projectQuery = `
      SELECT 
        p.*,
        u.full_name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `;
    
    const projectResult = await client.query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Không tìm thấy dự án' });
    }
    
    const project = projectResult.rows[0];
    
    // Get project members
    const membersQuery = `
      SELECT 
        pm.role,
        pm.joined_at,
        u.id,
        u.username,
        u.full_name,
        u.email
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `;
    
    const membersResult = await client.query(membersQuery, [projectId]);
    
    // Get project OKRs
    const okrsQuery = `
      SELECT 
        o.*,
        COALESCE(
          (SELECT current_value 
           FROM project_okr_updates pou 
           WHERE pou.okr_id = o.id 
           ORDER BY pou.updated_at DESC 
           LIMIT 1), 
          o.current_value
        ) as latest_value
      FROM okrs o
      WHERE o.project_id = $1
      ORDER BY o.created_at DESC
    `;
    
    const okrsResult = await client.query(okrsQuery, [projectId]);
    
    // Get project tasks summary
    const tasksQuery = `
      SELECT 
        status,
        priority,
        COUNT(*) as count
      FROM tasks
      WHERE project_id = $1
      GROUP BY status, priority
    `;
    
    const tasksResult = await client.query(tasksQuery, [projectId]);
    
    client.release();
    
    res.status(200).json({
      ...project,
      members: membersResult.rows,
      okrs: okrsResult.rows,
      tasks_summary: tasksResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin dự án' });
  }
}

// Create new project
async function createProject(req, res) {
  try {
    const { project_code, project_name, description, start_date, end_date, status = 'active' } = req.body;
    
    if (!project_code || !project_name) {
      return res.status(400).json({ error: 'Project code và project name là bắt buộc' });
    }
    
    const client = await pool.connect();
    
    // Check if project code already exists
    const checkQuery = 'SELECT id FROM projects WHERE project_code = $1';
    const checkResult = await client.query(checkQuery, [project_code]);
    
    if (checkResult.rows.length > 0) {
      client.release();
      return res.status(400).json({ error: 'Project code đã tồn tại' });
    }
    
    const insertQuery = `
      INSERT INTO projects (project_code, project_name, description, start_date, end_date, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      project_code,
      project_name,
      description || null,
      start_date || null,
      end_date || null,
      status,
      req.user.id
    ]);
    
    client.release();
    
    res.status(201).json({
      message: 'Tạo dự án thành công',
      project: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Lỗi khi tạo dự án' });
  }
}

// Update project
async function updateProject(req, res, projectId) {
  try {
    const { project_code, project_name, description, start_date, end_date, status } = req.body;
    
    const client = await pool.connect();
    
    // Check if project exists
    const checkQuery = 'SELECT id FROM projects WHERE id = $1';
    const checkResult = await client.query(checkQuery, [projectId]);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Không tìm thấy dự án' });
    }
    
    // Check if project code already exists (if changing)
    if (project_code) {
      const codeCheckQuery = 'SELECT id FROM projects WHERE project_code = $1 AND id != $2';
      const codeCheckResult = await client.query(codeCheckQuery, [project_code, projectId]);
      
      if (codeCheckResult.rows.length > 0) {
        client.release();
        return res.status(400).json({ error: 'Project code đã tồn tại' });
      }
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    if (project_code) {
      updateFields.push(`project_code = $${paramCount++}`);
      updateValues.push(project_code);
    }
    
    if (project_name) {
      updateFields.push(`project_name = $${paramCount++}`);
      updateValues.push(project_name);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }
    
    if (start_date !== undefined) {
      updateFields.push(`start_date = $${paramCount++}`);
      updateValues.push(start_date);
    }
    
    if (end_date !== undefined) {
      updateFields.push(`end_date = $${paramCount++}`);
      updateValues.push(end_date);
    }
    
    if (status) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({ error: 'Không có trường nào để cập nhật' });
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(projectId);
    
    const updateQuery = `
      UPDATE projects 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, updateValues);
    client.release();
    
    res.status(200).json({
      message: 'Cập nhật dự án thành công',
      project: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật dự án' });
  }
}

// Delete project
async function deleteProject(req, res, projectId) {
  try {
    const client = await pool.connect();
    
    // Check if project exists
    const checkQuery = 'SELECT id, project_name FROM projects WHERE id = $1';
    const checkResult = await client.query(checkQuery, [projectId]);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Không tìm thấy dự án' });
    }
    
    // Delete project (cascade will handle related records)
    const deleteQuery = 'DELETE FROM projects WHERE id = $1';
    await client.query(deleteQuery, [projectId]);
    
    client.release();
    
    res.status(200).json({
      message: 'Xóa dự án thành công',
      deleted_project: checkResult.rows[0].project_name
    });
    
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Lỗi khi xóa dự án' });
  }
}

// Get project OKRs
async function getOKRs(req, res, projectId) {
  try {
    const client = await pool.connect();
    
    // Build query based on projectId
    let whereClause = '';
    let queryParams = [];
    
    if (projectId && projectId !== 'all') {
      whereClause = 'WHERE EXISTS (SELECT 1 FROM projects p WHERE p.okr_id = o.id AND p.id = $1)';
      queryParams = [projectId];
    }
    
    const query = `
      SELECT 
        o.*,
        COALESCE(
          (SELECT current_value 
           FROM project_okr_updates pou 
           WHERE pou.okr_id = o.id 
           ORDER BY pou.updated_at DESC 
           LIMIT 1), 
          o.progress
        ) as latest_value,
        COALESCE(
          (SELECT updated_at 
           FROM project_okr_updates pou 
           WHERE pou.okr_id = o.id 
           ORDER BY pou.updated_at DESC 
           LIMIT 1), 
          o.updated_at
        ) as last_updated,
        EXTRACT(QUARTER FROM o.start_date) as quarter,
        EXTRACT(YEAR FROM o.start_date) as year,
        u.full_name as updated_by_name,
        (SELECT COUNT(*) FROM projects p WHERE p.okr_id = o.id) as project_count
      FROM okrs o
      LEFT JOIN project_okr_updates pou ON o.id = pou.okr_id
      LEFT JOIN users u ON pou.updated_by = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;
    
    const result = await client.query(query, queryParams);
    client.release();
    
    res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('Error fetching OKRs:', error);
    res.status(500).json({ error: 'Lỗi khi lấy OKRs' });
  }
}

async function getProjectOKRs(req, res, projectId) {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        o.*,
        COALESCE(
          (SELECT current_value 
           FROM project_okr_updates pou 
           WHERE pou.okr_id = o.id 
           ORDER BY pou.updated_at DESC 
           LIMIT 1), 
          o.current_value
        ) as latest_value,
        u.full_name as updated_by_name
      FROM okrs o
      LEFT JOIN project_okr_updates pou ON o.id = pou.okr_id
      LEFT JOIN users u ON pou.updated_by = u.id
      WHERE o.project_id = $1
      ORDER BY o.created_at DESC
    `;
    
    const result = await client.query(query, [projectId]);
    client.release();
    
    res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('Error fetching project OKRs:', error);
    res.status(500).json({ error: 'Lỗi khi lấy OKRs của dự án' });
  }
}

// Create OKR
async function createOKR(req, res, projectId) {
  try {
    const { objective, key_results, target_value, unit, quarter, year } = req.body;
    
    if (!objective || !key_results || !Array.isArray(key_results)) {
      return res.status(400).json({ error: 'Objective và key_results là bắt buộc' });
    }
    
    const client = await pool.connect();
    
    // Check if project exists
    const projectQuery = 'SELECT id FROM projects WHERE id = $1';
    const projectResult = await client.query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Không tìm thấy dự án' });
    }
    
    const insertQuery = `
      INSERT INTO okrs (project_id, objective, key_results, target_value, unit, quarter, year)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      projectId,
      objective,
      JSON.stringify(key_results),
      target_value || 100,
      unit || '%',
      quarter || null,
      year || new Date().getFullYear()
    ]);
    
    client.release();
    
    res.status(201).json({
      message: 'Tạo OKR thành công',
      okr: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating OKR:', error);
    res.status(500).json({ error: 'Lỗi khi tạo OKR' });
  }
}

// Update OKR progress
async function updateOKRProgress(req, res) {
  try {
    const { okr_id, progress_percentage, notes } = req.body;
    
    if (!okr_id || progress_percentage === undefined) {
      return res.status(400).json({ error: 'OKR ID và tiến độ là bắt buộc' });
    }
    
    const client = await pool.connect();
    
    // Insert progress update
    const insertQuery = `
      INSERT INTO project_okr_updates (okr_id, current_value, update_note, updated_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      okr_id,
      progress_percentage,
      notes || null,
      req.user.id
    ]);
    
    // Update OKR progress
    const updateQuery = `
      UPDATE okrs 
      SET progress = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    await client.query(updateQuery, [progress_percentage, okr_id]);
    
    client.release();
    
    res.status(200).json({
      message: 'Cập nhật tiến độ OKR thành công',
      update: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating OKR progress:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật tiến độ OKR' });
  }
}
