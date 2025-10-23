const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    
    // Get first task to see actual structure
    const result = await client.query(`
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
      LIMIT 1
    `);
    
    client.release();
    
    if (result.rows.length > 0) {
      const task = result.rows[0];
      return res.status(200).json({
        success: true,
        task: task,
        fields: Object.keys(task),
        debug: {
          task_name: task.task_name,
          description: task.description,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          assignee_name: task.assignee_name,
          project_name: task.project_name,
          okr_objective: task.okr_objective,
          progress_percentage: task.progress_percentage,
          estimated_hours: task.estimated_hours,
          actual_hours: task.actual_hours
        }
      });
    } else {
      return res.status(404).json({ error: 'No tasks found' });
    }
    
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: error.message });
  }
}
