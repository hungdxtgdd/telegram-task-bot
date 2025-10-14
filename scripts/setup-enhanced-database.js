#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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

async function setupEnhancedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up enhanced database for project-based task management...');
    
    // 1. Create projects table
    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_code VARCHAR(20) UNIQUE NOT NULL,
        project_name VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
        start_date DATE,
        end_date DATE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createProjectsTable);
    console.log('✅ Projects table created');
    
    // 2. Create OKRs table
    const createOKRsTable = `
      CREATE TABLE IF NOT EXISTS okrs (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        objective TEXT NOT NULL,
        key_results JSONB NOT NULL,
        target_value DECIMAL(10,2),
        current_value DECIMAL(10,2) DEFAULT 0,
        unit VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
        quarter VARCHAR(10),
        year INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createOKRsTable);
    console.log('✅ OKRs table created');
    
    // 3. Update tasks table to include project_id
    const updateTasksTable = `
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id),
      ADD COLUMN IF NOT EXISTS okr_id INTEGER REFERENCES okrs(id),
      ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
    `;
    
    await client.query(updateTasksTable);
    console.log('✅ Tasks table updated with project and OKR references');
    
    // 4. Create project_members table for team assignment
    const createProjectMembersTable = `
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      );
    `;
    
    await client.query(createProjectMembersTable);
    console.log('✅ Project members table created');
    
    // 5. Create task_dependencies table
    const createTaskDependenciesTable = `
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(50) REFERENCES tasks(task_id) ON DELETE CASCADE,
        depends_on_task_id VARCHAR(50) REFERENCES tasks(task_id) ON DELETE CASCADE,
        dependency_type VARCHAR(20) DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(task_id, depends_on_task_id)
      );
    `;
    
    await client.query(createTaskDependenciesTable);
    console.log('✅ Task dependencies table created');
    
    // 6. Create project_okr_updates table for tracking OKR progress
    const createProjectOKRUpdatesTable = `
      CREATE TABLE IF NOT EXISTS project_okr_updates (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER REFERENCES okrs(id) ON DELETE CASCADE,
        current_value DECIMAL(10,2) NOT NULL,
        update_note TEXT,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await client.query(createProjectOKRUpdatesTable);
    console.log('✅ Project OKR updates table created');
    
    // 7. Create indexes for better performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_okr_id ON tasks(okr_id);',
      'CREATE INDEX IF NOT EXISTS idx_okrs_project_id ON okrs(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);',
      'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);'
    ];
    
    for (const indexQuery of createIndexes) {
      await client.query(indexQuery);
    }
    console.log('✅ Database indexes created');
    
    // 8. Insert sample projects based on your data
    const sampleProjects = [
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
      }
    ];
    
    for (const project of sampleProjects) {
      const insertProject = `
        INSERT INTO projects (project_code, project_name, description, status, created_by)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (project_code) DO NOTHING
      `;
      await client.query(insertProject, [project.project_code, project.project_name, project.description, project.status]);
    }
    console.log('✅ Sample projects inserted');
    
    // 9. Insert sample OKRs
    const sampleOKRs = [
      {
        project_id: 1, // WEB-APP
        objective: 'Tăng trải nghiệm người dùng trên Web/App',
        key_results: [
          { description: 'Tăng tỷ lệ chuyển đổi từ 2.5% lên 4%', target: 4.0, current: 2.8 },
          { description: 'Giảm thời gian tải trang xuống dưới 3 giây', target: 3.0, current: 4.2 },
          { description: 'Tăng điểm NPS từ 7.5 lên 8.5', target: 8.5, current: 7.8 }
        ],
        target_value: 100,
        current_value: 75,
        unit: '%',
        quarter: 'Q4',
        year: 2025
      },
      {
        project_id: 2, // PROMO
        objective: 'Tăng doanh thu từ chương trình ưu đãi nội bộ',
        key_results: [
          { description: 'Đạt 500 đơn hàng từ nhân viên nội bộ', target: 500, current: 320 },
          { description: 'Tăng tỷ lệ sử dụng voucher lên 85%', target: 85, current: 72 },
          { description: 'Tạo ra 2M VND doanh thu từ nội bộ', target: 2000000, current: 1200000 }
        ],
        target_value: 100,
        current_value: 68,
        unit: '%',
        quarter: 'Q4',
        year: 2025
      }
    ];
    
    for (const okr of sampleOKRs) {
      const insertOKR = `
        INSERT INTO okrs (project_id, objective, key_results, target_value, current_value, unit, quarter, year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await client.query(insertOKR, [
        okr.project_id,
        okr.objective,
        JSON.stringify(okr.key_results),
        okr.target_value,
        okr.current_value,
        okr.unit,
        okr.quarter,
        okr.year
      ]);
    }
    console.log('✅ Sample OKRs inserted');
    
    console.log('\n🎉 Enhanced database setup completed successfully!');
    console.log('\n📊 Database Structure:');
    console.log('   • projects - Quản lý các dự án');
    console.log('   • okrs - Mục tiêu và kết quả chính của từng dự án');
    console.log('   • tasks - Nhiệm vụ (đã được cập nhật với project_id)');
    console.log('   • project_members - Thành viên của từng dự án');
    console.log('   • task_dependencies - Phụ thuộc giữa các nhiệm vụ');
    console.log('   • project_okr_updates - Lịch sử cập nhật OKR');
    
  } catch (error) {
    console.error('❌ Error setting up enhanced database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupEnhancedDatabase()
  .then(() => {
    console.log('\n✅ Enhanced database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Enhanced database setup failed:', error);
    process.exit(1);
  });
