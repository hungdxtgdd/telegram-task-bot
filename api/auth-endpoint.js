const { login, verify, logout, changePassword, verifyToken } = require('./auth');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { method, url } = req;
    
    try {
        // Parse URL to get endpoint
        const urlParts = url.split('?')[0].split('/');
        const endpoint = urlParts[urlParts.length - 1];
        
        switch (method) {
            case 'POST':
                if (endpoint === 'login') {
                    await login(req, res);
                } else if (endpoint === 'change-password') {
                    // Require authentication for password change
                    verifyToken(req, res, () => {
                        changePassword(req, res);
                    });
                } else {
                    res.status(404).json({ error: 'Endpoint không tìm thấy' });
                }
                break;
                
            case 'GET':
                if (endpoint === 'verify') {
                    // Require authentication for token verification
                    verifyToken(req, res, () => {
                        verify(req, res);
                    });
                } else {
                    res.status(404).json({ error: 'Endpoint không tìm thấy' });
                }
                break;
                
            case 'DELETE':
                if (endpoint === 'logout') {
                    await logout(req, res);
                } else {
                    res.status(404).json({ error: 'Endpoint không tìm thấy' });
                }
                break;
                
            default:
                res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
        }
        
    } catch (error) {
        console.error('Auth endpoint error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

