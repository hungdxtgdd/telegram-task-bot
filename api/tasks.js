require('dotenv').config();
const { Pool } = require('pg');

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

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      
      // Get all tasks
            const query = `
              SELECT
                t.task_id,
                t.task_name,
                t.description,
                t.assignee,
                t.status,
                t.priority,
                t.deadline,
                t.link_description,
                t.notes,
                t.created_at,
                t.updated_at,
                p.project_name,
                p.project_code,
                o.objective as okr_objective,
                u.full_name as assignee_name,
                u.username as assignee_username,
                u.email as assignee_email
              FROM tasks t
              LEFT JOIN projects p ON t.project_id = p.id
              LEFT JOIN okrs o ON t.okr_id = o.id
              LEFT JOIN users u ON t.assignee_id = u.id
              ORDER BY
                CASE t.priority
                  WHEN 'Emergency' THEN 1
                  WHEN 'High' THEN 2
                  WHEN 'Medium' THEN 3
                  WHEN 'Low' THEN 4
                END,
                t.deadline ASC
            `;
      
      const result = await client.query(query);
      client.release();
      
      res.status(200).json(result.rows);
      
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Create new task
    try {
      const { task_name, description, assignee, priority, deadline, notes, assignee_id } = req.body;
      
      if (!task_name || !assignee || !priority) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const client = await pool.connect();
      
      // Generate task ID
      const taskId = `TASK-${Date.now().toString().slice(-4)}`;
      
      const query = `
        INSERT INTO tasks (task_id, task_name, description, assignee, priority, deadline, notes, status, assignee_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await client.query(query, [
        taskId,
        task_name,
        description || null,
        assignee,
        priority,
        deadline || null,
        notes || null,
        'Pending',
        assignee_id || null
      ]);
      
      client.release();
      
      res.status(201).json(result.rows[0]);
      
    } catch (error) {
      console.error('❌ Error creating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Update task
    try {
      const { task_id, task_name, description, assignee, priority, deadline, notes, status, assignee_id } = req.body;
      
      if (!task_id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      const client = await pool.connect();
      
      const query = `
        UPDATE tasks 
        SET 
          task_name = COALESCE($2, task_name),
          description = COALESCE($3, description),
          assignee = COALESCE($4, assignee),
          priority = COALESCE($5, priority),
          deadline = COALESCE($6, deadline),
          notes = COALESCE($7, notes),
          status = COALESCE($8, status),
          assignee_id = COALESCE($9, assignee_id),
          updated_at = NOW()
        WHERE task_id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, [
        task_id,
        task_name,
        description,
        assignee,
        priority,
        deadline,
        notes,
        status,
        assignee_id
      ]);
      
      client.release();
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.status(200).json(result.rows[0]);
      
    } catch (error) {
      console.error('❌ Error updating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Delete task
    try {
      const { task_id } = req.body;
      
      if (!task_id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }
      
      const client = await pool.connect();
      
      const query = 'DELETE FROM tasks WHERE task_id = $1 RETURNING *';
      const result = await client.query(query, [task_id]);
      
      client.release();
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.status(200).json({ message: 'Task deleted successfully' });
      
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
