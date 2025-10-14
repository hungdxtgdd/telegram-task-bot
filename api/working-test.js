module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'Working Test API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};
