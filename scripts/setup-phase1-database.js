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

async function setupPhase1Database() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up Phase 1 database schema...');

    // 1. Create OKRs table
    const createOkrsTable = `
      CREATE TABLE IF NOT EXISTS okrs (
        id SERIAL PRIMARY KEY,
        objective TEXT NOT NULL,
        key_results JSONB,
        status VARCHAR(50) DEFAULT 'Not Started',
        quarter INTEGER,
        year INTEGER,
        start_date DATE,
        end_date DATE,
        target_value DECIMAL(10,2),
        current_value DECIMAL(10,2) DEFAULT 0,
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createOkrsTable);
    console.log('✅ OKRs table created');

    // Add owner_id column if it doesn't exist
    const addOwnerIdColumn = `
      ALTER TABLE okrs ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `;
    await client.query(addOwnerIdColumn);
    console.log('✅ OKRs owner_id column added');

    // 2. Create Projects table
    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER REFERENCES okrs(id) ON DELETE SET NULL,
        project_code VARCHAR(50) UNIQUE NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Not Started',
        priority VARCHAR(20) DEFAULT 'Medium',
        start_date DATE,
        end_date DATE,
        deadline DATE,
        target_value DECIMAL(10,2),
        current_value DECIMAL(10,2) DEFAULT 0,
        budget DECIMAL(15,2),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createProjectsTable);
    console.log('✅ Projects table created');

    // 3. Update Tasks table
    const addTaskColumns = `
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INTEGER;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id INTEGER;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_description TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_value DECIMAL(10,2);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INTEGER;
    `;
    await client.query(addTaskColumns);
    console.log('✅ Tasks table columns added');

    // 4. Add foreign key constraints
    const addConstraints = `
      ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
      ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assignee 
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE tasks ADD CONSTRAINT fk_tasks_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    `;
    try {
      await client.query(addConstraints);
      console.log('✅ Foreign key constraints added');
    } catch (error) {
      console.log('⚠️ Some constraints may already exist:', error.message);
    }

    // 5. Create Project Members table
    const createProjectMembersTable = `
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      );
    `;
    await client.query(createProjectMembersTable);
    console.log('✅ Project members table created');

    // 6. Create Notifications table
    const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        related_id INTEGER,
        related_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(createNotificationsTable);
    console.log('✅ Notifications table created');

    // 7. Create basic indexes
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
      CREATE INDEX IF NOT EXISTS idx_okrs_quarter_year ON okrs(quarter, year);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `;
    await client.query(createIndexes);
    console.log('✅ Basic indexes created');

    // 8. Skip sample data for now
    console.log('✅ Schema setup completed (skipping sample data)');

    console.log('🎉 Phase 1 database setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up Phase 1 database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupPhase1Database()
  .then(() => {
    console.log('✅ Phase 1 database setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Phase 1 database setup failed:', error);
    process.exit(1);
  });
