/**
 * Test DNS Resolution in Vercel Serverless Environment
 * This endpoint can be used to test DNS resolution from Vercel
 */

module.exports = async (req, res) => {
  const dns = require('dns');
  const { promisify } = require('util');
  const lookup = promisify(dns.lookup);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const hostname = 'db.kmsagdohchxuxllbhiye.supabase.co';
  
  try {
    console.log('🔍 Testing DNS resolution for:', hostname);
    
    // Test DNS lookup
    const startTime = Date.now();
    const result = await lookup(hostname, { all: true });
    const lookupTime = Date.now() - startTime;
    
    console.log('✅ DNS lookup successful:', result);
    
    // Test connection string parsing
    const DATABASE_URL = process.env.DATABASE_URL;
    let connectionInfo = null;
    
    if (DATABASE_URL) {
      try {
        const url = new URL(DATABASE_URL);
        connectionInfo = {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port,
          database: url.pathname,
          user: url.username,
          hasPassword: !!url.password,
          isSupabase: DATABASE_URL.includes('supabase.co'),
          isPooled: DATABASE_URL.includes(':6543')
        };
      } catch (e) {
        connectionInfo = { error: 'Failed to parse connection string', message: e.message };
      }
    }
    
    res.status(200).json({
      success: true,
      hostname,
      dns: {
        resolved: true,
        addresses: result.map(r => ({
          address: r.address,
          family: r.family
        })),
        lookupTime: `${lookupTime}ms`
      },
      environment: {
        hasDatabaseUrl: !!DATABASE_URL,
        databaseUrlLength: DATABASE_URL ? DATABASE_URL.length : 0,
        connectionInfo
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ DNS lookup failed:', error);
    
    res.status(500).json({
      success: false,
      hostname,
      error: {
        message: error.message,
        code: error.code,
        syscall: error.syscall,
        errno: error.errno
      },
      environment: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0
      },
      timestamp: new Date().toISOString()
    });
  }
};

