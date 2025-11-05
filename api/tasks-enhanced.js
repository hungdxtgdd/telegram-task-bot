require('dotenv').config();
const { verifyToken, requireAdmin, requireAdminOrManager } = require('./auth');
const { createPool } = require('./db-utils');
const {
  getAllTasks: supabaseGetAllTasks,
  getTaskById: supabaseGetTaskById,
  createTask: supabaseCreateTask,
  updateTask: supabaseUpdateTask,
  deleteTask: supabaseDeleteTask,
  getUserById,
  supabase
} = require('./supabase-client');

const DATABASE_URL = process.env.DATABASE_URL;

// Create pool only if DATABASE_URL is available (optional for Supabase client usage)
let pool = null;
if (DATABASE_URL) {
  try {
    pool = createPool(DATABASE_URL);
    console.log('📡 Direct PostgreSQL connection available as fallback');
  } catch (error) {
    console.warn('⚠️ Direct connection initialization failed:', error.message);
  }
} else {
  console.log('📡 Using Supabase client only (no DATABASE_URL) - some endpoints may not work');
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

  // Verify authentication for all Task operations
  verifyToken(req, res, async () => {
    await handleTaskRequest(req, res);
  });
};

async function handleTaskRequest(req, res) {
  // Use Supabase client (no need for pool check)
  console.log('✅ Tasks endpoint: Using Supabase client');

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
    const { project_id, assignee_id, status, priority, deadline_from, deadline_to } = req.query;
    
    // Build filters
    const filters = {};
    if (project_id) filters.project_id = parseInt(project_id);
    if (assignee_id) filters.assignee_id = parseInt(assignee_id);
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (deadline_from) filters.deadline_from = deadline_from;
    if (deadline_to) filters.deadline_to = deadline_to;
    
    // Get tasks from Supabase
    let tasks = await supabaseGetAllTasks(filters);
    
    if (!tasks) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = 'SELECT * FROM tasks ORDER BY deadline ASC';
          const result = await client.query(query);
          tasks = result.rows;
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi lấy danh sách tasks' });
      }
    }
    
    // Enrich tasks with additional data
    const enrichedTasks = await Promise.all(tasks.map(async (task) => {
      // Get project info
      let projectName = null;
      let projectCode = null;
      let okrObjective = null;
      if (task.project_id) {
        const project = await supabase.from('projects').select('project_name, project_code, okr_id').eq('id', task.project_id).single();
        if (project.data) {
          projectName = project.data.project_name;
          projectCode = project.data.project_code;
          if (project.data.okr_id) {
            const okr = await supabase.from('okrs').select('objective').eq('id', project.data.okr_id).single();
            okrObjective = okr.data?.objective || null;
          }
        }
      }
      
      // Get assignee info
      let assigneeName = null;
      let assigneeUsername = null;
      let assigneeEmail = null;
      if (task.assignee_id) {
        const assignee = await getUserById(task.assignee_id);
        if (assignee) {
          assigneeName = assignee.full_name || null;
          assigneeUsername = assignee.username || null;
          assigneeEmail = assignee.email || null;
        }
      }
      
      // Get creator info
      let createdByName = null;
      if (task.created_by) {
        const creator = await getUserById(task.created_by);
        createdByName = creator?.full_name || null;
      }
      
      return {
        ...task,
        project_name: projectName,
        project_code: projectCode,
        okr_objective: okrObjective,
        assignee_name: assigneeName,
        assignee_username: assigneeUsername,
        assignee_email: assigneeEmail,
        created_by_name: createdByName
      };
    }));
    
    // Sort by priority and deadline
    enrichedTasks.sort((a, b) => {
      const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
      const priorityDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      if (priorityDiff !== 0) return priorityDiff;
      
      const deadlineA = a.deadline ? new Date(a.deadline) : new Date('9999-12-31');
      const deadlineB = b.deadline ? new Date(b.deadline) : new Date('9999-12-31');
      return deadlineA - deadlineB;
    });
    
    res.status(200).json(enrichedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách tasks' });
  }
}

// Get Task by ID
async function getTaskById(req, res, taskId) {
  try {
    let task = await supabaseGetTaskById(taskId);
    
    if (!task) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = 'SELECT * FROM tasks WHERE id = $1';
          const result = await client.query(query, [taskId]);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task không tồn tại' });
          }
          task = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Task không tồn tại' });
      }
    }
    
    // Enrich with additional data
    let projectName = null;
    let projectCode = null;
    let okrObjective = null;
    if (task.project_id) {
      const project = await supabase.from('projects').select('project_name, project_code, okr_id').eq('id', task.project_id).single();
      if (project.data) {
        projectName = project.data.project_name;
        projectCode = project.data.project_code;
        if (project.data.okr_id) {
          const okr = await supabase.from('okrs').select('objective').eq('id', project.data.okr_id).single();
          okrObjective = okr.data?.objective || null;
        }
      }
    }
    
    let assigneeName = null;
    let assigneeUsername = null;
    let assigneeEmail = null;
    if (task.assignee_id) {
      const assignee = await getUserById(task.assignee_id);
      if (assignee) {
        assigneeName = assignee.full_name || null;
        assigneeUsername = assignee.username || null;
        assigneeEmail = assignee.email || null;
      }
    }
    
    let createdByName = null;
    if (task.created_by) {
      const creator = await getUserById(task.created_by);
      createdByName = creator?.full_name || null;
    }
    
    const enrichedTask = {
      ...task,
      project_name: projectName,
      project_code: projectCode,
      okr_objective: okrObjective,
      assignee_name: assigneeName,
      assignee_username: assigneeUsername,
      assignee_email: assigneeEmail,
      created_by_name: createdByName
    };
    
    res.status(200).json(enrichedTask);
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

    // Generate task_id - use timestamp to ensure uniqueness
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const task_id = `TASK-${timestamp}-${random}`;
    
    const taskData = {
      task_id,
      project_id,
      task_name,
      description: description || null,
      assignee_id: assignee_id || null,
      priority: priority || 'Medium',
      deadline: deadline || null,
      estimated_hours: estimated_hours || null,
      result_description: result_description || null,
      result_value: result_value || null,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    let task = await supabaseCreateTask(taskData);
    
    if (!task) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = `
            INSERT INTO tasks (
              task_id, project_id, task_name, description, assignee_id, priority,
              deadline, estimated_hours, result_description, result_value, created_by,
              created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING *
          `;
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
          task = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi tạo task' });
      }
    }
    
    // Create notification if task is assigned
    if (assignee_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: assignee_id,
          title: 'Task Assigned',
          message: `Bạn được giao task: ${task_name}`,
          type: 'task_assigned',
          related_id: task.id,
          related_type: 'task'
        });
      } catch (e) {
        console.warn('Could not create notification:', e.message);
      }
    }
    
    res.status(201).json({
      message: 'Tạo task thành công',
      task: task
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

    // Check if user can update this task
    let task = await supabaseGetTaskById(taskId);
    
    if (!task) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const checkQuery = 'SELECT assignee_id, created_by FROM tasks WHERE id = $1';
          const checkResult = await client.query(checkQuery, [taskId]);
          if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task không tồn tại' });
          }
          task = checkResult.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Task không tồn tại' });
      }
    }
    
    const canUpdate = req.user.role === 'admin' || 
                     req.user.role === 'manager' || 
                     task.assignee_id === req.user.id || 
                     task.created_by === req.user.id;
    
    if (!canUpdate) {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật task này' });
    }
    
    // Build update object
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    if (task_name !== undefined) updates.task_name = task_name;
    if (description !== undefined) updates.description = description;
    if (assignee_id !== undefined) updates.assignee_id = assignee_id;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (deadline !== undefined) updates.deadline = deadline;
    if (estimated_hours !== undefined) updates.estimated_hours = estimated_hours;
    if (actual_hours !== undefined) updates.actual_hours = actual_hours;
    if (result_description !== undefined) updates.result_description = result_description;
    if (result_value !== undefined) updates.result_value = result_value;
    
    const updatedTask = await supabaseUpdateTask(taskId, updates);
    
    if (!updatedTask) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
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
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task không tồn tại' });
          }
          task = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi cập nhật task' });
      }
    } else {
      task = updatedTask;
    }
    
    // Create notification if task is reassigned
    if (assignee_id && assignee_id !== task.assignee_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: assignee_id,
          title: 'Task Assigned',
          message: `Bạn được giao task: ${task.task_name}`,
          type: 'task_assigned',
          related_id: taskId,
          related_type: 'task'
        });
      } catch (e) {
        console.warn('Could not create notification:', e.message);
      }
    }
    
    res.status(200).json({
      message: 'Cập nhật task thành công',
      task: task
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
    
    const deletedTask = await supabaseDeleteTask(taskId);
    
    if (!deletedTask) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
          const result = await client.query(query, [taskId]);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task không tồn tại' });
          }
          console.log('Task deleted successfully:', result.rows[0]);
          return res.status(200).json({
            message: 'Xóa task thành công',
            task: result.rows[0]
          });
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Task không tồn tại' });
      }
    }
    
    console.log('Task deleted successfully:', deletedTask);
    res.status(200).json({
      message: 'Xóa task thành công',
      task: deletedTask
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

    const updates = {
      assignee_id,
      updated_at: new Date().toISOString()
    };
    
    const task = await supabaseUpdateTask(taskId, updates);
    
    if (!task) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = `
            UPDATE tasks 
            SET assignee_id = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
          `;
          const result = await client.query(query, [assignee_id, taskId]);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task không tồn tại' });
          }
          task = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Task không tồn tại' });
      }
    }
    
    // Create notification
    try {
      await supabase.from('notifications').insert({
        user_id: assignee_id,
        title: 'Task Assigned',
        message: `Bạn được giao task: ${task.task_name}`,
        type: 'task_assigned',
        related_id: taskId,
        related_type: 'task'
      });
    } catch (e) {
      console.warn('Could not create notification:', e.message);
    }
    
    res.status(200).json({
      message: 'Giao task thành công',
      task: task
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

    const commentData = {
      resource_type: 'task',
      resource_id: taskId,
      user_id: req.user.id,
      content,
      created_at: new Date().toISOString()
    };
    
    const { data: comment, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select()
      .single();
    
    if (error) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = `
            INSERT INTO comments (resource_type, resource_id, user_id, content)
            VALUES ('task', $1, $2, $3)
            RETURNING *
          `;
          const result = await client.query(query, [taskId, req.user.id, content]);
          return res.status(201).json({
            message: 'Thêm comment thành công',
            comment: result.rows[0]
          });
        } finally {
          client.release();
        }
      } else {
        console.error('Error adding comment:', error);
        return res.status(500).json({ error: 'Lỗi khi thêm comment' });
      }
    }
    
    res.status(201).json({
      message: 'Thêm comment thành công',
      comment: comment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Lỗi khi thêm comment' });
  }
}

