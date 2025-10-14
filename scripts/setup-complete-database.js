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

async function setupCompleteDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up complete database schema...');

    // 1. Create OKRs table (Top level)
    const createOkrsTable = `
      CREATE TABLE IF NOT EXISTS okrs (
        id SERIAL PRIMARY KEY,
        objective TEXT NOT NULL,
        key_results JSONB, -- [{"description": "KR1", "target": 100, "current": 0, "unit": "%"}]
        status VARCHAR(50) DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Achieved', 'At Risk', 'Dropped')),
        quarter INTEGER CHECK (quarter >= 1 AND quarter <= 4),
        year INTEGER,
        start_date DATE,
        end_date DATE,
        target_value DECIMAL(10,2), -- Mục tiêu tổng thể
        current_value DECIMAL(10,2) DEFAULT 0, -- Kết quả thực tế
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createOkrsTable);
    console.log('✅ OKRs table created');

    // 2. Create Projects table (Middle level)
    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER REFERENCES okrs(id) ON DELETE SET NULL,
        project_code VARCHAR(50) UNIQUE NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled')),
        priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
        start_date DATE,
        end_date DATE,
        deadline DATE,
        target_value DECIMAL(10,2), -- Mục tiêu của project cho OKR
        current_value DECIMAL(10,2) DEFAULT 0, -- Kết quả thực tế hiện tại
        budget DECIMAL(15,2),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createProjectsTable);
    console.log('✅ Projects table created');

    // 3. Update Tasks table (Bottom level)
    const updateTasksTable = `
      DO $$ BEGIN
        -- Add new columns if they don't exist
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INTEGER;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id INTEGER;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2);
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_description TEXT;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_value DECIMAL(10,2);
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INTEGER;
        
        -- Add constraints
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_project') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_project
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assignee') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_assignee
              FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_created_by') THEN
            ALTER TABLE tasks ADD CONSTRAINT fk_created_by
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END $$;
        
        -- Update status constraint
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
          CHECK (status IN ('Pending', 'In Progress', 'Done', 'Cancelled', 'Blocked'));
          
        -- Update priority constraint  
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
        ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
          CHECK (priority IN ('High', 'Medium', 'Low'));
      END $$;
    `;
    await client.query(updateTasksTable);
    console.log('✅ Tasks table updated');

    // 4. Create Project Members table
    const createProjectMembersTable = `
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      );
    `;
    await client.query(createProjectMembersTable);
    console.log('✅ Project members table created');

    // 5. Create Task Dependencies table
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

    // 6. Create Audit Logs table
    const createAuditLogsTable = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50),
        record_id INTEGER,
        action VARCHAR(20) CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
        old_values JSONB,
        new_values JSONB,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createAuditLogsTable);
    console.log('✅ Audit logs table created');

    // 7. Create Notifications table
    const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50), -- task_assigned, deadline_approaching, project_completed, okr_updated
        is_read BOOLEAN DEFAULT FALSE,
        related_id INTEGER, -- ID của task/project/okr liên quan
        related_type VARCHAR(50), -- task, project, okr
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createNotificationsTable);
    console.log('✅ Notifications table created');

    // 8. Create User Activities table
    const createUserActivitiesTable = `
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100),
        resource_type VARCHAR(50),
        resource_id INTEGER,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createUserActivitiesTable);
    console.log('✅ User activities table created');

    // 9. Create Comments table
    const createCommentsTable = `
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        resource_type VARCHAR(50), -- task, project, okr
        resource_id INTEGER,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE, -- For replies
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createCommentsTable);
    console.log('✅ Comments table created');

    // 10. Create Attachments table
    const createAttachmentsTable = `
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        resource_type VARCHAR(50), -- task, project, okr
        resource_id INTEGER,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createAttachmentsTable);
    console.log('✅ Attachments table created');

    // 11. Create Indexes for Performance
    const createIndexes = `
      -- Core indexes
      CREATE INDEX IF NOT EXISTS idx_projects_okr_id ON projects(okr_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_okrs_quarter_year ON okrs(quarter, year);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_resource ON comments(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_resource ON attachments(resource_type, resource_id);
    `;
    await client.query(createIndexes);
    console.log('✅ Performance indexes created');

    // 12. Create Views for Reporting
    const createViews = `
      -- OKR Progress Summary View
      CREATE OR REPLACE VIEW okr_progress_summary AS
      SELECT 
        o.id,
        o.objective,
        o.quarter,
        o.year,
        o.status,
        o.target_value,
        o.current_value,
        COUNT(p.id) as project_count,
        COUNT(CASE WHEN p.status = 'Completed' THEN 1 END) as completed_projects,
        COUNT(CASE WHEN p.status = 'In Progress' THEN 1 END) as active_projects,
        u.full_name as owner_name,
        o.created_at,
        o.updated_at
      FROM okrs o
      LEFT JOIN projects p ON o.id = p.okr_id
      LEFT JOIN users u ON o.owner_id = u.id
      GROUP BY o.id, o.objective, o.quarter, o.year, o.status, o.target_value, o.current_value, u.full_name, o.created_at, o.updated_at;

      -- Project Status Summary View
      CREATE OR REPLACE VIEW project_status_summary AS
      SELECT 
        p.id,
        p.project_code,
        p.project_name,
        p.status,
        p.priority,
        p.target_value,
        p.current_value,
        p.deadline,
        o.objective as okr_objective,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.status = 'Done' THEN 1 END) as completed_tasks,
        COUNT(pm.user_id) as member_count,
        u.full_name as created_by_name,
        p.created_at,
        p.updated_at
      FROM projects p
      LEFT JOIN okrs o ON p.okr_id = o.id
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN users u ON p.created_by = u.id
      GROUP BY p.id, p.project_code, p.project_name, p.status, p.priority, p.target_value, p.current_value, p.deadline, o.objective, u.full_name, p.created_at, p.updated_at;
    `;
    await client.query(createViews);
    console.log('✅ Reporting views created');

    console.log('🎉 Complete database schema setup finished successfully!');

  } catch (error) {
    console.error('❌ Error setting up complete database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupCompleteDatabase()
  .then(() => {
    console.log('✅ Database setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  });
