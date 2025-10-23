# Detail Cards Requirements - Task Management System

## 📋 **Tổng quan**

### **Mục tiêu**
Tạo hệ thống chi tiết cards cho OKRs, Projects, và Tasks với khả năng xem thông tin đầy đủ, relationships, và analytics dựa trên database schema hiện có.

### **Phạm vi**
- **OKRs Detail Cards**: Xem chi tiết OKR với related projects, team members, progress tracking
- **Projects Detail Cards**: Xem chi tiết project với tasks, members, budget, dependencies  
- **Tasks Detail Cards**: Xem chi tiết task với dependencies, time tracking, comments, files

## 🎯 **User Stories**

### **US1: OKR Detail View**
**As a** user/manager/admin  
**I want to** click vào OKR card để xem chi tiết đầy đủ  
**So that** tôi có thể hiểu rõ tiến độ, related projects, và team members

**Acceptance Criteria:**
- Click vào OKR card → Mở modal chi tiết
- Hiển thị thông tin cơ bản: objective, description, status, progress
- Hiển thị key results với progress bars
- Hiển thị related projects (nếu có)
- Hiển thị team members tham gia
- Hiển thị risk indicators nếu có issues
- Có thể edit OKR từ modal

### **US2: Project Detail View**
**As a** user/manager/admin  
**I want to** click vào Project card để xem chi tiết đầy đủ  
**So that** tôi có thể track progress, team members, và related tasks

**Acceptance Criteria:**
- Click vào Project card → Mở modal chi tiết
- Hiển thị project overview: name, description, owner, timeline
- Hiển thị progress tracking từ related tasks
- Hiển thị team members với roles
- Hiển thị related tasks với status
- Hiển thị budget tracking (nếu có)
- Hiển thị dependencies với projects khác
- Hiển thị risk assessment
- Có thể edit project từ modal

### **US3: Task Detail View**
**As a** user/manager/admin  
**I want to** click vào Task card để xem chi tiết đầy đủ  
**So that** tôi có thể track progress, dependencies, và time spent

**Acceptance Criteria:**
- Click vào Task card → Mở modal chi tiết
- Hiển thị task overview: name, description, assignee, deadline
- Hiển thị progress tracking và time tracking
- Hiển thị dependencies (blocking/blocked by)
- Hiển thị comments/notes
- Hiển thị file attachments
- Hiển thị related project/OKR
- Hiển thị activity log
- Có thể edit task từ modal

## 📊 **Database Relationships**

### **OKRs Table**
```sql
- id, objective, description, status, progress
- key_results (JSON), quarter, year
- owner_id → users(id)
- created_at, updated_at
```

### **Projects Table**  
```sql
- id, project_code, project_name, description
- okr_id → okrs(id), created_by → users(id)
- target_value, current_value, unit, budget
- start_date, end_date, status, priority
```

### **Tasks Table**
```sql
- id, task_id, task_name, description
- project_id → projects(id), okr_id → okrs(id)
- assignee_id → users(id), created_by → users(id)
- priority, status, deadline
- estimated_hours, actual_hours, progress_percentage
```

### **Project Members Table**
```sql
- project_id → projects(id), user_id → users(id)
- role (owner, manager, member, viewer)
- joined_at
```

### **Task Dependencies Table**
```sql
- task_id → tasks(task_id)
- depends_on_task_id → tasks(task_id)
- dependency_type (finish_to_start, etc.)
```

## 🎨 **UI/UX Requirements**

### **Design System**
- **Modal Size**: max-w-4xl (responsive)
- **Layout**: Grid system với sections
- **Colors**: Consistent với design system hiện có
- **Typography**: Clear hierarchy
- **Icons**: FontAwesome icons
- **Animations**: Smooth transitions

### **Mobile Responsive**
- **Mobile**: Full screen modal
- **Tablet**: 90% width modal
- **Desktop**: max-w-4xl modal

### **Accessibility**
- **Keyboard Navigation**: Tab, Enter, Escape
- **Screen Reader**: Proper ARIA labels
- **Focus Management**: Focus trap trong modal
- **Color Contrast**: WCAG AA compliant

## 🔧 **Technical Requirements**

### **Frontend**
- **Modal System**: Reusable modal component
- **Data Loading**: Async loading với loading states
- **Error Handling**: Graceful error handling
- **Performance**: Lazy loading cho large datasets

### **Backend**
- **API Endpoints**: 
  - `GET /api/okrs/{id}/detail`
  - `GET /api/projects/{id}/detail`  
  - `GET /api/tasks/{id}/detail`
- **Data Aggregation**: Join queries cho related data
- **Caching**: Redis cache cho frequently accessed data

### **Database Queries**
```sql
-- OKR Detail Query
SELECT o.*, 
       u.name as owner_name,
       COUNT(p.id) as project_count,
       AVG(p.progress) as avg_project_progress
FROM okrs o
LEFT JOIN users u ON o.owner_id = u.id  
LEFT JOIN projects p ON p.okr_id = o.id
WHERE o.id = $1
GROUP BY o.id, u.name;

-- Project Detail Query  
SELECT p.*,
       u.name as created_by_name,
       COUNT(t.id) as task_count,
       COUNT(pm.user_id) as member_count,
       AVG(t.progress_percentage) as avg_task_progress
FROM projects p
LEFT JOIN users u ON p.created_by = u.id
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN project_members pm ON pm.project_id = p.id
WHERE p.id = $1
GROUP BY p.id, u.name;

-- Task Detail Query
SELECT t.*,
       u1.name as assignee_name,
       u2.name as created_by_name,
       p.project_name,
       o.objective as okr_objective
FROM tasks t
LEFT JOIN users u1 ON t.assignee_id = u1.id
LEFT JOIN users u2 ON t.created_by = u2.id  
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN okrs o ON t.okr_id = o.id
WHERE t.id = $1;
```

## 📈 **Analytics & Metrics**

### **OKR Analytics**
- **Progress Tracking**: Overall progress từ related projects
- **Team Performance**: Member contribution metrics
- **Risk Indicators**: Projects/tasks behind schedule
- **Timeline Analysis**: Quarter progress vs target

### **Project Analytics**
- **Task Completion**: % tasks completed
- **Team Productivity**: Member activity metrics
- **Budget Tracking**: Planned vs actual spending
- **Timeline Tracking**: On-time delivery rate

### **Task Analytics**
- **Time Tracking**: Estimated vs actual hours
- **Dependency Analysis**: Blocking tasks identification
- **Assignee Performance**: Individual productivity metrics
- **Priority Distribution**: Task priority analysis

## 🚀 **Implementation Plan**

### **Phase 1: OKR Detail Cards (Week 1)**
- [ ] Create OKR detail modal component
- [ ] Implement basic OKR detail view
- [ ] Add related projects section
- [ ] Add team members section
- [ ] Add risk indicators
- [ ] Test and refine

### **Phase 2: Project Detail Cards (Week 2)**
- [ ] Create Project detail modal component
- [ ] Implement project overview section
- [ ] Add related tasks section
- [ ] Add team members with roles
- [ ] Add budget tracking
- [ ] Add dependencies section
- [ ] Test and refine

### **Phase 3: Task Detail Cards (Week 3)**
- [ ] Create Task detail modal component
- [ ] Implement task overview section
- [ ] Add dependencies section
- [ ] Add time tracking section
- [ ] Add comments/notes section
- [ ] Add file attachments
- [ ] Test and refine

### **Phase 4: Enhanced Features (Week 4)**
- [ ] Add real-time updates
- [ ] Add bulk operations
- [ ] Add export functionality
- [ ] Add advanced analytics
- [ ] Performance optimization
- [ ] Final testing

## ✅ **Success Criteria**

### **Functional Requirements**
- [ ] All cards clickable và hiển thị detail modal
- [ ] Data loading nhanh (< 2 seconds)
- [ ] Mobile responsive
- [ ] Error handling graceful
- [ ] Edit functionality working

### **Performance Requirements**
- [ ] Modal load time < 1 second
- [ ] Database queries optimized
- [ ] Memory usage reasonable
- [ ] No memory leaks

### **User Experience Requirements**
- [ ] Intuitive navigation
- [ ] Clear data presentation
- [ ] Smooth animations
- [ ] Accessible design
- [ ] Consistent with design system

## 🔍 **Testing Strategy**

### **Unit Tests**
- Modal component rendering
- Data loading functions
- Event handlers
- Utility functions

### **Integration Tests**
- API endpoint testing
- Database query testing
- Modal interaction testing
- Cross-browser compatibility

### **User Acceptance Tests**
- User workflow testing
- Mobile device testing
- Performance testing
- Accessibility testing

## 📝 **Documentation Requirements**

### **Technical Documentation**
- API documentation
- Database schema updates
- Component documentation
- Deployment guide

### **User Documentation**
- User guide for detail cards
- Feature overview
- Troubleshooting guide
- FAQ section

## 🎯 **Future Enhancements**

### **Advanced Features**
- **Real-time Collaboration**: Live updates khi có thay đổi
- **Advanced Analytics**: Machine learning insights
- **Custom Dashboards**: User-defined views
- **Integration APIs**: Third-party tool integration
- **Mobile App**: Native mobile application

### **Scalability**
- **Microservices**: Break down into microservices
- **Caching Strategy**: Advanced caching implementation
- **CDN Integration**: Global content delivery
- **Database Optimization**: Query optimization và indexing
