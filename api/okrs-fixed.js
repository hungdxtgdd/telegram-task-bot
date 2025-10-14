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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('OKR Fixed API called:', { method: req.method, url: req.url });

  try {
    // Simple routing
    if (req.method === 'GET' && req.url === '/api/okrs-fixed') {
      // Get all OKRs
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM okrs ORDER BY created_at DESC');
      client.release();
      
      res.status(200).json(result.rows);
    } else if (req.method === 'DELETE' && req.url.startsWith('/api/okrs-fixed/')) {
      // Delete OKR
      const okrId = req.url.split('/').pop();
      const client = await pool.connect();
      const result = await client.query('DELETE FROM okrs WHERE id = $1 RETURNING *', [okrId]);
      client.release();
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'OKR không tồn tại' });
      }
      
      res.status(200).json({
        message: 'Xóa OKR thành công',
        okr: result.rows[0]
      });
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('Error in OKR Fixed API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
