const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

require('dotenv').config();

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

const JWT_SECRET = process.env.JWT_SECRET || 'fa0d6e1cc58fa4031cbdbcd32ee2452f399fbf56235e409b7579ba75690f10d453801853c9796f8cfea508f0c20ed3dd20bd0c02c080c0f871e02d01c1a4a1fd';
const JWT_EXPIRES_IN = '24h';

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    
    if (!token) {
        return res.status(401).json({ error: 'Token không được cung cấp' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token không hợp lệ' });
    }
}

// Login endpoint
async function login(req, res) {
    const client = await pool.connect();
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu là bắt buộc' });
        }
        
        // Find user in database
        const query = `
            SELECT id, username, password_hash, full_name, role, is_active, last_login
            FROM users 
            WHERE username = $1
        `;
        
        const result = await client.query(query, [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
        
        const user = result.rows[0];
        
        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
        
        // Update last login
        const updateLoginQuery = 'UPDATE users SET last_login = NOW() WHERE id = $1';
        await client.query(updateLoginQuery, [user.id]);
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                name: user.full_name
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        // Return user info and token
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.full_name,
                role: user.role,
                last_login: user.last_login
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    } finally {
        client.release();
    }
}

// Verify token endpoint
async function verify(req, res) {
    try {
        // If we reach here, token is valid (middleware already verified)
        res.json({
            valid: true,
            user: req.user
        });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

// Logout endpoint
async function logout(req, res) {
    try {
        // In a stateless JWT system, logout is handled client-side
        // You could implement a token blacklist here if needed
        res.json({ message: 'Đăng xuất thành công' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

// Change password endpoint
async function changePassword(req, res) {
    const client = await pool.connect();
    
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }
        
        // Find user in database
        const query = 'SELECT password_hash FROM users WHERE id = $1';
        const result = await client.query(query, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }
        
        const user = result.rows[0];
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
        }
        
        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password in database
        const updateQuery = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
        await client.query(updateQuery, [hashedNewPassword, userId]);
        
        res.json({ message: 'Đổi mật khẩu thành công' });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    } finally {
        client.release();
    }
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện hành động này' });
    }
    next();
}

// Middleware to check if user is admin or manager
function requireAdminOrManager(req, res, next) {
    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Chỉ admin hoặc manager mới có quyền thực hiện hành động này' });
    }
    next();
}

// Middleware to check if user can access resource
function requireResourceAccess(resourceType) {
    return (req, res, next) => {
        const userId = req.user.id;
        const resourceId = req.params.id;
        
        // Admin can access everything
        if (req.user.role === 'admin') {
            return next();
        }
        
        // Check if user has access to the resource
        // This would need to be implemented based on your business logic
        // For now, allow access if user is the owner or member
        next();
    };
}

module.exports = {
    login,
    verify,
    logout,
    changePassword,
    verifyToken,
    requireAdmin,
    requireAdminOrManager,
    requireResourceAccess
};
