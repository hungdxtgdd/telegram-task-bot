---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- **Core Problem**: Cần một hệ thống quản lý dự án và OKRs (Objectives and Key Results) tích hợp với Telegram Bot để quản lý công việc hiệu quả
- **Pain Points**: 
  - Quản lý dự án và tasks rời rạc, không có hệ thống thống nhất
  - Khó theo dõi tiến độ OKRs và mục tiêu dài hạn
  - Thiếu báo cáo và phân tích hiệu suất công việc
  - Cần tích hợp với Telegram để thông báo và cập nhật real-time
- **Current Situation**: Sử dụng Google Apps Script (chậm) và các công cụ rời rạc
- **Target Users**: Quản lý dự án, team leaders, nhân viên cần theo dõi OKRs

## Goals & Objectives
**What do we want to achieve?**

### Primary Goals
- Xây dựng hệ thống quản lý dự án và OKRs hoàn chỉnh
- Tích hợp Telegram Bot để thông báo và cập nhật real-time
- Tạo web dashboard để quản lý và báo cáo
- Hỗ trợ role-based permissions (Admin, Manager, User)

### Secondary Goals
- Tự động hóa việc tạo mã dự án (P0001, P0002...)
- Đồng bộ đơn vị đo lường giữa OKRs và Projects
- Export/Import dữ liệu từ Google Sheets
- Báo cáo tiến độ và analytics

### UI/UX Goals (NEW)
- **Mobile-first design**: Ưu tiên mobile với hamburger menu, swipe gestures
- **Modern UI/UX**: Thiết kế hiện đại như CreatorUI - clean, professional
- **Workflow thông minh**: OKR → Project → Task, tập trung vào Projects & Tasks
- **Real-time collaboration**: Nhiều người dùng cùng lúc, live updates
- **Performance optimized**: Page load < 2s, lazy loading, compression vừa phải
- **User-friendly**: Keyboard shortcuts, global search, breadcrumbs, audit trail

### Non-goals
- Không phải là CRM system
- Không tích hợp với các hệ thống bên ngoài khác ngoài Telegram
- Không hỗ trợ mobile app riêng (chỉ web + Telegram)

## User Stories & Use Cases
**How will users interact with the solution?**

### Admin Users
- As an **Admin**, I want to **quản lý tất cả users, projects, OKRs** so that **tôi có thể kiểm soát toàn bộ hệ thống**
- As an **Admin**, I want to **xem báo cáo tổng quan** so that **tôi có thể đánh giá hiệu suất tổng thể**

### Manager Users  
- As a **Manager**, I want to **tạo và quản lý projects, OKRs** so that **tôi có thể theo dõi tiến độ team**
- As a **Manager**, I want to **assign tasks cho team members** so that **công việc được phân bổ rõ ràng**

### Regular Users
- As a **User**, I want to **xem projects và OKRs** so that **tôi hiểu mục tiêu của team**
- As a **User**, I want to **tạo và quản lý tasks của mình** so that **tôi có thể theo dõi công việc cá nhân**

### UI/UX User Stories (NEW)
- As a **User**, I want to **sử dụng mobile dễ dàng** so that **tôi có thể CRUD tasks mọi lúc mọi nơi**
- As a **User**, I want to **swipe để complete task** so that **tôi có thể cập nhật trạng thái nhanh chóng**
- As a **User**, I want to **xem real-time updates** so that **tôi luôn có thông tin mới nhất khi team làm việc**
- As a **User**, I want to **sử dụng keyboard shortcuts** so that **tôi có thể thao tác nhanh hơn**
- As a **Manager**, I want to **xem dashboard tổng quan** so that **tôi có cái nhìn toàn diện về workload team**
- As a **Manager**, I want to **xem metrics chi tiết** so that **tôi biết ai quá tải, ai ít việc, ai trễ deadline**
- As a **User**, I want to **đính kèm Google Docs/Sheets** so that **tôi có thể chia sẻ tài liệu dễ dàng**
- As a **User**, I want to **ghi chú và comment** so that **tôi có thể thảo luận về tasks**

### Key Workflows
1. **Project Creation**: Admin/Manager tạo project → Tự động tạo mã → Assign OKR → Set đơn vị đo lường
2. **OKR Management**: Tạo OKR → Set target/current values → Link với projects
3. **Task Management**: Tạo task → Assign project/OKR → Set priority/deadline → Track progress
4. **User Management**: Admin tạo users → Set roles → Assign permissions

## Success Criteria
**How will we know when we're done?**

### Measurable Outcomes
- ✅ **100%** projects có mã tự động (P0001, P0002...)
- ✅ **100%** OKRs có đơn vị đo lường đúng và đồng bộ với projects
- ✅ **< 2 giây** response time cho tất cả API calls
- ✅ **3 role levels** hoạt động đúng: Admin, Manager, User
- ✅ **Real-time** notifications qua Telegram Bot

### Acceptance Criteria
- [ ] Admin có thể tạo/sửa/xóa users, projects, OKRs
- [ ] Manager có thể tạo/sửa projects, OKRs, tasks (không xóa users)
- [ ] User có thể xem projects/OKRs, tạo/sửa tasks
- [ ] Đơn vị đo lường tự động sync giữa OKR và Project
- [ ] Telegram Bot hoạt động ổn định với webhook
- [ ] Web dashboard responsive trên mobile/desktop

### UI/UX Acceptance Criteria (NEW)
- [ ] **Mobile-First Design**: Hamburger menu, swipe gestures, pull-to-refresh
- [ ] **Modern UI**: Clean design như CreatorUI, smooth animations vừa phải
- [ ] **Performance**: < 2s page load, lazy loading, compression vừa phải
- [ ] **Real-time Collaboration**: WebSocket cho live updates, nhiều người dùng
- [ ] **User Experience**: Keyboard shortcuts, global search, breadcrumbs
- [ ] **File Integration**: Đính kèm Google Docs/Sheets links
- [ ] **Comments System**: Ghi chú và thảo luận trên tasks
- [ ] **Audit Trail**: Track logs khi edit OKR/Projects/Tasks
- [ ] **Daily Backup**: Tự động backup 12h đêm mỗi ngày
- [ ] **Workload Analytics**: Metrics quá tải, ít việc, trễ deadline

### Detailed UI/UX Requirements by Module (NEW)

#### 👥 Users Management Module
- [ ] **User Cards Layout**: Card-based design thay vì table
- [ ] **Smart Search**: Real-time search với filter chips
- [ ] **User Analytics**: Dashboard với user statistics
- [ ] **Bulk Operations**: Multi-select với bulk actions
- [ ] **Role Visualization**: Color-coded role indicators
- [ ] **Activity Timeline**: User activity history
- [ ] **Mobile Navigation**: Bottom tabs cho mobile
- [ ] **Floating Action Button**: Quick add user

#### 🎯 OKRs Management Module
- [ ] **Progress Rings**: Circular progress indicators
- [ ] **OKR Cards**: Card layout với key results
- [ ] **Quarterly View**: Timeline view cho quarters
- [ ] **Analytics Dashboard**: Performance charts
- [ ] **Key Results Visualization**: Progress bars cho KRs
- [ ] **Project Linking**: Visual connection to projects
- [ ] **Status Indicators**: Color-coded status badges
- [ ] **Mobile Gestures**: Swipe to update progress

#### 📁 Projects Management Module
- [ ] **Kanban Board**: Drag & drop project management
- [ ] **Project Cards**: Rich project cards với progress
- [ ] **Timeline View**: Gantt-style project timeline
- [ ] **Health Metrics**: Project health indicators
- [ ] **Team Assignment**: Visual team member assignment
- [ ] **Budget Tracking**: Visual budget progress
- [ ] **Milestone Tracking**: Project milestone visualization
- [ ] **Mobile Kanban**: Touch-friendly kanban board

#### ✅ Tasks Management Module
- [ ] **Task Kanban**: Multi-column task board
- [ ] **Task Cards**: Rich task cards với metadata
- [ ] **Priority Indicators**: Visual priority system
- [ ] **Assignee Avatars**: User avatar assignments
- [ ] **Deadline Alerts**: Visual deadline warnings
- [ ] **Time Tracking**: Built-in time tracking
- [ ] **Task Dependencies**: Visual dependency lines
- [ ] **Mobile Task View**: Optimized mobile task interface

### Performance Benchmarks
- **API Response Time**: < 2 giây
- **Database Queries**: < 500ms
- **Telegram Bot Response**: < 1 giây
- **Page Load Time**: < 2 giây (mobile-first)
- **Lazy Loading**: Load data khi cần thiết
- **Image Compression**: Vừa phải, không làm bể hình
- **Real-time Updates**: < 1 giây delay

## Constraints & Assumptions
**What limitations do we need to work within?**

### Technical Constraints
- **Platform**: Vercel (Hobby plan - 100 deployments/day limit)
- **Database**: PostgreSQL (Vercel Postgres)
- **Runtime**: Node.js 18+ trên Vercel Edge Functions
- **Storage**: File uploads không được hỗ trợ (chỉ database)

### Business Constraints
- **Budget**: Miễn phí hoàn toàn (Vercel Hobby + PostgreSQL Hobby)
- **Timeline**: Phát triển trong 2-3 tuần
- **Team Size**: 1 developer (Jack)

### Assumptions
- Users có Telegram account và biết sử dụng
- Database connection ổn định từ Vercel
- Không cần backup/restore phức tạp
- Không cần real-time collaboration (multiple users edit cùng lúc)

## Questions & Open Items
**What do we still need to clarify?**

### Resolved ✅
- [x] Cấu trúc database cho projects, OKRs, tasks
- [x] Role-based permissions system
- [x] Telegram Bot integration approach
- [x] Auto-generated project codes

### Open Items
- [x] **Backup Strategy**: Daily backup 12h đêm mỗi ngày ✅
- [x] **Data Migration**: Không cần migrate từ Google Sheets ✅
- [x] **Mobile Optimization**: Mobile-first design, không cần PWA ✅
- [x] **Analytics**: Workload analytics - quá tải, ít việc, trễ deadline ✅
- [x] **File Storage**: Camera integration với lo ngại Vercel storage limits ✅
- [x] **Voice Notes**: Có nếu có thể implement ✅

### Research Needed
- [ ] **Vercel Limits**: Kiểm tra giới hạn của Hobby plan
- [ ] **PostgreSQL Performance**: Test với dữ liệu lớn
- [ ] **Telegram Bot API**: Rate limits và best practices

