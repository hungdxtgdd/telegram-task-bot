module.exports = (req, res) => {
  console.log('OKR Fix API called:', { method: req.method, url: req.url });
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple response for any OKR request
  res.status(200).json({ 
    message: 'OKR Fix API is working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    data: [] // Empty array for OKRs
  });
};
