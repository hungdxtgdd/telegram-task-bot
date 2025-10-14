module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('Test OKR API called:', { method: req.method, url: req.url });
  
  res.status(200).json({ 
    message: 'Test OKR API is working',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
};
