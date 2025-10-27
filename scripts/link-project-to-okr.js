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

async function linkProjectToOKR() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Linking project to OKR...');
    
    // 1. Get first OKR
    const okrQuery = 'SELECT id, objective FROM okrs ORDER BY id LIMIT 1';
    const okrResult = await client.query(okrQuery);
    
    if (okrResult.rows.length === 0) {
      console.log('❌ No OKRs found');
      return;
    }
    
    const okr = okrResult.rows[0];
    console.log('✅ Found OKR:', okr.id, okr.objective);
    
    // 2. Get first project that doesn't have an OKR yet
    const projectQuery = 'SELECT id, project_name FROM projects WHERE okr_id IS NULL ORDER BY id LIMIT 1';
    const projectResult = await client.query(projectQuery);
    
    if (projectResult.rows.length === 0) {
      console.log('❌ No available projects found');
      return;
    }
    
    const project = projectResult.rows[0];
    console.log('✅ Found Project:', project.id, project.project_name);
    
    // 3. Link project to OKR
    const updateQuery = 'UPDATE projects SET okr_id = $1 WHERE id = $2 RETURNING *';
    const updateResult = await client.query(updateQuery, [okr.id, project.id]);
    
    console.log('✅ Successfully linked:');
    console.log('   OKR:', okr.objective);
    console.log('   Project:', project.project_name);
    console.log('   Project Code:', updateResult.rows[0].project_code);
    
  } catch (error) {
    console.error('❌ Error linking project to OKR:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

linkProjectToOKR();

