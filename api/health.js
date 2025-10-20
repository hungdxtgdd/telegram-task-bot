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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startTime = Date.now();
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    checks: {}
  };

  try {
    // Check database connection
    const dbStartTime = Date.now();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    healthCheck.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStartTime,
      message: 'Database connection successful'
    };

    // Check API endpoints
    const apiChecks = await checkAPIEndpoints();
    healthCheck.checks.apis = apiChecks;

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthCheck.checks.memory = {
      status: 'healthy',
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
    };

    // Overall response time
    healthCheck.responseTime = Date.now() - startTime;

    // Determine overall status
    const allChecksHealthy = Object.values(healthCheck.checks).every(check => 
      check.status === 'healthy'
    );

    if (!allChecksHealthy) {
      healthCheck.status = 'degraded';
    }

    res.status(200).json(healthCheck);

  } catch (error) {
    console.error('Health check failed:', error);
    
    healthCheck.status = 'unhealthy';
    healthCheck.checks.database = {
      status: 'unhealthy',
      error: error.message,
      message: 'Database connection failed'
    };
    
    healthCheck.responseTime = Date.now() - startTime;
    
    res.status(503).json(healthCheck);
  }
};

async function checkAPIEndpoints() {
  const endpoints = [
    { name: 'auth', url: '/api/auth/login' },
    { name: 'projects', url: '/api/projects-enhanced/projects' },
    { name: 'tasks', url: '/api/tasks-enhanced/tasks' },
    { name: 'okrs', url: '/api/okrs-enhanced/okrs' },
    { name: 'users', url: '/api/users-enhanced' }
  ];

  const results = {};

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await fetch(`https://taskm.creatorui.com${endpoint.url}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token' // This will fail but we just want to check if endpoint exists
        },
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      results[endpoint.name] = {
        status: response.status === 401 ? 'healthy' : 'degraded', // 401 means endpoint exists but needs auth
        responseTime,
        statusCode: response.status,
        message: response.status === 401 ? 'Endpoint accessible (auth required)' : 'Unexpected response'
      };
    } catch (error) {
      results[endpoint.name] = {
        status: 'unhealthy',
        error: error.message,
        message: 'Endpoint not accessible'
      };
    }
  }

  return results;
}
