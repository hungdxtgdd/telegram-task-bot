module.exports = (req, res) => {
  console.log('OKR Debug API called:', { method: req.method, url: req.url });
  
  res.status(200).json({ 
    message: 'OKR Debug API is working',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
};
