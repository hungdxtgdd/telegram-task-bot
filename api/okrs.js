require('dotenv').config();
const { Pool } = require('pg');
const { verifyToken, requireAdmin, requireAdminOrManager } = require('./auth');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Temporarily disable authentication for debugging
  // verifyToken(req, res, async () => {
    await handleOKRRequest(req, res);
  // });
};

async function handleOKRRequest(req, res) {
  const { method, url } = req;
  
  try {
    // Parse URL to get endpoint and ID
    const cleanUrl = url.split('?')[0];
    const urlParts = cleanUrl.split('/').filter(part => part);
    
    // Extract okrId and endpoint
    let okrId = null;
    let endpoint = null;
    
    // Handle different URL patterns
    if (urlParts.length >= 2 && urlParts[0] === 'api' && urlParts[1] === 'okrs') {
      if (urlParts.length === 2) {
        // /api/okrs
        endpoint = 'okrs';
      } else if (urlParts.length === 3) {
        // /api/okrs/123
        okrId = urlParts[2];
      } else if (urlParts.length === 4) {
        // /api/okrs/123/update-progress
        okrId = urlParts[2];
        endpoint = urlParts[3];
      }
    }

    // Debug logging
    console.log('OKR API Debug:', { method, url, urlParts, okrId, endpoint });
    
    // Test endpoint - more flexible matching
    if (url.includes('/api/okrs') && method === 'GET' && !okrId) {
      console.log('Test endpoint hit for GET /api/okrs');
      return res.status(200).json({ message: 'OKR API is working', url, method, urlParts, okrId, endpoint });
    }
    
    switch (method) {
      case 'GET':
        if (endpoint === 'okrs' && !okrId) {
          console.log('Getting all OKRs');
          await getAllOKRs(req, res);
        } else if (okrId && !isNaN(okrId)) {
          console.log('Getting OKR by ID:', okrId);
          await getOKRById(req, res, okrId);
        } else {
          console.log('GET endpoint not found:', { endpoint, okrId });
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
        
      case 'POST':
        if (endpoint === 'okrs') {
          requireAdmin(req, res, () => createOKR(req, res));
        } else if (endpoint === 'update-progress' && okrId) {
          await updateOKRProgress(req, res, okrId);
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
        
      case 'PUT':
        if (okrId && !isNaN(okrId)) {
          requireAdmin(req, res, () => updateOKR(req, res, okrId));
        } else {
          res.status(404).json({ error: 'OKR ID required' });
        }
        break;
        
      case 'DELETE':
        if (okrId && !isNaN(okrId)) {
          requireAdmin(req, res, () => deleteOKR(req, res, okrId));
        } else {
          res.status(404).json({ error: 'OKR ID required' });
        }
        break;
        
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('OKR API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all OKRs
async function getAllOKRs(req, res) {
  try {
    const client = await pool.connect();
    
    const { quarter, year, status } = req.query;
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (quarter || year || status) {
      const conditions = [];
      
      if (quarter) {
        paramCount++;
        conditions.push(`quarter = $${paramCount}`);
        queryParams.push(parseInt(quarter));
      }
      
      if (year) {
        paramCount++;
        conditions.push(`year = $${paramCount}`);
        queryParams.push(parseInt(year));
      }
      
      if (status) {
        paramCount++;
        conditions.push(`status = $${paramCount}`);
        queryParams.push(status);
      }
      
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        o.*,
        u.full_name as owner_name,
        (SELECT COUNT(*) FROM projects p WHERE p.okr_id = o.id) as project_count,
        (SELECT COUNT(*) FROM projects p WHERE p.okr_id = o.id AND p.status = 'Completed') as completed_projects
      FROM okrs o
      LEFT JOIN users u ON o.owner_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;
    
    const result = await client.query(query, queryParams);
    client.release();
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching OKRs:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách OKRs' });
  }
}

// Get OKR by ID
async function getOKRById(req, res, okrId) {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT 
        o.*,
        u.full_name as owner_name,
        (SELECT COUNT(*) FROM projects p WHERE p.okr_id = o.id) as project_count,
        (SELECT COUNT(*) FROM projects p WHERE p.okr_id = o.id AND p.status = 'Completed') as completed_projects
      FROM okrs o
      LEFT JOIN users u ON o.owner_id = u.id
      WHERE o.id = $1
    `;
    
    const result = await client.query(query, [okrId]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'OKR không tồn tại' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching OKR:', error);
    res.status(500).json({ error: 'Lỗi khi lấy OKR' });
  }
}

// Create new OKR
async function createOKR(req, res) {
  try {
    const {
      objective,
      key_results,
      quarter,
      year,
      start_date,
      end_date,
      target_value,
      owner_id
    } = req.body;

    if (!objective) {
      return res.status(400).json({ error: 'Mục tiêu là bắt buộc' });
    }

    const client = await pool.connect();
    
    const query = `
      INSERT INTO okrs (
        objective, key_results, quarter, year, start_date, end_date, 
        target_value, owner_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await client.query(query, [
      objective,
      key_results ? JSON.stringify(key_results) : null,
      quarter,
      year,
      start_date,
      end_date,
      target_value,
      owner_id || req.user.id
    ]);
    
    client.release();
    
    res.status(201).json({
      message: 'Tạo OKR thành công',
      okr: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating OKR:', error);
    res.status(500).json({ error: 'Lỗi khi tạo OKR' });
  }
}

// Update OKR
async function updateOKR(req, res, okrId) {
  try {
    const {
      objective,
      key_results,
      status,
      quarter,
      year,
      start_date,
      end_date,
      target_value,
      current_value,
      owner_id
    } = req.body;

    const client = await pool.connect();
    
    const query = `
      UPDATE okrs
      SET
        objective = COALESCE($2, objective),
        key_results = COALESCE($3, key_results),
        status = COALESCE($4, status),
        quarter = COALESCE($5, quarter),
        year = COALESCE($6, year),
        start_date = COALESCE($7, start_date),
        end_date = COALESCE($8, end_date),
        target_value = COALESCE($9, target_value),
        current_value = COALESCE($10, current_value),
        owner_id = COALESCE($11, owner_id),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, [
      okrId,
      objective,
      key_results ? JSON.stringify(key_results) : null,
      status,
      quarter,
      year,
      start_date,
      end_date,
      target_value,
      current_value,
      owner_id
    ]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'OKR không tồn tại' });
    }
    
    res.status(200).json({
      message: 'Cập nhật OKR thành công',
      okr: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating OKR:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật OKR' });
  }
}

// Delete OKR
async function deleteOKR(req, res, okrId) {
  try {
    const client = await pool.connect();
    
    const query = 'DELETE FROM okrs WHERE id = $1 RETURNING *';
    const result = await client.query(query, [okrId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'OKR không tồn tại' });
    }
    
    res.status(200).json({
      message: 'Xóa OKR thành công',
      okr: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting OKR:', error);
    res.status(500).json({ error: 'Lỗi khi xóa OKR' });
  }
}

// Update OKR progress
async function updateOKRProgress(req, res, okrId) {
  try {
    const { progress_percentage, notes } = req.body;
    
    if (progress_percentage === undefined) {
      return res.status(400).json({ error: 'Tiến độ là bắt buộc' });
    }

    const client = await pool.connect();
    
    // Update OKR progress
    const updateQuery = `
      UPDATE okrs
      SET current_value = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [progress_percentage, okrId]);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'OKR không tồn tại' });
    }
    
    // Create notification
    const notificationQuery = `
      INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await client.query(notificationQuery, [
      req.user.id,
      'OKR Progress Updated',
      `OKR "${result.rows[0].objective}" progress updated to ${progress_percentage}%`,
      'okr_updated',
      okrId,
      'okr'
    ]);
    
    client.release();
    
    res.status(200).json({
      message: 'Cập nhật tiến độ OKR thành công',
      okr: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating OKR progress:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật tiến độ OKR' });
  }
}

