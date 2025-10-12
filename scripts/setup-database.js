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
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up database...');
    
    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(50) UNIQUE NOT NULL,
        task_name TEXT NOT NULL,
        description TEXT,
        assignee VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        deadline DATE,
        link_description TEXT,
        notes TEXT,
        okr_related TEXT,
        chat_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create user_states table for bot flow management
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_states (
        chat_id BIGINT PRIMARY KEY,
        state VARCHAR(50),
        step VARCHAR(50),
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_chat_id ON tasks(chat_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
      CREATE INDEX IF NOT EXISTS idx_user_states_chat_id ON user_states(chat_id);
    `);
    
    console.log('✅ Database setup completed successfully!');
    console.log('📊 Tables created:');
    console.log('  - tasks: Main task storage');
    console.log('  - user_states: Bot flow management');
    console.log('📈 Indexes created for better performance');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
