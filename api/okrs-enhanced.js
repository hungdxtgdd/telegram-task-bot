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

  // Verify authentication for all OKR operations
  verifyToken(req, res, async () => {
    await handleOKRRequest(req, res);
  });
};

async function handleOKRRequest(req, res) {
  const { method, url } = req;
  
  try {
    // Parse URL to get endpoint and ID
    const cleanUrl = url.split('?')[0];
    const urlParts = cleanUrl.split('/').filter(part => part);
    
    let okrId = null;
    let endpoint = null;
    
    // Handle different URL patterns:
    // /api/okrs-enhanced/okrs -> endpoint = 'okrs'
    // /api/okrs-enhanced/okrs/123 -> okrId = '123'
    // /api/okrs-enhanced/okrs/123/update-progress -> okrId = '123', endpoint = 'update-progress'
    
    if (urlParts.length >= 3 && urlParts[0] === 'api' && urlParts[1] === 'okrs-enhanced') {
      if (urlParts[2] === 'okrs') {
        if (urlParts.length === 3) {
          // /api/okrs-enhanced/okrs
          endpoint = 'okrs';
        } else if (urlParts.length === 4) {
          // /api/okrs-enhanced/okrs/123
          okrId = urlParts[3];
        } else if (urlParts.length === 5) {
          // /api/okrs-enhanced/okrs/123/update-progress
          okrId = urlParts[3];
          endpoint = urlParts[4];
        }
      }
    }

    console.log('URL parsing:', { url: cleanUrl, urlParts, okrId, endpoint, method });

    switch (method) {
      case 'GET':
        if (endpoint === 'okrs') {
          await getAllOKRs(req, res);
        } else if (okrId && !isNaN(okrId)) {
          await getOKRById(req, res, okrId);
        } else {
          res.status(404).json({ error: 'OKR endpoint not found' });
        }
        break;
      case 'POST':
        if (endpoint === 'okrs') {
          await createOKR(req, res);
        } else if (endpoint === 'update-progress' && okrId && !isNaN(okrId)) {
          await updateOKRProgress(req, res, okrId);
        } else {
          res.status(404).json({ error: 'OKR endpoint not found' });
        }
        break;
      case 'PUT':
        if (okrId && !isNaN(okrId)) {
          await updateOKR(req, res, okrId);
        } else {
          res.status(404).json({ error: 'OKR ID required for update' });
        }
        break;
      case 'DELETE':
        if (okrId && !isNaN(okrId)) {
          await deleteOKR(req, res, okrId);
        } else {
          res.status(404).json({ error: 'OKR ID required for deletion' });
        }
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling OKR request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAllOKRs(req, res) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        o.*,
        u.username as owner_username
      FROM okrs o
      LEFT JOIN users u ON o.owner_id = u.id
      ORDER BY o.created_at DESC
    `;
    
    const result = await client.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching OKRs:', error);
    res.status(500).json({ error: 'Failed to fetch OKRs' });
  } finally {
    client.release();
  }
}

async function getOKRById(req, res, okrId) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        o.*,
        u.username as owner_username
      FROM okrs o
      LEFT JOIN users u ON o.owner_id = u.id
      WHERE o.id = $1
    `;
    
    const result = await client.query(query, [okrId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'OKR not found' });
      return;
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching OKR:', error);
    res.status(500).json({ error: 'Failed to fetch OKR' });
  } finally {
    client.release();
  }
}

async function createOKR(req, res) {
  const client = await pool.connect();
  
  try {
    const {
      objective,
      key_results,
      target_value,
      unit,
      current_value,
      status,
      quarter,
      year,
      start_date,
      end_date,
      progress
    } = req.body;

    const query = `
      INSERT INTO okrs (
        objective, key_results, target_value, unit, current_value, status,
        quarter, year, start_date, end_date, progress, owner_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

    const result = await client.query(query, [
      objective,
      JSON.stringify(key_results || []),
      target_value || null,
      unit || '%',
      current_value || 0,
      status || 'active',
      quarter || null,
      year || new Date().getFullYear(),
      start_date || null,
      end_date || null,
      progress || 0,
      req.user.id
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating OKR:', error);
    res.status(500).json({ error: 'Failed to create OKR' });
  } finally {
    client.release();
  }
}

async function updateOKR(req, res, okrId) {
  const client = await pool.connect();
  
  try {
    const {
      objective,
      key_results,
      target_value,
      unit,
      current_value,
      status,
      quarter,
      year,
      start_date,
      end_date,
      progress
    } = req.body;

    const query = `
      UPDATE okrs
      SET
        objective = COALESCE($2, objective),
        key_results = COALESCE($3, key_results),
        target_value = COALESCE($4, target_value),
        unit = COALESCE($5, unit),
        current_value = COALESCE($6, current_value),
        status = COALESCE($7, status),
        quarter = COALESCE($8, quarter),
        year = COALESCE($9, year),
        start_date = COALESCE($10, start_date),
        end_date = COALESCE($11, end_date),
        progress = COALESCE($12, progress),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(query, [
      okrId,
      objective,
      key_results ? JSON.stringify(key_results) : null,
      target_value,
      unit,
      current_value,
      status,
      quarter,
      year,
      start_date,
      end_date,
      progress
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'OKR not found' });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating OKR:', error);
    res.status(500).json({ error: 'Failed to update OKR' });
  } finally {
    client.release();
  }
}

async function updateOKRProgress(req, res, okrId) {
  const client = await pool.connect();
  
  try {
    const { current_value } = req.body;

    const query = `
      UPDATE okrs
      SET
        current_value = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(query, [okrId, current_value]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'OKR not found' });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating OKR progress:', error);
    res.status(500).json({ error: 'Failed to update OKR progress' });
  } finally {
    client.release();
  }
}

async function deleteOKR(req, res, okrId) {
  const client = await pool.connect();
  
  try {
    const query = 'DELETE FROM okrs WHERE id = $1 RETURNING *';
    const result = await client.query(query, [okrId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'OKR not found' });
      return;
    }

    res.status(200).json({ message: 'OKR deleted successfully', okr: result.rows[0] });
  } catch (error) {
    console.error('Error deleting OKR:', error);
    res.status(500).json({ error: 'Failed to delete OKR' });
  } finally {
    client.release();
  }
}
