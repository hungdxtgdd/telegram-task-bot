require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugTasks() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging tasks data...\n');
    
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
    
    if (result.rows.length > 0) {
      const task = result.rows[0];
      console.log('📋 Task data structure:');
      console.log('====================');
      Object.keys(task).forEach(key => {
        console.log(`${key}: ${task[key]} (${typeof task[key]})`);
      });
      
      console.log('\n🎯 Key fields for frontend:');
      console.log('==========================');
      console.log(`task_name: "${task.task_name}"`);
      console.log(`description: "${task.description}"`);
      console.log(`status: "${task.status}"`);
      console.log(`priority: "${task.priority}"`);
      console.log(`deadline: "${task.deadline}"`);
      console.log(`assignee_name: "${task.assignee_name}"`);
      console.log(`project_name: "${task.project_name}"`);
      console.log(`okr_objective: "${task.okr_objective}"`);
      console.log(`progress_percentage: ${task.progress_percentage}`);
      console.log(`estimated_hours: ${task.estimated_hours}`);
      console.log(`actual_hours: ${task.actual_hours}`);
    } else {
      console.log('❌ No tasks found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

debugTasks();
