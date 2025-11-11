const { Pool } = require('pg');

/**
 * Helper function to fix connection string if password needs encoding
 * Vercel có thể decode URL-encoded characters khi lưu environment variables,
 * nên cần re-encode password có ký tự đặc biệt
 */
function fixConnectionString(connStr) {
  if (!connStr) return connStr;
  
  try {
    // Parse connection string
    const url = new URL(connStr);
    
    // If password contains special characters that might not be encoded, encode them
    const password = url.password;
    if (password && (password.includes('%') || password.includes('&') || password.includes('@') || password.includes('#'))) {
      // Check if password is already URL-encoded
      try {
        const decoded = decodeURIComponent(password);
        // If decode succeeds, re-encode to ensure proper encoding
        // This handles cases where Vercel auto-decoded the password
        const encodedPassword = encodeURIComponent(decoded);
        url.password = encodedPassword;
        return url.toString();
      } catch (e) {
        // If decode fails, password is not encoded, so encode it
        url.password = encodeURIComponent(password);
        return url.toString();
      }
    }
    
    return connStr;
  } catch (error) {
    // If URL parsing fails, return original string
    console.warn('Failed to parse connection string:', error.message);
    return connStr;
  }
}

/**
 * Create a database pool with connection string fix applied
 */
function createPool(databaseUrl, options = {}) {
  const fixedUrl = fixConnectionString(databaseUrl);
  
  return new Pool({
    connectionString: fixedUrl,
    ssl: {
      rejectUnauthorized: false
    },
    // Default settings optimized for Supabase
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 10000,
    ...options
  });
}

module.exports = {
  fixConnectionString,
  createPool
};

