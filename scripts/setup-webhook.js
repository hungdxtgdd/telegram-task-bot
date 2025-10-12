/**
 * Script để setup webhook cho Telegram bot
 * Chạy: node scripts/setup-webhook.js
 */

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || 'https://your-app.vercel.app/webhook';

async function setupWebhook() {
  try {
    console.log('🔧 Setting up Telegram webhook...');
    console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
    const data = JSON.stringify({
      url: WEBHOOK_URL,
      allowed_updates: ['message', 'callback_query']
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
            console.log('✅ Webhook setup successfully!');
            console.log('📱 Bot is ready to receive messages');
          } else {
            console.error('❌ Webhook setup failed:', result.description);
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
    console.error('❌ Setup error:', error);
  }
}

async function checkWebhook() {
  try {
    console.log('🔍 Checking webhook info...');
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
    
    const req = https.request(url, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.ok) {
            console.log('📡 Webhook Info:');
            console.log(`URL: ${result.result.url}`);
            console.log(`Has custom certificate: ${result.result.has_custom_certificate}`);
            console.log(`Pending updates: ${result.result.pending_update_count}`);
            console.log(`Last error date: ${result.result.last_error_date}`);
            console.log(`Last error message: ${result.result.last_error_message}`);
            console.log(`Max connections: ${result.result.max_connections}`);
            console.log(`Allowed updates: ${JSON.stringify(result.result.allowed_updates)}`);
          } else {
            console.error('❌ Failed to get webhook info:', result.description);
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
    console.error('❌ Check error:', error);
  }
}

// Chạy script
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check') {
    checkWebhook();
  } else {
    setupWebhook();
  }
}

module.exports = { setupWebhook, checkWebhook };
