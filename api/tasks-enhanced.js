require('dotenv').config({ path: '.env.local' });
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

  // Verify authentication for all Task operations
  verifyToken(req, res, async () => {
    await handleTaskRequest(req, res);
  });
};

async function handleTaskRequest(req, res) {
  const { method, url } = req;
  
  try {
    // Parse URL to get endpoint and task ID
    // Remove leading slash and split
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const urlParts = cleanUrl.split('?')[0].split('/').filter(part => part !== '');
    const lastPart = urlParts[urlParts.length - 1];
    const secondLastPart = urlParts[urlParts.length - 2];
    
    // Check if last part is a number (task ID)
    const taskId = !isNaN(lastPart) ? lastPart : null;
    const endpoint = taskId ? secondLastPart : lastPart;
    
    console.log('URL parsing:', { url, cleanUrl, urlParts, taskId, endpoint });

    switch (method) {
      case 'GET':
        if (endpoint === 'tasks' && !taskId) {
          await getAllTasks(req, res);
        } else if (taskId && !isNaN(taskId)) {
          await getTaskById(req, res, taskId);
        } else if (endpoint === 'assign' && taskId) {
          await assignTask(req, res, taskId);
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
        
      case 'POST':
        if (endpoint === 'tasks') {
          // All authenticated users can create tasks
          await createTask(req, res);
        } else if (endpoint === 'comment' && taskId) {
          await addTaskComment(req, res, taskId);
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
        
      case 'PUT':
        if (taskId && !isNaN(taskId)) {
          // All authenticated users can update tasks
          await updateTask(req, res, taskId);
        } else {
          res.status(404).json({ error: 'Task ID required' });
        }
        break;
        
      case 'DELETE':
        console.log('DELETE request:', { taskId, endpoint, isNaN: isNaN(taskId) });
        if (taskId && !isNaN(taskId)) {
          console.log('Calling deleteTask with ID:', taskId);
          // All authenticated users can delete tasks
          await deleteTask(req, res, taskId);
        } else {
          console.log('DELETE failed - Task ID required:', { taskId, endpoint });
          res.status(404).json({ error: 'Task ID required' });
        }
        break;
        
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Task API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all Tasks
async function getAllTasks(req, res) {
  try {
    const client = await pool.connect();
    
    const { project_id, assignee_id, status, priority, deadline_from, deadline_to } = req.query;
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (project_id || assignee_id || status || priority || deadline_from || deadline_to) {
      const conditions = [];
      
      if (project_id) {
        paramCount++;
        conditions.push(`t.project_id = $${paramCount}`);
        queryParams.push(parseInt(project_id));
      }
      
      if (assignee_id) {
        paramCount++;
        conditions.push(`t.assignee_id = $${paramCount}`);
        queryParams.push(parseInt(assignee_id));
      }
      
      if (status) {
        paramCount++;
        conditions.push(`t.status = $${paramCount}`);
        queryParams.push(status);
      }
      
      if (priority) {
        paramCount++;
        conditions.push(`t.priority = $${paramCount}`);
        queryParams.push(priority);
      }
      
      if (deadline_from) {
        paramCount++;
        conditions.push(`t.deadline >= $${paramCount}`);
        queryParams.push(deadline_from);
      }
      
      if (deadline_to) {
        paramCount++;
        conditions.push(`t.deadline <= $${paramCount}`);
        queryParams.push(deadline_to);
      }
      
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        t.*,
        p.project_name,
        p.project_code,
        o.objective as okr_objective,
        u.full_name as assignee_name,
        u.username as assignee_username,
        u.email as assignee_email,
        creator.full_name as created_by_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN okrs o ON p.okr_id = o.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      ${whereClause}
      ORDER BY 
        CASE t.priority
          WHEN 'High' THEN 1
          WHEN 'Medium' THEN 2
          WHEN 'Low' THEN 3
        END,
        t.deadline ASC
    `;
    
    const result = await client.query(query, queryParams);
    client.release();
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách tasks' });
  }
}

// Get Task by ID
async function getTaskById(req, res, taskId) {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        t.*,
        p.project_name,
        p.project_code,
        o.objective as okr_objective,
        u.full_name as assignee_name,
        u.username as assignee_username,
        u.email as assignee_email,
        creator.full_name as created_by_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN okrs o ON p.okr_id = o.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = $1
    `;
    
    const result = await client.query(query, [taskId]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task không tồn tại' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Lỗi khi lấy task' });
  }
}

// Create new Task
async function createTask(req, res) {
  try {
    console.log('createTask called with user:', req.user);
    
    const {
      project_id,
      task_name,
      description,
      assignee_id,
      priority,
      deadline,
      estimated_hours,
      result_description,
      result_value
    } = req.body;

    if (!project_id || !task_name) {
      return res.status(400).json({ error: 'Dự án và tên task là bắt buộc' });
    }

    const client = await pool.connect();
    
    // Generate task_id - use timestamp to ensure uniqueness
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const task_id = `TASK-${timestamp}-${random}`;
    
    const query = `
      INSERT INTO tasks (
        task_id, project_id, task_name, description, assignee_id, priority,
        deadline, estimated_hours, result_description, result_value, created_by,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;
    
    console.log('Executing query with values:', [
      task_id,
      project_id,
      task_name,
      description || null,
      assignee_id || null,
      priority || 'Medium',
      deadline || null,
      estimated_hours || null,
      result_description || null,
      result_value || null,
      req.user.id
    ]);
    
    const result = await client.query(query, [
      task_id,
      project_id,
      task_name,
      description || null,
      assignee_id || null,
      priority || 'Medium',
      deadline || null,
      estimated_hours || null,
      result_description || null,
      result_value || null,
      req.user.id
    ]);
    
    // Create notification if task is assigned
    if (assignee_id) {
      const notificationQuery = `
        INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await client.query(notificationQuery, [
        assignee_id,
        'Task Assigned',
        `Bạn được giao task: ${task_name}`,
        'task_assigned',
        result.rows[0].id,
        'task'
      ]);
    }
    
    client.release();
    
    res.status(201).json({
      message: 'Tạo task thành công',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Lỗi khi tạo task' });
  }
}

// Update Task
async function updateTask(req, res, taskId) {
  try {
    const {
      task_name,
      description,
      assignee_id,
      status,
      priority,
      deadline,
      estimated_hours,
      actual_hours,
      result_description,
      result_value
    } = req.body;

    const client = await pool.connect();
    
    // Check if user can update this task
    const checkQuery = 'SELECT assignee_id, created_by FROM tasks WHERE id = $1';
    const checkResult = await client.query(checkQuery, [taskId]);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Task không tồn tại' });
    }
    
    const task = checkResult.rows[0];
    const canUpdate = req.user.role === 'admin' || 
                     req.user.role === 'manager' || 
                     task.assignee_id === req.user.id || 
                     task.created_by === req.user.id;
    
    if (!canUpdate) {
      client.release();
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật task này' });
    }
    
    const query = `
      UPDATE tasks
      SET
        task_name = COALESCE($2, task_name),
        description = COALESCE($3, description),
        assignee_id = COALESCE($4, assignee_id),
        status = COALESCE($5, status),
        priority = COALESCE($6, priority),
        deadline = COALESCE($7, deadline),
        estimated_hours = COALESCE($8, estimated_hours),
        actual_hours = COALESCE($9, actual_hours),
        result_description = COALESCE($10, result_description),
        result_value = COALESCE($11, result_value),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, [
      taskId,
      task_name,
      description,
      assignee_id,
      status,
      priority,
      deadline,
      estimated_hours,
      actual_hours,
      result_description,
      result_value
    ]);
    
    // Create notification if task is reassigned
    if (assignee_id && assignee_id !== task.assignee_id) {
      const notificationQuery = `
        INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await client.query(notificationQuery, [
        assignee_id,
        'Task Assigned',
        `Bạn được giao task: ${result.rows[0].task_name}`,
        'task_assigned',
        taskId,
        'task'
      ]);
    }
    
    client.release();
    
    res.status(200).json({
      message: 'Cập nhật task thành công',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật task' });
  }
}

// Delete Task
async function deleteTask(req, res, taskId) {
  try {
    console.log('deleteTask called with:', { taskId, user: req.user });
    
    const client = await pool.connect();
    
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
    const result = await client.query(query, [taskId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      console.log('Task not found:', taskId);
      return res.status(404).json({ error: 'Task không tồn tại' });
    }
    
    console.log('Task deleted successfully:', result.rows[0]);
    res.status(200).json({
      message: 'Xóa task thành công',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Lỗi khi xóa task' });
  }
}

// Assign Task
async function assignTask(req, res, taskId) {
  try {
    const { assignee_id } = req.body;
    
    if (!assignee_id) {
      return res.status(400).json({ error: 'Assignee ID là bắt buộc' });
    }

    const client = await pool.connect();
    
    const query = `
      UPDATE tasks 
      SET assignee_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await client.query(query, [assignee_id, taskId]);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Task không tồn tại' });
    }
    
    // Create notification
    const notificationQuery = `
      INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await client.query(notificationQuery, [
      assignee_id,
      'Task Assigned',
      `Bạn được giao task: ${result.rows[0].task_name}`,
      'task_assigned',
      taskId,
      'task'
    ]);
    
    client.release();
    
    res.status(200).json({
      message: 'Giao task thành công',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Lỗi khi giao task' });
  }
}

// Add Task Comment
async function addTaskComment(req, res, taskId) {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Nội dung comment là bắt buộc' });
    }

    const client = await pool.connect();
    
    const query = `
      INSERT INTO comments (resource_type, resource_id, user_id, content)
      VALUES ('task', $1, $2, $3)
      RETURNING *
    `;
    
    const result = await client.query(query, [taskId, req.user.id, content]);
    
    client.release();
    
    res.status(201).json({
      message: 'Thêm comment thành công',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Lỗi khi thêm comment' });
  }
}

