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

  console.log('Simple OKR API called:', { method: req.method, url: req.url });

  try {
    if (req.method === 'GET' && req.url === '/api/okrs-simple') {
      // Get all OKRs without authentication
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM okrs ORDER BY created_at DESC');
      client.release();
      
      res.status(200).json(result.rows);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('Error in simple OKR API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
