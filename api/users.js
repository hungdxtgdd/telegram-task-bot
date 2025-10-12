require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { verifyToken } = require('./auth');

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

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện hành động này' });
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

  // Verify authentication for all user operations
  verifyToken(req, res, async () => {
    await handleUserRequest(req, res);
  });
};

async function handleUserRequest(req, res) {
  const { method, url } = req;
  
  try {
    // Parse URL to get endpoint
    const urlParts = url.split('?')[0].split('/');
    const endpoint = urlParts[urlParts.length - 1];
    
    // Handle different endpoints
    if (endpoint === 'users') {
      switch (method) {
        case 'GET':
          await getAllUsers(req, res);
          break;
        case 'POST':
          // Create new user - require admin
          requireAdmin(req, res, () => {
            createUser(req, res);
          });
          break;
        default:
          res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
      }
    } else if (endpoint.match(/^\d+$/)) {
      const userId = parseInt(endpoint);
      switch (method) {
        case 'GET':
          await getUserById(req, res, userId);
          break;
        case 'PUT':
          // Update user - require admin
          requireAdmin(req, res, () => {
            updateUser(req, res, userId);
          });
          break;
        case 'DELETE':
          // Delete user - require admin
          requireAdmin(req, res, () => {
            deleteUser(req, res, userId);
          });
          break;
        default:
          res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
      }
    } else {
      res.status(404).json({ error: 'Endpoint không tìm thấy' });
    }
    
  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
}

// Get all users (admin only)
async function getAllUsers(req, res) {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        username,
        email,
        full_name,
        role,
        is_active,
        last_login,
        created_at,
        updated_at
      FROM users 
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query);
    client.release();
    
    res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách user' });
  }
}

// Get user by ID
async function getUserById(req, res, userId) {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        id,
        username,
        email,
        full_name,
        role,
        is_active,
        last_login,
        created_at,
        updated_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [userId]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }
    
    res.status(200).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin user' });
  }
}

// Create new user
async function createUser(req, res) {
  try {
    const { username, password, email, full_name, role = 'user' } = req.body;
    
    // Validation
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password và full_name là bắt buộc' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role phải là admin hoặc user' });
    }
    
    const client = await pool.connect();
    
    // Check if username already exists
    const checkQuery = 'SELECT id FROM users WHERE username = $1';
    const checkResult = await client.query(checkQuery, [username]);
    
    if (checkResult.rows.length > 0) {
      client.release();
      return res.status(400).json({ error: 'Username đã tồn tại' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert new user
    const insertQuery = `
      INSERT INTO users (username, password_hash, email, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, full_name, role, is_active, created_at
    `;
    
    const result = await client.query(insertQuery, [
      username,
      passwordHash,
      email || null,
      full_name,
      role
    ]);
    
    client.release();
    
    res.status(201).json({
      message: 'Tạo user thành công',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Lỗi khi tạo user' });
  }
}

// Update user
async function updateUser(req, res, userId) {
  try {
    const { username, email, full_name, role, is_active, password } = req.body;
    
    // Validation
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role phải là admin hoặc user' });
    }
    
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    
    const client = await pool.connect();
    
    // Check if user exists
    const checkQuery = 'SELECT id FROM users WHERE id = $1';
    const checkResult = await client.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }
    
    // Check if username already exists (if changing username)
    if (username) {
      const usernameCheckQuery = 'SELECT id FROM users WHERE username = $1 AND id != $2';
      const usernameCheckResult = await client.query(usernameCheckQuery, [username, userId]);
      
      if (usernameCheckResult.rows.length > 0) {
        client.release();
        return res.status(400).json({ error: 'Username đã tồn tại' });
      }
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    if (username) {
      updateFields.push(`username = $${paramCount++}`);
      updateValues.push(username);
    }
    
    if (email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(email);
    }
    
    if (full_name) {
      updateFields.push(`full_name = $${paramCount++}`);
      updateValues.push(full_name);
    }
    
    if (role) {
      updateFields.push(`role = $${paramCount++}`);
      updateValues.push(role);
    }
    
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(is_active);
    }
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateFields.push(`password_hash = $${paramCount++}`);
      updateValues.push(passwordHash);
    }
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({ error: 'Không có trường nào để cập nhật' });
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId);
    
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, full_name, role, is_active, updated_at
    `;
    
    const result = await client.query(updateQuery, updateValues);
    client.release();
    
    res.status(200).json({
      message: 'Cập nhật user thành công',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật user' });
  }
}

// Delete user
async function deleteUser(req, res, userId) {
  try {
    const client = await pool.connect();
    
    // Check if user exists
    const checkQuery = 'SELECT id, username FROM users WHERE id = $1';
    const checkResult = await client.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }
    
    // Prevent deleting own account
    if (parseInt(userId) === req.user.id) {
      client.release();
      return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
    }
    
    // Delete user
    const deleteQuery = 'DELETE FROM users WHERE id = $1';
    await client.query(deleteQuery, [userId]);
    
    client.release();
    
    res.status(200).json({
      message: 'Xóa user thành công',
      deleted_user: checkResult.rows[0].username
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Lỗi khi xóa user' });
  }
}
