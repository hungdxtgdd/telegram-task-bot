---
phase: requirements
title: Tasks UI Enhancement Requirements
description: Yêu cầu cải thiện giao diện quản lý tasks với nhiều view modes, filters, và UX tốt hơn
created: 2025-11-05
status: draft
---

# Tasks UI Enhancement Requirements

## Problem Statement

**Vấn đề hiện tại:**
- Giao diện quản lý tasks hiện tại chưa chuẩn, thiếu nhiều tính năng cần thiết
- Chưa có nhiều cách xem tasks (chỉ có list và kanban cơ bản)
- Thiếu biểu đồ Gantt timeline để xem tiến độ theo thời gian
- Bộ lọc chưa đầy đủ và chưa rõ ràng
- Card task chưa đẹp mắt và thiếu thông tin quan trọng
- Chi tiết task, chỉnh sửa và thêm task chưa rõ ràng, UX chưa tốt

**Mục tiêu:**
- Tạo giao diện quản lý tasks chuyên nghiệp, đẹp mắt, dễ sử dụng
- Hỗ trợ nhiều view modes để phù hợp với nhu cầu khác nhau
- Cải thiện UX cho các thao tác CRUD tasks
- Tăng hiệu quả quản lý và theo dõi công việc

## User Stories

### View Modes
- **As a User**, I want to **xem tasks theo trạng thái** so that **tôi có thể tập trung vào từng giai đoạn công việc**
- **As a User**, I want to **xem tasks dạng danh sách** so that **tôi có thể xem tổng quan tất cả tasks**
- **As a Manager**, I want to **xem tasks trên biểu đồ Gantt timeline** so that **tôi có thể theo dõi tiến độ theo thời gian và phát hiện conflicts**

### Filtering & Search
- **As a User**, I want to **lọc tasks theo nhiều tiêu chí** so that **tôi có thể tìm nhanh tasks cần thiết**
- **As a Manager**, I want to **lọc tasks theo assignee, project, priority, deadline** so that **tôi có thể quản lý workload hiệu quả**

### Task Cards & Details
- **As a User**, I want to **xem task card đẹp mắt với đầy đủ thông tin** so that **tôi hiểu rõ task ngay lập tức**
- **As a User**, I want to **xem chi tiết task rõ ràng** so that **tôi có đủ thông tin để thực hiện task**
- **As a User**, I want to **chỉnh sửa task dễ dàng** so that **tôi có thể cập nhật thông tin nhanh chóng**
- **As a User**, I want to **thêm task với form rõ ràng** so that **tôi có thể tạo task đầy đủ thông tin ngay từ đầu**

## Functional Requirements

### 1. View Modes

#### 1.1 Status View (Kanban Board)
- **Mô tả**: Xem tasks theo trạng thái trong các cột Kanban
- **Các trạng thái**: To Do, In Progress, Done, Blocked
- **Tính năng**:
  - Drag & drop để chuyển task giữa các cột
  - Hiển thị số lượng tasks trong mỗi cột
  - Color-coded columns theo trạng thái
  - Responsive: trên mobile hiển thị dạng tabs thay vì columns
  - Auto-save khi drag & drop

#### 1.2 List View
- **Mô tả**: Xem tasks dạng danh sách với cards
- **Tính năng**:
  - Grid layout responsive (1 cột mobile, 2-3 cột desktop)
  - Sortable columns (theo deadline, priority, status, assignee)
  - Pagination hoặc infinite scroll
  - Compact view và expanded view toggle

#### 1.3 Gantt Timeline View
- **Mô tả**: Biểu đồ Gantt hiển thị tasks theo timeline
- **Tính năng**:
  - Hiển thị tasks trên timeline với start date và due date
  - Group by project hoặc assignee
  - Zoom in/out (day, week, month view)
  - Drag để thay đổi start date và duration
  - Highlight tasks quá hạn (overdue)
  - Visual dependencies giữa tasks
  - Milestone markers

### 2. Filtering System

#### 2.1 Filter Options
- **Status**: To Do, In Progress, Done, Blocked
- **Priority**: High, Medium, Low
- **Assignee**: Filter theo người được giao
- **Project**: Filter theo project
- **OKR**: Filter theo OKR liên quan
- **Due Date**: Today, This Week, This Month, Overdue, No Due Date
- **Created Date**: Filter theo ngày tạo
- **Tags/Labels**: Nếu có hệ thống tags

#### 2.2 Filter UI
- **Filter Bar**: Thanh filter ở trên cùng với quick filters
- **Advanced Filter**: Modal/drawer với tất cả options
- **Active Filters**: Hiển thị chips cho các filter đang active
- **Save Filters**: Lưu filter presets để dùng lại
- **Clear All**: Nút xóa tất cả filters

### 3. Task Card Design

#### 3.1 Card Components
- **Header**:
  - Task title (clickable để xem chi tiết)
  - Priority indicator (color-coded badge)
  - Status badge
  - Quick actions menu (edit, delete, duplicate)
  
- **Body**:
  - Description preview (truncated với "read more")
  - Assignee avatar(s) với tooltip
  - Project/OKR link
  - Due date với visual indicator (overdue = red, upcoming = yellow)
  - Progress bar (nếu có subtasks)
  - Tags/Labels
  
- **Footer**:
  - Comments count
  - Attachments count
  - Created/Updated timestamps
  - Quick status change buttons

#### 3.2 Card Styling
- **Visual Hierarchy**: Rõ ràng, dễ scan
- **Color Coding**: Priority và status có màu sắc nhất quán
- **Hover Effects**: Subtle animations khi hover
- **Responsive**: Card tự điều chỉnh trên mobile
- **Accessibility**: Contrast ratio đạt chuẩn, keyboard navigation

### 4. Task Detail View

#### 4.1 Detail Modal/Drawer
- **Layout**: Slide-in drawer từ bên phải (desktop) hoặc full screen (mobile)
- **Sections**:
  1. **Header**: Title, status, priority với quick edit
  2. **Description**: Rich text editor với markdown support
  3. **Metadata**: 
     - Assignee(s) với avatar
     - Project/OKR links
     - Due date với date picker
     - Created/Updated timestamps
  4. **Subtasks**: Nested tasks list với checkboxes
  5. **Comments**: Thread comments với replies
  6. **Attachments**: File links (Google Docs, Sheets, etc.)
  7. **Activity Log**: Timeline của các thay đổi
  8. **Dependencies**: Related tasks

#### 4.2 Detail Actions
- **Edit**: Inline editing hoặc edit mode
- **Delete**: Với confirmation
- **Duplicate**: Tạo task mới từ task hiện tại
- **Archive**: Ẩn task khỏi active view
- **Share**: Copy link hoặc share với team

### 5. Task Edit Form

#### 5.1 Form Fields
- **Title**: Required, với character counter
- **Description**: Rich text editor
- **Status**: Dropdown với color indicators
- **Priority**: Radio buttons hoặc dropdown
- **Assignee**: Multi-select với user avatars
- **Project**: Dropdown với search
- **OKR**: Dropdown với search
- **Due Date**: Date picker với time
- **Start Date**: Date picker (optional)
- **Tags**: Multi-select với autocomplete
- **Subtasks**: Dynamic list để thêm/xóa subtasks
- **Dependencies**: Select related tasks

#### 5.2 Form UX
- **Validation**: Real-time validation với error messages
- **Auto-save**: Tự động lưu draft khi đang nhập
- **Keyboard Shortcuts**: 
  - `Ctrl/Cmd + S` để save
  - `Esc` để cancel
- **Mobile Optimized**: Form fields dễ nhập trên mobile
- **Loading States**: Skeleton loaders khi đang save

### 6. Add Task Form

#### 6.1 Quick Add
- **Floating Action Button (FAB)**: Nút "+" ở góc dưới bên phải
- **Quick Add Modal**: Modal nhỏ với các fields cơ bản
  - Title (required)
  - Assignee
  - Due date
  - Priority
  - Project
- **Quick Add to Column**: Trong Kanban view, có thể add trực tiếp vào cột

#### 6.2 Full Add Form
- **Modal/Drawer**: Tương tự edit form nhưng với tất cả fields
- **Templates**: Option để tạo từ template
- **Duplicate from**: Option để duplicate từ task khác

## Non-Functional Requirements

### Performance
- **Page Load**: < 2 giây
- **Filter Response**: < 500ms
- **Drag & Drop**: Smooth, no lag
- **Gantt Render**: < 1 giây cho 100 tasks

### Responsive Design
- **Mobile**: Tối ưu cho màn hình nhỏ, touch-friendly
- **Tablet**: Layout tối ưu cho tablet
- **Desktop**: Tận dụng không gian màn hình lớn

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels đầy đủ
- **Color Contrast**: WCAG AA compliant
- **Focus Indicators**: Rõ ràng cho keyboard users

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile

## Success Criteria

### Measurable Outcomes
- [ ] **4 view modes** hoạt động đầy đủ: Status, List, Gantt, Timeline
- [ ] **10+ filter options** với UI rõ ràng
- [ ] **Task cards** hiển thị đầy đủ thông tin, đẹp mắt
- [ ] **Task detail** modal/drawer với tất cả sections
- [ ] **Edit/Add forms** với validation và UX tốt
- [ ] **< 2s** page load time
- [ ] **100%** responsive trên mobile/tablet/desktop

### Acceptance Criteria
- [ ] User có thể chuyển đổi giữa các view modes dễ dàng
- [ ] User có thể filter tasks theo tất cả các tiêu chí
- [ ] User có thể xem chi tiết task đầy đủ
- [ ] User có thể edit task với form rõ ràng
- [ ] User có thể add task nhanh chóng
- [ ] Drag & drop hoạt động smooth trên Kanban
- [ ] Gantt chart hiển thị chính xác timeline
- [ ] Mobile experience tốt, không bị lag

## Open Questions

### Resolved ✅
- [x] Sử dụng Gantt library nào? → D3.js hoặc Frappe Gantt
- [x] Drag & drop library? → HTML5 Drag & Drop API hoặc SortableJS
- [x] Rich text editor? → Quill hoặc TinyMCE

### To Be Resolved
- [ ] Có cần subtasks không? (Nested tasks)
- [ ] Có cần task dependencies không?
- [ ] Có cần time tracking không?
- [ ] Có cần task templates không?
- [ ] Có cần bulk operations không? (Bulk edit, bulk delete)

## Dependencies

### External Libraries
- **Gantt Chart**: Frappe Gantt hoặc D3.js
- **Drag & Drop**: SortableJS hoặc native HTML5
- **Date Picker**: Flatpickr hoặc native
- **Rich Text Editor**: Quill hoặc TinyMCE
- **Icons**: Font Awesome (đã có)

### Internal Dependencies
- **API**: `/api/tasks-enhanced` endpoints
- **Auth**: Authentication system
- **Users API**: Để lấy danh sách users cho assignee
- **Projects API**: Để lấy danh sách projects
- **OKRs API**: Để lấy danh sách OKRs

## References

### Current Implementation
- `pages/tasks-management-new.html`: Current tasks page
- `api/tasks-enhanced.js`: Tasks API endpoints

### Design Inspiration
- Linear.app: Task management với Gantt view
- Asana: Kanban và list views
- Monday.com: Timeline và Gantt charts
- Notion: Rich task cards và detail views





