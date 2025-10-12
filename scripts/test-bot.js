/**
 * Script để test bot hoạt động
 * Chạy: node scripts/test-bot.js
 */

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TEST_CHAT_ID = process.env.TEST_CHAT_ID || 'YOUR_CHAT_ID';

async function sendTestMessage() {
  try {
    console.log('🧪 Sending test message...');
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const data = JSON.stringify({
      chat_id: TEST_CHAT_ID,
      text: '🧪 Test message from Vercel bot!\n\nBot is working correctly! ✅',
      parse_mode: 'Markdown'
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.ok) {
            console.log('✅ Test message sent successfully!');
            console.log(`📱 Message ID: ${result.result.message_id}`);
            console.log(`👤 Chat ID: ${result.result.chat.id}`);
          } else {
            console.error('❌ Failed to send message:', result.description);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error);
    });
    
    req.write(data);
    req.end();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function getBotInfo() {
  try {
    console.log('🤖 Getting bot info...');
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;
    
    const req = https.request(url, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.ok) {
            console.log('🤖 Bot Info:');
            console.log(`ID: ${result.result.id}`);
            console.log(`Username: @${result.result.username}`);
            console.log(`First Name: ${result.result.first_name}`);
            console.log(`Can Join Groups: ${result.result.can_join_groups}`);
            console.log(`Can Read All Group Messages: ${result.result.can_read_all_group_messages}`);
            console.log(`Supports Inline Queries: ${result.result.supports_inline_queries}`);
          } else {
            console.error('❌ Failed to get bot info:', result.description);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Bot info error:', error);
  }
}

// Chạy script
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'info') {
    getBotInfo();
  } else {
    sendTestMessage();
  }
}

module.exports = { sendTestMessage, getBotInfo };
