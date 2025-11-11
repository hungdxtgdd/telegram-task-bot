---
phase: testing
title: Complete Test Guide - Run All Tests
description: Hướng dẫn chạy tất cả tests cho Tasks UI
created: 2025-11-05
status: active
---

# Complete Test Guide - Run All Tests

## 🚀 Quick Start

### Option 1: Test Page (Recommended)

1. **Navigate to test page:**
   ```
   /pages/test-tasks-ui.html
   ```

2. **Click "Run All Tests" button**

3. **View results:**
   - Results appear in the page
   - Detailed logs in browser console (F12)

### Option 2: Browser Console

1. **Open Tasks page:**
   ```
   /tasks hoặc /tasks-management-new.html
   ```

2. **Open Developer Tools (F12)**

3. **Load test script:**
   ```javascript
   // Copy và paste nội dung từ scripts/test-runner-complete.js vào console
   // Hoặc load từ file:
   const script = document.createElement('script');
   script.src = '/scripts/test-runner-complete.js';
   document.head.appendChild(script);
   ```

4. **Run tests:**
   ```javascript
   CompleteTestRunner.runAll()
   ```

### Option 3: Direct Console (If on Tasks Page)

1. **Navigate to `/tasks` page**

2. **Open Console (F12)**

3. **Run:**
   ```javascript
   // Load test runner
   fetch('/scripts/test-runner-complete.js')
     .then(r => r.text())
     .then(eval);
   
   // Wait a moment, then run
   setTimeout(() => CompleteTestRunner.runAll(), 500);
   ```

## 📋 Test Suites Included

### 1. Normalization Functions (20+ tests)
- Status normalization với various inputs
- Priority normalization
- Edge cases (null, undefined, invalid values)

### 2. Filter Logic (10+ tests)
- Status filter
- Priority filter
- Assignee filter
- Project filter
- Search filter
- Combined filters
- Empty filters

### 3. Date Formatting (5+ tests)
- Tomorrow date
- Overdue date
- Today date
- Invalid dates
- Null dates

### 4. Component Initialization (10+ tests)
- TaskCard component
- ViewModeSwitcher component
- FilterBar component
- Variant rendering

### 5. Edge Cases (15+ tests)
- Missing data
- Null/undefined values
- Very long titles
- Very long descriptions
- Invalid status/priority
- Empty arrays
- Name formatting edge cases

### 6. DOM Elements (15+ tests)
- Required elements exist
- Kanban columns exist
- Stats elements exist
- View containers exist

### 7. Global Variables (5+ tests)
- Tasks array defined
- Filtered tasks array defined
- Current view variable
- Users/projects arrays

### 8. Functions Existence (13+ tests)
- All required functions exist
- Functions are callable

### 9. API Integration (3+ tests)
- API endpoints accessible
- Response status checks

### 10. Performance (1+ test)
- Filter performance với 1000 tasks
- Should complete in < 100ms

## 📊 Expected Results

### All Tests Pass
```
Total Tests: 100+
✅ Passed: 100+
❌ Failed: 0
Success Rate: 100%
```

### Common Failures & Solutions

#### 1. Component Not Loaded
**Error:** `TaskCard not defined`
**Solution:** 
- Ensure you're on the Tasks page
- Check that component scripts are loaded
- Reload the page

#### 2. DOM Elements Not Found
**Error:** `Element not found`
**Solution:**
- Navigate to `/tasks` page first
- Ensure page is fully loaded
- Check element IDs match

#### 3. API Endpoints Not Accessible
**Error:** `API endpoint not accessible`
**Solution:**
- Check server is running
- Verify API endpoints exist
- Check authentication token

## 🎯 Test Scenarios to Manually Verify

After running automated tests, manually verify:

### 1. UI Interactions
- [ ] Click task cards
- [ ] Hover effects
- [ ] Button clicks
- [ ] Modal/drawer opens

### 2. Drag & Drop (Desktop)
- [ ] Drag task between columns
- [ ] Visual feedback
- [ ] Auto-save works
- [ ] Counts update

### 3. Mobile Experience
- [ ] Responsive layout
- [ ] Tabs work
- [ ] Touch interactions
- [ ] No horizontal scroll

### 4. Real Data
- [ ] Load real tasks from API
- [ ] Filter real data
- [ ] Update real tasks
- [ ] Verify persistence

## 📝 Test Results Template

```markdown
## Test Results - [Date]

### Environment
- Browser: ___________
- OS: ___________
- Screen Size: ___________

### Automated Tests
- Total: ___
- Passed: ___
- Failed: ___
- Success Rate: ___%

### Manual Tests
- UI Interactions: ✅/❌
- Drag & Drop: ✅/❌
- Mobile: ✅/❌
- Real Data: ✅/❌

### Issues Found
1. ___________
2. ___________

### Notes
___________
```

## 🔧 Troubleshooting

### Tests Not Running
1. Check browser console for errors
2. Verify scripts are loaded
3. Check network tab for 404s
4. Ensure you're on correct page

### Incomplete Results
1. Check if all test suites ran
2. Look for errors in console
3. Verify all components loaded
4. Check API connectivity

### Performance Issues
1. Check network speed
2. Verify server performance
3. Check browser performance
4. Monitor memory usage

## 📚 Additional Resources

- **Test Plan:** `docs/ai/testing/tasks-ui-test-plan.md`
- **Manual Guide:** `docs/ai/testing/manual-testing-guide.md`
- **Test Script:** `scripts/test-runner-complete.js`
- **Test Page:** `pages/test-tasks-ui.html`

## ✅ Success Criteria

All tests should pass with:
- ✅ 100% success rate for core functionality
- ✅ < 100ms filter performance
- ✅ All components initialize correctly
- ✅ All edge cases handled
- ✅ No console errors
- ✅ All DOM elements present

## 🎉 Next Steps After Testing

1. **Document Results:** Record test results
2. **Fix Issues:** Address any failures
3. **Re-test:** Run tests again after fixes
4. **Deploy:** If all tests pass, ready for deployment

