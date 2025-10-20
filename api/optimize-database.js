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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const client = await pool.connect();
  
  try {
    console.log('🔧 Optimizing database schema...');
    
    // 1. Add missing indexes for performance
    console.log('Adding performance indexes...');
    const performanceIndexes = [
      // Users table indexes
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);',
      'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);',
      
      // Projects table indexes
      'CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);',
      'CREATE INDEX IF NOT EXISTS idx_projects_okr_id ON projects(okr_id);',
      'CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);',
      'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);',
      'CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);',
      'CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);',
      'CREATE INDEX IF NOT EXISTS idx_projects_end_date ON projects(end_date);',
      
      // OKRs table indexes
      'CREATE INDEX IF NOT EXISTS idx_okrs_owner_id ON okrs(owner_id);',
      'CREATE INDEX IF NOT EXISTS idx_okrs_status ON okrs(status);',
      'CREATE INDEX IF NOT EXISTS idx_okrs_quarter_year ON okrs(quarter, year);',
      'CREATE INDEX IF NOT EXISTS idx_okrs_start_date ON okrs(start_date);',
      'CREATE INDEX IF NOT EXISTS idx_okrs_end_date ON okrs(end_date);',
      
      // Tasks table indexes
      'CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_okr_id ON tasks(okr_id);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);',
      
      // Composite indexes for common queries
      'CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);',
      'CREATE INDEX IF NOT EXISTS idx_projects_okr_status ON projects(okr_id, status);',
      'CREATE INDEX IF NOT EXISTS idx_okrs_owner_status ON okrs(owner_id, status);'
    ];
    
    const indexResults = [];
    for (const indexQuery of performanceIndexes) {
      try {
        await client.query(indexQuery);
        indexResults.push({ query: indexQuery, status: 'success' });
      } catch (error) {
        indexResults.push({ query: indexQuery, status: 'exists', message: error.message });
      }
    }
    console.log('✅ Performance indexes processed');
    
    // 2. Add missing constraints
    console.log('Adding missing constraints...');
    const constraints = [
      // Add check constraints for status values
      `ALTER TABLE projects ADD CONSTRAINT IF NOT EXISTS projects_status_check 
       CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled'));`,
      
      `ALTER TABLE okrs ADD CONSTRAINT IF NOT EXISTS okrs_status_check 
       CHECK (status IN ('active', 'completed', 'paused'));`,
      
      `ALTER TABLE tasks ADD CONSTRAINT IF NOT EXISTS tasks_status_check 
       CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));`,
      
      `ALTER TABLE tasks ADD CONSTRAINT IF NOT EXISTS tasks_priority_check 
       CHECK (priority IN ('Emergency', 'High', 'Medium', 'Low'));`,
      
      // Add check constraints for numeric values
      `ALTER TABLE projects ADD CONSTRAINT IF NOT EXISTS projects_target_value_check 
       CHECK (target_value IS NULL OR target_value >= 0);`,
      
      `ALTER TABLE projects ADD CONSTRAINT IF NOT EXISTS projects_current_value_check 
       CHECK (current_value IS NULL OR current_value >= 0);`,
      
      `ALTER TABLE okrs ADD CONSTRAINT IF NOT EXISTS okrs_target_value_check 
       CHECK (target_value IS NULL OR target_value >= 0);`,
      
      `ALTER TABLE okrs ADD CONSTRAINT IF NOT EXISTS okrs_current_value_check 
       CHECK (current_value IS NULL OR current_value >= 0);`
    ];
    
    const constraintResults = [];
    for (const constraintQuery of constraints) {
      try {
        await client.query(constraintQuery);
        constraintResults.push({ query: constraintQuery, status: 'success' });
      } catch (error) {
        constraintResults.push({ query: constraintQuery, status: 'exists', message: error.message });
      }
    }
    console.log('✅ Constraints processed');
    
    // 3. Create useful views for reporting
    console.log('Creating reporting views...');
    const views = [
      // Project summary view
      `CREATE OR REPLACE VIEW project_summary AS
       SELECT 
         p.id,
         p.project_code,
         p.project_name,
         p.status,
         p.priority,
         p.target_value,
         p.current_value,
         p.unit,
         p.start_date,
         p.end_date,
         o.objective as okr_objective,
         u.full_name as created_by_name,
         COUNT(t.id) as task_count,
         COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
         ROUND(
           CASE 
             WHEN COUNT(t.id) > 0 THEN 
               (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::DECIMAL / COUNT(t.id)) * 100
             ELSE 0 
           END, 2
         ) as completion_percentage,
         p.created_at,
         p.updated_at
       FROM projects p
       LEFT JOIN okrs o ON p.okr_id = o.id
       LEFT JOIN tasks t ON p.id = t.project_id
       LEFT JOIN users u ON p.created_by = u.id
       GROUP BY p.id, p.project_code, p.project_name, p.status, p.priority, 
                p.target_value, p.current_value, p.unit, p.start_date, p.end_date, 
                o.objective, u.full_name, p.created_at, p.updated_at;`,
      
      // OKR progress view
      `CREATE OR REPLACE VIEW okr_progress AS
       SELECT 
         o.id,
         o.objective,
         o.target_value,
         o.current_value,
         o.unit,
         o.status,
         o.quarter,
         o.year,
         u.full_name as owner_name,
         COUNT(p.id) as project_count,
         COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_projects,
         ROUND(
           CASE 
             WHEN o.target_value > 0 THEN 
               (o.current_value / o.target_value) * 100
             ELSE 0 
           END, 2
         ) as progress_percentage,
         o.created_at,
         o.updated_at
       FROM okrs o
       LEFT JOIN projects p ON o.id = p.okr_id
       LEFT JOIN users u ON o.owner_id = u.id
       GROUP BY o.id, o.objective, o.target_value, o.current_value, o.unit, 
                o.status, o.quarter, o.year, u.full_name, o.created_at, o.updated_at;`,
      
      // Task summary view
      `CREATE OR REPLACE VIEW task_summary AS
       SELECT 
         t.id,
         t.task_id,
         t.task_name,
         t.status,
         t.priority,
         t.deadline,
         p.project_name,
         p.project_code,
         u.full_name as assignee_name,
         u2.full_name as created_by_name,
         t.estimated_hours,
         t.actual_hours,
         t.created_at,
         t.updated_at
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users u2 ON t.created_by = u2.id;`
    ];
    
    const viewResults = [];
    for (const viewQuery of views) {
      try {
        await client.query(viewQuery);
        viewResults.push({ query: viewQuery, status: 'success' });
      } catch (error) {
        viewResults.push({ query: viewQuery, status: 'error', message: error.message });
      }
    }
    console.log('✅ Reporting views processed');
    
    // 4. Analyze tables for query optimization
    console.log('Analyzing tables for optimization...');
    const analyzeTables = [
      'ANALYZE users;',
      'ANALYZE projects;',
      'ANALYZE okrs;',
      'ANALYZE tasks;'
    ];
    
    for (const analyzeQuery of analyzeTables) {
      await client.query(analyzeQuery);
    }
    console.log('✅ Tables analyzed');
    
    res.status(200).json({
      message: 'Database schema optimization completed successfully!',
      results: {
        indexes: indexResults,
        constraints: constraintResults,
        views: viewResults,
        analysis: 'Tables analyzed for query optimization'
      }
    });
    
  } catch (error) {
    console.error('❌ Error optimizing database schema:', error);
    res.status(500).json({ error: 'Database optimization failed: ' + error.message });
  } finally {
    client.release();
  }
};
