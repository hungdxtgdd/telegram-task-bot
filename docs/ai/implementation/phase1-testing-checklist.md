---
phase: implementation
title: Phase 1 Testing Checklist
description: Checklist để test Phase 1 components
created: 2025-11-05
status: draft
---

# Phase 1 Testing Checklist

## Components to Test

### 1. TaskCard Component

#### Basic Rendering
- [ ] TaskCard renders với task data
- [ ] Compact variant hiển thị đúng
- [ ] Standard variant hiển thị đúng
- [ ] Expanded variant hiển thị đúng (nếu có)

#### Task Data Display
- [ ] Title hiển thị đúng
- [ ] Description hiển thị đúng (truncated)
- [ ] Priority indicator hiển thị đúng màu
- [ ] Status badge hiển thị đúng
- [ ] Assignee avatar và name hiển thị đúng
- [ ] Project name hiển thị đúng
- [ ] Due date hiển thị đúng format
- [ ] Overdue tasks có màu đỏ
- [ ] Progress bar hiển thị đúng (nếu có)
- [ ] Tags hiển thị đúng (nếu có)
- [ ] Comments count hiển thị đúng
- [ ] Attachments count hiển thị đúng

#### Interactions
- [ ] Click vào card mở task detail
- [ ] Edit button hoạt động
- [ ] Delete button hoạt động
- [ ] Hover effects hoạt động
- [ ] Action buttons chỉ hiện khi hover

#### Edge Cases
- [ ] Task không có assignee → hiển thị "Chưa giao"
- [ ] Task không có project → không hiển thị project
- [ ] Task không có due date → không hiển thị due date
- [ ] Task không có description → không hiển thị description section
- [ ] Long title → word break đúng
- [ ] Long description → truncated đúng

### 2. ViewModeSwitcher Component

#### Basic Functionality
- [ ] Component renders với 4 buttons
- [ ] Active view được highlight đúng
- [ ] Click vào button switch view
- [ ] onChange callback được gọi
- [ ] View state được lưu vào localStorage

#### View Switching
- [ ] Switch từ List → Kanban
- [ ] Switch từ Kanban → List
- [ ] Switch từ List → Gantt (placeholder)
- [ ] Switch từ List → Timeline (placeholder)
- [ ] View được restore từ localStorage khi reload

#### Mobile
- [ ] Trên mobile chỉ hiển thị icons
- [ ] Buttons responsive đúng
- [ ] Touch interactions hoạt động

### 3. FilterBar Component

#### Basic Rendering
- [ ] Filter bar renders với tất cả filters
- [ ] Status dropdown có đầy đủ options
- [ ] Priority dropdown có đầy đủ options
- [ ] Assignee dropdown có danh sách users
- [ ] Project dropdown có danh sách projects
- [ ] Search input hiển thị đúng

#### Filter Functionality
- [ ] Filter theo status hoạt động
- [ ] Filter theo priority hoạt động
- [ ] Filter theo assignee hoạt động
- [ ] Filter theo project hoạt động
- [ ] Search filter hoạt động (debounced)
- [ ] Multiple filters combine đúng (AND logic)
- [ ] Clear all filters hoạt động

#### Active Filter Chips
- [ ] Active filters hiển thị dạng chips
- [ ] Click X trên chip remove filter
- [ ] Chips hiển thị đúng label
- [ ] Clear all button hiển thị khi có filters

#### Edge Cases
- [ ] Filter với empty users array
- [ ] Filter với empty projects array
- [ ] Search với special characters
- [ ] Filter với tasks không có data (null/undefined)

### 4. Integration

#### Page Load
- [ ] Page loads không có errors
- [ ] Components initialize đúng
- [ ] Tasks load từ API
- [ ] Users load từ API
- [ ] Projects load từ API
- [ ] Filter bar initialize sau khi users/projects load

#### View Rendering
- [ ] List view renders với TaskCard components
- [ ] Kanban view renders với TaskCard components (compact)
- [ ] Tasks được filter đúng
- [ ] Tasks count update đúng

#### Data Flow
- [ ] Filter changes → applyFilters được gọi
- [ ] applyFilters → filteredTasks update
- [ ] filteredTasks update → renderTasks được gọi
- [ ] renderTasks → TaskCard components render

#### Statistics
- [ ] Total tasks count đúng
- [ ] In progress count đúng
- [ ] Completed count đúng
- [ ] Overdue count đúng

### 5. Responsive Design

#### Desktop (> 1024px)
- [ ] Layout hiển thị đúng
- [ ] Task cards grid 2-3 columns
- [ ] Filter bar horizontal layout
- [ ] View switcher horizontal

#### Tablet (768px - 1024px)
- [ ] Layout responsive
- [ ] Task cards grid 2 columns
- [ ] Filter bar responsive

#### Mobile (< 768px)
- [ ] Layout responsive
- [ ] Task cards 1 column
- [ ] Filter bar vertical stack
- [ ] View switcher icons only
- [ ] Touch interactions hoạt động

### 6. Error Handling

#### API Errors
- [ ] Tasks API error → show error message
- [ ] Users API error → filter bar vẫn hoạt động
- [ ] Projects API error → filter bar vẫn hoạt động

#### Data Errors
- [ ] Invalid task data → không crash
- [ ] Missing fields → hiển thị defaults
- [ ] Null/undefined values → handle gracefully

### 7. Performance

#### Load Time
- [ ] Initial page load < 2s
- [ ] Filter response < 500ms
- [ ] View switch < 300ms

#### Rendering
- [ ] 100 tasks render trong < 1s
- [ ] No lag khi scroll
- [ ] No memory leaks

## Test Scenarios

### Scenario 1: Basic Usage
1. Load page
2. Verify tasks display
3. Switch to Kanban view
4. Switch back to List view
5. Apply status filter
6. Apply priority filter
7. Clear filters
8. Click on task card
9. Verify task detail opens

### Scenario 2: Filter Combinations
1. Filter by status = "In Progress"
2. Add priority filter = "High"
3. Add assignee filter
4. Add search term
5. Verify filtered results
6. Remove filters one by one
7. Verify results update

### Scenario 3: Mobile Experience
1. Resize browser to mobile size
2. Verify layout responsive
3. Test filter bar on mobile
4. Test view switcher on mobile
5. Test task cards on mobile
6. Test touch interactions

### Scenario 4: Edge Cases
1. Load page with no tasks
2. Load page with no users
3. Load page with no projects
4. Filter with no results
5. Task with missing data
6. Very long task title
7. Very long description

## Known Issues to Check

- [ ] Filter bar không initialize nếu users chưa load
- [ ] TaskCard onClick có thể conflict với action buttons
- [ ] View switcher state có thể không sync với currentView
- [ ] Statistics có thể không update khi filter

## Fixes Applied

1. ✅ Filter bar initialize không cần đợi users
2. ✅ TaskCard action buttons sử dụng global handlers
3. ✅ View switching logic improved
4. ✅ Statistics sử dụng normalizeStatus
5. ✅ Filter bar re-render khi users/projects update

