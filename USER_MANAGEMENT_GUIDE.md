# Hướng dẫn Quản lý User

## Tổng quan
Hệ thống quản lý user đã được tích hợp hoàn toàn với database, cho phép admin tạo, sửa, xóa và quản lý user một cách dễ dàng.

## Tính năng chính

### 🔐 Phân quyền
- **Admin**: Toàn quyền quản lý user và tasks
- **User**: Chỉ có quyền xem và quản lý tasks

### 👥 Quản lý User
- ✅ Tạo user mới
- ✅ Chỉnh sửa thông tin user
- ✅ Xóa user
- ✅ Kích hoạt/vô hiệu hóa user
- ✅ Thay đổi role (admin/user)
- ✅ Xem lịch sử đăng nhập

## Cách sử dụng

### 1. Truy cập trang quản lý user
- Đăng nhập với tài khoản admin
- Click nút "Quản lý User" trên dashboard
- Hoặc truy cập trực tiếp: `https://your-app.vercel.app/users`

### 2. Tạo user mới
1. Click "Thêm User mới"
2. Điền thông tin:
   - **Username**: Tên đăng nhập (bắt buộc)
   - **Họ tên**: Tên hiển thị (bắt buộc)
   - **Email**: Email liên hệ (tùy chọn)
   - **Role**: Admin hoặc User (bắt buộc)
   - **Mật khẩu**: Mật khẩu đăng nhập (bắt buộc)
   - **Tài khoản hoạt động**: Check để kích hoạt
3. Click "Lưu User"

### 3. Chỉnh sửa user
1. Click "Sửa" bên cạnh user cần chỉnh sửa
2. Thay đổi thông tin cần thiết
3. **Lưu ý**: Để trống mật khẩu nếu không muốn thay đổi
4. Click "Lưu User"

### 4. Xóa user
1. Click "Xóa" bên cạnh user cần xóa
2. Xác nhận xóa
3. **Lưu ý**: Không thể xóa tài khoản của chính mình

### 5. Xem chi tiết user
1. Click "Xem" bên cạnh user
2. Xem đầy đủ thông tin user
3. Có thể chỉnh sửa hoặc xóa từ modal này

## Lọc và tìm kiếm

### Lọc theo Role
- **Tất cả Role**: Hiển thị tất cả user
- **Admin**: Chỉ hiển thị admin
- **User**: Chỉ hiển thị user thường

### Lọc theo Trạng thái
- **Tất cả Trạng thái**: Hiển thị tất cả user
- **Hoạt động**: Chỉ hiển thị user đang hoạt động
- **Vô hiệu hóa**: Chỉ hiển thị user bị vô hiệu hóa

## Thống kê

Trang quản lý user hiển thị 3 thống kê chính:
- **Tổng User**: Tổng số user trong hệ thống
- **User Hoạt động**: Số user đang hoạt động
- **Admin**: Số user có quyền admin

## Bảo mật

### Quyền truy cập
- Chỉ admin mới có thể truy cập trang quản lý user
- User thường sẽ bị chuyển hướng về dashboard

### Bảo vệ dữ liệu
- Mật khẩu được hash bằng bcrypt
- Tất cả API calls đều yêu cầu JWT token
- Kiểm tra quyền admin cho mọi thao tác

### Giới hạn
- Không thể xóa tài khoản của chính mình
- Không thể tự hạ cấp quyền admin của mình
- Mật khẩu phải có ít nhất 6 ký tự

## API Endpoints

### GET /api/users/users
Lấy danh sách tất cả user (chỉ admin)

### POST /api/users/users
Tạo user mới (chỉ admin)
```json
{
  "username": "newuser",
  "full_name": "New User",
  "email": "user@example.com",
  "role": "user",
  "password": "password123",
  "is_active": true
}
```

### PUT /api/users/users
Cập nhật user (chỉ admin)
```json
{
  "id": 1,
  "username": "updateduser",
  "full_name": "Updated User",
  "email": "updated@example.com",
  "role": "admin",
  "is_active": true
}
```

### DELETE /api/users/users
Xóa user (chỉ admin)
```json
{
  "id": 1
}
```

## Troubleshooting

### Lỗi "Bạn không có quyền truy cập trang này"
- Kiểm tra tài khoản có phải admin không
- Đăng xuất và đăng nhập lại

### Lỗi "Username đã tồn tại"
- Chọn username khác
- Kiểm tra user đã bị xóa chưa

### Lỗi "Không thể xóa tài khoản của chính mình"
- Đây là tính năng bảo mật
- Cần admin khác xóa hoặc tạo tài khoản mới

### User không thể đăng nhập
- Kiểm tra tài khoản có bị vô hiệu hóa không
- Kiểm tra mật khẩu có đúng không
- Kiểm tra username có đúng không

## Cấu hình Database

### Tạo bảng users
```bash
npm run setup-users
```

### Cấu trúc bảng
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Liên hệ hỗ trợ

- 📧 Email: support@avakids.com
- 💬 Telegram: @avakids_support
- 📖 Documentation: [SECURITY_GUIDE.md](./SECURITY_GUIDE.md)

---

**Lưu ý**: Hãy thường xuyên kiểm tra và cập nhật thông tin user để đảm bảo bảo mật!

