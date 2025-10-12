# Hướng dẫn Bảo mật Dashboard

## Tổng quan
Dashboard hiện tại đã được bảo mật với hệ thống xác thực JWT. Chỉ những người có tài khoản hợp lệ mới có thể truy cập.

## Thông tin đăng nhập mặc định

### Tài khoản Admin
- **Username:** `admin`
- **Password:** `password`

### Tài khoản User
- **Username:** `avakids`
- **Password:** `password`

⚠️ **QUAN TRỌNG:** Hãy đổi mật khẩu ngay sau khi triển khai!

## Cách thay đổi mật khẩu

### 1. Thay đổi trong code (Khuyến nghị cho production)

Mở file `api/auth.js` và thay đổi mật khẩu:

```javascript
// Tạo hash mật khẩu mới
const bcrypt = require('bcryptjs');
const newPassword = 'your-new-password';
const hashedPassword = await bcrypt.hash(newPassword, 10);
console.log(hashedPassword); // Copy kết quả này

// Thay thế trong users array
const users = [
    {
        id: 1,
        username: 'admin',
        password: 'your-new-hashed-password', // Thay thế ở đây
        role: 'admin',
        name: 'Administrator'
    }
];
```

### 2. Thêm tài khoản mới

Thêm user mới vào array `users` trong `api/auth.js`:

```javascript
{
    id: 3,
    username: 'newuser',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
    role: 'user',
    name: 'New User'
}
```

## Cấu hình JWT Secret

### 1. Tạo JWT Secret mạnh

```bash
# Tạo secret ngẫu nhiên
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Cập nhật trong Vercel

1. Vào Vercel Dashboard
2. Chọn project của bạn
3. Vào Settings > Environment Variables
4. Thêm biến `JWT_SECRET` với giá trị vừa tạo

## Bảo mật bổ sung

### 1. HTTPS Only
Dashboard đã được cấu hình để chỉ hoạt động trên HTTPS.

### 2. Token Expiration
JWT token hết hạn sau 24 giờ. User cần đăng nhập lại.

### 3. CORS Protection
API đã được cấu hình CORS để bảo vệ khỏi các request không mong muốn.

## Kiểm tra bảo mật

### 1. Test đăng nhập
```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### 2. Test truy cập không có token
```bash
curl https://your-app.vercel.app/api/tasks
# Sẽ trả về 401 Unauthorized
```

### 3. Test với token hợp lệ
```bash
curl https://your-app.vercel.app/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Lỗi "Token không hợp lệ"
- Kiểm tra JWT_SECRET có đúng không
- Kiểm tra token có hết hạn không
- Kiểm tra format Authorization header

### Lỗi "Tên đăng nhập hoặc mật khẩu không đúng"
- Kiểm tra username/password có đúng không
- Kiểm tra hash password có đúng không

### Dashboard không load được
- Kiểm tra console browser để xem lỗi
- Kiểm tra network tab để xem API calls
- Kiểm tra localStorage có token không

## Nâng cấp bảo mật

### 1. Database Authentication
Thay vì lưu user trong code, nên lưu trong database:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Rate Limiting
Thêm rate limiting cho API login:

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
});
```

### 3. Two-Factor Authentication
Thêm 2FA với Google Authenticator hoặc SMS.

## Liên hệ hỗ trợ

Nếu gặp vấn đề về bảo mật, vui lòng liên hệ:
- Email: support@avakids.com
- Telegram: @avakids_support
