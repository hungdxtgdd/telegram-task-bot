# 🚀 Hướng dẫn Deploy Telegram Bot lên Vercel

## 📋 Bước 1: Chuẩn bị

### 1.1 Tạo Telegram Bot
1. Mở Telegram và tìm [@BotFather](https://t.me/botfather)
2. Gửi `/newbot`
3. Nhập tên bot (ví dụ: "Task Manager Bot")
4. Nhập username bot (ví dụ: "avakidsbot")
5. **Lưu lại BOT TOKEN** (dạng: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 1.2 Tạo GitHub Repository
1. Đăng nhập [GitHub](https://github.com)
2. Tạo repository mới tên `telegram-task-bot`
3. Upload toàn bộ code trong folder `telegram-bot-vercel/` lên GitHub

## 📋 Bước 2: Deploy lên Vercel

### 2.1 Đăng ký Vercel
1. Truy cập [vercel.com](https://vercel.com)
2. Đăng nhập bằng GitHub account
3. Click "New Project"

### 2.2 Import Project
1. Chọn repository `telegram-task-bot` vừa tạo
2. Click "Import"
3. Vercel sẽ tự động detect Node.js project

### 2.3 Cấu hình Environment Variables
Trong Vercel Dashboard, thêm các biến môi trường:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-app.vercel.app/webhook
DATABASE_URL=your_vercel_postgres_url
BOT_USERNAME=@avakidsbot
BOT_LINK=https://t.me/avakidsbot
NODE_ENV=production
```

### 2.4 Deploy
1. Click "Deploy"
2. Chờ 2-3 phút để deploy hoàn tất
3. **Lưu lại URL** của app (dạng: `https://your-app.vercel.app`)

## 📋 Bước 3: Cấu hình Database

### 3.1 Tạo Vercel Postgres
1. Trong Vercel Dashboard, chọn project
2. Vào tab "Storage"
3. Click "Create Database" → "Postgres"
4. Chọn plan "Hobby" (miễn phí)
5. **Lưu lại DATABASE_URL**

### 3.2 Cập nhật Environment Variables
1. Vào tab "Settings" → "Environment Variables"
2. Cập nhật `DATABASE_URL` với URL vừa tạo
3. Cập nhật `TELEGRAM_WEBHOOK_URL` với URL app của bạn

## 📋 Bước 4: Cấu hình Telegram Webhook

### 4.1 Set Webhook
Mở terminal và chạy lệnh:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-app.vercel.app/webhook"}'
```

Thay `<YOUR_BOT_TOKEN>` và `your-app.vercel.app` bằng giá trị thực tế.

### 4.2 Kiểm tra Webhook
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## 📋 Bước 5: Test Bot

### 5.1 Test cơ bản
1. Mở Telegram
2. Tìm bot theo username (ví dụ: @avakidsbot)
3. Gửi `/start`
4. Bot sẽ hiện menu chính

### 5.2 Test thêm task
1. Click "➕ Thêm Task"
2. Chọn priority (ví dụ: High)
3. Nhập tên task
4. Nhập người phụ trách
5. Nhập deadline
6. Xác nhận tạo task

## 🔧 Troubleshooting

### Lỗi thường gặp:

1. **Bot không phản hồi**
   - Kiểm tra webhook URL
   - Kiểm tra BOT_TOKEN
   - Xem logs trong Vercel Dashboard

2. **Database error**
   - Kiểm tra DATABASE_URL
   - Đảm bảo Vercel Postgres đã được tạo

3. **Deploy failed**
   - Kiểm tra package.json
   - Xem logs trong Vercel Dashboard

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra logs trong Vercel Dashboard
2. Kiểm tra webhook info
3. Test từng bước theo hướng dẫn

## 🎉 Hoàn thành!

Sau khi hoàn thành tất cả bước, bạn sẽ có:
- ✅ Telegram bot hoạt động trên Vercel
- ✅ Database PostgreSQL để lưu dữ liệu
- ✅ Bot phản hồi nhanh và ổn định
- ✅ Không tốn phí hosting

**Bot URL**: `https://your-app.vercel.app`
**Bot Telegram**: `@avakidsbot`
