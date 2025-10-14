#!/usr/bin/env node

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

async function setupOKRFocusedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up OKR-focused database structure...');
    
    // 1. Create OKRs table (cấp cao nhất)
    const createOKRsTable = `
      CREATE TABLE IF NOT EXISTS okrs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        objective TEXT NOT NULL,
        key_results JSONB NOT NULL, -- Array of key results with targets
        quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
        year INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
        progress DECIMAL(5,2) DEFAULT 0.00,
        start_date DATE,
        end_date DATE,
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createOKRsTable);
    console.log('✅ OKRs table created');
    
    // 2. Create Projects table (cấp 2 - để thực hiện OKRs)
    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_code VARCHAR(50) UNIQUE NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        description TEXT,
        okr_id INTEGER REFERENCES okrs(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        start_date DATE,
        end_date DATE,
        budget DECIMAL(15,2),
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createProjectsTable);
    console.log('✅ Projects table created');
    
    // 3. Update Tasks table (cấp 3 - công việc cụ thể trong project)
    const updateTasksTable = `
      DO $$ BEGIN
        -- Add new columns if they don't exist
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS okr_id INTEGER REFERENCES okrs(id) ON DELETE SET NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8,2);
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8,2);
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points INTEGER;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[];
        
        -- Update existing columns
        ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'pending';
        ALTER TABLE tasks ADD CONSTRAINT IF NOT EXISTS check_status 
          CHECK (status IN ('pending', 'in_progress', 'review', 'testing', 'done', 'cancelled'));
      END $$;
    `;
    
    await client.query(updateTasksTable);
    console.log('✅ Tasks table updated');
    
    // 4. Create project_members table (team members for each project)
    const createProjectMembersTable = `
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'developer', 'designer', 'tester', 'reviewer', 'member')),
        permissions JSONB DEFAULT '{"can_edit": false, "can_delete": false, "can_assign": false}',
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP,
        UNIQUE(project_id, user_id)
      );
    `;
    
    await client.query(createProjectMembersTable);
    console.log('✅ Project members table created');
    
    // 5. Create task_dependencies table
    const createTaskDependenciesTable = `
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(50) REFERENCES tasks(task_id) ON DELETE CASCADE,
        depends_on_task_id VARCHAR(50) REFERENCES tasks(task_id) ON DELETE CASCADE,
        dependency_type VARCHAR(20) DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(task_id, depends_on_task_id)
      );
    `;
    
    await client.query(createTaskDependenciesTable);
    console.log('✅ Task dependencies table created');
    
    // 6. Create okr_progress_updates table
    const createOKRProgressUpdatesTable = `
      CREATE TABLE IF NOT EXISTS okr_progress_updates (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER REFERENCES okrs(id) ON DELETE CASCADE,
        update_date DATE DEFAULT CURRENT_DATE,
        progress_percentage DECIMAL(5,2) NOT NULL,
        notes TEXT,
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createOKRProgressUpdatesTable);
    console.log('✅ OKR progress updates table created');
    
    // 7. Create project_milestones table
    const createProjectMilestonesTable = `
      CREATE TABLE IF NOT EXISTS project_milestones (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createProjectMilestonesTable);
    console.log('✅ Project milestones table created');
    
    // 8. Create notifications table
    const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_type VARCHAR(50), -- 'okr', 'project', 'task'
        related_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createNotificationsTable);
    console.log('✅ Notifications table created');
    
    // 9. Create indexes for better performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_okrs_quarter_year ON okrs(quarter, year);
      CREATE INDEX IF NOT EXISTS idx_okrs_status ON okrs(status);
      CREATE INDEX IF NOT EXISTS idx_projects_okr_id ON projects(okr_id);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `;
    
    await client.query(createIndexes);
    console.log('✅ Indexes created');
    
    console.log('\n🎉 OKR-focused database structure created successfully!');
    console.log('\n📊 Database Hierarchy:');
    console.log('   1. OKRs (Objectives & Key Results) - Cấp cao nhất');
    console.log('   2. Projects - Thực hiện OKRs');
    console.log('   3. Tasks - Công việc cụ thể trong Projects');
    console.log('   4. Users - Thành viên tham gia');
    
    console.log('\n🔗 Key Relationships:');
    console.log('   • OKR → Projects (1:many)');
    console.log('   • Project → Tasks (1:many)');
    console.log('   • Project → Members (1:many)');
    console.log('   • Task → Assignee (1:1)');
    console.log('   • Task → Dependencies (many:many)');
    
  } catch (error) {
    console.error('❌ Error setting up OKR-focused database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupOKRFocusedDatabase()
  .then(() => {
    console.log('\n✅ OKR-focused database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ OKR-focused database setup failed:', error);
    process.exit(1);
  });

