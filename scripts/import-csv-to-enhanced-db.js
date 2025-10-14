#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

// Function to parse CSV content
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

// Function to map CSV data to database structure
function mapTaskData(csvRow, index) {
  // Truncate long task names to fit database constraints
  const taskName = csvRow['Tên công việc'] || '';
  const truncatedTaskName = taskName.length > 500 ? taskName.substring(0, 497) + '...' : taskName;
  
  // Generate short task_id if the original is too long or empty
  let taskId = csvRow.ID || '';
  if (!taskId || taskId.length > 50) {
    taskId = `TASK-${String(index + 1).padStart(4, '0')}`;
  }
  
  // Clean up assignee field (remove extra spaces, handle multiple assignees)
  let assignee = csvRow['Người phụ trách'] || '';
  if (assignee.includes(',')) {
    assignee = assignee.split(',')[0].trim(); // Take first assignee
  }
  
  // Clean up status field
  let status = csvRow['Trạng thái'] || 'Pending';
  if (status === 'In Progress') status = 'In Progress';
  if (status === 'Done') status = 'Done';
  if (status === 'Pending') status = 'Pending';
  
  return {
    task_id: taskId,
    task_name: truncatedTaskName,
    assignee: assignee,
    status: status,
    priority: csvRow['Priority'] || 'Medium',
    deadline: csvRow['Deadline'] || null,
    description: csvRow['Link mô tả'] || '',
    notes: csvRow['Ghi chú'] || '',
    link_description: csvRow['Link mô tả'] || '',
    okr_related: csvRow['OKR liên quan'] || '', // Add OKR related field
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Function to determine project based on task name
function determineProject(taskName) {
  const projectMappings = {
    'Web/App': 'WEB-APP',
    'App': 'WEB-APP',
    'Web': 'WEB-APP',
    'Ưu Đãi': 'PROMO',
    'Voucher': 'VOUCHER',
    'Săn Voucher': 'VOUCHER',
    'Tracking': 'TRACKING',
    'Gom đơn': 'TRACKING',
    'Payment': 'PAYMENT',
    'Thanh toán': 'PAYMENT',
    'PMH': 'PAYMENT',
    'Game': 'GAME',
    'Vòng quay': 'GAME',
    'LDP': 'GAME',
    'Hội thảo': 'EVENT',
    'Campaign': 'CAMPAIGN',
    'Khuyến mãi': 'CAMPAIGN',
    'Flashsale': 'CAMPAIGN'
  };
  
  for (const [keyword, projectCode] of Object.entries(projectMappings)) {
    if (taskName.includes(keyword)) {
      return projectCode;
    }
  }
  
  return 'GENERAL'; // Default project for unmatched tasks
}

async function importCSVToEnhancedDB() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting CSV import to enhanced database...');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '..', '..', 'AVAKids Task_OKR_Tracker - Task Tracker.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found at:', csvPath);
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = parseCSV(csvContent);
    
    console.log(`📊 Found ${csvData.length} tasks in CSV`);
    
    // First, ensure we have the enhanced database structure
    console.log('🔧 Setting up enhanced database structure...');
    
    // Create projects table if not exists
    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_code VARCHAR(20) UNIQUE NOT NULL,
        project_name VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
        start_date DATE,
        end_date DATE,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createProjectsTable);
    console.log('✅ Projects table ready');
    
    // Create enhanced tasks table if not exists
    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        task_id VARCHAR(50) PRIMARY KEY,
        task_name VARCHAR(500) NOT NULL,
        assignee VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending',
        priority VARCHAR(20) DEFAULT 'Medium',
        deadline DATE,
        description TEXT,
        notes TEXT,
        link_description TEXT,
        project_id INTEGER REFERENCES projects(id),
        okr_id INTEGER,
        estimated_hours DECIMAL(5,2),
        actual_hours DECIMAL(5,2),
        progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createTasksTable);
    console.log('✅ Enhanced tasks table ready');
    
    // Insert default projects
    const defaultProjects = [
      {
        project_code: 'WEB-APP',
        project_name: 'Web/App AVAKids mới',
        description: 'Nâng cấp và phát triển hệ thống Web/App mới',
        status: 'active'
      },
      {
        project_code: 'PROMO',
        project_name: 'Chương trình Ưu Đãi Nội Bộ',
        description: 'Xây dựng và triển khai chương trình ưu đãi cho nhân viên nội bộ',
        status: 'active'
      },
      {
        project_code: 'VOUCHER',
        project_name: 'Chương trình Săn Voucher',
        description: 'Phát triển hệ thống săn voucher và khuyến mãi',
        status: 'active'
      },
      {
        project_code: 'TRACKING',
        project_name: 'Hệ thống Tracking và Analytics',
        description: 'Xây dựng hệ thống theo dõi và phân tích dữ liệu',
        status: 'active'
      },
      {
        project_code: 'PAYMENT',
        project_name: 'Nâng cấp hệ thống thanh toán',
        description: 'Cải thiện và mở rộng các phương thức thanh toán',
        status: 'active'
      },
      {
        project_code: 'GAME',
        project_name: 'Hệ thống Game và Mini Game',
        description: 'Phát triển các trò chơi và mini game trên nền tảng',
        status: 'active'
      },
      {
        project_code: 'EVENT',
        project_name: 'Sự kiện và Hội thảo',
        description: 'Tổ chức và quản lý các sự kiện, hội thảo',
        status: 'active'
      },
      {
        project_code: 'CAMPAIGN',
        project_name: 'Chiến dịch Marketing',
        description: 'Thực hiện các chiến dịch marketing và khuyến mãi',
        status: 'active'
      },
      {
        project_code: 'GENERAL',
        project_name: 'Dự án Chung',
        description: 'Các dự án và nhiệm vụ chung khác',
        status: 'active'
      }
    ];
    
    console.log('📁 Inserting default projects...');
    for (const project of defaultProjects) {
      const insertProject = `
        INSERT INTO projects (project_code, project_name, description, status, created_by)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (project_code) DO NOTHING
      `;
      await client.query(insertProject, [project.project_code, project.project_name, project.description, project.status]);
    }
    console.log('✅ Default projects inserted');
    
    // Get project mappings
    const projectQuery = 'SELECT id, project_code FROM projects';
    const projectResult = await client.query(projectQuery);
    const projectMap = {};
    projectResult.rows.forEach(row => {
      projectMap[row.project_code] = row.id;
    });
    
    // Clear existing tasks
    console.log('🗑️ Clearing existing tasks...');
    await client.query('DELETE FROM tasks');
    console.log('✅ Existing tasks cleared');
    
    // Import tasks
    console.log('📥 Importing tasks...');
    let importedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < csvData.length; i++) {
      const csvRow = csvData[i];
      
      // Skip empty rows or rows without task name
      if (!csvRow['Tên công việc'] || csvRow['Tên công việc'].trim() === '') {
        skippedCount++;
        continue;
      }
      
      // Skip rows that are just empty cells
      if (Object.values(csvRow).every(value => !value || value.trim() === '')) {
        skippedCount++;
        continue;
      }
      
      const taskData = mapTaskData(csvRow, i);
      const projectCode = determineProject(taskData.task_name);
      const projectId = projectMap[projectCode] || projectMap['GENERAL'];
      
      // Convert deadline format if exists
      if (taskData.deadline) {
        try {
          const [day, month, year] = taskData.deadline.split('/');
          if (day && month && year) {
            taskData.deadline = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            taskData.deadline = null;
          }
        } catch (error) {
          taskData.deadline = null;
        }
      }
      
      const insertTask = `
        INSERT INTO tasks (
          task_id, task_name, assignee, status, priority, deadline,
          description, notes, link_description, project_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      try {
        await client.query(insertTask, [
          taskData.task_id,
          taskData.task_name,
          taskData.assignee,
          taskData.status,
          taskData.priority,
          taskData.deadline,
          taskData.description,
          taskData.notes,
          taskData.link_description,
          projectId,
          taskData.created_at,
          taskData.updated_at
        ]);
        importedCount++;
      } catch (error) {
        console.error(`❌ Error importing task ${taskData.task_id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 Import completed!`);
    console.log(`✅ Imported: ${importedCount} tasks`);
    console.log(`⏭️ Skipped: ${skippedCount} tasks`);
    
    // Show project distribution
    console.log('\n📊 Project Distribution:');
    const distributionQuery = `
      SELECT p.project_name, COUNT(t.task_id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id, p.project_name
      ORDER BY task_count DESC
    `;
    
    const distributionResult = await client.query(distributionQuery);
    distributionResult.rows.forEach(row => {
      console.log(`   ${row.project_name}: ${row.task_count} tasks`);
    });
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
importCSVToEnhancedDB()
  .then(() => {
    console.log('\n✅ CSV import to enhanced database completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ CSV import failed:', error);
    process.exit(1);
  });
