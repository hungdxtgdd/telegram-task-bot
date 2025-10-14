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

// Function to generate username from full name
function generateUsername(fullName) {
  if (!fullName) return '';
  
  // Remove Vietnamese diacritics and convert to lowercase
  const name = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim();
  
  // Split name and take first name + last name initial
  const nameParts = name.split(' ').filter(part => part.length > 0);
  if (nameParts.length === 1) {
    return nameParts[0];
  } else if (nameParts.length >= 2) {
    return `${nameParts[0]}.${nameParts[nameParts.length - 1]}`;
  }
  
  return name.replace(/\s+/g, '');
}

// Function to generate email from username
function generateEmail(username) {
  return `${username}@avakids.com`;
}

// Function to generate default password
function generatePassword() {
  return 'Avakids@2025'; // Default password for all users
}

// Function to clean assignee names
function cleanAssigneeName(assignee) {
  if (!assignee) return '';
  
  // Remove extra spaces and handle multiple assignees
  let cleaned = assignee.trim();
  
  // If contains comma, take the first one
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[0].trim();
  }
  
  // Remove common prefixes/suffixes
  cleaned = cleaned.replace(/^(Anh|Chị|Mr\.|Ms\.|Mrs\.)\s+/i, '');
  cleaned = cleaned.replace(/\s+(Anh|Chị|Mr\.|Ms\.|Mrs\.)$/i, '');
  
  return cleaned;
}

async function createUsersFromTasks() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating user accounts from task assignees...');
    
    // Get all unique assignees from tasks
    const assigneesQuery = `
      SELECT DISTINCT assignee 
      FROM tasks 
      WHERE assignee IS NOT NULL 
      AND assignee != '' 
      AND assignee != 'N/A'
      ORDER BY assignee
    `;
    
    const assigneesResult = await client.query(assigneesQuery);
    const assignees = assigneesResult.rows.map(row => cleanAssigneeName(row.assignee)).filter(name => name);
    
    console.log(`📊 Found ${assignees.length} unique assignees from tasks`);
    
    // Get existing users to avoid duplicates
    const existingUsersQuery = 'SELECT username, full_name FROM users';
    const existingUsersResult = await client.query(existingUsersQuery);
    const existingUsernames = new Set(existingUsersResult.rows.map(row => row.username));
    const existingFullNames = new Set(existingUsersResult.rows.map(row => row.full_name));
    
    console.log(`👥 Found ${existingUsernames.size} existing users`);
    
    // Create users
    let createdCount = 0;
    let skippedCount = 0;
    const defaultPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    console.log(`\n🔐 Default password for all new users: ${defaultPassword}`);
    console.log('📝 Creating user accounts...\n');
    
    for (const assignee of assignees) {
      const username = generateUsername(assignee);
      const email = generateEmail(username);
      
      // Skip if username already exists
      if (existingUsernames.has(username) || existingFullNames.has(assignee)) {
        console.log(`⏭️ Skipped: ${assignee} (already exists)`);
        skippedCount++;
        continue;
      }
      
      // Skip if username is too short or invalid
      if (username.length < 2) {
        console.log(`⏭️ Skipped: ${assignee} (invalid username: ${username})`);
        skippedCount++;
        continue;
      }
      
      try {
        const insertUserQuery = `
          INSERT INTO users (username, full_name, email, password_hash, role, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id, username, full_name, email
        `;
        
        const result = await client.query(insertUserQuery, [
          username,
          assignee,
          email,
          hashedPassword,
          'user', // Default role
          true
        ]);
        
        const newUser = result.rows[0];
        console.log(`✅ Created: ${newUser.full_name} (${newUser.username}) - ${newUser.email}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creating user ${assignee}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 User creation completed!`);
    console.log(`✅ Created: ${createdCount} users`);
    console.log(`⏭️ Skipped: ${skippedCount} users`);
    
    // Show summary of all users
    console.log('\n📋 All Users Summary:');
    const allUsersQuery = `
      SELECT username, full_name, email, role, is_active, created_at
      FROM users 
      ORDER BY created_at DESC
    `;
    
    const allUsersResult = await client.query(allUsersQuery);
    allUsersResult.rows.forEach(user => {
      const status = user.is_active ? '🟢 Active' : '🔴 Inactive';
      const role = user.role === 'admin' ? '👑 Admin' : '👤 User';
      console.log(`   ${user.full_name} (${user.username}) - ${user.email} - ${role} - ${status}`);
    });
    
    console.log(`\n🔐 Login Credentials:`);
    console.log(`   Default Password: ${defaultPassword}`);
    console.log(`   Users should change their password after first login`);
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the user creation
createUsersFromTasks()
  .then(() => {
    console.log('\n✅ User creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ User creation failed:', error);
    process.exit(1);
  });

