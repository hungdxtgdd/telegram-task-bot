# Hướng dẫn Triển khai Dashboard Bảo mật

## Tổng quan
Dashboard hiện tại đã được bảo mật với hệ thống xác thực JWT. Chỉ những người có tài khoản hợp lệ mới có thể truy cập.

## Bước 1: Cài đặt Dependencies

```bash
cd telegram-bot-vercel
npm install
```

## Bước 2: Cấu hình Environment Variables

### Trong Vercel Dashboard:

1. Vào **Settings** > **Environment Variables**
2. Thêm các biến sau:

```
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NODE_ENV=production
```

### Tạo JWT Secret mạnh:

```bash
# Chạy lệnh này để tạo secret ngẫu nhiên
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Bước 3: Cấu hình Mật khẩu

### Thay đổi mật khẩu mặc định:

```bash
# Chạy script tạo hash mật khẩu
npm run generate-password
```

### Cập nhật trong code:

1. Mở file `api/auth.js`
2. Thay thế password hash trong users array:

```javascript
const users = [
    {
        id: 1,
        username: 'admin',
        password: 'your-new-hashed-password', // Thay thế ở đây
        role: 'admin',
        name: 'Administrator'
    },
    {
        id: 2,
        username: 'avakids',
        password: 'your-new-hashed-password', // Thay thế ở đây
        role: 'user',
        name: 'AVAKids Team'
    }
];
```

## Bước 4: Triển khai lên Vercel

```bash
# Deploy lên Vercel
vercel --prod
```

## Bước 5: Kiểm tra Bảo mật

### 1. Truy cập Dashboard:
- Mở trình duyệt và vào URL Vercel của bạn
- Sẽ được chuyển hướng đến trang đăng nhập

### 2. Test đăng nhập:
- **Username:** `admin` hoặc `avakids`
- **Password:** mật khẩu bạn đã đặt

### 3. Test bảo mật:
```bash
# Test API không có token (sẽ trả về 401)
curl https://your-app.vercel.app/api/tasks

# Test API với token hợp lệ
curl https://your-app.vercel.app/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Cấu trúc Bảo mật

### 1. Authentication Flow:
```
User → Login Page → JWT Token → Dashboard → API Calls (with token)
```

### 2. Protected Routes:
- `/` → Redirect to `/login`
- `/dashboard` → Requires authentication
- `/api/tasks` → Requires JWT token
- `/api/auth/*` → Public endpoints

### 3. Security Features:
- ✅ JWT Token Authentication
- ✅ Password Hashing (bcrypt)
- ✅ Token Expiration (24h)
- ✅ CORS Protection
- ✅ HTTPS Only
- ✅ Input Validation

## Thông tin Đăng nhập Mặc định

⚠️ **THAY ĐỔI NGAY SAU KHI TRIỂN KHAI!**

### Tài khoản Admin:
- Username: `admin`
- Password: `password`

### Tài khoản User:
- Username: `avakids`
- Password: `password`

## Troubleshooting

### Lỗi "Token không hợp lệ":
1. Kiểm tra JWT_SECRET có đúng không
2. Kiểm tra token có hết hạn không (24h)
3. Clear localStorage và đăng nhập lại

### Lỗi "Tên đăng nhập hoặc mật khẩu không đúng":
1. Kiểm tra username/password có đúng không
2. Kiểm tra password hash có đúng không
3. Chạy lại script generate-password

### Dashboard không load:
1. Kiểm tra console browser
2. Kiểm tra network tab
3. Kiểm tra localStorage có token không

## Nâng cấp Bảo mật (Tùy chọn)

### 1. Database Authentication:
Thay vì lưu user trong code, lưu trong database:

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

### 2. Rate Limiting:
Thêm rate limiting cho API login.

### 3. Two-Factor Authentication:
Thêm 2FA với Google Authenticator.

## Liên hệ Hỗ trợ

- 📧 Email: support@avakids.com
- 💬 Telegram: @avakids_support
- 📖 Documentation: [SECURITY_GUIDE.md](./SECURITY_GUIDE.md)

---

**Lưu ý:** Hãy đọc kỹ [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) để biết thêm chi tiết về bảo mật!
