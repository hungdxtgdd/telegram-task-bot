---
phase: testing
title: Tasks UI Test Plan
description: Comprehensive test plan cho Phase 1 & 2 features
created: 2025-11-05
status: active
---

# Tasks UI Test Plan

## Test Environment Setup

### Prerequisites
- [ ] Server đang chạy
- [ ] Database connection hoạt động
- [ ] API endpoints accessible
- [ ] Browser console mở để xem logs
- [ ] Network tab mở để monitor API calls

### Test Data Requirements
- [ ] Có ít nhất 10 tasks với các status khác nhau
- [ ] Có tasks với các priority khác nhau
- [ ] Có tasks với và không có assignee
- [ ] Có tasks với và không có due date
- [ ] Có tasks với overdue dates
- [ ] Có ít nhất 3 users
- [ ] Có ít nhất 2 projects

## Phase 1: Foundation & Core Components

### 1.1 TaskCard Component

#### Basic Rendering
- [ ] **TC-001**: TaskCard renders với task data
  - Steps: Load page, verify task cards hiển thị
  - Expected: Cards hiển thị với title, status, priority
  
- [ ] **TC-002**: Compact variant hiển thị đúng
  - Steps: Switch to Kanban view
  - Expected: Cards nhỏ hơn, ít thông tin hơn
  
- [ ] **TC-003**: Standard variant hiển thị đúng
  - Steps: Switch to List view
  - Expected: Cards đầy đủ thông tin

#### Task Data Display
- [ ] **TC-004**: Title hiển thị đúng
  - Steps: Check task cards
  - Expected: Task name/title hiển thị rõ ràng
  
- [ ] **TC-005**: Description truncated đúng
  - Steps: Check tasks với long description
  - Expected: Description bị truncate với "..."
  
- [ ] **TC-006**: Priority indicator hiển thị đúng màu
  - Steps: Check tasks với different priorities
  - Expected: High = red, Medium = yellow, Low = green
  
- [ ] **TC-007**: Status badge hiển thị đúng
  - Steps: Check tasks với different statuses
  - Expected: Status badges với đúng màu và text
  
- [ ] **TC-008**: Assignee avatar và name hiển thị
  - Steps: Check tasks với assignee
  - Expected: Avatar với initials và name
  
- [ ] **TC-009**: Project name hiển thị
  - Steps: Check tasks với project
  - Expected: Project icon và name hiển thị
  
- [ ] **TC-010**: Due date hiển thị đúng format
  - Steps: Check tasks với due dates
  - Expected: Date format "DD/MM/YYYY" hoặc relative ("2 ngày nữa")
  
- [ ] **TC-011**: Overdue tasks có màu đỏ
  - Steps: Check tasks với overdue dates
  - Expected: Due date text màu đỏ, có indicator "overdue"

#### Interactions
- [ ] **TC-012**: Click vào card mở task detail
  - Steps: Click vào task card
  - Expected: Task detail drawer/modal mở
  
- [ ] **TC-013**: Edit button hoạt động
  - Steps: Hover card, click edit button
  - Expected: Edit modal mở với task data
  
- [ ] **TC-014**: Delete button hoạt động
  - Steps: Hover card, click delete button
  - Expected: Delete confirmation modal mở
  
- [ ] **TC-015**: Hover effects hoạt động
  - Steps: Hover over task card
  - Expected: Card có shadow, transform effect

#### Edge Cases
- [ ] **TC-016**: Task không có assignee
  - Steps: Check task không có assignee_id
  - Expected: Hiển thị "Chưa giao"
  
- [ ] **TC-017**: Task không có project
  - Steps: Check task không có project_id
  - Expected: Không hiển thị project section
  
- [ ] **TC-018**: Task không có due date
  - Steps: Check task không có deadline
  - Expected: Không hiển thị due date
  
- [ ] **TC-019**: Long title word break
  - Steps: Check task với very long title
  - Expected: Title wrap đúng, không overflow

### 1.2 ViewModeSwitcher Component

#### Basic Functionality
- [ ] **TC-020**: Component renders với 4 buttons
  - Steps: Load page
  - Expected: 4 buttons: List, Kanban, Gantt, Timeline
  
- [ ] **TC-021**: Active view được highlight
  - Steps: Check current view
  - Expected: Active button có background và border
  
- [ ] **TC-022**: Click button switch view
  - Steps: Click "Kanban" button
  - Expected: View switch sang Kanban, button active
  
- [ ] **TC-023**: onChange callback được gọi
  - Steps: Switch views, check console
  - Expected: Callback được gọi với view ID
  
- [ ] **TC-024**: View state được lưu vào localStorage
  - Steps: Switch view, reload page
  - Expected: View được restore từ localStorage

#### View Switching
- [ ] **TC-025**: Switch List → Kanban
  - Steps: Click Kanban button
  - Expected: Kanban board hiển thị, List view ẩn
  
- [ ] **TC-026**: Switch Kanban → List
  - Steps: Click List button
  - Expected: List view hiển thị, Kanban view ẩn
  
- [ ] **TC-027**: Switch to Gantt (placeholder)
  - Steps: Click Gantt button
  - Expected: Gantt placeholder hiển thị (hoặc message)
  
- [ ] **TC-028**: Switch to Timeline (placeholder)
  - Steps: Click Timeline button
  - Expected: Timeline placeholder hiển thị (hoặc message)

#### Mobile
- [ ] **TC-029**: Mobile chỉ hiển thị icons
  - Steps: Resize browser to mobile size
  - Expected: Buttons chỉ hiển thị icons, không có text
  
- [ ] **TC-030**: Touch interactions hoạt động
  - Steps: Tap buttons trên mobile
  - Expected: View switch đúng

### 1.3 FilterBar Component

#### Basic Rendering
- [ ] **TC-031**: Filter bar renders với tất cả filters
  - Steps: Load page
  - Expected: Status, Priority, Assignee, Project, Search hiển thị
  
- [ ] **TC-032**: Status dropdown có đầy đủ options
  - Steps: Click status dropdown
  - Expected: To Do, In Progress, Done, Blocked
  
- [ ] **TC-033**: Priority dropdown có đầy đủ options
  - Steps: Click priority dropdown
  - Expected: High, Medium, Low, Emergency
  
- [ ] **TC-034**: Assignee dropdown có danh sách users
  - Steps: Click assignee dropdown
  - Expected: List users từ API
  
- [ ] **TC-035**: Project dropdown có danh sách projects
  - Steps: Click project dropdown
  - Expected: List projects từ API

#### Filter Functionality
- [ ] **TC-036**: Filter theo status hoạt động
  - Steps: Select "In Progress" status
  - Expected: Chỉ hiển thị tasks với status "In Progress"
  
- [ ] **TC-037**: Filter theo priority hoạt động
  - Steps: Select "High" priority
  - Expected: Chỉ hiển thị tasks với priority "High"
  
- [ ] **TC-038**: Filter theo assignee hoạt động
  - Steps: Select một user
  - Expected: Chỉ hiển thị tasks của user đó
  
- [ ] **TC-039**: Filter theo project hoạt động
  - Steps: Select một project
  - Expected: Chỉ hiển thị tasks của project đó
  
- [ ] **TC-040**: Search filter hoạt động (debounced)
  - Steps: Type vào search box
  - Expected: Filter sau 300ms, search trong title và description
  
- [ ] **TC-041**: Multiple filters combine đúng
  - Steps: Select status + priority + assignee
  - Expected: Tasks match tất cả filters (AND logic)

#### Active Filter Chips
- [ ] **TC-042**: Active filters hiển thị dạng chips
  - Steps: Apply filters
  - Expected: Chips hiển thị với filter labels
  
- [ ] **TC-043**: Click X trên chip remove filter
  - Steps: Click X trên filter chip
  - Expected: Filter removed, tasks update
  
- [ ] **TC-044**: Clear all filters hoạt động
  - Steps: Click "Clear all" button
  - Expected: Tất cả filters cleared, tất cả tasks hiển thị

## Phase 2: Kanban Board

### 2.1 Kanban Board Layout

#### Desktop Layout
- [ ] **TC-045**: 4 columns hiển thị side-by-side
  - Steps: Switch to Kanban view trên desktop
  - Expected: 4 columns: To Do, In Progress, Done, Blocked
  
- [ ] **TC-046**: Column headers với count badges
  - Steps: Check column headers
  - Expected: Title và count badge hiển thị
  
- [ ] **TC-047**: Color-coded columns
  - Steps: Check column backgrounds
  - Expected: To Do = gray, In Progress = blue, Done = green, Blocked = red
  
- [ ] **TC-048**: Tasks group đúng theo status
  - Steps: Check tasks trong columns
  - Expected: Tasks hiển thị trong đúng column theo status

#### Mobile Layout
- [ ] **TC-049**: Tabs hiển thị thay vì columns
  - Steps: Resize to mobile, switch to Kanban
  - Expected: Tabs hiển thị, không có columns
  
- [ ] **TC-050**: Click tab switch column
  - Steps: Click tab
  - Expected: Column tương ứng hiển thị
  
- [ ] **TC-051**: Tab counts update đúng
  - Steps: Apply filters, check tab counts
  - Expected: Counts reflect filtered tasks

### 2.2 Drag & Drop

#### Desktop Drag & Drop
- [ ] **TC-052**: Drag task giữa columns
  - Steps: Drag task từ "To Do" sang "In Progress"
  - Expected: Task moves, status updates
  
- [ ] **TC-053**: Visual feedback khi drag
  - Steps: Start dragging task
  - Expected: Ghost card, column highlights
  
- [ ] **TC-054**: Drop task vào column
  - Steps: Drop task vào column
  - Expected: Task appears trong column mới
  
- [ ] **TC-055**: Auto-save khi drop
  - Steps: Drag task, check network tab
  - Expected: API call PUT /api/tasks-enhanced/tasks/:id với status mới
  
- [ ] **TC-056**: Column counts update sau drag
  - Steps: Drag task, check counts
  - Expected: Counts update đúng
  
- [ ] **TC-057**: Drag trong cùng column (reorder)
  - Steps: Drag task trong cùng column
  - Expected: Task reorder (nếu supported)

#### Error Handling
- [ ] **TC-058**: Revert nếu API fails
  - Steps: Simulate API error, drag task
  - Expected: Task revert về vị trí cũ, error message hiển thị
  
- [ ] **TC-059**: Network error handling
  - Steps: Disconnect network, drag task
  - Expected: Error message, task revert

#### Mobile
- [ ] **TC-060**: Drag & drop không hoạt động trên mobile
  - Steps: Try drag trên mobile
  - Expected: Drag không hoạt động (by design)

### 2.3 Task Cards in Kanban

- [ ] **TC-061**: Compact variant cho Kanban
  - Steps: Check task cards trong Kanban
  - Expected: Cards compact, ít thông tin hơn List view
  
- [ ] **TC-062**: Click card mở detail
  - Steps: Click task card trong Kanban
  - Expected: Task detail drawer mở
  
- [ ] **TC-063**: Edit/Delete buttons hoạt động
  - Steps: Hover card, click buttons
  - Expected: Edit/Delete modals mở

## Integration Tests

### Data Flow
- [ ] **TC-064**: Load tasks từ API
  - Steps: Load page, check network tab
  - Expected: GET /api/tasks-enhanced/tasks called, tasks render
  
- [ ] **TC-065**: Load users từ API
  - Steps: Check filter bar
  - Expected: GET /api/users-enhanced called, users trong dropdown
  
- [ ] **TC-066**: Load projects từ API
  - Steps: Check filter bar
  - Expected: GET /api/projects-enhanced/projects called, projects trong dropdown
  
- [ ] **TC-067**: Filter changes → applyFilters → renderTasks
  - Steps: Apply filter, check console
  - Expected: applyFilters called, filteredTasks update, renderTasks called

### Statistics
- [ ] **TC-068**: Total tasks count đúng
  - Steps: Check stats card
  - Expected: Count matches total tasks
  
- [ ] **TC-069**: In progress count đúng
  - Steps: Check stats card
  - Expected: Count matches tasks với status "In Progress"
  
- [ ] **TC-070**: Completed count đúng
  - Steps: Check stats card
  - Expected: Count matches tasks với status "Done"
  
- [ ] **TC-071**: Overdue count đúng
  - Steps: Check stats card
  - Expected: Count matches tasks với overdue dates

### View Persistence
- [ ] **TC-072**: View mode persists sau reload
  - Steps: Switch view, reload page
  - Expected: View được restore
  
- [ ] **TC-073**: Filters không persist (by design)
  - Steps: Apply filters, reload page
  - Expected: Filters cleared (hoặc persist nếu implemented)

## Performance Tests

- [ ] **TC-074**: Page load < 2s
  - Steps: Load page, measure time
  - Expected: Initial load < 2 seconds
  
- [ ] **TC-075**: Filter response < 500ms
  - Steps: Apply filter, measure time
  - Expected: Filter applied < 500ms
  
- [ ] **TC-076**: View switch < 300ms
  - Steps: Switch views, measure time
  - Expected: View switch < 300ms
  
- [ ] **TC-077**: Drag & drop smooth, no lag
  - Steps: Drag task
  - Expected: Smooth animation, no lag
  
- [ ] **TC-078**: 100+ tasks render trong < 1s
  - Steps: Load page với 100+ tasks
  - Expected: All tasks render < 1 second

## Responsive Design Tests

### Desktop (> 1024px)
- [ ] **TC-079**: Layout hiển thị đúng
  - Steps: Check trên desktop
  - Expected: 2-3 columns cho task cards, 4 columns cho Kanban
  
- [ ] **TC-080**: Filter bar horizontal
  - Steps: Check filter bar
  - Expected: Filters horizontal layout

### Tablet (768px - 1024px)
- [ ] **TC-081**: Layout responsive
  - Steps: Resize to tablet
  - Expected: Layout adjusts, 2 columns cho cards
  
- [ ] **TC-082**: Filter bar responsive
  - Steps: Check filter bar
  - Expected: Filters wrap nếu cần

### Mobile (< 768px)
- [ ] **TC-083**: Task cards 1 column
  - Steps: Resize to mobile
  - Expected: Cards stack vertically
  
- [ ] **TC-084**: Filter bar vertical stack
  - Steps: Check filter bar
  - Expected: Filters stack vertically
  
- [ ] **TC-085**: View switcher icons only
  - Steps: Check view switcher
  - Expected: Only icons, no text
  
- [ ] **TC-086**: Kanban tabs hoạt động
  - Steps: Switch to Kanban
  - Expected: Tabs hiển thị, columns ẩn

## Error Handling Tests

- [ ] **TC-087**: API error → show error message
  - Steps: Simulate API error
  - Expected: Error message hiển thị
  
- [ ] **TC-088**: Network error → show error message
  - Steps: Disconnect network
  - Expected: Error message hiển thị
  
- [ ] **TC-089**: Invalid data → handle gracefully
  - Steps: Load task với invalid data
  - Expected: Default values hiển thị, không crash

## Browser Compatibility

- [ ] **TC-090**: Chrome latest
- [ ] **TC-091**: Firefox latest
- [ ] **TC-092**: Safari latest
- [ ] **TC-093**: Edge latest
- [ ] **TC-094**: Mobile Safari (iOS)
- [ ] **TC-095**: Chrome Mobile (Android)

## Test Results Summary

### Passed: __ / __
### Failed: __ / __
### Blocked: __ / __

## Notes

- Test date: ___________
- Tester: ___________
- Environment: ___________
- Issues found: ___________

