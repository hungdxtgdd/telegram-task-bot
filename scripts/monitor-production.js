#!/usr/bin/env node

/**
 * Production Monitoring Script
 * Monitors the health and performance of the deployed application
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-app.vercel.app',
  healthEndpoint: '/api/health',
  checkInterval: 60000, // 1 minute
  logFile: path.join(__dirname, '../logs/monitoring.log'),
  alertThresholds: {
    responseTime: 2000, // 2 seconds
    memoryUsage: 100, // 100 MB
    errorRate: 0.1 // 10%
  }
};

// Ensure logs directory exists
const logsDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class ProductionMonitor {
  constructor() {
    this.stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      lastCheck: null,
      uptime: 0
    };
    this.startTime = Date.now();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logEntry.trim());
    fs.appendFileSync(CONFIG.logFile, logEntry);
  }

  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              responseTime,
              data: jsonData,
              success: res.statusCode >= 200 && res.statusCode < 300
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              responseTime,
              data: data,
              success: false,
              error: 'Invalid JSON response'
            });
          }
        });
      });
      
      req.on('error', (error) => {
        reject({
          error: error.message,
          responseTime: Date.now() - startTime,
          success: false
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject({
          error: 'Request timeout',
          responseTime: Date.now() - startTime,
          success: false
        });
      });
    });
  }

  async checkHealth() {
    try {
      this.log('Starting health check...');
      
      const result = await this.makeRequest(`${CONFIG.baseUrl}${CONFIG.healthEndpoint}`);
      
      this.stats.totalChecks++;
      this.stats.lastCheck = new Date().toISOString();
      
      if (result.success) {
        this.stats.successfulChecks++;
        this.log(`Health check successful - Response time: ${result.responseTime}ms`);
        
        // Update average response time
        this.stats.averageResponseTime = 
          (this.stats.averageResponseTime * (this.stats.totalChecks - 1) + result.responseTime) / 
          this.stats.totalChecks;
        
        // Check for performance issues
        this.checkPerformanceIssues(result);
        
        // Log detailed health data
        if (result.data && result.data.checks) {
          this.logHealthDetails(result.data.checks);
        }
        
      } else {
        this.stats.failedChecks++;
        this.log(`Health check failed - Status: ${result.statusCode}, Error: ${result.error || 'Unknown'}`, 'ERROR');
        
        // Send alert for critical failures
        if (result.statusCode >= 500) {
          this.sendAlert('CRITICAL', `Health check failed with status ${result.statusCode}`);
        }
      }
      
    } catch (error) {
      this.stats.failedChecks++;
      this.log(`Health check error: ${error.error || error.message}`, 'ERROR');
      this.sendAlert('ERROR', `Health check failed: ${error.error || error.message}`);
    }
  }

  checkPerformanceIssues(result) {
    const issues = [];
    
    // Check response time
    if (result.responseTime > CONFIG.alertThresholds.responseTime) {
      issues.push(`High response time: ${result.responseTime}ms`);
    }
    
    // Check memory usage if available
    if (result.data && result.data.checks && result.data.checks.memory) {
      const memoryUsed = parseInt(result.data.checks.memory.used);
      if (memoryUsed > CONFIG.alertThresholds.memoryUsage) {
        issues.push(`High memory usage: ${memoryUsed}MB`);
      }
    }
    
    // Check database response time
    if (result.data && result.data.checks && result.data.checks.database) {
      const dbResponseTime = result.data.checks.database.responseTime;
      if (dbResponseTime > 1000) {
        issues.push(`Slow database response: ${dbResponseTime}ms`);
      }
    }
    
    if (issues.length > 0) {
      this.log(`Performance issues detected: ${issues.join(', ')}`, 'WARN');
      this.sendAlert('WARNING', `Performance issues: ${issues.join(', ')}`);
    }
  }

  logHealthDetails(checks) {
    Object.entries(checks).forEach(([name, check]) => {
      if (check.status === 'unhealthy') {
        this.log(`${name} check failed: ${check.message || check.error}`, 'ERROR');
      } else if (check.status === 'degraded') {
        this.log(`${name} check degraded: ${check.message}`, 'WARN');
      }
    });
  }

  sendAlert(level, message) {
    this.log(`ALERT [${level}]: ${message}`, 'ALERT');
    
    // Here you could integrate with external alerting services
    // like Slack, Discord, email, etc.
    
    // For now, just log to console and file
    console.error(`🚨 ${level} ALERT: ${message}`);
  }

  generateReport() {
    const uptime = Date.now() - this.startTime;
    const successRate = this.stats.totalChecks > 0 ? 
      (this.stats.successfulChecks / this.stats.totalChecks * 100).toFixed(2) : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime / 1000), // seconds
      totalChecks: this.stats.totalChecks,
      successfulChecks: this.stats.successfulChecks,
      failedChecks: this.stats.failedChecks,
      successRate: `${successRate}%`,
      averageResponseTime: `${Math.round(this.stats.averageResponseTime)}ms`,
      lastCheck: this.stats.lastCheck
    };
    
    this.log(`Monitoring Report: ${JSON.stringify(report, null, 2)}`);
    return report;
  }

  async start() {
    this.log('Starting production monitoring...');
    this.log(`Monitoring URL: ${CONFIG.baseUrl}${CONFIG.healthEndpoint}`);
    this.log(`Check interval: ${CONFIG.checkInterval / 1000} seconds`);
    
    // Initial health check
    await this.checkHealth();
    
    // Set up interval
    setInterval(async () => {
      await this.checkHealth();
      
      // Generate report every 10 checks
      if (this.stats.totalChecks % 10 === 0) {
        this.generateReport();
      }
    }, CONFIG.checkInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('Stopping monitoring...');
      this.generateReport();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      this.log('Stopping monitoring...');
      this.generateReport();
      process.exit(0);
    });
  }
}

// Start monitoring if run directly
if (require.main === module) {
  const monitor = new ProductionMonitor();
  monitor.start().catch(error => {
    console.error('Failed to start monitoring:', error);
    process.exit(1);
  });
}

module.exports = ProductionMonitor;
