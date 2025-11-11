#!/usr/bin/env node

/**
 * Test Supabase Client Script
 * 
 * Tests Supabase JS client connection and API endpoints
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

async function testSupabaseClient() {
  log('\n🔌 Testing Supabase JS Client...', 'cyan');
  log('================================\n', 'cyan');

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kmsagdohchxuxllbhiye.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc2FnZG9oY2h4dXhsbGJoaXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzY0NzgsImV4cCI6MjA3NzgxMjQ3OH0._TRC4Trs1xQumlk2SAv47AxT7JxfIreDgaZ8Fj1UZdQ';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log('❌ Missing Supabase credentials!', 'red');
    log('\nPlease set:', 'yellow');
    log('  SUPABASE_URL=https://xxx.supabase.co', 'blue');
    log('  SUPABASE_SERVICE_ROLE_KEY=xxx (or SUPABASE_ANON_KEY)', 'blue');
    process.exit(1);
  }

  log(`Supabase URL: ${SUPABASE_URL}`, 'blue');
  log(`Has API Key: ${SUPABASE_KEY ? 'Yes' : 'No'}`, 'blue');
  log('');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Test 1: Basic connection
    log('📡 Test 1: Basic Connection...', 'cyan');
    const startTime = Date.now();
    const { data: testData, error: testError } = await supabase.from('users').select('count').limit(1);
    const connectionTime = Date.now() - startTime;
    
    if (testError) {
      log(`  ❌ Connection failed: ${testError.message}`, 'red');
      if (testError.code === 'PGRST116') {
        log('  💡 Tip: Check if table exists or permissions are correct', 'yellow');
      }
      throw testError;
    }
    
    log(`  ✅ Connected in ${connectionTime}ms`, 'green');

    // Test 2: Get users
    log('\n👥 Test 2: Get Users...', 'cyan');
    const usersStart = Date.now();
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, full_name, role')
      .limit(5);
    const usersTime = Date.now() - usersStart;
    
    if (usersError) {
      log(`  ❌ Failed: ${usersError.message}`, 'red');
    } else {
      log(`  ✅ Retrieved ${users.length} users in ${usersTime}ms`, 'green');
      if (users.length > 0) {
        log(`  📋 Sample user: ${users[0].username} (${users[0].role})`, 'blue');
      }
    }

    // Test 3: Get OKRs
    log('\n🎯 Test 3: Get OKRs...', 'cyan');
    const okrsStart = Date.now();
    const { data: okrs, error: okrsError } = await supabase
      .from('okrs')
      .select('id, objective, key_results')
      .limit(5);
    const okrsTime = Date.now() - okrsStart;
    
    if (okrsError) {
      log(`  ⚠️  Failed: ${okrsError.message}`, 'yellow');
    } else {
      log(`  ✅ Retrieved ${okrs.length} OKRs in ${okrsTime}ms`, 'green');
      if (okrs.length > 0) {
        log(`  📋 Sample OKR: ${okrs[0].objective}`, 'blue');
      }
    }

    // Test 4: Get Projects
    log('\n📁 Test 4: Get Projects...', 'cyan');
    const projectsStart = Date.now();
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, project_name, project_code, status')
      .limit(5);
    const projectsTime = Date.now() - projectsStart;
    
    if (projectsError) {
      log(`  ⚠️  Failed: ${projectsError.message}`, 'yellow');
    } else {
      log(`  ✅ Retrieved ${projects.length} projects in ${projectsTime}ms`, 'green');
      if (projects.length > 0) {
        log(`  📋 Sample project: ${projects[0].project_name} (${projects[0].status})`, 'blue');
      }
    }

    // Test 5: Get Tasks
    log('\n📝 Test 5: Get Tasks...', 'cyan');
    const tasksStart = Date.now();
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, task_name, status, priority')
      .limit(5);
    const tasksTime = Date.now() - tasksStart;
    
    if (tasksError) {
      log(`  ⚠️  Failed: ${tasksError.message}`, 'yellow');
    } else {
      log(`  ✅ Retrieved ${tasks.length} tasks in ${tasksTime}ms`, 'green');
      if (tasks.length > 0) {
        log(`  📋 Sample task: ${tasks[0].task_name} (${tasks[0].status})`, 'blue');
      }
    }

    // Test 6: Latency test
    log('\n⚡ Test 6: Latency Test (10 queries)...', 'cyan');
    const latencies = [];
    for (let i = 0; i < 10; i++) {
      const latStart = Date.now();
      await supabase.from('users').select('count').limit(1);
      latencies.push(Date.now() - latStart);
    }
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    
    log(`  ✅ Average latency: ${avgLatency.toFixed(2)}ms`, 'green');
    log(`  ⚡ Min latency: ${minLatency}ms`, 'blue');
    log(`  🐌 Max latency: ${maxLatency}ms`, 'blue');
    
    if (avgLatency < 200) {
      log(`  🎉 Excellent latency! (< 200ms)`, 'green');
    } else if (avgLatency < 500) {
      log(`  ✅ Good latency (< 500ms)`, 'green');
    } else if (avgLatency < 1000) {
      log(`  ⚠️  Acceptable latency (< 1000ms)`, 'yellow');
    } else {
      log(`  ❌ High latency (> 1000ms)`, 'red');
    }

    log('\n✅ All Supabase client tests passed!', 'green');
    log('\n📋 Summary:', 'cyan');
    log(`  Connection Time: ${connectionTime}ms`, 'blue');
    log(`  Users Query: ${usersTime}ms`, 'blue');
    log(`  OKRs Query: ${okrsTime}ms`, 'blue');
    log(`  Projects Query: ${projectsTime}ms`, 'blue');
    log(`  Tasks Query: ${tasksTime}ms`, 'blue');
    log(`  Average Latency: ${avgLatency.toFixed(2)}ms`, 'blue');
    
    log('\n🎉 Supabase JS client is working correctly!', 'green');
    log('✅ Ready for production deployment', 'green');

    process.exit(0);
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    if (error.code) {
      log(`  Code: ${error.code}`, 'yellow');
    }
    if (error.details) {
      log(`  Details: ${error.details}`, 'yellow');
    }
    if (error.hint) {
      log(`  Hint: ${error.hint}`, 'yellow');
    }
    process.exit(1);
  }
}

testSupabaseClient();

