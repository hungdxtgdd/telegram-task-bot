---
phase: monitoring
title: Monitoring & Observability
description: Define monitoring strategy, metrics, alerts, and incident response
---

# Monitoring & Observability

## Key Metrics
**What do we need to track?**

### Performance Metrics
- **API Response Time**: < 2 seconds (95th percentile)
- **Database Query Time**: < 500ms average
- **Function Duration**: < 10 seconds (Vercel limit)
- **Memory Usage**: Monitor for memory leaks
- **Cold Start Time**: < 1 second for new functions

### Business Metrics
- **Active Users**: Daily/weekly active users
- **Project Creation Rate**: Projects created per day
- **Task Completion Rate**: Tasks completed vs assigned
- **OKR Progress**: Average OKR completion percentage
- **User Engagement**: Login frequency and session duration

### Error Metrics
- **Error Rate**: < 1% of total requests
- **4xx Errors**: Client errors (400, 401, 403, 404)
- **5xx Errors**: Server errors (500, 502, 503, 504)
- **Database Errors**: Connection timeouts, query failures
- **Authentication Failures**: Invalid tokens, login attempts

### System Health Metrics
- **Uptime**: 99.9% target (Vercel SLA)
- **Function Invocations**: Total API calls per day
- **Database Connections**: Active connection count
- **Telegram Bot Messages**: Messages processed per day

## Monitoring Tools
**What tools are we using?**

### Vercel Built-in Monitoring
- **Function Logs**: Real-time execution logs
- **Performance Metrics**: Response time and duration
- **Error Tracking**: Automatic error detection
- **Usage Analytics**: Function invocations and costs

### Custom Monitoring
- **Health Check Endpoint**: `/api/health` for system status
- **Database Monitoring**: Connection pool status
- **Telegram Bot Monitoring**: Webhook delivery status
- **User Activity Logging**: Login attempts and actions

### External Tools
- **Vercel Analytics**: Built-in performance monitoring
- **PostgreSQL Monitoring**: Database performance metrics
- **Telegram Bot API**: Bot usage statistics

## Logging Strategy
**What do we log and how?**

### Log Levels and Categories
```javascript
// Log levels
console.log('INFO: User login successful', { userId, username });
console.warn('WARN: Database connection slow', { queryTime: '2.5s' });
console.error('ERROR: Authentication failed', { error: error.message });
console.debug('DEBUG: API request', { method, url, body });
```

### Structured Logging Format
```javascript
// Standard log format
{
  timestamp: '2025-01-15T10:30:00Z',
  level: 'INFO',
  service: 'auth-api',
  message: 'User login successful',
  userId: 123,
  username: 'admin',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  requestId: 'req-abc123'
}
```

### Log Categories
- **Authentication**: Login attempts, token validation, password changes
- **API Requests**: All API calls with method, URL, response time
- **Database**: Query execution, connection issues, transaction failures
- **Telegram Bot**: Message processing, webhook delivery, bot responses
- **Errors**: All errors with stack traces and context

### Log Retention Policy
- **Vercel Logs**: 7 days (free tier)
- **Error Logs**: 30 days (if using external service)
- **Audit Logs**: 90 days for security events
- **Performance Logs**: 7 days for analysis

### Sensitive Data Handling
- **Passwords**: Never logged, only hash verification
- **JWT Tokens**: Log only token presence, not content
- **Personal Data**: Log only user IDs, not names/emails
- **Database Queries**: Log query structure, not parameter values

## Alerts & Notifications
**When and how do we get notified?**

### Critical Alerts
- **Alert 1**: Error rate > 5% → Email + Slack notification
- **Alert 2**: Database connection failure → Immediate email
- **Alert 3**: API response time > 5 seconds → Email notification
- **Alert 4**: Function timeout > 10 seconds → Critical alert

### Warning Alerts
- **Alert 1**: Error rate > 1% → Slack notification
- **Alert 2**: API response time > 2 seconds → Warning
- **Alert 3**: Database query time > 1 second → Warning
- **Alert 4**: Memory usage > 80% → Warning

### Alert Channels
- **Email**: Critical alerts to developer
- **Slack**: Team notifications (if configured)
- **Telegram**: Bot status notifications
- **Vercel Dashboard**: Built-in alert management

## Dashboards
**What do we visualize?**

### System Health Dashboard
- **API Status**: Green/Red status for each endpoint
- **Response Times**: Line chart of API response times
- **Error Rates**: Bar chart of errors by endpoint
- **Database Status**: Connection pool and query performance
- **Uptime**: System availability percentage

### Business Metrics Dashboard
- **User Activity**: Daily active users, login frequency
- **Project Metrics**: Projects created, completed, in progress
- **Task Metrics**: Tasks assigned, completed, overdue
- **OKR Progress**: OKR completion rates and trends
- **Role Distribution**: Admin, Manager, User counts

### Custom Views per Role
- **Admin View**: Full system metrics and user management
- **Manager View**: Project and team performance metrics
- **Developer View**: Technical metrics and error tracking

## Incident Response
**How do we handle issues?**

### On-Call Rotation
- **Primary**: Jack Ng (Lead Developer)
- **Backup**: None (single developer team)
- **Escalation**: Direct communication via email/Slack

### Incident Process
1. **Detection and Triage**
   - Monitor Vercel logs and error rates
   - Check system health dashboard
   - Identify severity level (Critical/High/Medium/Low)

2. **Investigation and Diagnosis**
   - Analyze error logs and stack traces
   - Check database connectivity and performance
   - Test affected API endpoints
   - Identify root cause

3. **Resolution and Mitigation**
   - Implement hotfix if possible
   - Deploy rollback if needed
   - Monitor system recovery
   - Update users if necessary

4. **Post-mortem and Learning**
   - Document incident details
   - Identify prevention measures
   - Update monitoring and alerting
   - Share learnings with team

### Incident Severity Levels
- **Critical**: System down, data loss, security breach
- **High**: Major feature broken, performance severely degraded
- **Medium**: Minor feature issues, some users affected
- **Low**: Cosmetic issues, no user impact

## Health Checks
**How do we verify system health?**

### Endpoint Health Checks
```javascript
// Health check endpoint
GET /api/health
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "telegram": "webhook_active",
    "auth": "jwt_valid"
  },
  "metrics": {
    "responseTime": "45ms",
    "memoryUsage": "128MB",
    "uptime": "99.9%"
  }
}
```

### Dependency Checks
- **Database**: Test connection and basic query
- **Telegram Bot**: Verify webhook is active
- **Authentication**: Test JWT token validation
- **API Endpoints**: Test critical endpoints

### Automated Smoke Tests
- **Login Flow**: Test user authentication
- **Project Creation**: Test project management
- **Task Assignment**: Test task workflow
- **Role Permissions**: Test access control

### Health Check Schedule
- **Continuous**: Real-time monitoring via Vercel
- **Scheduled**: Every 5 minutes via health check endpoint
- **Manual**: Daily verification of critical functions
- **Weekly**: Full system health review

## Monitoring Setup
**How do we implement monitoring?**

### Vercel Configuration
```json
// vercel.json monitoring config
{
  "functions": {
    "api/health.js": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/health",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
```

### Custom Health Check Implementation
```javascript
// api/health.js
module.exports = async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    metrics: {}
  };
  
  // Check database
  try {
    await pool.query('SELECT 1');
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'error';
    health.status = 'unhealthy';
  }
  
  // Check Telegram webhook
  // ... implementation
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
};
```

