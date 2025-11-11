/**
 * Tasks UI Test Script
 * Run this in browser console để test các functions
 */

// Test utilities
const TestUtils = {
  log: (testName, passed, message = '') => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testName}${message ? ': ' + message : ''}`);
    return passed;
  },
  
  assert: (condition, testName, message = '') => {
    return TestUtils.log(testName, condition, message);
  },
  
  assertEqual: (actual, expected, testName) => {
    const passed = actual === expected;
    return TestUtils.log(testName, passed, `Expected: ${expected}, Got: ${actual}`);
  },
  
  assertNotNull: (value, testName) => {
    return TestUtils.log(testName, value !== null && value !== undefined, `Got: ${value}`);
  }
};

// Test TaskCard Component
function testTaskCard() {
  console.log('\n🧪 Testing TaskCard Component...');
  
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
  
  // Test normalization
  const taskCard = new TaskCard(testTask, { variant: 'standard' });
  const status = taskCard.normalizeStatus('In Progress');
  TestUtils.assertEqual(status, 'in-progress', 'Normalize status "In Progress"');
  
  const priority = taskCard.normalizePriority('High');
  TestUtils.assertEqual(priority, 'high', 'Normalize priority "High"');
  
  // Test date formatting
  const dueDate = taskCard.formatDate(testTask.deadline);
  TestUtils.assertNotNull(dueDate, 'Format due date');
  
  // Test initials
  const initials = taskCard.getInitials('John Doe');
  TestUtils.assertEqual(initials, 'JD', 'Get initials from name');
  
  // Test render
  const cardElement = taskCard.render();
  TestUtils.assertNotNull(cardElement, 'Render task card');
  TestUtils.assert(cardElement.classList.contains('task-card'), 'Card has task-card class');
}

// Test ViewModeSwitcher Component
function testViewModeSwitcher() {
  console.log('\n🧪 Testing ViewModeSwitcher Component...');
  
  // Create test container
  const container = document.createElement('div');
  container.id = 'testViewSwitcher';
  document.body.appendChild(container);
  
  const switcher = new ViewModeSwitcher(container, {
    currentView: 'list',
    onChange: (viewId) => {
      TestUtils.log('onChange callback', true, `View: ${viewId}`);
    }
  });
  
  TestUtils.assertNotNull(switcher, 'Create ViewModeSwitcher');
  TestUtils.assertEqual(switcher.getView(), 'list', 'Get current view');
  
  switcher.setView('kanban');
  TestUtils.assertEqual(switcher.getView(), 'kanban', 'Set view to kanban');
  
  // Cleanup
  document.body.removeChild(container);
}

// Test FilterBar Component
function testFilterBar() {
  console.log('\n🧪 Testing FilterBar Component...');
  
  // Create test container
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
      { id: 1, full_name: 'John Doe', username: 'john' },
      { id: 2, full_name: 'Jane Smith', username: 'jane' }
    ],
    projects: [
      { id: 1, project_name: 'Project 1' },
      { id: 2, project_name: 'Project 2' }
    ],
    onChange: (filters) => {
      TestUtils.log('onChange callback', true, `Filters: ${JSON.stringify(filters)}`);
    }
  });
  
  TestUtils.assertNotNull(filterBar, 'Create FilterBar');
  
  const filters = filterBar.getFilters();
  TestUtils.assertNotNull(filters, 'Get filters');
  
  filterBar.setFilters({ status: ['todo'] });
  const updatedFilters = filterBar.getFilters();
  TestUtils.assert(updatedFilters.status.includes('todo'), 'Set status filter');
  
  // Cleanup
  document.body.removeChild(container);
}

// Test Normalization Functions
function testNormalization() {
  console.log('\n🧪 Testing Normalization Functions...');
  
  // Test status normalization
  const statusTests = [
    { input: 'Pending', expected: 'todo' },
    { input: 'In Progress', expected: 'in-progress' },
    { input: 'Done', expected: 'done' },
    { input: 'Blocked', expected: 'blocked' },
    { input: 'completed', expected: 'done' },
    { input: 'cancelled', expected: 'blocked' }
  ];
  
  statusTests.forEach(test => {
    // Simulate normalizeStatus function
    const statusLower = test.input.toLowerCase().replace(/_/g, '-');
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
    TestUtils.assertEqual(result, test.expected, `Normalize status "${test.input}"`);
  });
  
  // Test priority normalization
  const priorityTests = [
    { input: 'High', expected: 'high' },
    { input: 'Medium', expected: 'medium' },
    { input: 'Low', expected: 'low' },
    { input: 'Emergency', expected: 'emergency' }
  ];
  
  priorityTests.forEach(test => {
    const priorityLower = test.input.toLowerCase();
    const priorityMap = {
      'emergency': 'emergency',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    const result = priorityMap[priorityLower] || 'medium';
    TestUtils.assertEqual(result, test.expected, `Normalize priority "${test.input}"`);
  });
}

// Test Filter Logic
function testFilterLogic() {
  console.log('\n🧪 Testing Filter Logic...');
  
  const tasks = [
    { id: 1, task_name: 'Task 1', status: 'Pending', priority: 'High', assignee_id: 1, project_id: 1 },
    { id: 2, task_name: 'Task 2', status: 'In Progress', priority: 'Medium', assignee_id: 2, project_id: 1 },
    { id: 3, task_name: 'Task 3', status: 'Done', priority: 'Low', assignee_id: 1, project_id: 2 }
  ];
  
  // Simulate normalizeStatus
  const normalizeStatus = (status) => {
    const statusLower = status.toLowerCase().replace(/_/g, '-');
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
  const statusFilter = { status: ['todo'] };
  const filteredByStatus = tasks.filter(task => {
    const taskStatus = normalizeStatus(task.status);
    return !statusFilter.status.length || statusFilter.status.includes(taskStatus);
  });
  TestUtils.assertEqual(filteredByStatus.length, 1, 'Filter by status');
  
  // Test assignee filter
  const assigneeFilter = { assignee: ['1'] };
  const filteredByAssignee = tasks.filter(task => {
    const assigneeId = String(task.assignee_id || '');
    return !assigneeFilter.assignee.length || assigneeFilter.assignee.includes(assigneeId);
  });
  TestUtils.assertEqual(filteredByAssignee.length, 2, 'Filter by assignee');
  
  // Test combined filters
  const combinedFilter = { status: ['todo'], assignee: ['1'] };
  const filteredCombined = tasks.filter(task => {
    const taskStatus = normalizeStatus(task.status);
    const assigneeId = String(task.assignee_id || '');
    const matchesStatus = !combinedFilter.status.length || combinedFilter.status.includes(taskStatus);
    const matchesAssignee = !combinedFilter.assignee.length || combinedFilter.assignee.includes(assigneeId);
    return matchesStatus && matchesAssignee;
  });
  TestUtils.assertEqual(filteredCombined.length, 1, 'Filter by status + assignee');
}

// Test Date Formatting
function testDateFormatting() {
  console.log('\n🧪 Testing Date Formatting...');
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Test formatDate function logic
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
  TestUtils.assertNotNull(tomorrowResult, 'Format tomorrow date');
  TestUtils.assertEqual(tomorrowResult.text, 'Ngày mai', 'Tomorrow shows "Ngày mai"');
  
  const overdueResult = formatDate(yesterday.toISOString());
  TestUtils.assertNotNull(overdueResult, 'Format overdue date');
  TestUtils.assertEqual(overdueResult.class, 'overdue', 'Overdue date has overdue class');
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Tasks UI Tests...\n');
  
  try {
    testNormalization();
    testFilterLogic();
    testDateFormatting();
    
    // Component tests (require DOM)
    if (typeof TaskCard !== 'undefined') {
      testTaskCard();
    } else {
      console.log('⚠️ TaskCard component not loaded, skipping component tests');
    }
    
    if (typeof ViewModeSwitcher !== 'undefined') {
      testViewModeSwitcher();
    } else {
      console.log('⚠️ ViewModeSwitcher component not loaded, skipping component tests');
    }
    
    if (typeof FilterBar !== 'undefined') {
      testFilterBar();
    } else {
      console.log('⚠️ FilterBar component not loaded, skipping component tests');
    }
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.TasksUITests = {
    runAll: runAllTests,
    testTaskCard,
    testViewModeSwitcher,
    testFilterBar,
    testNormalization,
    testFilterLogic,
    testDateFormatting
  };
  
  console.log('📋 Tasks UI Test Suite loaded!');
  console.log('Run Tests.TasksUITests.runAll() to run all tests');
}

// Auto-run if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    TestUtils
  };
}

