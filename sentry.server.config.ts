import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // ...

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
  
  debug: process.env.NODE_ENV === 'development',
  
  environment: process.env.NODE_ENV,
  
  beforeSend(event, hint) {
    // Filter out sensitive information
    if (event.request?.data) {
      const sanitized = { ...event.request.data }
      delete sanitized.password
      delete sanitized.paypalClientSecret
      delete sanitized.vapiApiKey
      delete sanitized.supabaseServiceKey
      delete sanitized.token
      event.request.data = sanitized
    }
    
    return event
  },
});