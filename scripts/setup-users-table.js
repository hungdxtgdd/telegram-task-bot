#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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

async function setupUsersTable() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up users table...');
    
    // Create users table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createTableQuery);
    console.log('✅ Users table created successfully');
    
    // Create index for username
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `;
    
    await client.query(createIndexQuery);
    console.log('✅ Username index created');
    
    // Check if admin user exists
    const checkAdminQuery = 'SELECT id FROM users WHERE username = $1';
    const adminResult = await client.query(checkAdminQuery, ['admin']);
    
    if (adminResult.rows.length === 0) {
      // Create default admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      const insertAdminQuery = `
        INSERT INTO users (username, password_hash, full_name, role, email)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await client.query(insertAdminQuery, [
        'admin',
        adminPassword,
        'Administrator',
        'admin',
        'admin@avakids.com'
      ]);
      
      console.log('✅ Default admin user created');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change the password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists');
    }
    
    // Check if avakids user exists
    const checkAvakidsQuery = 'SELECT id FROM users WHERE username = $1';
    const avakidsResult = await client.query(checkAvakidsQuery, ['avakids']);
    
    if (avakidsResult.rows.length === 0) {
      // Create default avakids user
      const avakidsPassword = await bcrypt.hash('avakids123', 10);
      const insertAvakidsQuery = `
        INSERT INTO users (username, password_hash, full_name, role, email)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await client.query(insertAvakidsQuery, [
        'avakids',
        avakidsPassword,
        'AVAKids Team',
        'user',
        'team@avakids.com'
      ]);
      
      console.log('✅ Default avakids user created');
      console.log('   Username: avakids');
      console.log('   Password: avakids123');
    } else {
      console.log('ℹ️  AVAKids user already exists');
    }
    
    console.log('\n🎉 Users table setup completed successfully!');
    console.log('\n📋 Default credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   User:  avakids / avakids123');
    console.log('\n⚠️  Please change these passwords after first login!');
    
  } catch (error) {
    console.error('❌ Error setting up users table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupUsersTable()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
