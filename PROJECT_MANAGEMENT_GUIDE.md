# 🚀 Hướng dẫn Quản lý Dự án & OKRs

## 📋 Tổng quan

Hệ thống quản lý dự án và OKRs mới cho phép bạn:
- **Quản lý dự án** theo từng nhóm công việc riêng biệt
- **Theo dõi OKRs** (Objectives and Key Results) cho từng dự án
- **Phân loại tasks** theo dự án và OKR
- **Báo cáo tiến độ** chi tiết theo dự án

## 🗄️ Cấu trúc Database

### 1. **Bảng Projects** (Dự án)
```sql
- id: ID duy nhất
- project_code: Mã dự án (VD: WEB-APP, PROMO)
- project_name: Tên dự án
- description: Mô tả dự án
- status: Trạng thái (active, completed, paused, cancelled)
- start_date, end_date: Thời gian bắt đầu/kết thúc
- created_by: Người tạo
```

### 2. **Bảng OKRs** (Mục tiêu & Kết quả chính)
```sql
- id: ID duy nhất
- project_id: Liên kết với dự án
- objective: Mục tiêu chính
- key_results: Các kết quả chính (JSON)
- target_value: Giá trị mục tiêu
- current_value: Giá trị hiện tại
- unit: Đơn vị đo lường
- quarter, year: Quý và năm
```

### 3. **Bảng Tasks** (Nhiệm vụ - đã cập nhật)
```sql
- task_id: ID nhiệm vụ
- task_name: Tên nhiệm vụ
- assignee: Người phụ trách
- status: Trạng thái
- priority: Độ ưu tiên
- deadline: Hạn chót
- project_id: Liên kết với dự án
- okr_id: Liên kết với OKR
- progress_percentage: % hoàn thành
```

## 🚀 Cài đặt và Triển khai

### 1. **Setup Database Enhanced**
```bash
cd telegram-bot-vercel
npm run setup-enhanced
```

### 2. **Import dữ liệu từ CSV**
```bash
npm run import-csv
```

### 3. **Deploy lên Vercel**
```bash
vercel --prod --force
```

## 📊 Các Dự án Mặc định

Hệ thống tự động tạo các dự án sau:

| Mã Dự án | Tên Dự án | Mô tả |
|----------|-----------|-------|
| **WEB-APP** | Web/App AVAKids mới | Nâng cấp và phát triển hệ thống Web/App mới |
| **PROMO** | Chương trình Ưu Đãi Nội Bộ | Xây dựng và triển khai chương trình ưu đãi cho nhân viên nội bộ |
| **VOUCHER** | Chương trình Săn Voucher | Phát triển hệ thống săn voucher và khuyến mãi |
| **TRACKING** | Hệ thống Tracking và Analytics | Xây dựng hệ thống theo dõi và phân tích dữ liệu |
| **PAYMENT** | Nâng cấp hệ thống thanh toán | Cải thiện và mở rộng các phương thức thanh toán |
| **GAME** | Hệ thống Game và Mini Game | Phát triển các trò chơi và mini game trên nền tảng |
| **EVENT** | Sự kiện và Hội thảo | Tổ chức và quản lý các sự kiện, hội thảo |
| **CAMPAIGN** | Chiến dịch Marketing | Thực hiện các chiến dịch marketing và khuyến mãi |
| **GENERAL** | Dự án Chung | Các dự án và nhiệm vụ chung khác |

## 🎯 Cách sử dụng

### 1. **Truy cập Dashboard**
- URL: `https://your-domain.vercel.app/dashboard`
- Đăng nhập với tài khoản admin/user

### 2. **Quản lý Dự án**
- URL: `https://your-domain.vercel.app/projects`
- **Tạo dự án mới**: Click "Thêm Dự án mới"
- **Xem chi tiết**: Click "Xem" trên dự án
- **Chỉnh sửa**: Click "Sửa" trên dự án

### 3. **Quản lý Tasks**
- URL: `https://your-domain.vercel.app/dashboard`
- Tasks sẽ tự động được phân loại theo dự án
- Có thể lọc theo trạng thái và độ ưu tiên

### 4. **Theo dõi OKRs**
- Trong trang dự án, xem phần OKRs
- Cập nhật tiến độ OKR theo thời gian
- Theo dõi % hoàn thành mục tiêu

## 📈 Báo cáo và Thống kê

### 1. **Dashboard Tổng quan**
- Tổng số dự án
- Số dự án đang hoạt động
- Tổng số OKRs
- Tiến độ trung bình

### 2. **Báo cáo theo Dự án**
- Số lượng tasks trong dự án
- Tasks đã hoàn thành
- Tiến độ % hoàn thành
- OKRs và tiến độ

### 3. **Phân tích OKRs**
- Mục tiêu chính của từng dự án
- Các kết quả chính cần đạt được
- Tiến độ hiện tại vs mục tiêu
- Xu hướng cải thiện

## 🔧 API Endpoints

### **Projects API**
```
GET    /api/projects/projects          # Lấy danh sách dự án
POST   /api/projects/projects          # Tạo dự án mới (Admin)
GET    /api/projects/{id}              # Lấy chi tiết dự án
PUT    /api/projects/{id}              # Cập nhật dự án (Admin)
DELETE /api/projects/{id}              # Xóa dự án (Admin)
GET    /api/projects/okrs?project_id=X # Lấy OKRs của dự án
POST   /api/projects/okrs?project_id=X # Tạo OKR mới (Admin)
```

### **Tasks API** (đã cập nhật)
```
GET    /api/tasks                      # Lấy danh sách tasks
POST   /api/tasks                      # Tạo task mới
PUT    /api/tasks                      # Cập nhật task
DELETE /api/tasks                      # Xóa task
```

## 🎨 Giao diện Người dùng

### 1. **Dashboard Chính**
- Thống kê tổng quan
- Danh sách tasks với bộ lọc
- Quick actions
- Navigation đến các trang quản lý

### 2. **Trang Quản lý Dự án**
- Danh sách dự án với thống kê
- Modal xem chi tiết dự án
- Form tạo/sửa dự án
- Bộ lọc theo trạng thái

### 3. **Trang Quản lý Users** (Admin)
- Danh sách người dùng
- Tạo/sửa/xóa user
- Phân quyền admin/user

## 🔐 Bảo mật

- **JWT Authentication**: Tất cả API đều yêu cầu token
- **Role-based Access**: Admin có quyền tạo/sửa/xóa dự án
- **CORS Protection**: Cấu hình CORS phù hợp
- **Input Validation**: Kiểm tra dữ liệu đầu vào

## 📝 Lưu ý Quan trọng

1. **Backup Database**: Luôn backup trước khi thay đổi cấu trúc
2. **Environment Variables**: Cấu hình đúng DATABASE_URL và JWT_SECRET
3. **User Permissions**: Chỉ admin mới có quyền quản lý dự án
4. **Data Migration**: Sử dụng script import để chuyển dữ liệu từ CSV

## 🆘 Troubleshooting

### **Lỗi thường gặp:**

1. **"DATABASE_URL not found"**
   - Kiểm tra file .env
   - Cấu hình trong Vercel Dashboard

2. **"Permission denied"**
   - Kiểm tra role của user
   - Đăng nhập lại với tài khoản admin

3. **"Project not found"**
   - Kiểm tra project_id
   - Chạy lại script setup-enhanced

4. **"Tasks not loading"**
   - Kiểm tra kết nối database
   - Chạy lại script import-csv

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs trong Vercel Dashboard
2. Chạy `vercel logs` để xem chi tiết
3. Kiểm tra cấu hình environment variables
4. Liên hệ team phát triển

---

**🎉 Chúc bạn sử dụng hệ thống hiệu quả!**

