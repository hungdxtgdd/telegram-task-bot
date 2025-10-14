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

async function fixDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing database schema...');

    // 1. Add missing columns to okrs table
    console.log('Adding missing columns to okrs table...');
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE okrs ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE okrs ADD COLUMN IF NOT EXISTS end_date DATE;
        ALTER TABLE okrs ADD COLUMN IF NOT EXISTS progress DECIMAL(5,2) DEFAULT 0.00;
        ALTER TABLE okrs ADD COLUMN IF NOT EXISTS target_value DECIMAL(10,2);
        ALTER TABLE okrs ADD COLUMN IF NOT EXISTS current_value DECIMAL(10,2) DEFAULT 0.00;
        ALTER TABLE okrs ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE okrs ADD COLUMN IF NOT EXISTS quarter INTEGER;
        ALTER TABLE okrs ADD COLUMN IF NOT EXISTS year INTEGER;
      END $$;
    `);
    console.log('✅ OKRs table columns added');

    // 2. Add missing columns to projects table
    console.log('Adding missing columns to projects table...');
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS okr_id INTEGER REFERENCES okrs(id) ON DELETE SET NULL;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Not Started';
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium';
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_value DECIMAL(10,2);
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_value DECIMAL(10,2) DEFAULT 0.00;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2);
      END $$;
    `);
    console.log('✅ Projects table columns added');

    // 3. Add missing columns to tasks table
    console.log('Adding missing columns to tasks table...');
    
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium';
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline DATE;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS link_description TEXT;
      END $$;
    `);
    console.log('✅ Tasks table columns added');

    // 4. Create project_members table if not exists
    console.log('Creating project_members table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      );
    `);
    console.log('✅ Project members table created');

    // 5. Create project_okr_updates table if not exists
    console.log('Creating project_okr_updates table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_okr_updates (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER REFERENCES okrs(id) ON DELETE CASCADE,
        current_value DECIMAL(10,2) NOT NULL,
        update_note TEXT,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Project OKR updates table created');

    // 6. Add constraints to existing tables
    console.log('Adding constraints...');
    
    try {
      await client.query(`
        ALTER TABLE okrs ADD CONSTRAINT okrs_status_check 
          CHECK (status IN ('Not Started', 'In Progress', 'Achieved', 'At Risk', 'Dropped'));
      `);
    } catch (e) {
      // Constraint might already exist
    }
    
    try {
      await client.query(`
        ALTER TABLE projects ADD CONSTRAINT projects_status_check 
          CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled'));
      `);
    } catch (e) {
      // Constraint might already exist
    }
    
    try {
      await client.query(`
        ALTER TABLE projects ADD CONSTRAINT projects_priority_check 
          CHECK (priority IN ('Low', 'Medium', 'High', 'Emergency'));
      `);
    } catch (e) {
      // Constraint might already exist
    }
    
    try {
      await client.query(`
        ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
          CHECK (status IN ('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'));
      `);
    } catch (e) {
      // Constraint might already exist
    }
    
    try {
      await client.query(`
        ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
          CHECK (priority IN ('Low', 'Medium', 'High', 'Emergency'));
      `);
    } catch (e) {
      // Constraint might already exist
    }
    
    console.log('✅ Constraints added');

    console.log('🎉 Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabaseSchema()
  .then(() => {
    console.log('✅ Database schema fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database schema fix failed:', error);
    process.exit(1);
  });
