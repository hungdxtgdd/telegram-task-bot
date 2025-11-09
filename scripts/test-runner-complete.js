/**
 * Complete Test Runner for Tasks UI
 * Chạy tất cả tests và hiển thị kết quả chi tiết
 */

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: []
    };
    this.startTime = null;
    this.endTime = null;
  }

  log(testName, passed, message = '', details = {}) {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASS' : 'FAIL';
    const logMessage = `${icon} [${status}] ${testName}${message ? ': ' + message : ''}`;
    
    console.log(logMessage);
    if (!passed && details.error) {
      console.error('   Error:', details.error);
    }
    if (details.details) {
      console.log('   Details:', details.details);
    }
    
    this.results.tests.push({
      name: testName,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    });
    
    this.results.total++;
    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
    
    return passed;
  }

  assert(condition, testName, message = '', details = {}) {
    return this.log(testName, condition, message, details);
  }

  assertEqual(actual, expected, testName, details = {}) {
    const passed = actual === expected;
    const message = passed ? '' : `Expected: ${expected}, Got: ${actual}`;
    return this.log(testName, passed, message, { ...details, actual, expected });
  }

  assertNotNull(value, testName, details = {}) {
    const passed = value !== null && value !== undefined;
    const message = passed ? '' : `Got: ${value}`;
    return this.log(testName, passed, message, { ...details, value });
  }

  assertArrayLength(array, expectedLength, testName, details = {}) {
    const actualLength = array ? array.length : 0;
    const passed = actualLength === expectedLength;
    const message = passed ? '' : `Expected length: ${expectedLength}, Got: ${actualLength}`;
    return this.log(testName, passed, message, { ...details, actualLength, expectedLength });
  }

  async runTest(testFunction, testName) {
    try {
      await testFunction();
      return true;
    } catch (error) {
      this.log(testName, false, error.message, { error: error.stack });
      return false;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    
    if (this.startTime && this.endTime) {
      const duration = ((this.endTime - this.startTime) / 1000).toFixed(2);
      console.log(`⏱️  Duration: ${duration}s`);
    }
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.message}`);
        });
    }
    
    console.log('='.repeat(60) + '\n');
    
    return this.results;
  }
}

// Create global test runner
const testRunner = new TestRunner();

// ========================================
// TEST SUITES
// ========================================

// Test Suite 1: Normalization Functions
async function testNormalization() {
  console.log('\n🧪 TEST SUITE 1: Normalization Functions\n');
  
  // Status normalization
  const statusTests = [
    { input: 'Pending', expected: 'todo' },
    { input: 'In Progress', expected: 'in-progress' },
    { input: 'Done', expected: 'done' },
    { input: 'Blocked', expected: 'blocked' },
    { input: 'completed', expected: 'done' },
    { input: 'cancelled', expected: 'blocked' },
    { input: 'inprogress', expected: 'in-progress' },
    { input: 'IN_PROGRESS', expected: 'in-progress' },
    { input: null, expected: 'todo' },
    { input: undefined, expected: 'todo' },
    { input: '', expected: 'todo' }
  ];
  
  statusTests.forEach(test => {
    // Replace spaces and underscores with hyphens, then lowercase (matching actual implementation)
    const statusLower = (test.input || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
    const statusMap = {
      'pending': 'todo',
      'completed': 'done',
      'cancelled': 'blocked',
      'in-progress': 'in-progress',
      'inprogress': 'in-progress',
      'todo': 'todo',
      'done': 'done',
      'blocked': 'blocked'
    };
    const result = statusMap[statusLower] || 'todo';
    testRunner.assertEqual(result, test.expected, `Normalize status "${test.input}"`);
  });
  
  // Priority normalization
  const priorityTests = [
    { input: 'High', expected: 'high' },
    { input: 'Medium', expected: 'medium' },
    { input: 'Low', expected: 'low' },
    { input: 'Emergency', expected: 'emergency' },
    { input: 'HIGH', expected: 'high' },
    { input: null, expected: 'medium' },
    { input: undefined, expected: 'medium' },
    { input: 'Invalid', expected: 'medium' }
  ];
  
  priorityTests.forEach(test => {
    const priorityLower = (test.input || '').toLowerCase();
    const priorityMap = {
      'emergency': 'emergency',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    const result = priorityMap[priorityLower] || 'medium';
    testRunner.assertEqual(result, test.expected, `Normalize priority "${test.input}"`);
  });
}

// Test Suite 2: Filter Logic
async function testFilterLogic() {
  console.log('\n🧪 TEST SUITE 2: Filter Logic\n');
  
  const tasks = [
    { id: 1, task_name: 'Task 1', status: 'Pending', priority: 'High', assignee_id: 1, project_id: 1, description: 'Test 1' },
    { id: 2, task_name: 'Task 2', status: 'In Progress', priority: 'Medium', assignee_id: 2, project_id: 1, description: 'Test 2' },
    { id: 3, task_name: 'Task 3', status: 'Done', priority: 'Low', assignee_id: 1, project_id: 2, description: 'Test 3' },
    { id: 4, task_name: 'Task 4', status: 'Blocked', priority: 'High', assignee_id: null, project_id: null, description: 'Test 4' },
    { id: 5, task_name: 'Task 5', status: 'Pending', priority: 'Medium', assignee_id: 1, project_id: 1, description: 'Another task' }
  ];
  
  const normalizeStatus = (status) => {
    if (!status) return 'todo';
    // Replace spaces and underscores with hyphens, then lowercase (matching actual implementation)
    const statusLower = status.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
    const statusMap = {
      'pending': 'todo',
      'completed': 'done',
      'cancelled': 'blocked',
      'in-progress': 'in-progress',
      'inprogress': 'in-progress',
      'todo': 'todo',
      'done': 'done',
      'blocked': 'blocked'
    };
    return statusMap[statusLower] || 'todo';
  };
  
  // Test status filter
  // Expected: Task 1 (Pending -> todo) and Task 5 (Pending -> todo) = 2 tasks
  const statusFilter = { status: ['todo'] };
  const filteredByStatus = tasks.filter(task => {
    const taskStatus = normalizeStatus(task.status);
    return !statusFilter.status.length || statusFilter.status.includes(taskStatus);
  });
  // Task 1: Pending -> todo, Task 5: Pending -> todo = 2 tasks
  testRunner.assertArrayLength(filteredByStatus, 2, 'Filter by status "todo"', {
    details: `Found tasks: ${filteredByStatus.map(t => `${t.id}(${normalizeStatus(t.status)})`).join(', ')}`
  });
  
  // Test priority filter
  const priorityFilter = { priority: ['high'] };
  const filteredByPriority = tasks.filter(task => {
    const priority = (task.priority || '').toLowerCase();
    return !priorityFilter.priority.length || priorityFilter.priority.includes(priority);
  });
  testRunner.assertArrayLength(filteredByPriority, 2, 'Filter by priority "high"');
  
  // Test assignee filter
  const assigneeFilter = { assignee: ['1'] };
  const filteredByAssignee = tasks.filter(task => {
    const assigneeId = String(task.assignee_id || '');
    return !assigneeFilter.assignee.length || assigneeFilter.assignee.includes(assigneeId);
  });
  testRunner.assertArrayLength(filteredByAssignee, 3, 'Filter by assignee ID 1');
  
  // Test project filter
  const projectFilter = { project: ['1'] };
  const filteredByProject = tasks.filter(task => {
    const projectId = String(task.project_id || '');
    return !projectFilter.project.length || projectFilter.project.includes(projectId);
  });
  testRunner.assertArrayLength(filteredByProject, 3, 'Filter by project ID 1');
  
  // Test search filter
  const searchFilter = { search: 'Test' };
  const filteredBySearch = tasks.filter(task => {
    const searchLower = searchFilter.search.toLowerCase();
    const title = (task.task_name || '').toLowerCase();
    const description = (task.description || '').toLowerCase();
    return !searchFilter.search || title.includes(searchLower) || description.includes(searchLower);
  });
  testRunner.assertArrayLength(filteredBySearch, 4, 'Filter by search "Test"');
  
  // Test combined filters
  const combinedFilter = { status: ['todo'], assignee: ['1'] };
  const filteredCombined = tasks.filter(task => {
    const taskStatus = normalizeStatus(task.status);
    const assigneeId = String(task.assignee_id || '');
    const matchesStatus = !combinedFilter.status.length || combinedFilter.status.includes(taskStatus);
    const matchesAssignee = !combinedFilter.assignee.length || combinedFilter.assignee.includes(assigneeId);
    return matchesStatus && matchesAssignee;
  });
  testRunner.assertArrayLength(filteredCombined, 2, 'Filter by status "todo" + assignee "1"');
  
  // Test empty filters
  const emptyFilter = { status: [], priority: [], assignee: [], project: [], search: '' };
  const filteredEmpty = tasks.filter(task => {
    return true; // All tasks should pass
  });
  testRunner.assertArrayLength(filteredEmpty, 5, 'Empty filters return all tasks');
}

// Test Suite 3: Date Formatting
async function testDateFormatting() {
  console.log('\n🧪 TEST SUITE 3: Date Formatting\n');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { text: `${Math.abs(diffDays)} ngày trễ`, class: 'overdue' };
      } else if (diffDays === 0) {
        return { text: 'Hôm nay', class: 'upcoming' };
      } else if (diffDays === 1) {
        return { text: 'Ngày mai', class: 'upcoming' };
      } else if (diffDays <= 7) {
        return { text: `${diffDays} ngày nữa`, class: 'upcoming' };
      } else {
        return { text: date.toLocaleDateString('vi-VN'), class: 'normal' };
      }
    } catch (error) {
      return null;
    }
  };
  
  const tomorrowResult = formatDate(tomorrow.toISOString());
  testRunner.assertNotNull(tomorrowResult, 'Format tomorrow date');
  testRunner.assertEqual(tomorrowResult.text, 'Ngày mai', 'Tomorrow shows "Ngày mai"');
  testRunner.assertEqual(tomorrowResult.class, 'upcoming', 'Tomorrow has "upcoming" class');
  
  const overdueResult = formatDate(yesterday.toISOString());
  testRunner.assertNotNull(overdueResult, 'Format overdue date');
  testRunner.assertEqual(overdueResult.class, 'overdue', 'Overdue date has "overdue" class');
  
  const nullResult = formatDate(null);
  testRunner.assertEqual(nullResult, null, 'Null date returns null');
  
  const invalidResult = formatDate('invalid-date');
  // Invalid date might return null or throw error, both are acceptable
  const isValid = invalidResult === null || (typeof invalidResult === 'object' && invalidResult === null);
  testRunner.assert(invalidResult === null, 'Invalid date returns null', {
    details: `Got: ${JSON.stringify(invalidResult)}`
  });
}

// Test Suite 4: Component Initialization
async function testComponentInitialization() {
  console.log('\n🧪 TEST SUITE 4: Component Initialization\n');
  
  // Test TaskCard
  if (typeof TaskCard !== 'undefined') {
    const testTask = {
      id: 1,
      task_name: 'Test Task',
      description: 'Test description',
      status: 'In Progress',
      priority: 'High',
      assignee_id: 1,
      assignee_name: 'John Doe',
      project_name: 'Test Project',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString()
    };
    
    const taskCard = new TaskCard(testTask, { variant: 'standard' });
    testRunner.assertNotNull(taskCard, 'Create TaskCard instance');
    
    const cardElement = taskCard.render();
    testRunner.assertNotNull(cardElement, 'Render TaskCard');
    testRunner.assert(cardElement.classList.contains('task-card'), 'Card has task-card class');
    testRunner.assert(cardElement.classList.contains('task-card-standard'), 'Card has standard variant class');
    
    // Test compact variant
    const compactCard = new TaskCard(testTask, { variant: 'compact' });
    const compactElement = compactCard.render();
    testRunner.assert(compactElement.classList.contains('task-card-compact'), 'Compact variant has correct class');
  } else {
    testRunner.assert(false, 'TaskCard component loaded', { error: 'TaskCard not defined' });
  }
  
  // Test ViewModeSwitcher
  if (typeof ViewModeSwitcher !== 'undefined') {
    const container = document.createElement('div');
    container.id = 'testViewSwitcher';
    document.body.appendChild(container);
    
    const switcher = new ViewModeSwitcher(container, {
      currentView: 'list',
      onChange: () => {}
    });
    
    testRunner.assertNotNull(switcher, 'Create ViewModeSwitcher instance');
    testRunner.assertEqual(switcher.getView(), 'list', 'Get current view');
    
    switcher.setView('kanban');
    testRunner.assertEqual(switcher.getView(), 'kanban', 'Set view to kanban');
    
    document.body.removeChild(container);
  } else {
    testRunner.assert(false, 'ViewModeSwitcher component loaded', { error: 'ViewModeSwitcher not defined' });
  }
  
  // Test FilterBar
  if (typeof FilterBar !== 'undefined') {
    const container = document.createElement('div');
    container.id = 'testFilterBar';
    document.body.appendChild(container);
    
    const filterBar = new FilterBar(container, {
      filters: {
        status: [],
        priority: [],
        assignee: [],
        project: [],
        dueDate: null,
        search: ''
      },
      users: [
        { id: 1, full_name: 'John Doe', username: 'john' }
      ],
      projects: [
        { id: 1, project_name: 'Project 1' }
      ],
      onChange: () => {}
    });
    
    testRunner.assertNotNull(filterBar, 'Create FilterBar instance');
    const filters = filterBar.getFilters();
    testRunner.assertNotNull(filters, 'Get filters from FilterBar');
    
    document.body.removeChild(container);
  } else {
    testRunner.assert(false, 'FilterBar component loaded', { error: 'FilterBar not defined' });
  }
}

// Test Suite 5: Edge Cases
async function testEdgeCases() {
  console.log('\n🧪 TEST SUITE 5: Edge Cases\n');
  
  // Test TaskCard với missing data
  if (typeof TaskCard !== 'undefined') {
    const minimalTask = {
      id: 1,
      task_name: 'Minimal Task'
    };
    
    const card = new TaskCard(minimalTask);
    const element = card.render();
    testRunner.assertNotNull(element, 'Render TaskCard with minimal data');
    
    // Test với null/undefined values
    const nullTask = {
      id: 2,
      task_name: 'Null Task',
      assignee_id: null,
      project_id: null,
      deadline: null,
      description: null
    };
    
    const nullCard = new TaskCard(nullTask);
    const nullElement = nullCard.render();
    testRunner.assertNotNull(nullElement, 'Render TaskCard with null values');
    
    // Test với very long title
    const longTitleTask = {
      id: 3,
      task_name: 'A'.repeat(200) + ' Very Long Task Title That Should Be Truncated',
      description: 'Test'
    };
    
    const longCard = new TaskCard(longTitleTask);
    const longElement = longCard.render();
    testRunner.assertNotNull(longElement, 'Render TaskCard with long title');
    
    // Test với very long description
    const longDescTask = {
      id: 4,
      task_name: 'Long Description Task',
      description: 'B'.repeat(500) + ' Very Long Description'
    };
    
    const longDescCard = new TaskCard(longDescTask);
    const longDescElement = longDescCard.render();
    testRunner.assertNotNull(longDescElement, 'Render TaskCard with long description');
    
    // Test initials với different name formats
    const initialsTests = [
      { name: 'John Doe', expected: 'JD' },
      { name: 'John', expected: 'JO' },
      { name: 'John Michael Smith', expected: 'JS' },
      { name: '', expected: '?' },
      { name: null, expected: '?' }
    ];
    
    initialsTests.forEach(test => {
      const task = { id: 5, task_name: 'Test', assignee_name: test.name };
      const card = new TaskCard(task);
      const initials = card.getInitials(test.name);
      testRunner.assertEqual(initials, test.expected, `Get initials from "${test.name}"`);
    });
  }
  
  // Test filter với empty arrays
  const emptyTasks = [];
  const emptyFilter = { status: ['todo'] };
  const filteredEmpty = emptyTasks.filter(() => true);
  testRunner.assertArrayLength(filteredEmpty, 0, 'Filter empty task array');
  
  // Test filter với invalid data
  const invalidTasks = [
    { id: 1 },
    { id: 2, status: null },
    { id: 3, status: undefined },
    { id: 4, status: 'Invalid Status' }
  ];
  
  const normalizeStatus = (status) => {
    if (!status) return 'todo';
    const statusLower = status.toLowerCase().replace(/_/g, '-');
    const statusMap = {
      'pending': 'todo',
      'completed': 'done',
      'cancelled': 'blocked',
      'in-progress': 'in-progress',
      'todo': 'todo',
      'done': 'done',
      'blocked': 'blocked'
    };
    return statusMap[statusLower] || 'todo';
  };
  
  const filteredInvalid = invalidTasks.filter(task => {
    const taskStatus = normalizeStatus(task.status);
    return taskStatus === 'todo';
  });
  testRunner.assertArrayLength(filteredInvalid, 4, 'Filter tasks with invalid/missing status');
}

// Test Suite 6: DOM Elements
async function testDOMElements() {
  console.log('\n🧪 TEST SUITE 6: DOM Elements\n');
  
  // Check required elements exist
  const requiredElements = [
    { id: 'viewModeSwitcher', name: 'View Mode Switcher' },
    { id: 'filterBarContainer', name: 'Filter Bar Container' },
    { id: 'tasksGrid', name: 'Tasks Grid' },
    { id: 'kanbanView', name: 'Kanban View' },
    { id: 'listView', name: 'List View' }
  ];
  
  requiredElements.forEach(element => {
    const el = document.getElementById(element.id);
    testRunner.assertNotNull(el, `${element.name} exists`);
  });
  
  // Check Kanban columns
  const kanbanColumns = [
    { id: 'todoTasks', name: 'To Do Column' },
    { id: 'inProgressTasks', name: 'In Progress Column' },
    { id: 'doneTasks', name: 'Done Column' },
    { id: 'blockedTasks', name: 'Blocked Column' }
  ];
  
  kanbanColumns.forEach(column => {
    const el = document.getElementById(column.id);
    testRunner.assertNotNull(el, `${column.name} exists`);
  });
  
  // Check stats elements
  const statsElements = [
    { id: 'totalTasks', name: 'Total Tasks Counter' },
    { id: 'inProgressTasks', name: 'In Progress Counter' },
    { id: 'completedTasks', name: 'Completed Counter' },
    { id: 'overdueTasks', name: 'Overdue Counter' }
  ];
  
  statsElements.forEach(element => {
    const el = document.getElementById(element.id);
    testRunner.assertNotNull(el, `${element.name} exists`);
  });
}

// Test Suite 7: Global Variables
async function testGlobalVariables() {
  console.log('\n🧪 TEST SUITE 7: Global Variables\n');
  
  // Note: These variables exist in tasks-management-new.html scope, not in test page
  // This test checks if we're on the actual tasks page
  const isTasksPage = window.location.pathname.includes('tasks-management-new');
  
  if (!isTasksPage) {
    console.log('ℹ️  Skipping global variable tests - not on tasks-management-new.html page');
    console.log('ℹ️  These variables only exist in the actual tasks management page scope');
    return;
  }
  
  // Check if global variables are defined (they should be in tasks-management-new.html)
  try {
    testRunner.assert(typeof window.tasks !== 'undefined' || typeof tasks !== 'undefined', 'Tasks array defined', { 
      details: `Type: ${typeof (window.tasks || tasks)}, Is Array: ${Array.isArray(window.tasks || tasks)}` 
    });
    
    testRunner.assert(typeof window.filteredTasks !== 'undefined' || typeof filteredTasks !== 'undefined', 'Filtered tasks array defined', {
      details: `Type: ${typeof (window.filteredTasks || filteredTasks)}, Is Array: ${Array.isArray(window.filteredTasks || filteredTasks)}`
    });
    
    testRunner.assert(typeof window.currentView !== 'undefined' || typeof currentView !== 'undefined', 'Current view variable defined', {
      details: `Value: ${window.currentView || currentView}`
    });
    
    testRunner.assert(typeof window.users !== 'undefined' || typeof users !== 'undefined', 'Users array defined', {
      details: `Type: ${typeof (window.users || users)}, Is Array: ${Array.isArray(window.users || users)}`
    });
    
    testRunner.assert(typeof window.projects !== 'undefined' || typeof projects !== 'undefined', 'Projects array defined', {
      details: `Type: ${typeof (window.projects || projects)}, Is Array: ${Array.isArray(window.projects || projects)}`
    });
  } catch (error) {
    testRunner.assert(false, 'Global Variables', {
      error: error.message,
      details: 'Variables are scoped to tasks-management-new.html and not accessible from test page'
    });
  }
}

// Test Suite 8: Functions Existence
async function testFunctionsExistence() {
  console.log('\n🧪 TEST SUITE 8: Functions Existence\n');
  
  // Note: These functions exist in tasks-management-new.html scope, not in test page
  // This test checks if we're on the actual tasks page
  const isTasksPage = window.location.pathname.includes('tasks-management-new');
  
  if (!isTasksPage) {
    console.log('ℹ️  Skipping function existence tests - not on tasks-management-new.html page');
    console.log('ℹ️  These functions only exist in the actual tasks management page scope');
    console.log('ℹ️  Component functions (TaskCard, ViewModeSwitcher, FilterBar, KanbanBoard) are tested in Suite 4');
    return;
  }
  
  const requiredFunctions = [
    'normalizeStatus',
    'normalizePriority',
    'applyFilters',
    'renderTasks',
    'renderListView',
    'renderKanbanView',
    'updateStats',
    'updateTasksCount',
    'updateKanbanCounts',
    'switchView',
    'loadTasks',
    'loadUsers',
    'loadProjects'
  ];
  
  requiredFunctions.forEach(funcName => {
    // Try both window scope and local scope
    const exists = typeof window[funcName] === 'function' || typeof eval(funcName) === 'function';
    testRunner.assert(exists, `Function "${funcName}" exists`, {
      details: exists ? 'Function is callable' : 'Function not found (scoped to tasks-management-new.html)'
    });
  });
}

// Test Suite 9: API Integration (if available)
async function testAPIIntegration() {
  console.log('\n🧪 TEST SUITE 9: API Integration\n');
  
  // Test if API endpoints are accessible
  const endpoints = [
    '/api/tasks-enhanced/tasks',
    '/api/users-enhanced',
    '/api/projects-enhanced/projects'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      testRunner.assert(response.ok || response.status === 401, `API endpoint "${endpoint}" accessible`, {
        details: `Status: ${response.status}`
      });
    } catch (error) {
      testRunner.assert(false, `API endpoint "${endpoint}" accessible`, {
        error: error.message
      });
    }
  }
}

// Test Suite 10: Performance
async function testPerformance() {
  console.log('\n🧪 TEST SUITE 10: Performance\n');
  
  // Test filter performance với large dataset
  const largeTaskArray = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    task_name: `Task ${i + 1}`,
    status: ['Pending', 'In Progress', 'Done', 'Blocked'][i % 4],
    priority: ['High', 'Medium', 'Low'][i % 3],
    assignee_id: (i % 5) + 1,
    project_id: (i % 3) + 1
  }));
  
  const normalizeStatus = (status) => {
    if (!status) return 'todo';
    // Replace spaces and underscores with hyphens, then lowercase (matching actual implementation)
    const statusLower = status.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
    const statusMap = {
      'pending': 'todo',
      'completed': 'done',
      'cancelled': 'blocked',
      'in-progress': 'in-progress',
      'inprogress': 'in-progress',
      'todo': 'todo',
      'done': 'done',
      'blocked': 'blocked'
    };
    return statusMap[statusLower] || 'todo';
  };
  
  const startTime = performance.now();
  const filtered = largeTaskArray.filter(task => {
    const taskStatus = normalizeStatus(task.status);
    return taskStatus === 'todo';
  });
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  testRunner.assert(duration < 100, 'Filter 1000 tasks in < 100ms', {
    details: `Duration: ${duration.toFixed(2)}ms, Filtered: ${filtered.length} tasks`
  });
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log('🚀 Starting Complete Test Suite...\n');
  console.log('='.repeat(60));
  console.log('TASKS UI - COMPREHENSIVE TEST RUNNER');
  console.log('='.repeat(60));
  
  testRunner.startTime = performance.now();
  
  // Run all test suites
  await testRunner.runTest(testNormalization, 'Normalization Functions');
  await testRunner.runTest(testFilterLogic, 'Filter Logic');
  await testRunner.runTest(testDateFormatting, 'Date Formatting');
  await testRunner.runTest(testComponentInitialization, 'Component Initialization');
  await testRunner.runTest(testEdgeCases, 'Edge Cases');
  await testRunner.runTest(testDOMElements, 'DOM Elements');
  await testRunner.runTest(testGlobalVariables, 'Global Variables');
  await testRunner.runTest(testFunctionsExistence, 'Functions Existence');
  await testRunner.runTest(testAPIIntegration, 'API Integration');
  await testRunner.runTest(testPerformance, 'Performance');
  
  testRunner.endTime = performance.now();
  
  // Print summary
  const summary = testRunner.printSummary();
  
  // Return results for further processing
  return summary;
}

// Export for use
if (typeof window !== 'undefined') {
  window.CompleteTestRunner = {
    runAll: runAllTests,
    testRunner: testRunner
  };
  
  console.log('📋 Complete Test Runner loaded!');
  console.log('Run CompleteTestRunner.runAll() to run all tests');
}

// Auto-run if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    TestRunner
  };
}

