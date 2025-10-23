require('dotenv').config();

// Mock data for testing without database
const mockUsers = [
    {
        id: 1,
        name: 'Administrator',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        name: 'Manager',
        email: 'manager@example.com',
        role: 'manager',
        status: 'active',
        created_at: new Date().toISOString()
    },
    {
        id: 3,
        name: 'User',
        email: 'user@example.com',
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString()
    }
];

const mockProjects = [
    {
        id: 1,
        project_name: 'Web/App AVAKids mới',
        project_code: 'WEB-APP',
        description: 'Phát triển web và app mới cho AVAKids',
        status: 'active',
        priority: 'Medium',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        target_value: 50.00,
        current_value: 100.00,
        unit: 'VND',
        budget: 1000000,
        okr_id: 1,
        task_count: 24,
        completed_tasks: 7,
        member_count: 0,
        deadline: null
    },
    {
        id: 2,
        project_name: 'Test Update Fixed',
        project_code: 'P0002',
        description: 'Test project for updates',
        status: 'active',
        priority: 'Medium',
        start_date: null,
        end_date: null,
        target_value: null,
        current_value: 0.00,
        unit: 'số lượng',
        okr_id: 4,
        task_count: 0,
        completed_tasks: 0,
        member_count: 1,
        deadline: null
    }
];

const mockTasks = [
    {
        id: 1,
        task_name: 'Thiết kế UI/UX',
        description: 'Thiết kế giao diện người dùng cho web và app',
        status: 'in_progress',
        priority: 'High',
        assignee_id: 1,
        assignee_name: 'Administrator',
        project_id: 1,
        project_name: 'Web/App AVAKids mới',
        due_date: '2024-11-30',
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        task_name: 'Phát triển Backend API',
        description: 'Xây dựng API backend cho hệ thống',
        status: 'todo',
        priority: 'High',
        assignee_id: 2,
        assignee_name: 'Manager',
        project_id: 1,
        project_name: 'Web/App AVAKids mới',
        due_date: '2024-12-15',
        created_at: new Date().toISOString()
    }
];

const mockOKRs = [
    {
        id: 1,
        objective: 'Tăng doanh thu',
        quarter: 'Q4 2024',
        status: 'active',
        key_results: [
            {
                id: 1,
                description: 'Giá trị đơn trung bình (AOV)',
                target_value: 800000,
                current_value: 750000,
                unit: 'VND',
                progress: 93.75
            }
        ]
    },
    {
        id: 2,
        objective: 'Tăng tỷ lệ chuyển đổi',
        quarter: 'Q4 2024',
        status: 'active',
        key_results: [
            {
                id: 2,
                description: 'Tỉ lệ chuyển đổi (CR)',
                target_value: 5.0,
                current_value: 3.2,
                unit: '%',
                progress: 64.0
            }
        ]
    }
];

// Simple authentication check
function checkAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    
    const token = authHeader.replace('Bearer ', '');
    // Accept any token that starts with 'mock-'
    return token.startsWith('mock-');
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Check authentication
    if (!checkAuth(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const url = req.url;
    
    try {
        if (url.includes('/users')) {
            return res.status(200).json(mockUsers);
        } else if (url.includes('/projects')) {
            return res.status(200).json(mockProjects);
        } else if (url.includes('/tasks')) {
            return res.status(200).json(mockTasks);
        } else if (url.includes('/okrs')) {
            return res.status(200).json(mockOKRs);
        } else {
            return res.status(404).json({ error: 'Endpoint not found' });
        }
    } catch (error) {
        console.error('Mock API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
