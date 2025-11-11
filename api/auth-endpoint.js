const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { createPool } = require('./db-utils');
const { getUserByUsername, getUserById, updateLastLogin } = require('./supabase-client');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'fa0d6e1cc58fa4031cbdbcd32ee2452f399fbf56235e409b7579ba75690f10d453801853c9796f8cfea508f0c20ed3dd20bd0c02c080c0f871e02d01c1a4a1fd';

// Log initialization
console.log('🔍 Initializing auth endpoint...');
console.log('📡 Using Supabase JS client (REST API) to bypass DNS issues');

// Try to initialize direct connection as fallback
let pool = null;
if (DATABASE_URL) {
  try {
    pool = createPool(DATABASE_URL);
    console.log('📡 Direct PostgreSQL connection available as fallback');
  } catch (error) {
    console.warn('⚠️ Direct connection initialization failed, will use Supabase client only:', error.message);
  }
} else {
  console.log('📡 Using Supabase client only (no DATABASE_URL)');
}

// Auth functions
async function login(req, res) {
  try {
    console.log('🔐 Login attempt:', { username: req.body?.username });
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu là bắt buộc' });
    }

    // Try Supabase client first (bypasses DNS issues)
    console.log('📡 Attempting Supabase client query...');
    let user = await getUserByUsername(username);
    
    // Fallback to direct connection if Supabase client fails
    if (!user && pool) {
      console.log('⚠️ Supabase client failed, trying direct connection...');
      try {
        const client = await pool.connect();
        try {
          const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
          const result = await client.query(query, [username]);
          if (result.rows.length > 0) {
            user = result.rows[0];
            console.log('✅ Direct connection successful');
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Direct connection also failed:', error.message);
      }
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    console.log('✅ User found:', user.username);
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    // Update last login (try Supabase client first)
    await updateLastLogin(user.id);
    
    // Generate JWT token
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
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Lỗi server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    // Try Supabase client first
    let user = await getUserById(decoded.id);
    
    // Fallback to direct connection if Supabase client fails
    if (!user && pool) {
      try {
        const client = await pool.connect();
        try {
          const query = 'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1 AND is_active = true';
          const result = await client.query(query, [decoded.id]);
          if (result.rows.length > 0) {
            user = result.rows[0];
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Direct connection failed:', error.message);
      }
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User không tồn tại hoặc đã bị vô hiệu hóa' });
    }
    
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
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Lỗi server',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Export auth functions for use in other files
module.exports.verifyToken = verifyToken;
module.exports.requireAdmin = requireAdmin;
module.exports.requireAdminOrManager = requireAdminOrManager;