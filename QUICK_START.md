# 🚀 QUICK START - Telegram Bot Vercel

## ⚡ Deploy trong 5 phút!

### 1️⃣ Tạo Telegram Bot
```
1. Mở Telegram → Tìm @BotFather
2. Gửi /newbot
3. Nhập tên: "Task Manager Bot"
4. Nhập username: "avakidsbot"
5. Lưu BOT TOKEN: 8376207780:AAFFCquazFpo7WCKAv_iM4G5o-5W_-IXXZU
```

### 2️⃣ Deploy lên Vercel
```
1. Truy cập vercel.com
2. Đăng nhập bằng GitHub
3. Click "New Project"
4. Import repository này
5. Click "Deploy"
```

### 3️⃣ Cấu hình Environment Variables
Trong Vercel Dashboard → Settings → Environment Variables:

```env
TELEGRAM_BOT_TOKEN=8376207780:AAFFCquazFpo7WCKAv_iM4G5o-5W_-IXXZU
TELEGRAM_WEBHOOK_URL=https://your-app.vercel.app/webhook
DATABASE_URL=your_vercel_postgres_url
BOT_USERNAME=@avakidsbot
BOT_LINK=https://t.me/avakidsbot
NODE_ENV=production
```

### 4️⃣ Tạo Database
```
1. Vercel Dashboard → Storage
2. Create Database → Postgres
3. Chọn Hobby (miễn phí)
4. Copy DATABASE_URL
```

### 5️⃣ Set Webhook
```bash
# Thay YOUR_BOT_TOKEN và your-app.vercel.app
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-app.vercel.app/webhook"}'
```

### 6️⃣ Test Bot
```
1. Mở Telegram
2. Tìm @avakidsbot
3. Gửi /start
4. Click "➕ Thêm Task"
5. Chọn priority → Nhập task → Hoàn thành!
```

## 🎯 Kết quả

- ✅ **Bot hoạt động** trên Vercel
- ✅ **Database** PostgreSQL
- ✅ **Phản hồi nhanh** < 100ms
- ✅ **Miễn phí** hoàn toàn
- ✅ **Tự động scale**

## 🔧 Scripts hữu ích

```bash
# Setup webhook
npm run setup-webhook

# Kiểm tra webhook
npm run check-webhook

# Test bot
npm run test-bot

# Xem bot info
npm run bot-info
```

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra logs trong Vercel Dashboard
2. Kiểm tra webhook info
3. Xem file `deploy.md` để hướng dẫn chi tiết

## 🎉 Hoàn thành!

Bot của bạn giờ sẽ:
- ⚡ **Nhanh hơn** Google Apps Script 10x
- 🔄 **Ổn định** hơn với Vercel
- 💾 **Lưu dữ liệu** trong PostgreSQL
- 🆓 **Miễn phí** hoàn toàn

**Chúc mừng! Bot đã sẵn sàng! 🚀**
