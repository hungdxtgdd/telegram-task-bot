require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

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

// Full data from your Google Sheets (TASK-0013 to TASK-0113)
const fullTasksData = [
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
  },
  {
    task_id: 'TASK-0022',
    task_name: 'Proposal Chương trình Săn Voucher',
    assignee: 'Luân, Như',
    status: 'Done',
    priority: 'Emergency',
    deadline: '2025-08-26',
    link_description: 'https://docs.google.com/spreadsheets/d/1LrKhcHJiuCJd4sEPTE9JRkkcqYixaNx7o3tnwBzPmek/edit?usp=sharing',
    notes: 'Proposeal Initial deadline: 21/07, Update deadline: 24/07 06/08 13/8 rehearsal'
  },
  {
    task_id: 'TASK-0019',
    task_name: 'Chương trình bán hàng cận date',
    assignee: 'Phúc',
    status: 'Pending',
    priority: 'Low',
    deadline: '2025-09-15'
  },
  {
    task_id: 'TASK-0023',
    task_name: 'Recommend Web/App.',
    assignee: 'Tú',
    status: 'Done',
    priority: 'Medium',
    deadline: '2025-08-15',
    link_description: 'https://www.figma.com/proto/MXWl373fNr9c8Qd1HlIHFg/Gợi-ý-sản-phẩm-|-Personalize?page-id=0%3A1&node-id=37-3&p=f&viewport=28%2C399%2C0.23&t=NFwuw1XtAcxxqIIl-1&scaling=min-zoom&content-scaling=fixed',
    notes: '24/07/2025 Golive ngữ cảnh gợi ý cho bạn link test data : https://docs.google.com/spreadsheets/d/1_A4W38aLwkhMzlFlbdhbbMQIdDGkp1IadB3hKLGQ2N8/edit?gid=1670124162#gid=1670124162'
  },
  {
    task_id: 'TASK-0024',
    task_name: 'Khuyến mãi khu vực và nền tảng Web/App.',
    assignee: 'Phúc',
    status: 'Done',
    priority: 'Emergency',
    deadline: '2025-09-29',
    link_description: 'https://docs.google.com/document/d/1S3jUpFlakgYTdcA5Bpki3hoCEoNOPjEGZ16huKJZJzI/edit?tab=t.0',
    notes: '29/09/2025 Golive'
  },
  {
    task_id: 'TASK-0025',
    task_name: 'Nâng cấp chính sách giao khu vực Hà Nội.',
    assignee: 'Phúc',
    status: 'Done',
    priority: 'High',
    deadline: '2025-07-18',
    notes: 'Golived'
  },
  {
    task_id: 'TASK-0026',
    task_name: 'Gom đơn',
    assignee: 'Phúc',
    status: 'In Progress',
    priority: 'Emergency',
    deadline: '2025-10-07',
    link_description: 'https://docs.google.com/document/d/1xEKaEvBqvKaDE_hINjdBJdtr87ku0HPOjzElJYgJBNQ/edit?tab=t.0#heading=h.lkkb7mrn62o'
  },
  {
    task_id: 'TASK-0027',
    task_name: '[Phase 1] - Quy hoạch tracking',
    assignee: 'Tú, Thanh',
    status: 'Done',
    priority: 'Low',
    deadline: '2025-07-31',
    link_description: 'https://docs.google.com/spreadsheets/d/1Q8C79CyeuEEMvY4sIhsLH15o74XSOhTfF1Rmkxv_A3Q/edit?gid=77716891#gid=77716891',
    notes: 'Đã gửi mô tả cho IT, timline golive vào 11/8'
  },
  {
    task_id: 'TASK-0028',
    task_name: '[Phase 2] - Nâng cấp mua kèm.',
    assignee: 'Tú',
    status: 'In Progress',
    priority: 'High',
    deadline: '2025-10-15',
    notes: 'Cập nhật ngữ cảnh mua kèm ở ô sản phẩm & Flashsale 30/09'
  },
  {
    task_id: 'TASK-0110',
    task_name: 'Điều chỉnh chính sách App/Web AVAKids',
    assignee: 'Phúc',
    status: 'In Progress',
    priority: 'High',
    deadline: '2025-10-15'
  },
  {
    task_id: 'TASK-0111',
    task_name: 'Điều chỉnh rule Popup',
    assignee: 'Giang',
    status: 'In Progress',
    priority: 'Medium',
    deadline: '2025-10-15'
  },
  {
    task_id: 'TASK-0112',
    task_name: 'Bổ sung sắp xếp nổi bật trang cate',
    assignee: 'Tú',
    status: 'In Progress',
    priority: 'Low',
    deadline: '2025-10-30',
    link_description: 'https://docs.google.com/document/d/1F_P-LgipclNDxCskt2tBu3MMygwm-K_1E8AJaaZkJfg/edit?tab=t.16m1d5p3ptbd#heading=h.yzhkz9yqostb'
  },
  {
    task_id: 'TASK-0113',
    task_name: 'Update trạng thái sản phẩm trên PIM',
    assignee: 'Thanh',
    status: 'In Progress',
    priority: 'Medium',
    deadline: '2025-10-30',
    link_description: 'https://docs.google.com/document/d/1pehjz4PV9jjaH3xm8I493zuA9OtuBlCqTX-rdV6R7_U/edit?tab=t.0'
  }
];

async function importAllTasks() {
  const client = await pool.connect();
  
  try {
    console.log('📥 Importing all tasks from Google Sheets...');
    console.log(`📊 Total tasks to import: ${fullTasksData.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const task of fullTasksData) {
      try {
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
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error importing ${task.task_id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Import completed!');
    console.log(`✅ Successfully imported: ${successCount} tasks`);
    console.log(`❌ Failed to import: ${errorCount} tasks`);
    console.log(`📊 Total processed: ${fullTasksData.length} tasks`);
    
  } catch (error) {
    console.error('❌ Error during import:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

importAllTasks();
