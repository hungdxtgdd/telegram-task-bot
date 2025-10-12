/**
 * ========================================
 * TELEGRAM TASK MANAGER BOT - VERCEL
 * ========================================
 * Version: V2.0.0 - VERCEL OPTIMIZED
 * Author: Jack Ng - Creatorui.com
 * Platform: Vercel + Node.js + PostgreSQL
 * ========================================
 */

const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
require('dotenv').config();

// ========================================
// CONFIGURATION
// ========================================

const config = {
  botToken: process.env.BOT_TOKEN,
  webhookUrl: process.env.WEBHOOK_URL,
  databaseUrl: process.env.DATABASE_URL,
  botUsername: process.env.BOT_USERNAME || '@avakidsbot',
  botLink: process.env.BOT_LINK || 'https://t.me/avakidsbot',
  port: process.env.PORT || 3000
};

// Priority Configuration
const PRIORITY_CONFIG = {
  EMERGENCY: { name: 'Emergency', icon: '🚨', score: 4, color: 'red' },
  HIGH: { name: 'High', icon: '🔴', score: 3, color: 'red' },
  MEDIUM: { name: 'Medium', icon: '🟡', score: 2, color: 'yellow' },
  LOW: { name: 'Low', icon: '🟢', score: 1, color: 'green' }
};

// ========================================
// DATABASE SETUP
// ========================================

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
async function initDatabase() {
  try {
    const client = await pool.connect();
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        name VARCHAR(500) NOT NULL,
        description TEXT,
        assignee VARCHAR(255),
        deadline DATE,
        priority VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
      )
    `);
    
    // Create user_states table for flow management
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_states (
        telegram_id BIGINT PRIMARY KEY,
        state VARCHAR(50),
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    client.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// ========================================
// BOT SETUP
// ========================================

const bot = new TelegramBot(config.botToken, { polling: false });

// ========================================
// UTILITY FUNCTIONS
// ========================================

async function saveUser(telegramUser) {
  try {
    const client = await pool.connect();
    await client.query(`
      INSERT INTO users (telegram_id, username, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telegram_id) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = CURRENT_TIMESTAMP
    `, [
      telegramUser.id,
      telegramUser.username || null,
      telegramUser.first_name || null,
      telegramUser.last_name || null
    ]);
    client.release();
  } catch (error) {
    console.error('❌ Error saving user:', error);
  }
}

async function getUserState(telegramId) {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM user_states WHERE telegram_id = $1',
      [telegramId]
    );
    client.release();
    
    if (result.rows.length === 0) return null;
    
    const state = result.rows[0];
    // Check if state is expired (30 minutes)
    const now = new Date();
    const createdAt = new Date(state.created_at);
    if (now - createdAt > 30 * 60 * 1000) {
      await clearUserState(telegramId);
      return null;
    }
    
    return {
      state: state.state,
      data: state.data || {},
      step: state.data?.step || null,
      priority: state.data?.priority || null
    };
  } catch (error) {
    console.error('❌ Error getting user state:', error);
    return null;
  }
}

async function setUserState(telegramId, state, data) {
  try {
    const client = await pool.connect();
    await client.query(`
      INSERT INTO user_states (telegram_id, state, data)
      VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id)
      DO UPDATE SET 
        state = EXCLUDED.state,
        data = EXCLUDED.data,
        updated_at = CURRENT_TIMESTAMP
    `, [telegramId, state, JSON.stringify(data)]);
    client.release();
  } catch (error) {
    console.error('❌ Error setting user state:', error);
  }
}

async function clearUserState(telegramId) {
  try {
    const client = await pool.connect();
    await client.query('DELETE FROM user_states WHERE telegram_id = $1', [telegramId]);
    client.release();
  } catch (error) {
    console.error('❌ Error clearing user state:', error);
  }
}

async function saveTask(telegramId, taskData) {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO tasks (telegram_id, name, description, assignee, deadline, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      telegramId,
      taskData.name,
      taskData.description || null,
      taskData.assignee,
      taskData.deadline,
      taskData.priority,
      'pending'
    ]);
    client.release();
    return result.rows[0].id;
  } catch (error) {
    console.error('❌ Error saving task:', error);
    return null;
  }
}

// ========================================
// MESSAGE HANDLERS
// ========================================

async function handleMessage(msg) {
  try {
    const chatId = msg.chat.id;
    const text = msg.text;
    const user = msg.from;
    
    console.log(`📥 Message from ${user.first_name}: ${text}`);
    
    // Save user info
    await saveUser(user);
    
    // Check if user is in a flow
    const userState = await getUserState(chatId);
    
    if (userState) {
      await handleUserFlow(chatId, text, user, userState);
      return;
    }
    
    // Handle commands
    if (text.startsWith('/')) {
      await handleCommand(chatId, text, user);
    } else {
      await handleRegularMessage(chatId, text, user);
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
  }
}

async function handleCallbackQuery(callbackQuery) {
  try {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const user = callbackQuery.from;
    
    console.log(`📥 Callback from ${user.first_name}: ${data}`);
    
    // Answer callback query
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Save user info
    await saveUser(user);
    
    // Handle callback data
    await handleCallbackData(chatId, data, user);
  } catch (error) {
    console.error('❌ Error handling callback:', error);
  }
}

// ========================================
// COMMAND HANDLERS
// ========================================

async function handleCommand(chatId, text, user) {
  switch (text) {
    case '/start':
      await handleStartCommand(chatId, user);
      break;
    case '/help':
      await handleHelpCommand(chatId);
      break;
    case '/info':
      await handleVersionCommand(chatId);
      break;
    default:
      await bot.sendMessage(chatId, '❌ Lệnh không được hỗ trợ. Sử dụng /help để xem danh sách lệnh.');
  }
}

async function handleStartCommand(chatId, user) {
  const message = `🤖 *Chào mừng đến với Task Manager Bot!*

Chọn tính năng bạn muốn sử dụng:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📋 Xem Tasks', callback_data: 'view_tasks' },
        { text: '➕ Thêm Task', callback_data: 'add_task' }
      ],
      [
        { text: '📊 Báo cáo', callback_data: 'reports' },
        { text: '📈 Phân tích', callback_data: 'analytics' }
      ],
      [
        { text: '❓ Trợ giúp', callback_data: 'help' },
        { text: 'ℹ️ Thông tin', callback_data: 'info' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function handleHelpCommand(chatId) {
  const message = `📖 *HƯỚNG DẪN SỬ DỤNG*

*Các lệnh chính:*
/start - Bắt đầu sử dụng bot
/help - Hiển thị hướng dẫn này
/info - Thông tin về bot

*Các tính năng:*
• 📋 Xem Tasks - Xem danh sách tasks
• ➕ Thêm Task - Tạo task mới
• 📊 Báo cáo - Xem báo cáo tổng quan
• 📈 Phân tích - Phân tích chi tiết

*Hệ thống ưu tiên:*
🚨 Emergency - Khẩn cấp
🔴 High - Cao
🟡 Medium - Trung bình
🟢 Low - Thấp`;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

async function handleVersionCommand(chatId) {
  const message = `ℹ️ *THÔNG TIN BOT*

*Version:* V2.0.0 - VERCEL OPTIMIZED
*Platform:* Vercel + Node.js + PostgreSQL
*Author:* Jack Ng - Creatorui.com
*Features:* Task Management, Priority System, Analytics

*Bot Link:* ${config.botLink}`;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

async function handleRegularMessage(chatId, text, user) {
  await bot.sendMessage(chatId, 
    `💬 Tôi hiểu bạn đã gửi: "${text}"\n\nSử dụng /help để xem các lệnh có sẵn hoặc bấm /start để xem menu.`
  );
}

// ========================================
// CALLBACK HANDLERS
// ========================================

async function handleCallbackData(chatId, data, user) {
  switch (data) {
    case 'start':
      await handleStartCommand(chatId, user);
      break;
    case 'help':
      await handleHelpCommand(chatId);
      break;
    case 'info':
      await handleVersionCommand(chatId);
      break;
    case 'view_tasks':
      await showViewTasksMenu(chatId);
      break;
    case 'add_task':
      await showAddTaskMenu(chatId);
      break;
    case 'reports':
      await showReportsMenu(chatId);
      break;
    case 'analytics':
      await showAnalyticsMenu(chatId);
      break;
    case 'add_emergency_task':
      await showAddTaskForm(chatId, 'emergency');
      break;
    case 'add_high_task':
      await showAddTaskForm(chatId, 'high');
      break;
    case 'add_medium_task':
      await showAddTaskForm(chatId, 'medium');
      break;
    case 'add_low_task':
      await showAddTaskForm(chatId, 'low');
      break;
    case 'back_to_main':
      await clearUserState(chatId);
      await handleStartCommand(chatId, user);
      break;
    case 'confirm_add_task':
      await confirmAddTask(chatId, user);
      break;
    case 'cancel_add_task':
      await cancelAddTask(chatId, user);
      break;
    default:
      await bot.sendMessage(chatId, '❌ Action không được hỗ trợ.');
  }
}

// ========================================
// MENU FUNCTIONS
// ========================================

async function showViewTasksMenu(chatId) {
  const message = `📋 *XEM TASKS*

Chọn loại tasks bạn muốn xem:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📋 Tất cả Tasks', callback_data: 'view_all_tasks' },
        { text: '👤 Tasks của tôi', callback_data: 'view_my_tasks' }
      ],
      [
        { text: '🚨 Emergency', callback_data: 'view_emergency_tasks' },
        { text: '🔴 High Priority', callback_data: 'view_high_priority_tasks' }
      ],
      [
        { text: '⬅️ BACK', callback_data: 'back_to_main' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function showAddTaskMenu(chatId) {
  const message = `➕ *THÊM TASK MỚI*

Chọn mức độ ưu tiên cho task:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚨 Emergency', callback_data: 'add_emergency_task' },
        { text: '🔴 High', callback_data: 'add_high_task' }
      ],
      [
        { text: '🟡 Medium', callback_data: 'add_medium_task' },
        { text: '🟢 Low', callback_data: 'add_low_task' }
      ],
      [
        { text: '⬅️ BACK', callback_data: 'back_to_main' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function showAddTaskForm(chatId, priority) {
  const priorityInfo = PRIORITY_CONFIG[priority.toUpperCase()];
  
  // Set user state
  await setUserState(chatId, 'adding_task', {
    priority: priority,
    step: 'task_name',
    data: {}
  });
  
  const message = `➕ *THÊM TASK MỚI - ${priorityInfo.icon} ${priorityInfo.name}*

📝 *Bước 1/4: Nhập tên task*

Hãy gửi tên task bạn muốn tạo:

💡 *Ví dụ:* Fix bug login, Update documentation, Create new feature`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔙 Chọn Priority khác', callback_data: 'add_task' }
      ],
      [
        { text: '❌ Hủy', callback_data: 'back_to_main' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function showReportsMenu(chatId) {
  const message = `📊 *BÁO CÁO*

Chọn loại báo cáo bạn muốn xem:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 Tổng quan', callback_data: 'summary_all' },
        { text: '👤 Cá nhân', callback_data: 'summary_my' }
      ],
      [
        { text: '⬅️ BACK', callback_data: 'back_to_main' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function showAnalyticsMenu(chatId) {
  const message = `📈 *PHÂN TÍCH*

Chọn loại phân tích bạn muốn xem:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📈 Tất cả', callback_data: 'analysis_all' },
        { text: '👤 Cá nhân', callback_data: 'analysis_my' }
      ],
      [
        { text: '⬅️ BACK', callback_data: 'back_to_main' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// ========================================
// USER FLOW HANDLERS
// ========================================

async function handleUserFlow(chatId, text, user, userState) {
  console.log(`🔄 Handling user flow for chat: ${chatId}, step: ${userState.step}`);
  
  switch (userState.state) {
    case 'adding_task':
      await handleAddTaskFlow(chatId, text, user, userState);
      break;
    default:
      await handleRegularMessage(chatId, text, user);
  }
}

async function handleAddTaskFlow(chatId, text, user, state) {
  const data = state.data || {};
  
  switch (state.step) {
    case 'task_name':
      data.taskName = text;
      await setUserState(chatId, 'adding_task', {
        priority: state.priority,
        step: 'assignee',
        data: data
      });
      
      const message1 = `📝 *Bước 2/4: Nhập người phụ trách*

Tên task: *${text}*

Hãy nhập tên người phụ trách task này:

💡 *Ví dụ:* Phúc, Giang, Minh, @username`;
      
      await bot.sendMessage(chatId, message1, { parse_mode: 'Markdown' });
      break;
      
    case 'assignee':
      data.assignee = text;
      await setUserState(chatId, 'adding_task', {
        priority: state.priority,
        step: 'deadline',
        data: data
      });
      
      const message2 = `📅 *Bước 3/4: Nhập deadline*

Tên task: *${data.taskName}*
Người phụ trách: *${text}*

Hãy nhập deadline (DD/MM/YYYY):

💡 *Ví dụ:* 20/08/2025, 25/12/2025`;
      
      await bot.sendMessage(chatId, message2, { parse_mode: 'Markdown' });
      break;
      
    case 'deadline':
      data.deadline = text;
      await setUserState(chatId, 'adding_task', {
        priority: state.priority,
        step: 'confirm',
        data: data
      });
      
      const priorityInfo = PRIORITY_CONFIG[state.priority.toUpperCase()];
      
      const message3 = `✅ *Bước 4/4: Xác nhận thông tin*

*Tên task:* ${data.taskName}
*Người phụ trách:* ${data.assignee}
*Deadline:* ${text}
*Mức độ ưu tiên:* ${priorityInfo.icon} ${priorityInfo.name}

Bấm "✅ Xác nhận" để tạo task hoặc "❌ Hủy" để hủy bỏ.`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Xác nhận', callback_data: 'confirm_add_task' },
            { text: '❌ Hủy', callback_data: 'cancel_add_task' }
          ]
        ]
      };
      
      await bot.sendMessage(chatId, message3, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      break;
  }
}

async function confirmAddTask(chatId, user) {
  const userState = await getUserState(chatId);
  
  if (!userState || userState.state !== 'adding_task') {
    await bot.sendMessage(chatId, '❌ Không có task nào để xác nhận.');
    return;
  }
  
  const data = userState.data;
  const priorityInfo = PRIORITY_CONFIG[userState.priority.toUpperCase()];
  
  // Save task to database
  const taskId = await saveTask(chatId, {
    name: data.taskName,
    assignee: data.assignee,
    deadline: data.deadline,
    priority: userState.priority
  });
  
  if (taskId) {
    // Clear user state
    await clearUserState(chatId);
    
    const message = `✅ *Task đã được tạo thành công!*

*ID:* ${taskId}
*Tên:* ${data.taskName}
*Người phụ trách:* ${data.assignee}
*Deadline:* ${data.deadline}
*Mức độ ưu tiên:* ${priorityInfo.icon} ${priorityInfo.name}

Sử dụng /start để xem menu chính.`;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } else {
    await bot.sendMessage(chatId, '❌ Có lỗi xảy ra khi tạo task. Vui lòng thử lại.');
  }
}

async function cancelAddTask(chatId, user) {
  await clearUserState(chatId);
  await bot.sendMessage(chatId, '❌ Đã hủy tạo task. Sử dụng /start để xem menu chính.');
}

// ========================================
// WEBHOOK SETUP
// ========================================

async function setupWebhook() {
  try {
    const webhookUrl = `${config.webhookUrl}/webhook`;
    await bot.setWebHook(webhookUrl);
    console.log(`✅ Webhook set to: ${webhookUrl}`);
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
  }
}

// ========================================
// VERCEL API HANDLER
// ========================================

module.exports = async (req, res) => {
  try {
    // Handle webhook
    if (req.method === 'POST' && req.url === '/webhook') {
      const update = req.body;
      
      if (update.message) {
        await handleMessage(update.message);
      } else if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
      }
      
      res.status(200).json({ ok: true });
      return;
    }
    
    // Handle other requests
    if (req.method === 'GET') {
      res.status(200).json({ 
        message: 'Telegram Task Manager Bot is running!',
        version: '2.0.0',
        platform: 'Vercel + Node.js + PostgreSQL'
      });
      return;
    }
    
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// INITIALIZATION
// ========================================

async function initialize() {
  try {
    console.log('🚀 Initializing Telegram Task Manager Bot...');
    
    // Initialize database
    await initDatabase();
    
    // Setup webhook
    await setupWebhook();
    
    console.log('✅ Bot initialized successfully!');
    console.log(`📱 Bot Link: ${config.botLink}`);
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
}

// Initialize when module loads
if (require.main === module) {
  initialize();
}
