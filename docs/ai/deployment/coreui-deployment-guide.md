# CoreUI Deployment Guide

## Pre-Deployment Checklist

### Development Environment
- [ ] CoreUI assets integrated
- [ ] All components migrated
- [ ] Responsive design tested
- [ ] Cross-browser compatibility verified
- [ ] Performance optimized
- [ ] Security review completed

### Production Environment
- [ ] Vercel configuration updated
- [ ] Environment variables set
- [ ] Database connections verified
- [ ] API endpoints functional
- [ ] SSL certificates valid
- [ ] CDN configuration ready

## Deployment Strategy

### Phase 1: Staging Deployment

#### Step 1.1: Prepare Staging Environment
```bash
# Clone production repository
git clone https://github.com/your-repo/telegram-bot-vercel.git
cd telegram-bot-vercel

# Create staging branch
git checkout -b coreui-integration

# Install dependencies
npm install
```

#### Step 1.2: Deploy to Staging
```bash
# Deploy to Vercel staging
vercel --target staging

# Verify deployment
curl -I https://your-staging-url.vercel.app
```

#### Step 1.3: Staging Testing
```bash
# Run automated tests
npm test

# Run E2E tests
npm run test:e2e

# Performance testing
npm run test:performance
```

### Phase 2: Production Deployment

#### Step 2.1: Production Preparation
```bash
# Merge to main branch
git checkout main
git merge coreui-integration

# Update version
npm version patch

# Tag release
git tag -a v2.0.0 -m "CoreUI Integration Release"
git push origin v2.0.0
```

#### Step 2.2: Deploy to Production
```bash
# Deploy to Vercel production
vercel --prod

# Verify deployment
curl -I https://taskm.creatorui.com
```

#### Step 2.3: Post-Deployment Verification
```bash
# Health check
curl https://taskm.creatorui.com/api/health

# Database connectivity
curl https://taskm.creatorui.com/api/okrs-enhanced

# Authentication
curl -X POST https://taskm.creatorui.com/api/auth/login
```

## Vercel Configuration

### vercel.json Updates
```json
{
  "version": 2,
  "builds": [
    {
      "src": "pages/**/*.html",
      "use": "@vercel/static"
    },
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/pages/$1"
    }
  ],
  "env": {
    "COREUI_VERSION": "4.0.0",
    "ENVIRONMENT": "production"
  }
}
```

### Environment Variables
```bash
# Production environment variables
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
COREUI_THEME=default
ENABLE_ANALYTICS=true
```

## Asset Optimization

### CSS Optimization
```css
/* Custom CSS for production */
:root {
  --coreui-primary: #321fdb;
  --coreui-secondary: #6c757d;
}

/* Minify and compress CSS */
/* Remove unused CoreUI components */
/* Optimize font loading */
```

### JavaScript Optimization
```javascript
// Production JavaScript optimizations
const productionConfig = {
  minify: true,
  compress: true,
  treeShaking: true,
  bundleAnalysis: true
};
```

### Image Optimization
```bash
# Optimize CoreUI icons
npx imagemin assets/img/coreui-icons/*.svg --out-dir=assets/img/coreui-icons/optimized

# Generate WebP versions
npx cwebp assets/img/*.png -o assets/img/*.webp
```

## Performance Monitoring

### Core Web Vitals
```javascript
// Monitor Core Web Vitals
function measureWebVitals() {
  // Largest Contentful Paint (LCP)
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay (FID)
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      console.log('FID:', entry.processingStart - entry.startTime);
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift (CLS)
  new PerformanceObserver((entryList) => {
    let clsValue = 0;
    for (const entry of entryList.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    console.log('CLS:', clsValue);
  }).observe({ entryTypes: ['layout-shift'] });
}
```

### Performance Budget
```json
{
  "budget": {
    "totalSize": "500kb",
    "jsSize": "200kb",
    "cssSize": "100kb",
    "imageSize": "200kb"
  },
  "thresholds": {
    "lcp": "2.5s",
    "fid": "100ms",
    "cls": "0.1"
  }
}
```

## Security Considerations

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https:;">
```

### Security Headers
```javascript
// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

## Monitoring and Alerting

### Application Monitoring
```javascript
// Error tracking
window.addEventListener('error', (event) => {
  console.error('JavaScript Error:', event.error);
  // Send to monitoring service
  fetch('/api/errors', {
    method: 'POST',
    body: JSON.stringify({
      message: event.error.message,
      stack: event.error.stack,
      url: window.location.href
    })
  });
});
```

### Performance Monitoring
```javascript
// Performance metrics
function trackPerformance() {
  const navigation = performance.getEntriesByType('navigation')[0];
  const metrics = {
    loadTime: navigation.loadEventEnd - navigation.loadEventStart,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
    firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
  };
  
  // Send metrics to monitoring service
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metrics)
  });
}
```

## Rollback Strategy

### Rollback Plan
```bash
# Quick rollback to previous version
git checkout v1.9.0
vercel --prod

# Database rollback (if needed)
# Restore from backup
pg_restore -d your_database backup_file.dump
```

### Health Checks
```javascript
// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.COREUI_VERSION,
    database: checkDatabaseConnection(),
    services: checkExternalServices()
  };
  
  res.json(health);
});
```

## Post-Deployment Tasks

### Immediate Tasks (0-1 hour)
- [ ] Verify all pages load correctly
- [ ] Test authentication system
- [ ] Check database connectivity
- [ ] Verify API endpoints
- [ ] Test mobile responsiveness

### Short-term Tasks (1-24 hours)
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] User feedback collection
- [ ] Bug fixes if needed
- [ ] Documentation updates

### Long-term Tasks (1-7 days)
- [ ] Performance optimization
- [ ] User training
- [ ] Feature enhancements
- [ ] Security audit
- [ ] Backup verification

## Success Metrics

### Technical Metrics
- [ ] Page load time < 3 seconds
- [ ] Core Web Vitals within thresholds
- [ ] 99.9% uptime
- [ ] Zero critical errors
- [ ] Mobile performance score > 90

### User Experience Metrics
- [ ] User satisfaction > 4.5/5
- [ ] Task completion rate > 95%
- [ ] Support tickets < 5% increase
- [ ] User adoption > 90%
- [ ] Training time < 2 hours

## Troubleshooting Guide

### Common Issues
1. **CoreUI CSS not loading**
   - Check asset paths
   - Verify Vercel configuration
   - Clear browser cache

2. **JavaScript errors**
   - Check console for errors
   - Verify CoreUI JS loading
   - Check for conflicts

3. **Mobile layout issues**
   - Test responsive breakpoints
   - Check viewport meta tag
   - Verify touch interactions

4. **Performance issues**
   - Optimize images
   - Minify CSS/JS
   - Enable compression
   - Use CDN for assets

### Debug Commands
```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs [deployment-url]

# Test API endpoints
curl -X GET https://taskm.creatorui.com/api/health

# Check database connection
curl -X GET https://taskm.creatorui.com/api/okrs-enhanced
```
