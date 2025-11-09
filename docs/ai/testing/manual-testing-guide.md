---
phase: testing
title: Manual Testing Guide
description: Hướng dẫn test manual cho Tasks UI
created: 2025-11-05
status: active
---

# Manual Testing Guide - Tasks UI

## Quick Start

1. Mở browser và navigate đến `/tasks` page
2. Mở Developer Tools (F12)
3. Mở Console tab để xem logs
4. Mở Network tab để monitor API calls
5. Load test script: Copy nội dung từ `scripts/test-tasks-ui.js` và paste vào console, sau đó run `TasksUITests.runAll()`

## Test Scenarios

### Scenario 1: Basic Page Load

**Steps:**
1. Navigate to `/tasks`
2. Wait for page to load

**Expected Results:**
- ✅ Page loads without errors
- ✅ Tasks display in List view
- ✅ Stats cards show correct counts
- ✅ Filter bar visible
- ✅ View mode switcher visible
- ✅ No console errors

**Check:**
- [ ] Console: No red errors
- [ ] Network: API calls successful (200 status)
- [ ] UI: All elements visible

---

### Scenario 2: View Mode Switching

**Steps:**
1. Click "Kanban" button
2. Click "List" button
3. Click "Gantt" button (if available)
4. Reload page

**Expected Results:**
- ✅ View switches smoothly
- ✅ Tasks render correctly in each view
- ✅ View persists after reload (check localStorage)

**Check:**
- [ ] Kanban: 4 columns visible
- [ ] List: Grid layout with cards
- [ ] View state saved in localStorage

---

### Scenario 3: Filter Tasks

**Steps:**
1. Select "In Progress" from status filter
2. Add "High" priority filter
3. Select an assignee
4. Type in search box
5. Click "Clear all" button

**Expected Results:**
- ✅ Tasks filter correctly
- ✅ Active filter chips appear
- ✅ Counts update
- ✅ Clear all removes all filters

**Check:**
- [ ] Filter chips visible
- [ ] Tasks count matches filtered results
- [ ] Search debounced (300ms delay)

---

### Scenario 4: Drag & Drop (Desktop)

**Steps:**
1. Switch to Kanban view
2. Drag a task from "To Do" to "In Progress"
3. Check Network tab
4. Verify task moved

**Expected Results:**
- ✅ Drag smooth with visual feedback
- ✅ Task moves to new column
- ✅ API call PUT /api/tasks-enhanced/tasks/:id
- ✅ Status updated in database
- ✅ Column counts update

**Check:**
- [ ] Visual feedback during drag
- [ ] API call with correct status
- [ ] Task appears in new column
- [ ] Counts updated

---

### Scenario 5: Task Card Interactions

**Steps:**
1. Hover over a task card
2. Click on task card
3. Click edit button
4. Click delete button

**Expected Results:**
- ✅ Hover effects visible
- ✅ Task detail drawer opens
- ✅ Edit modal opens with task data
- ✅ Delete confirmation modal opens

**Check:**
- [ ] Hover: Shadow and transform
- [ ] Click: Detail drawer slides in
- [ ] Edit: Form pre-filled
- [ ] Delete: Confirmation shown

---

### Scenario 6: Mobile Experience

**Steps:**
1. Resize browser to mobile size (< 768px)
2. Switch to Kanban view
3. Click tabs to switch columns
4. Test filters

**Expected Results:**
- ✅ Layout responsive
- ✅ Kanban shows tabs instead of columns
- ✅ Tabs switch columns
- ✅ Filters stack vertically
- ✅ View switcher shows icons only

**Check:**
- [ ] Mobile layout correct
- [ ] Tabs functional
- [ ] Touch interactions work
- [ ] No horizontal scroll

---

### Scenario 7: Error Handling

**Steps:**
1. Disconnect network
2. Try to drag a task
3. Try to filter
4. Reconnect network

**Expected Results:**
- ✅ Error messages shown
- ✅ UI doesn't crash
- ✅ Tasks revert on error
- ✅ Works after reconnect

**Check:**
- [ ] Error messages user-friendly
- [ ] No crashes
- [ ] State consistent

---

### Scenario 8: Edge Cases

**Test Cases:**
1. Task without assignee
2. Task without project
3. Task without due date
4. Task with very long title
5. Task with very long description
6. Empty task list
7. No matching filters

**Expected Results:**
- ✅ All cases handled gracefully
- ✅ Default values shown
- ✅ No crashes
- ✅ UI remains usable

**Check:**
- [ ] "Chưa giao" for no assignee
- [ ] No project section if no project
- [ ] No due date if missing
- [ ] Long text truncated
- [ ] Empty state shown

---

## Browser Console Commands

### Run Test Suite
```javascript
TasksUITests.runAll()
```

### Test Individual Components
```javascript
TasksUITests.testTaskCard()
TasksUITests.testViewModeSwitcher()
TasksUITests.testFilterBar()
TasksUITests.testNormalization()
TasksUITests.testFilterLogic()
```

### Check Current State
```javascript
// Check current view
console.log('Current view:', currentView);

// Check tasks
console.log('Total tasks:', tasks.length);
console.log('Filtered tasks:', filteredTasks.length);

// Check filters
if (filterBar) {
  console.log('Active filters:', filterBar.getFilters());
}

// Check components
console.log('ViewModeSwitcher:', viewModeSwitcher);
console.log('FilterBar:', filterBar);
console.log('KanbanBoard:', kanbanBoard);
```

### Simulate Actions
```javascript
// Switch view
switchView('kanban');

// Apply filter
if (filterBar) {
  filterBar.setFilters({ status: ['todo'] });
}

// Update task status
updateTaskStatus(1, 'in-progress');
```

---

## Common Issues & Solutions

### Issue: Tasks not loading
**Check:**
- Network tab: API call status
- Console: Error messages
- API endpoint: `/api/tasks-enhanced/tasks`

**Solution:**
- Check authentication token
- Verify API endpoint accessible
- Check CORS settings

### Issue: Drag & drop not working
**Check:**
- SortableJS loaded: `typeof Sortable !== 'undefined'`
- Kanban board initialized: `kanbanBoard !== null`
- Desktop view (not mobile)

**Solution:**
- Verify SortableJS script loaded
- Check Kanban board initialization
- Ensure desktop view

### Issue: Filters not working
**Check:**
- FilterBar initialized: `filterBar !== null`
- Filter logic: Check `applyFilters` function
- Tasks data: Check `tasks` array

**Solution:**
- Verify FilterBar initialization
- Check filter logic in console
- Verify tasks data structure

### Issue: View not switching
**Check:**
- ViewModeSwitcher initialized
- Current view state
- DOM elements exist

**Solution:**
- Verify ViewModeSwitcher initialization
- Check `currentView` variable
- Verify view containers exist

---

## Performance Checklist

- [ ] Page load < 2s
- [ ] Filter response < 500ms
- [ ] View switch < 300ms
- [ ] Drag & drop smooth
- [ ] No lag with 100+ tasks
- [ ] No memory leaks (check Memory tab)

---

## Accessibility Checklist

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Focus indicators visible
- [ ] ARIA labels present

---

## Notes

- Test trên multiple browsers
- Test trên multiple devices
- Test với different data sets
- Document any issues found
- Take screenshots of bugs

