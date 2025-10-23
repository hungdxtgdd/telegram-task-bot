require('dotenv').config();

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Simple authentication bypass for testing
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token không được cung cấp' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Accept any token for testing
    if (!token) {
        return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    // Return mock user info for any valid token
    const userInfo = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin'
    };

    res.status(200).json({
        message: 'Authentication successful',
        user: userInfo
    });
};
