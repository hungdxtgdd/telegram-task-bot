require('dotenv').config();
const bcrypt = require('bcryptjs');
const { verifyToken } = require('./auth');
const { createPool } = require('./db-utils');
const {
  getAllUsers: supabaseGetAllUsers,
  getUserById: supabaseGetUserById,
  createUser: supabaseCreateUser,
  updateUser: supabaseUpdateUser,
  deleteUser: supabaseDeleteUser,
  checkUsernameExists
} = require('./supabase-client');

const DATABASE_URL = process.env.DATABASE_URL;

// Create pool only if DATABASE_URL is available (optional for Supabase client usage)
let pool = null;
if (DATABASE_URL) {
  try {
    pool = createPool(DATABASE_URL);
    console.log('📡 Direct PostgreSQL connection available as fallback');
  } catch (error) {
    console.warn('⚠️ Direct connection initialization failed:', error.message);
  }
} else {
  console.log('📡 Using Supabase client only (no DATABASE_URL) - some endpoints may not work');
}

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

  const { method, url } = req;
  
  try {
    // Parse URL to get endpoint
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const urlParts = cleanUrl.split('?')[0].split('/').filter(part => part !== '');
    console.log('Users URL parsing:', { url, cleanUrl, urlParts });
    
    // Check if this is a sub-endpoint like /api/users-enhanced/123
    let userId = null;
    let endpoint = '';
    
    // More flexible URL parsing
    if (urlParts.length >= 2) {
      if (urlParts[0] === 'api' && urlParts[1] === 'users-enhanced') {
        if (urlParts.length >= 3 && !isNaN(urlParts[2])) {
          userId = urlParts[2]; // /api/users-enhanced/123
          endpoint = 'user';
        } else if (urlParts.length >= 3) {
          endpoint = urlParts[2]; // /api/users-enhanced/something
        } else {
          endpoint = 'list'; // /api/users-enhanced
        }
      } else if (urlParts.length >= 3 && urlParts[1] === 'users-enhanced' && !isNaN(urlParts[2])) {
        // Handle case where api is missing from urlParts
        userId = urlParts[2];
        endpoint = 'user';
      } else {
        endpoint = 'list';
      }
    } else {
      endpoint = 'list';
    }
    
    console.log('Users endpoint:', { endpoint, userId });

    // Verify authentication for all user operations
  verifyToken(req, res, async () => {
    console.log('Calling handleUserRequest with:', { endpoint, userId, method: req.method });
    await handleUserRequest(req, res, endpoint, userId);
  });
  } catch (error) {
    console.error('Error in users-enhanced API:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

async function handleUserRequest(req, res, endpoint, userId) {
  // Use Supabase client (no need for pool check)
  console.log('✅ Users endpoint: Using Supabase client');

  const { method } = req;
  
  console.log('handleUserRequest called with:', { endpoint, userId, method });
  
  try {
    // Handle different endpoints
    if (endpoint === 'list') {
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
    } else if (endpoint === 'user' && userId) {
      const userIdInt = parseInt(userId);
      switch (method) {
        case 'GET':
          await getUserById(req, res, userIdInt);
          break;
        case 'PUT':
          // Update user - require admin
          requireAdmin(req, res, () => {
            updateUser(req, res, userIdInt);
          });
          break;
        case 'DELETE':
          // Delete user - require admin
          requireAdmin(req, res, () => {
            deleteUser(req, res, userIdInt);
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
    const simple = req.query.simple === 'true';
    
    let users = await supabaseGetAllUsers(simple);
    
    if (!users) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          let query;
          if (simple) {
            query = `
              SELECT id, username, full_name, email
              FROM users 
              WHERE is_active = true
              ORDER BY full_name ASC
            `;
          } else {
            query = `
              SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at
              FROM users 
              ORDER BY created_at DESC
            `;
          }
          const result = await client.query(query);
          users = result.rows;
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi lấy danh sách user' });
      }
    }
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách user' });
  }
}

// Get user by ID
async function getUserById(req, res, userId) {
  try {
    let user = await supabaseGetUserById(userId);
    
    if (!user) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const query = `
            SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at
            FROM users 
            WHERE id = $1
          `;
          const result = await client.query(query, [userId]);
          if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy user' });
          }
          user = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Không tìm thấy user' });
      }
    }
    
    // Remove sensitive data
    const { password_hash, ...safeUser } = user;
    
    res.status(200).json(safeUser);
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
    
    if (!['admin', 'manager', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role phải là admin, manager hoặc user' });
    }
    
    // Check if username already exists
    const usernameExists = await checkUsernameExists(username);
    
    if (usernameExists) {
      return res.status(400).json({ error: 'Username đã tồn tại' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const userData = {
      username,
      password_hash: passwordHash,
      email: email || null,
      full_name,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    let user = await supabaseCreateUser(userData);
    
    if (!user) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
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
          user = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi tạo user' });
      }
    }
    
    res.status(201).json({
      message: 'Tạo user thành công',
      user: user
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
    
    console.log('updateUser called with:', { userId, body: req.body });
    
    // Validation
    if (role && !['admin', 'manager', 'user'].includes(role)) {
      console.log('Role validation failed:', role);
      return res.status(400).json({ error: 'Role phải là admin, manager hoặc user' });
    }
    
    if (password && password.length < 6) {
      console.log('Password validation failed:', password.length);
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    
    // Check if user exists
    let existingUser = await supabaseGetUserById(userId);
    
    if (!existingUser) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const checkQuery = 'SELECT id FROM users WHERE id = $1';
          const checkResult = await client.query(checkQuery, [userId]);
          if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy user' });
          }
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Không tìm thấy user' });
      }
    }
    
    // Check if username already exists (if changing username)
    if (username && username !== existingUser?.username) {
      const usernameExists = await checkUsernameExists(username, userId);
      
      if (usernameExists) {
        return res.status(400).json({ error: 'Username đã tồn tại' });
      }
    }
    
    // Build update object
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.password_hash = passwordHash;
    }
    
    let user = await supabaseUpdateUser(userId, updates);
    
    if (!user) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
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
          user = result.rows[0];
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi cập nhật user' });
      }
    }
    
    res.status(200).json({
      message: 'Cập nhật user thành công',
      user: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật user' });
  }
}

// Delete user
async function deleteUser(req, res, userId) {
  try {
    // Prevent deleting own account
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
    }
    
    // Check if user exists and get username
    let existingUser = await supabaseGetUserById(userId);
    let username = null;
    
    if (!existingUser) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const checkQuery = 'SELECT id, username FROM users WHERE id = $1';
          const checkResult = await client.query(checkQuery, [userId]);
          if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy user' });
          }
          username = checkResult.rows[0].username;
        } finally {
          client.release();
        }
      } else {
        return res.status(404).json({ error: 'Không tìm thấy user' });
      }
    } else {
      username = existingUser.username;
    }
    
    // Delete user
    const deletedUser = await supabaseDeleteUser(userId);
    
    if (!deletedUser) {
      // Fallback to direct connection if available
      if (pool) {
        const client = await pool.connect();
        try {
          const deleteQuery = 'DELETE FROM users WHERE id = $1';
          await client.query(deleteQuery, [userId]);
        } finally {
          client.release();
        }
      } else {
        return res.status(500).json({ error: 'Lỗi khi xóa user' });
      }
    }
    
    res.status(200).json({
      message: 'Xóa user thành công',
      deleted_user: username || deletedUser?.username
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Lỗi khi xóa user' });
  }
}
