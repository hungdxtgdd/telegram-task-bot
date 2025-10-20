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

async function addManagerRole() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current users...');
    
    // Check current users
    const checkQuery = 'SELECT id, username, role FROM users ORDER BY id';
    const result = await client.query(checkQuery);
    
    console.log('Current users:');
    result.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    // Check if manager1 already exists
    const managerCheck = await client.query('SELECT id FROM users WHERE username = $1', ['manager1']);
    
    if (managerCheck.rows.length > 0) {
      console.log('✅ User manager1 already exists');
    } else {
      console.log('➕ Creating manager1 user...');
      
      // Create manager user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('manager123', 10);
      
      const insertQuery = `
        INSERT INTO users (username, password_hash, full_name, email, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, username, role
      `;
      
      const insertResult = await client.query(insertQuery, [
        'manager1',
        hashedPassword,
        'Manager Test',
        'manager@test.com',
        'manager',
        true
      ]);
      
      console.log('✅ Created manager user:', insertResult.rows[0]);
    }
    
    // Verify the role constraint
    console.log('🔍 Checking role constraints...');
    const constraintQuery = `
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
      AND conname LIKE '%role%'
    `;
    
    const constraintResult = await client.query(constraintQuery);
    console.log('Role constraints:', constraintResult.rows);
    
    console.log('✅ Database check completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addManagerRole();
