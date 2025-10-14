module.exports = async (req, res) => {
  console.log('OKR Simple Replace API called:', { method: req.method, url: req.url });
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/okrs') {
    res.status(200).json({ 
      message: 'OKR Simple Replace API is working',
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
};
