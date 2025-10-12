require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_SHEETS_ID = '1A-8zQoLuuqyH02z4_aenYeJPL1QLDiJhDv44yLMfEu8';
const GOOGLE_SHEETS_GID = '604311506';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Sample data from your Google Sheets (you can expand this)
const sampleTasks = [
  {
    task_id: 'TASK-0013',
    task_name: 'Làm kế hoạch triển khai hệ thông tin sản phẩm core mới',
    assignee: 'Thanh',
    status: 'Done',
    priority: 'Medium',
    deadline: '2025-07-31',
    notes: '31/07/2025 Có bản test - Cập nhật timeline mới nhatthanh26111312@gmail.com'
  },
  {
    task_id: 'TASK-0015',
    task_name: 'Sáp nhập tỉnh thành',
    assignee: 'Phúc',
    status: 'Done',
    priority: 'High',
    deadline: '2025-08-11',
    link_description: 'https://docs.google.com/document/d/1a4SJVftuxnXc8iCtG5UdbYLt8W-YULX3QWTeCLqze_M/edit?tab=t.0#heading=h.xaqs40d8vw18',
    notes: '11/08/2025 golive Web/App theo core mới'
  },
  {
    task_id: 'TASK-0016',
    task_name: '[Phase 1] - Nâng cấp mua kèm',
    assignee: 'Tú',
    status: 'Done',
    priority: 'Medium',
    deadline: '2025-08-11',
    link_description: 'https://docs.google.com/document/u/0/?q=mua%20kèm'
  },
  {
    task_id: 'TASK-0020',
    task_name: 'Web/App AVAKids mới.',
    assignee: 'Giang',
    status: 'Done',
    priority: 'Emergency',
    deadline: '2025-08-30',
    link_description: 'https://docs.google.com/document/d/1RrsAWpPKN3OznBnuBHiGtDVzGgYIvJvb6fLrP5WO2eQ/edit?tab=t.0',
    notes: 'Cập nhật timeline mới giangnguy1310@gmail.com'
  },
  {
    task_id: 'TASK-0021',
    task_name: 'Chương trình Ưu Đãi Nội Bộ.',
    assignee: 'Giang',
    status: 'Pending',
    priority: 'High',
    deadline: '2025-10-15',
    notes: 'Listing timeline: https://docs.google.com/spreadsheets/d/1NxsVpgOlAtZhRkX53n2TJpR4-vBAvtgIcpLwk9f0QQ0/edit?gid=0#gid=0 - 15/09/2025 Golive Check lại quy trình với kinh doanh giangnguy1310@gmail.com'
  }
];

async function importTasks() {
  const client = await pool.connect();
  
  try {
    console.log('📥 Importing tasks from Google Sheets...');
    
    for (const task of sampleTasks) {
      const query = `
        INSERT INTO tasks (task_id, task_name, description, assignee, status, priority, deadline, link_description, notes, chat_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (task_id) DO UPDATE SET
          task_name = EXCLUDED.task_name,
          description = EXCLUDED.description,
          assignee = EXCLUDED.assignee,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          deadline = EXCLUDED.deadline,
          link_description = EXCLUDED.link_description,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `;
      
      await client.query(query, [
        task.task_id,
        task.task_name,
        task.description || null,
        task.assignee,
        task.status,
        task.priority,
        task.deadline,
        task.link_description || null,
        task.notes || null,
        null // chat_id will be set when user creates task via bot
      ]);
      
      console.log(`✅ Imported: ${task.task_id} - ${task.task_name}`);
    }
    
    console.log('🎉 Import completed successfully!');
    console.log(`📊 Total tasks imported: ${sampleTasks.length}`);
    
  } catch (error) {
    console.error('❌ Error importing tasks:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

importTasks();
