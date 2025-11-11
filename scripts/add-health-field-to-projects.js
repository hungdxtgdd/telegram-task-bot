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

async function addHealthFieldToProjects() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding health field to projects table...');
    
    // Add health column with constraint
    await client.query(`
      DO $$ BEGIN
        -- Add health column if not exists
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS health VARCHAR(20) DEFAULT 'good';
        
        -- Add constraint for health values
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_health_check;
        ALTER TABLE projects ADD CONSTRAINT projects_health_check 
          CHECK (health IN ('excellent', 'good', 'warning', 'critical'));
      END $$;
    `);
    
    console.log('✅ Health field added to projects table');
    
    // Create function to calculate health status
    console.log('🔧 Creating health calculation function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_project_health(project_id INTEGER)
      RETURNS VARCHAR(20) AS $$
      DECLARE
        project_record RECORD;
        completion_percentage DECIMAL(5,2) := 0;
        is_overdue BOOLEAN := FALSE;
        days_until_deadline INTEGER := 0;
        progress_percentage DECIMAL(5,2) := 0;
        health_status VARCHAR(20) := 'good';
      BEGIN
        -- Get project data with task statistics
        SELECT 
          p.*,
          COALESCE(task_stats.task_count, 0) as task_count,
          COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
          CASE 
            WHEN COALESCE(task_stats.task_count, 0) > 0 THEN 
              ROUND((COALESCE(task_stats.completed_tasks, 0)::DECIMAL / task_stats.task_count) * 100, 2)
            ELSE 0 
          END as completion_percentage
        INTO project_record
        FROM projects p
        LEFT JOIN (
          SELECT 
            project_id,
            COUNT(*) as task_count,
            COUNT(CASE WHEN status IN ('Done', 'completed', 'done') THEN 1 END) as completed_tasks
          FROM tasks 
          WHERE project_id = calculate_project_health.project_id
          GROUP BY project_id
        ) task_stats ON p.id = task_stats.project_id
        WHERE p.id = calculate_project_health.project_id;
        
        -- If project not found, return default
        IF NOT FOUND THEN
          RETURN 'good';
        END IF;
        
        -- Extract values
        completion_percentage := COALESCE(project_record.completion_percentage, 0);
        
        -- Check if overdue
        IF project_record.end_date IS NOT NULL THEN
          is_overdue := project_record.end_date < CURRENT_DATE;
          days_until_deadline := EXTRACT(DAYS FROM (project_record.end_date - CURRENT_DATE));
        END IF;
        
        -- Calculate progress percentage
        IF project_record.target_value IS NOT NULL AND project_record.target_value > 0 THEN
          progress_percentage := ROUND((COALESCE(project_record.current_value, 0) / project_record.target_value) * 100, 2);
        END IF;
        
        -- Calculate health status based on logic
        IF completion_percentage >= 90 AND NOT is_overdue AND progress_percentage >= 80 THEN
          health_status := 'excellent';
        ELSIF completion_percentage >= 70 AND NOT is_overdue AND progress_percentage >= 60 THEN
          health_status := 'good';
        ELSIF completion_percentage < 50 OR is_overdue OR days_until_deadline < 7 OR progress_percentage < 30 THEN
          health_status := 'critical';
        ELSIF completion_percentage < 70 OR days_until_deadline < 14 OR progress_percentage < 50 THEN
          health_status := 'warning';
        ELSE
          health_status := 'good';
        END IF;
        
        RETURN health_status;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Health calculation function created');
    
    // Update existing projects with calculated health
    console.log('🔧 Updating existing projects with calculated health...');
    
    await client.query(`
      UPDATE projects 
      SET health = calculate_project_health(id)
      WHERE id IS NOT NULL;
    `);
    
    console.log('✅ Existing projects updated with health status');
    
    // Create trigger to auto-update health on project changes
    console.log('🔧 Creating trigger for auto health update...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_project_health()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update health when project is modified
        NEW.health := calculate_project_health(NEW.id);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS trigger_update_project_health ON projects;
      CREATE TRIGGER trigger_update_project_health
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE FUNCTION update_project_health();
    `);
    
    console.log('✅ Auto-update trigger created');
    
    console.log('🎉 Health field implementation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding health field:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
addHealthFieldToProjects()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
