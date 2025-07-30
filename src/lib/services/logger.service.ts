/**
 * Simple Logger Service
 * Provides structured logging with correlation IDs
 */

interface LogContext {
  correlationId?: string
  [key: string]: any
}

export class LoggerService {
  private static instance: LoggerService

  private constructor() {}

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService()
    }
    return LoggerService.instance
  }

  info(message: string, context?: LogContext) {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '')
  }

  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '')
  }

  error(message: string, context?: LogContext) {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context) : '')
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '')
    }
  }
}