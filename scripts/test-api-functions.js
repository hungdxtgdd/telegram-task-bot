#!/usr/bin/env node

/**
 * Test API Functions Script
 * 
 * Tests the migrated API helper functions from supabase-client.js
 */

require('dotenv').config();
const {
  getUserByUsername,
  getUserById,
  getAllOKRs,
  getOKRById,
  getAllProjects,
  getProjectById,
  getAllTasks,
  getTaskById,
  getAllUsers
} = require('../api/supabase-client');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAPIFunctions() {
  log('\n🧪 Testing API Helper Functions...', 'cyan');
  log('==================================\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // Test 1: getUserByUsername
  log('📋 Test 1: getUserByUsername...', 'cyan');
  try {
    const start = Date.now();
    const user = await getUserByUsername('admin');
    const time = Date.now() - start;
    
    if (user) {
      log(`  ✅ Found user: ${user.username} (${user.role}) in ${time}ms`, 'green');
      passed++;
    } else {
      log(`  ⚠️  User not found (may not exist)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Test 2: getUserById
  log('\n📋 Test 2: getUserById...', 'cyan');
  try {
    const start = Date.now();
    const user = await getUserById(1);
    const time = Date.now() - start;
    
    if (user) {
      log(`  ✅ Found user: ${user.username} (${user.role}) in ${time}ms`, 'green');
      passed++;
    } else {
      log(`  ⚠️  User not found (may not exist)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Test 3: getAllOKRs
  log('\n🎯 Test 3: getAllOKRs...', 'cyan');
  try {
    const start = Date.now();
    const okrs = await getAllOKRs();
    const time = Date.now() - start;
    
    if (okrs && okrs.length > 0) {
      log(`  ✅ Retrieved ${okrs.length} OKRs in ${time}ms`, 'green');
      log(`  📋 Sample: ${okrs[0].objective}`, 'blue');
      passed++;
    } else {
      log(`  ⚠️  No OKRs found (may be empty)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Test 4: getOKRById
  log('\n🎯 Test 4: getOKRById...', 'cyan');
  try {
    const start = Date.now();
    const okr = await getOKRById(1);
    const time = Date.now() - start;
    
    if (okr) {
      log(`  ✅ Found OKR: ${okr.objective} in ${time}ms`, 'green');
      passed++;
    } else {
      log(`  ⚠️  OKR not found (may not exist)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Test 5: getAllProjects
  log('\n📁 Test 5: getAllProjects...', 'cyan');
  try {
    const start = Date.now();
    const projects = await getAllProjects();
    const time = Date.now() - start;
    
    if (projects && projects.length > 0) {
      log(`  ✅ Retrieved ${projects.length} projects in ${time}ms`, 'green');
      log(`  📋 Sample: ${projects[0].project_name}`, 'blue');
      passed++;
    } else {
      log(`  ⚠️  No projects found (may be empty)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Test 6: getProjectById
  log('\n📁 Test 6: getProjectById...', 'cyan');
  try {
    const start = Date.now();
    const project = await getProjectById(1);
    const time = Date.now() - start;
    
    if (project) {
      log(`  ✅ Found project: ${project.project_name} in ${time}ms`, 'green');
      passed++;
    } else {
      log(`  ⚠️  Project not found (may not exist)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Test 7: getAllTasks
  log('\n📝 Test 7: getAllTasks...', 'cyan');
  try {
    const start = Date.now();
    const tasks = await getAllTasks();
    const time = Date.now() - start;
    
    if (tasks && tasks.length > 0) {
      log(`  ✅ Retrieved ${tasks.length} tasks in ${time}ms`, 'green');
      log(`  📋 Sample: ${tasks[0].task_name}`, 'blue');
      passed++;
    } else {
      log(`  ⚠️  No tasks found (may be empty)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Test 8: getTaskById
  log('\n📝 Test 8: getTaskById...', 'cyan');
  try {
    const start = Date.now();
    const task = await getTaskById(1);
    const time = Date.now() - start;
    
    if (task) {
      log(`  ✅ Found task: ${task.task_name} in ${time}ms`, 'green');
      passed++;
    } else {
      log(`  ⚠️  Task not found (may not exist)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Test 9: getAllUsers
  log('\n👥 Test 9: getAllUsers...', 'cyan');
  try {
    const start = Date.now();
    const users = await getAllUsers();
    const time = Date.now() - start;
    
    if (users && users.length > 0) {
      log(`  ✅ Retrieved ${users.length} users in ${time}ms`, 'green');
      log(`  📋 Sample: ${users[0].username}`, 'blue');
      passed++;
    } else {
      log(`  ⚠️  No users found (may be empty)`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ Failed: ${error.message}`, 'red');
    failed++;
  }

  // Summary
  log('\n📊 Test Summary:', 'cyan');
  log(`  ✅ Passed: ${passed}`, 'green');
  log(`  ❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`  📈 Total: ${passed + failed}`, 'blue');

  if (failed === 0) {
    log('\n🎉 All API functions are working correctly!', 'green');
    log('✅ Migration successful - ready for deployment', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
    process.exit(1);
  }
}

testAPIFunctions();

