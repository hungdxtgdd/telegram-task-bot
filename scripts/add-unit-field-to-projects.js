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

async function addUnitFieldToProjects() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding unit field to projects table...');
    
    // Add unit field to projects table
    await client.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT '%'
    `);
    
    console.log('✅ Unit field added to projects table');
    
    // Update existing projects to have default unit value
    await client.query(`
      UPDATE projects 
      SET unit = '%' 
      WHERE unit IS NULL
    `);
    
    console.log('✅ Existing projects updated with default unit value');
    
    console.log('\n🎉 Unit field migration completed successfully!');
    console.log('\n📊 Updated Projects Table Structure:');
    console.log('   • target_value - Mục tiêu của dự án');
    console.log('   • unit - Đơn vị đo lường (%, VND, USD, etc.)');
    console.log('   • budget - Ngân sách dự án');
    
  } catch (error) {
    console.error('❌ Error adding unit field:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addUnitFieldToProjects();
