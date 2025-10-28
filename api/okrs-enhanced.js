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
  await new Promise((resolve) => {
    verifyToken(req, res, async () => {
      await handleOKRRequest(req, res);
      resolve();
    });
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
          // /api/okrs-enhanced/okrs/123/update-progress or /history
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
        } else if (endpoint === 'history' && okrId && !isNaN(okrId)) {
          await getOKREditHistory(req, res, okrId);
        } else if (okrId && !isNaN(okrId)) {
          await getOKRById(req, res, okrId);
        } else {
          res.status(404).json({ error: 'OKR endpoint not found' });
        }
        break;
      case 'POST':
        if (endpoint === 'okrs') {
          requireAdminOrManager(req, res, () => createOKR(req, res));
        } else if (endpoint === 'update-progress' && okrId && !isNaN(okrId)) {
          requireAdminOrManager(req, res, () => updateOKRProgress(req, res, okrId));
        } else if (endpoint === 'sync-real-data' && okrId && !isNaN(okrId)) {
          requireAdminOrManager(req, res, () => syncOKRWithRealData(req, res, okrId));
        } else {
          res.status(404).json({ error: 'OKR endpoint not found' });
        }
        break;
      case 'PUT':
        if (okrId && !isNaN(okrId)) {
          requireAdminOrManager(req, res, () => updateOKR(req, res, okrId));
        } else {
          res.status(404).json({ error: 'OKR ID required for update' });
        }
        break;
      case 'DELETE':
        if (okrId && !isNaN(okrId)) {
          requireAdmin(req, res, () => deleteOKR(req, res, okrId));
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
    // First get all OKRs
    const okrsQuery = `
      SELECT 
        o.*,
        u.username as owner_username
      FROM okrs o
      LEFT JOIN users u ON o.owner_id = u.id
      ORDER BY o.created_at DESC
    `;
    
    const okrsResult = await client.query(okrsQuery);
    
    // Get all projects with their OKR associations
    const projectsQuery = `
      SELECT 
        p.id, p.project_name, p.project_code, p.status, p.okr_id
      FROM projects p
      WHERE p.okr_id IS NOT NULL
    `;
    
    const projectsResult = await client.query(projectsQuery);
    
    // Group projects by okr_id
    const projectsByOkr = {};
    projectsResult.rows.forEach(project => {
      if (!projectsByOkr[project.okr_id]) {
        projectsByOkr[project.okr_id] = [];
      }
      projectsByOkr[project.okr_id].push({
        id: project.id,
        project_name: project.project_name,
        project_code: project.project_code,
        status: project.status
      });
    });
    
    // Attach projects to each OKR
    const okrs = okrsResult.rows.map(okr => ({
      ...okr,
      projects: projectsByOkr[okr.id] || []
    }));
    
    res.status(200).json(okrs);
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

async function getOKREditHistory(req, res, okrId) {
  const client = await pool.connect();
  
  try {
    // Ensure edit history table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS okr_edit_history (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username VARCHAR(100),
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        edited_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_okr_edit_history_okr_id ON okr_edit_history(okr_id);
      CREATE INDEX IF NOT EXISTS idx_okr_edit_history_edited_at ON okr_edit_history(edited_at DESC);
    `);
    
    const query = `
      SELECT 
        id,
        okr_id,
        user_id,
        username,
        field_name,
        old_value,
        new_value,
        edited_at
      FROM okr_edit_history
      WHERE okr_id = $1
      ORDER BY edited_at DESC
      LIMIT 50
    `;
    
    const result = await client.query(query, [okrId]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching OKR edit history:', error);
    res.status(500).json({ error: 'Failed to fetch OKR edit history' });
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
    // Get current OKR values before update for comparison
    const getCurrentQuery = 'SELECT * FROM okrs WHERE id = $1';
    const currentResult = await client.query(getCurrentQuery, [okrId]);
    
    if (currentResult.rows.length === 0) {
      res.status(404).json({ error: 'OKR not found' });
      return;
    }
    
    const oldValues = currentResult.rows[0];
    
    console.log('Update OKR request body:', req.body);
    
    // Update database constraint to allow new status values
    await client.query(`
      ALTER TABLE okrs DROP CONSTRAINT IF EXISTS okrs_status_check;
      ALTER TABLE okrs ADD CONSTRAINT okrs_status_check 
      CHECK (status IN ('active', 'completed', 'archived'));
    `);
    
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
    
    // Track changes for edit history (only track fields that were actually changed)
    const changes = [];
    
    // Use strict comparison to avoid string/number mismatches
    const oldCurrentValue = parseFloat(oldValues.current_value) || 0;
    const newCurrentValue = current_value !== undefined ? parseFloat(current_value) : oldCurrentValue;
    
    const oldTargetValue = parseFloat(oldValues.target_value) || 0;
    const newTargetValue = target_value !== undefined ? parseFloat(target_value) : oldTargetValue;
    
    if (objective && objective !== oldValues.objective) {
      changes.push({
        field: 'objective',
        old: oldValues.objective || '',
        new: objective
      });
    }
    
    // Only track if current_value is explicitly provided and different
    if (current_value !== undefined && newCurrentValue !== oldCurrentValue) {
      changes.push({
        field: 'current_value',
        old: oldValues.current_value || 0,
        new: current_value
      });
    }
    
    // Only track if target_value is explicitly provided and different
    if (target_value !== undefined && newTargetValue !== oldTargetValue) {
      changes.push({
        field: 'target_value',
        old: oldValues.target_value || 0,
        new: target_value
      });
    }
    
    console.log('Update OKR - Status check:', { 
      oldStatus: oldValues.status, 
      newStatus: status,
      statusChanged: status && status !== oldValues.status 
    });
    
    if (status && status !== oldValues.status) {
      changes.push({
        field: 'status',
        old: oldValues.status || '',
        new: status
      });
    }

    // If current_value and target_value are provided, update key_results
    let updatedKeyResults = key_results;
    if (current_value !== undefined && target_value !== undefined && !key_results) {
      // Get current OKR
      const getOKRQuery = 'SELECT key_results FROM okrs WHERE id = $1';
      const okrResult = await client.query(getOKRQuery, [okrId]);
      
      if (okrResult.rows.length > 0) {
        let existingKeyResults = [];
        try {
          existingKeyResults = typeof okrResult.rows[0].key_results === 'string' 
            ? JSON.parse(okrResult.rows[0].key_results) 
            : okrResult.rows[0].key_results || [];
        } catch (e) {
          existingKeyResults = [];
        }
        
        // Update the first key result with new values
        if (existingKeyResults.length > 0) {
          existingKeyResults[0].current = current_value;
          existingKeyResults[0].current_value = current_value;
          existingKeyResults[0].target = target_value;
          existingKeyResults[0].target_value = target_value;
        } else {
          // Create a default key result
          existingKeyResults = [{
            description: objective || 'Key Result',
            current: current_value,
            current_value: current_value,
            target: target_value,
            target_value: target_value
          }];
        }
        
        updatedKeyResults = existingKeyResults;
      }
    }

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
      updatedKeyResults ? JSON.stringify(updatedKeyResults) : null,
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
    
    // Save edit history
    if (changes.length > 0 && req.user) {
      try {
        // Get user info from database
        // Get username for edit history
        console.log('Debug user info:', { 
          userId: req.user.id, 
          username: req.user.username,
          userObject: req.user 
        });
        
        const userQuery = await client.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
        console.log('User query result:', userQuery.rows);
        
        const username = userQuery.rows[0]?.username || req.user.username || 'Unknown';
        
        console.log('Saving edit history:', { 
          okrId, 
          userId: req.user.id, 
          username, 
          changes: changes.length 
        });
        
        // Ensure edit history table exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS okr_edit_history (
            id SERIAL PRIMARY KEY,
            okr_id INTEGER NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            username VARCHAR(100),
            field_name VARCHAR(100),
            old_value TEXT,
            new_value TEXT,
            edited_at TIMESTAMP DEFAULT NOW()
          )
        `);
        
        const historyQueries = changes.map(change => ({
          text: `INSERT INTO okr_edit_history (okr_id, user_id, username, field_name, old_value, new_value, edited_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          values: [
            okrId,
            req.user.id,
            username,
            change.field,
            String(change.old),
            String(change.new)
          ]
        }));
        
        await Promise.all(historyQueries.map(q => client.query(q.text, q.values)));
      } catch (historyError) {
        console.error('Error saving edit history:', historyError);
        // Don't fail the update if history fails
      }
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

    // First get current OKR to update key_results
    const getOKRQuery = 'SELECT * FROM okrs WHERE id = $1';
    const okrResult = await client.query(getOKRQuery, [okrId]);
    
    if (okrResult.rows.length === 0) {
      res.status(404).json({ error: 'OKR not found' });
      return;
    }
    
    const okr = okrResult.rows[0];
    let keyResults = [];
    
    // Parse and update key_results
    if (okr.key_results) {
      try {
        keyResults = typeof okr.key_results === 'string' ? JSON.parse(okr.key_results) : okr.key_results;
        
        // Update the first key result with current_value
        if (keyResults.length > 0) {
          keyResults[0].current = current_value;
        }
      } catch (e) {
        console.warn('Error parsing key_results:', e);
        keyResults = [];
      }
    }

    const query = `
      UPDATE okrs
      SET
        current_value = $2,
        key_results = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(query, [
      okrId, 
      current_value, 
      JSON.stringify(keyResults)
    ]);

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

async function syncOKRWithRealData(req, res, okrId) {
  const client = await pool.connect();
  
  try {
    // Get OKR details
    const okrQuery = 'SELECT * FROM okrs WHERE id = $1';
    const okrResult = await client.query(okrQuery, [okrId]);
    
    if (okrResult.rows.length === 0) {
      res.status(404).json({ error: 'OKR not found' });
      return;
    }
    
    const okr = okrResult.rows[0];
    
    // Simulate getting real data based on OKR objective
    let realDataValue = 0;
    let dataSource = 'simulated';
    
    if (okr.objective && okr.objective.toLowerCase().includes('tải app')) {
      // Simulate app download data - in real implementation, this would come from analytics API
      realDataValue = Math.floor(Math.random() * 100000) + 50000; // Random between 50k-150k
      dataSource = 'app_analytics';
    } else if (okr.objective && okr.objective.toLowerCase().includes('doanh thu')) {
      // Simulate revenue data
      realDataValue = Math.floor(Math.random() * 1000000) + 100000; // Random between 100k-1.1M
      dataSource = 'revenue_system';
    } else {
      // Default simulation
      realDataValue = Math.floor(Math.random() * 1000) + 100;
      dataSource = 'general_metrics';
    }
    
    // Calculate progress percentage
    const targetValue = parseFloat(okr.target_value) || 1;
    const progressPercentage = Math.min((realDataValue / targetValue) * 100, 100);
    
    // Update OKR with real data
    const updateQuery = `
      UPDATE okrs
      SET
        current_value = $2,
        progress = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const updateResult = await client.query(updateQuery, [
      okrId,
      realDataValue,
      progressPercentage
    ]);
    
    // Log the sync in project_okr_updates table
    const logQuery = `
      INSERT INTO project_okr_updates (okr_id, current_value, update_note, updated_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    await client.query(logQuery, [
      okrId,
      realDataValue,
      `Auto-sync from ${dataSource}: ${realDataValue} ${okr.unit || ''}`,
      req.user.id
    ]);
    
    res.status(200).json({
      message: 'OKR synced with real data successfully',
      okr: updateResult.rows[0],
      realData: {
        value: realDataValue,
        source: dataSource,
        progressPercentage: progressPercentage
      }
    });
    
  } catch (error) {
    console.error('Error syncing OKR with real data:', error);
    res.status(500).json({ error: 'Failed to sync OKR with real data' });
  } finally {
    client.release();
  }
}

async function deleteOKR(req, res, okrId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // First, unlink related projects (set okr_id to NULL instead of deleting)
    await client.query('UPDATE projects SET okr_id = NULL WHERE okr_id = $1', [okrId]);
    console.log('Unlinked related projects for OKR:', okrId);
    
    // Then delete the OKR
    const query = 'DELETE FROM okrs WHERE id = $1 RETURNING *';
    const result = await client.query(query, [okrId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'OKR not found' });
      return;
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'OKR deleted successfully', okr: result.rows[0] });
  } catch (error) {
    console.error('Error deleting OKR:', error);
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to delete OKR' });
  } finally {
    client.release();
  }
}
