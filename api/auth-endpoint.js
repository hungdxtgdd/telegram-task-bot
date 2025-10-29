const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'fa0d6e1cc58fa4031cbdbcd32ee2452f399fbf56235e409b7579ba75690f10d453801853c9796f8cfea508f0c20ed3dd20bd0c02c080c0f871e02d01c1a4a1fd';


const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Auth functions
async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu là bắt buộc' });
    }

    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
      const result = await client.query(query, [username]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
      }
      
      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
      }
      
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          name: user.full_name
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// Cache user info để tránh query database mỗi lần verify
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

async function verify(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check cache first để tránh database query
    const cacheKey = `user_${decoded.id}`;
    const cached = userCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      // Return cached user data - no database query needed
      return res.json({
        valid: true,
        user: cached.user
      });
    }
    
    // Only query database if not in cache
    const client = await pool.connect();
    try {
      const query = 'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [decoded.id]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User không tồn tại hoặc đã bị vô hiệu hóa' });
      }
      
      const user = result.rows[0];
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.full_name,
        role: user.role,
        is_active: user.is_active
      };
      
      // Cache user data for next request
      userCache.set(cacheKey, {
        user: userData,
        timestamp: Date.now()
      });
      
      res.json({
        valid: true,
        user: userData
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cần quyền admin' });
  }
  next();
}

function requireAdminOrManager(req, res, next) {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Cần quyền admin hoặc manager' });
  }
  next();
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
    
    const { method, url } = req;
    
    try {
        // Parse URL to get endpoint
        const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
        const urlParts = cleanUrl.split('?')[0].split('/').filter(part => part !== '');
        console.log('Auth URL parsing:', { url, cleanUrl, urlParts });
        
        // Check if this is a sub-endpoint like /api/auth/login
        let endpoint = '';
        if (urlParts.length >= 3 && urlParts[0] === 'api' && urlParts[1] === 'auth') {
            endpoint = urlParts[2]; // login, verify
        } else if (urlParts.length >= 2 && urlParts[0] === 'api' && urlParts[1] === 'auth') {
            endpoint = 'root'; // /api/auth
        } else {
            endpoint = urlParts[urlParts.length - 1];
        }
        
        console.log('Auth endpoint:', endpoint);
        
        switch (endpoint) {
            case 'login':
                if (method === 'POST') {
                    await login(req, res);
                } else {
                    res.status(405).json({ error: 'Method not allowed' });
                }
                break;
                
            case 'verify':
                if (method === 'POST' || method === 'GET') {
                    await verify(req, res);
                } else {
                    res.status(405).json({ error: 'Method not allowed' });
                }
                break;
                
            default:
                res.status(404).json({ error: 'Endpoint không tìm thấy' });
        }
    } catch (error) {
        console.error('Auth endpoint error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

// Export auth functions for use in other files
module.exports.verifyToken = verifyToken;
module.exports.requireAdmin = requireAdmin;
module.exports.requireAdminOrManager = requireAdminOrManager;