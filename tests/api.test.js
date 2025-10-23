const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret';

// Mock database connection
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(() => Promise.resolve({
      query: jest.fn(),
      release: jest.fn()
    })),
    end: jest.fn()
  }))
}));

describe('API Tests', () => {
  let mockClient;
  let mockPool;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool = {
      connect: jest.fn(() => Promise.resolve(mockClient)),
      end: jest.fn()
    };
    Pool.mockImplementation(() => mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication API', () => {
    test('should login with valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        full_name: 'Administrator',
        role: 'admin',
        is_active: true
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockUser]
      });

      const req = {
        method: 'POST',
        body: {
          username: 'admin',
          password: 'admin123'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      // Mock bcrypt
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      // Import and test auth endpoint
      const authEndpoint = require('../api/auth-endpoint');
      await authEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({
            id: 1,
            username: 'admin',
            role: 'admin'
          })
        })
      );
    });

    test('should reject invalid credentials', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const req = {
        method: 'POST',
        body: {
          username: 'admin',
          password: 'wrongpassword'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      const authEndpoint = require('../api/auth-endpoint');
      await authEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Tên đăng nhập hoặc mật khẩu không đúng'
      });
    });
  });

  describe('Projects API', () => {
    test('should get all projects', async () => {
      const mockProjects = [
        {
          id: 1,
          project_code: 'P0001',
          project_name: 'Test Project',
          status: 'active',
          created_by: 1
        }
      ];

      mockClient.query.mockResolvedValueOnce({
        rows: mockProjects
      });

      const req = {
        method: 'GET',
        url: '/api/projects-enhanced/projects',
        user: { id: 1, role: 'admin' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      const projectsEndpoint = require('../api/projects-enhanced');
      await projectsEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProjects);
    });

    test('should create project with auto-generated code', async () => {
      const mockProject = {
        id: 1,
        project_code: 'P0001',
        project_name: 'New Project',
        status: 'active',
        created_by: 1
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Count query
        .mockResolvedValueOnce({ rows: [mockProject] }); // Insert query

      const req = {
        method: 'POST',
        url: '/api/projects-enhanced/projects',
        body: {
          project_name: 'New Project',
          description: 'Test project',
          status: 'active',
          priority: 'Medium'
        },
        user: { id: 1, role: 'admin' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      const projectsEndpoint = require('../api/projects-enhanced');
      await projectsEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('Tasks API', () => {
    test('should get all tasks', async () => {
      const mockTasks = [
        {
          id: 1,
          task_id: 'TASK-001',
          task_name: 'Test Task',
          status: 'pending',
          project_id: 1
        }
      ];

      mockClient.query.mockResolvedValueOnce({
        rows: mockTasks
      });

      const req = {
        method: 'GET',
        url: '/api/tasks-enhanced/tasks',
        user: { id: 1, role: 'user' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      const tasksEndpoint = require('../api/tasks-enhanced');
      await tasksEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTasks);
    });

    test('should create task with UUID-like ID', async () => {
      const mockTask = {
        id: 1,
        task_id: 'TASK-1234567890-123',
        task_name: 'New Task',
        status: 'pending',
        project_id: 1,
        created_by: 1
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockTask]
      });

      const req = {
        method: 'POST',
        url: '/api/tasks-enhanced/tasks',
        body: {
          task_name: 'New Task',
          description: 'Test task',
          project_id: 1,
          priority: 'Medium'
        },
        user: { id: 1, role: 'user' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      const tasksEndpoint = require('../api/tasks-enhanced');
      await tasksEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('OKRs API', () => {
    test('should get all OKRs', async () => {
      const mockOKRs = [
        {
          id: 1,
          objective: 'Test Objective',
          target_value: 100,
          current_value: 50,
          status: 'active'
        }
      ];

      mockClient.query.mockResolvedValueOnce({
        rows: mockOKRs
      });

      const req = {
        method: 'GET',
        url: '/api/okrs-enhanced/okrs',
        user: { id: 1, role: 'admin' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      const okrsEndpoint = require('../api/okrs-enhanced');
      await okrsEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockOKRs);
    });
  });

  describe('Users API', () => {
    test('should get all users for admin', async () => {
      const mockUsers = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@test.com',
          full_name: 'Administrator',
          role: 'admin',
          is_active: true
        }
      ];

      mockClient.query.mockResolvedValueOnce({
        rows: mockUsers
      });

      const req = {
        method: 'GET',
        url: '/api/users-enhanced',
        user: { id: 1, role: 'admin' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      const usersEndpoint = require('../api/users-enhanced');
      await usersEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    test('should create user with valid data', async () => {
      const mockUser = {
        id: 2,
        username: 'testuser',
        email: 'test@test.com',
        full_name: 'Test User',
        role: 'user',
        is_active: true
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockUser]
      });

      const req = {
        method: 'POST',
        url: '/api/users-enhanced',
        body: {
          username: 'testuser',
          email: 'test@test.com',
          full_name: 'Test User',
          password: 'password123',
          role: 'user'
        },
        user: { id: 1, role: 'admin' }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };

      const usersEndpoint = require('../api/users-enhanced');
      await usersEndpoint(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Role-based Access Control', () => {
    test('should allow admin to access all endpoints', async () => {
      const adminUser = { id: 1, role: 'admin' };
      
      // Test projects access
      const projectsReq = {
        method: 'GET',
        url: '/api/projects-enhanced/projects',
        user: adminUser
      };
      
      const projectsRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({ rows: [] });
      
      const projectsEndpoint = require('../api/projects-enhanced');
      await projectsEndpoint(projectsReq, projectsRes);

      expect(projectsRes.status).toHaveBeenCalledWith(200);
    });

    test('should restrict user access to certain endpoints', async () => {
      const regularUser = { id: 2, role: 'user' };
      
      // Test users endpoint access (should be restricted)
      const usersReq = {
        method: 'GET',
        url: '/api/users-enhanced',
        user: regularUser
      };
      
      const usersRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const usersEndpoint = require('../api/users-enhanced');
      await usersEndpoint(usersReq, usersRes);

      expect(usersRes.status).toHaveBeenCalledWith(403);
    });
  });
});
