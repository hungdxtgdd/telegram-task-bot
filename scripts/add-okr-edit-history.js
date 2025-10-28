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

async function addOKREditHistory() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding OKR edit history table...');
    
    // Create okr_edit_history table
    const createEditHistoryTable = `
      CREATE TABLE IF NOT EXISTS okr_edit_history (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username VARCHAR(100),
        field_name VARCHAR(100), -- Tên trường bị thay đổi
        old_value TEXT, -- Giá trị cũ
        new_value TEXT, -- Giá trị mới
        edited_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_okr_edit_history_okr_id ON okr_edit_history(okr_id);
      CREATE INDEX IF NOT EXISTS idx_okr_edit_history_edited_at ON okr_edit_history(edited_at DESC);
    `;
    
    await client.query(createEditHistoryTable);
    console.log('✅ OKR edit history table created');
    
    console.log('✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addOKREditHistory();

