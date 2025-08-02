// Optional Sentry import - gracefully handle when package is not installed
let SentryClient: any = null
try {
  SentryClient = require('@sentry/nextjs')
} catch (error) {
  console.warn('Sentry package not installed. Client-side error tracking will be disabled.')
}

if (SentryClient && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  SentryClient.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // ...

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
  
  debug: process.env.NODE_ENV === 'development',
  
  environment: process.env.NODE_ENV,
  
  beforeSend(event: any, hint: any) {
    // Filter out sensitive information
    if (event.request?.data) {
      const sanitized = { ...event.request.data }
      delete sanitized.password
      delete sanitized.paypalClientSecret
      delete sanitized.vapiApiKey
      delete sanitized.token
      event.request.data = sanitized
    }
    
    return event
  },
  
  integrations: [
    new SentryClient.Replay({
      // Mask all text and input content
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  })
}