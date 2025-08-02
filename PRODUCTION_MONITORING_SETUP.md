# Production Monitoring Setup

This document outlines the comprehensive monitoring, error tracking, and production safety systems implemented in Voice Matrix.

## 🚀 Production Blockers Status

### ✅ 1. Usage Enforcement - COMPLETED
- Fixed `checkSubscriptionLimits()` function in `src/lib/auth.ts`
- Implemented real database queries instead of placeholder `return true`
- Added proper assistant and minute limit checking
- Created `UsageService` class for comprehensive usage management
- Added automatic usage tracking triggers in database

### ✅ 2. Rate Limiting - COMPLETED  
- Implemented comprehensive rate limiting system in `src/lib/middleware/rate-limiting.ts`
- Multi-layer protection with different configs for different endpoints:
  - API endpoints: 100 requests/15min per IP
  - Auth endpoints: 10 requests/15min per IP (stricter)
  - Webhook endpoints: 30 requests/min per IP
  - Assistant operations: 20 requests/hour per user
  - Call operations: 50 requests/5min per user
- Applied to critical endpoints:
  - `/api/assistants` (GET/POST)
  - `/api/webhooks/vapi`
  - `/api/health`
- In-memory rate limiter with automatic cleanup
- Production-ready with Redis-like behavior

### ✅ 3. Error Tracking - COMPLETED
- Comprehensive Sentry integration in `src/lib/monitoring/sentry.ts`
- Multi-level error tracking system:
  - API errors with full context
  - Authentication errors
  - Payment errors (critical)
  - VAPI integration errors
  - Usage violation tracking
- Performance monitoring for slow operations
- Business metrics tracking
- Health monitoring for all external services

## 📊 Monitoring Components

### Error Tracking (`src/lib/monitoring/sentry.ts`)

**ErrorTracker Class:**
- `captureError()` - General error capture with context
- `captureApiError()` - API-specific errors with request context
- `captureAuthError()` - Authentication failures
- `capturePaymentError()` - Payment processing errors (critical)
- `captureVapiError()` - VAPI integration issues
- `captureUsageViolation()` - Usage limit violations

**PerformanceTracker Class:**
- `startTransaction()` - Begin performance tracking
- `endTransaction()` - Complete with success/failure metrics
- Automatic alerting on operations >5 seconds
- Detailed operation metadata

**BusinessMetrics Class:**
- `trackSignup()` - User registration events
- `trackSubscriptionChange()` - Plan upgrades/downgrades
- `trackAssistantCreated()` - Feature usage
- `trackCallCompleted()` - Core business metrics

**HealthMonitor Class:**
- `checkDatabaseHealth()` - Database connectivity
- `checkVapiHealth()` - VAPI service status
- `checkPayPalHealth()` - Payment processor status
- `runHealthChecks()` - Comprehensive system health

### Rate Limiting (`src/lib/middleware/rate-limiting.ts`)

**Configuration:**
```typescript
const RATE_LIMIT_CONFIGS = {
  api: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  webhook: { windowMs: 1 * 60 * 1000, maxRequests: 30 },
  assistant: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  calls: { windowMs: 5 * 60 * 1000, maxRequests: 50 }
}
```

**Features:**
- IP-based and user-based rate limiting
- Automatic cleanup of expired entries
- Graceful degradation (fail-open on errors)
- Detailed rate limit headers in responses
- Persistent tracking for brute force detection

### Usage Enforcement (`src/lib/middleware/usage-enforcement.ts`)

**UsageService Class:**
- Real-time usage checking against subscription limits
- Assistant creation limits
- Monthly minute limits
- Automatic usage tracking on call completion
- Database triggers for real-time updates

### Health Monitoring (`src/app/api/health/route.ts`)

**Health Check Endpoint:**
- Database connectivity verification
- VAPI API key validation
- Environment variable validation
- Rate limiting protection
- Automatic error reporting to Sentry

## 🛠️ Setup Instructions

### 1. Sentry Configuration

1. Create Sentry account and project
2. Add environment variables:
```bash
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
NEXT_PUBLIC_SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_sentry_organization
SENTRY_PROJECT=your_sentry_project
```

3. Install Sentry dependencies:
```bash
npm install @sentry/nextjs
```

### 2. Database Setup

Run the usage tracking trigger:
```sql
-- Execute add_usage_tracking_trigger.sql
-- This creates automatic usage tracking on call completion
```

### 3. Environment Variables

Copy `.env.example` to `.env.local` and configure:
- All existing environment variables
- New Sentry configuration
- Optional monitoring endpoints

## 🔍 Monitoring Dashboard

### Health Check Endpoint
`GET /api/health` - System health status
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "checks": {
    "app": true,
    "database": true,
    "vapi": true,
    "environment": true
  }
}
```

### Error Categories Tracked

1. **Critical Errors** (Sentry level: fatal)
   - Payment processing failures
   - Database connection failures
   - VAPI integration failures

2. **Important Errors** (Sentry level: error)
   - API endpoint failures
   - Authentication failures
   - Usage limit violations

3. **Warnings** (Sentry level: warning)
   - Performance issues (>5s operations)
   - Service degradation
   - Usage approaching limits

4. **Info** (Sentry level: info)
   - User signups
   - Subscription changes
   - Feature usage metrics

## 📈 Production Readiness

### Immediate Benefits
- **Real-time error tracking** with full context
- **Performance monitoring** for slow operations
- **Rate limiting protection** against abuse
- **Usage enforcement** preventing overuse
- **Health monitoring** for service dependencies

### Long-term Benefits
- **Business intelligence** from usage metrics
- **Proactive monitoring** of system health
- **Automated alerting** for critical issues
- **Performance optimization** insights
- **User behavior analytics**

## 🚨 Alerting Setup

### Critical Alerts (Immediate Response)
- Payment processing failures
- Database connectivity issues
- VAPI service outages
- Rate limit threshold breaches

### Warning Alerts (Monitor)
- Performance degradation
- Usage limit approaches
- Error rate increases
- Health check failures

### Business Metrics (Daily/Weekly Reports)
- User signup trends
- Subscription conversion rates
- Feature adoption metrics
- Revenue tracking

## 🔄 Maintenance

### Weekly Tasks
- Review error rates and trends
- Check performance metrics
- Verify health check status
- Clean up old rate limit entries

### Monthly Tasks
- Analyze business metrics
- Optimize rate limiting thresholds
- Review Sentry event retention
- Update monitoring dashboards

## 🎯 Success Metrics

The Voice Matrix platform now has enterprise-grade monitoring covering:

1. ✅ **Error Tracking**: Comprehensive error capture with context
2. ✅ **Performance Monitoring**: Operation timing and bottleneck detection
3. ✅ **Rate Limiting**: Multi-layer abuse protection
4. ✅ **Usage Enforcement**: Real subscription limit enforcement  
5. ✅ **Health Monitoring**: Service dependency tracking
6. ✅ **Business Metrics**: User behavior and revenue insights

This monitoring system provides complete visibility into system health, user behavior, and business performance, enabling proactive issue resolution and data-driven decision making.