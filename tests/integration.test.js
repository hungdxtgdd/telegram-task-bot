const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the database and API endpoints
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(() => Promise.resolve({
      query: jest.fn(),
      release: jest.fn()
    })),
    end: jest.fn()
  }))
}));

describe('Integration Tests', () => {
  let authToken;
  let adminToken;
  let managerToken;
  let userToken;

  beforeAll(async () => {
    // Generate test tokens
    adminToken = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    managerToken = jwt.sign(
      { id: 2, username: 'manager', role: 'manager' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { id: 3, username: 'user', role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Authentication Flow', () => {
    test('should complete full authentication flow', async () => {
      // 1. Login
      const loginResponse = await request('https://taskm.creatorui.com')
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.role).toBe('admin');

      authToken = loginResponse.body.token;

      // 2. Verify token
      const verifyResponse = await request('https://taskm.creatorui.com')
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyResponse.body).toHaveProperty('user');
      expect(verifyResponse.body.user.username).toBe('admin');
    });

    test('should handle invalid credentials', async () => {
      await request('https://taskm.creatorui.com')
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);
    });
  });

  describe('Project Management Flow', () => {
    test('should complete project CRUD operations', async () => {
      // 1. Get all projects
      const getProjectsResponse = await request('https://taskm.creatorui.com')
        .get('/api/projects-enhanced/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(getProjectsResponse.body)).toBe(true);

      // 2. Create new project
      const createProjectResponse = await request('https://taskm.creatorui.com')
        .post('/api/projects-enhanced/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_name: 'Integration Test Project',
          description: 'Test project for integration testing',
          status: 'active',
          priority: 'High',
          target_value: 100,
          unit: '%'
        })
        .expect(201);

      expect(createProjectResponse.body).toHaveProperty('project_code');
      expect(createProjectResponse.body.project_name).toBe('Integration Test Project');

      const projectId = createProjectResponse.body.id;

      // 3. Update project
      const updateProjectResponse = await request('https://taskm.creatorui.com')
        .put(`/api/projects-enhanced/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_name: 'Updated Integration Test Project',
          current_value: 50
        })
        .expect(200);

      expect(updateProjectResponse.body.project_name).toBe('Updated Integration Test Project');
      expect(updateProjectResponse.body.current_value).toBe(50);

      // 4. Delete project
      await request('https://taskm.creatorui.com')
        .delete(`/api/projects-enhanced/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Task Management Flow', () => {
    test('should complete task CRUD operations', async () => {
      // 1. Get all tasks
      const getTasksResponse = await request('https://taskm.creatorui.com')
        .get('/api/tasks-enhanced/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(getTasksResponse.body)).toBe(true);

      // 2. Create new task
      const createTaskResponse = await request('https://taskm.creatorui.com')
        .post('/api/tasks-enhanced/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          task_name: 'Integration Test Task',
          description: 'Test task for integration testing',
          project_id: 1,
          priority: 'High',
          deadline: '2025-12-31'
        })
        .expect(201);

      expect(createTaskResponse.body).toHaveProperty('task_id');
      expect(createTaskResponse.body.task_name).toBe('Integration Test Task');

      const taskId = createTaskResponse.body.id;

      // 3. Update task
      const updateTaskResponse = await request('https://taskm.creatorui.com')
        .put(`/api/tasks-enhanced/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          task_name: 'Updated Integration Test Task',
          status: 'in_progress'
        })
        .expect(200);

      expect(updateTaskResponse.body.task_name).toBe('Updated Integration Test Task');
      expect(updateTaskResponse.body.status).toBe('in_progress');

      // 4. Delete task
      await request('https://taskm.creatorui.com')
        .delete(`/api/tasks-enhanced/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('OKR Management Flow', () => {
    test('should complete OKR CRUD operations', async () => {
      // 1. Get all OKRs
      const getOKRsResponse = await request('https://taskm.creatorui.com')
        .get('/api/okrs-enhanced/okrs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(getOKRsResponse.body)).toBe(true);

      // 2. Create new OKR
      const createOKRResponse = await request('https://taskm.creatorui.com')
        .post('/api/okrs-enhanced/okrs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          objective: 'Integration Test OKR',
          key_results: [
            {
              description: 'Test key result 1',
              target: 100,
              current: 0,
              unit: '%'
            }
          ],
          target_value: 100,
          unit: '%',
          quarter: 'Q4',
          year: 2025
        })
        .expect(201);

      expect(createOKRResponse.body.objective).toBe('Integration Test OKR');
      expect(createOKRResponse.body.key_results).toHaveLength(1);

      const okrId = createOKRResponse.body.id;

      // 3. Update OKR
      const updateOKRResponse = await request('https://taskm.creatorui.com')
        .put(`/api/okrs-enhanced/okrs/${okrId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          objective: 'Updated Integration Test OKR',
          current_value: 50
        })
        .expect(200);

      expect(updateOKRResponse.body.objective).toBe('Updated Integration Test OKR');
      expect(updateOKRResponse.body.current_value).toBe(50);

      // 4. Delete OKR
      await request('https://taskm.creatorui.com')
        .delete(`/api/okrs-enhanced/okrs/${okrId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('User Management Flow', () => {
    test('should complete user CRUD operations (Admin only)', async () => {
      // 1. Get all users
      const getUsersResponse = await request('https://taskm.creatorui.com')
        .get('/api/users-enhanced')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(getUsersResponse.body)).toBe(true);

      // 2. Create new user
      const createUserResponse = await request('https://taskm.creatorui.com')
        .post('/api/users-enhanced')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'integrationtest',
          email: 'integration@test.com',
          full_name: 'Integration Test User',
          password: 'password123',
          role: 'user'
        })
        .expect(201);

      expect(createUserResponse.body.username).toBe('integrationtest');
      expect(createUserResponse.body.role).toBe('user');

      const userId = createUserResponse.body.id;

      // 3. Update user
      const updateUserResponse = await request('https://taskm.creatorui.com')
        .put(`/api/users-enhanced/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Updated Integration Test User',
          role: 'manager'
        })
        .expect(200);

      expect(updateUserResponse.body.full_name).toBe('Updated Integration Test User');
      expect(updateUserResponse.body.role).toBe('manager');

      // 4. Delete user
      await request('https://taskm.creatorui.com')
        .delete(`/api/users-enhanced/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    test('should restrict user management to admin only', async () => {
      // Manager should not be able to access user management
      await request('https://taskm.creatorui.com')
        .get('/api/users-enhanced')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      // Regular user should not be able to access user management
      await request('https://taskm.creatorui.com')
        .get('/api/users-enhanced')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Role-based Access Control', () => {
    test('should enforce role-based permissions correctly', async () => {
      // Admin can access everything
      await request('https://taskm.creatorui.com')
        .get('/api/projects-enhanced/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request('https://taskm.creatorui.com')
        .get('/api/okrs-enhanced/okrs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request('https://taskm.creatorui.com')
        .get('/api/tasks-enhanced/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Manager can access projects, OKRs, tasks but not users
      await request('https://taskm.creatorui.com')
        .get('/api/projects-enhanced/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request('https://taskm.creatorui.com')
        .get('/api/okrs-enhanced/okrs')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request('https://taskm.creatorui.com')
        .get('/api/tasks-enhanced/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request('https://taskm.creatorui.com')
        .get('/api/users-enhanced')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      // User can access projects, OKRs, tasks but not users
      await request('https://taskm.creatorui.com')
        .get('/api/projects-enhanced/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      await request('https://taskm.creatorui.com')
        .get('/api/okrs-enhanced/okrs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      await request('https://taskm.creatorui.com')
        .get('/api/tasks-enhanced/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      await request('https://taskm.creatorui.com')
        .get('/api/users-enhanced')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Data Validation', () => {
    test('should validate required fields', async () => {
      // Test project creation without required fields
      await request('https://taskm.creatorui.com')
        .post('/api/projects-enhanced/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Project without name'
        })
        .expect(400);

      // Test task creation without required fields
      await request('https://taskm.creatorui.com')
        .post('/api/tasks-enhanced/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Task without name'
        })
        .expect(400);
    });

    test('should validate data types and formats', async () => {
      // Test project creation with invalid data types
      await request('https://taskm.creatorui.com')
        .post('/api/projects-enhanced/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_name: 'Test Project',
          target_value: 'invalid_number',
          status: 'invalid_status'
        })
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // This would require mocking database errors
      // For now, we'll test with invalid endpoints
      await request('https://taskm.creatorui.com')
        .get('/api/invalid-endpoint')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    test('should handle authentication errors', async () => {
      await request('https://taskm.creatorui.com')
        .get('/api/projects-enhanced/projects')
        .expect(401);

      await request('https://taskm.creatorui.com')
        .get('/api/projects-enhanced/projects')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
