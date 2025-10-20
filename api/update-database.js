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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow admin to update database
  const { verifyToken, requireAdmin } = require('./auth');
  
  verifyToken(req, res, () => {
    requireAdmin(req, res, async () => {
      await updateDatabaseConstraint(req, res);
    });
  });
};

async function updateDatabaseConstraint(req, res) {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current role constraints...');
    
    // Check current constraints
    const constraintQuery = `
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
      AND conname LIKE '%role%'
    `;
    
    const constraintResult = await client.query(constraintQuery);
    console.log('Current role constraints:', constraintResult.rows);
    
    // Check if there's a check constraint on role
    const checkConstraintQuery = `
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%'
    `;
    
    const checkResult = await client.query(checkConstraintQuery);
    console.log('Check constraints on role:', checkResult.rows);
    
    // Try to drop existing constraint if it exists
    if (checkResult.rows.length > 0) {
      console.log('🗑️ Dropping existing role constraint...');
      for (const constraint of checkResult.rows) {
        try {
          await client.query(`ALTER TABLE users DROP CONSTRAINT ${constraint.conname}`);
          console.log(`✅ Dropped constraint: ${constraint.conname}`);
        } catch (error) {
          console.log(`⚠️ Could not drop constraint ${constraint.conname}:`, error.message);
        }
      }
    }
    
    // Add new constraint that allows admin, manager, user
    console.log('➕ Adding new role constraint...');
    try {
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'manager', 'user'))
      `);
      console.log('✅ Added new role constraint');
    } catch (error) {
      console.log('⚠️ Could not add constraint:', error.message);
    }
    
    // Test by trying to insert a manager user
    console.log('🧪 Testing manager role...');
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('manager123', 10);
      
      const testQuery = `
        INSERT INTO users (username, password_hash, full_name, email, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (username) DO NOTHING
        RETURNING id, username, role
      `;
      
      const testResult = await client.query(testQuery, [
        'test_manager',
        hashedPassword,
        'Test Manager',
        'manager@test.com',
        'manager',
        true
      ]);
      
      if (testResult.rows.length > 0) {
        console.log('✅ Manager role test successful:', testResult.rows[0]);
      } else {
        console.log('ℹ️ Manager user already exists');
      }
    } catch (error) {
      console.log('❌ Manager role test failed:', error.message);
    }
    
    res.status(200).json({
      message: 'Database constraint updated successfully',
      constraints: constraintResult.rows,
      newConstraint: 'users_role_check CHECK (role IN (\'admin\', \'manager\', \'user\'))'
    });
    
  } catch (error) {
    console.error('❌ Error updating database:', error);
    res.status(500).json({ error: 'Failed to update database constraint' });
  } finally {
    client.release();
  }
}
