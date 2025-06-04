import { supabase } from '../lib/supabase'

export interface ErrorInfo {
  type: 'network' | 'auth' | 'validation' | 'server' | 'client' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  userMessage: string
  action?: 'retry' | 'refresh' | 'logout' | 'contact_support' | 'none'
  retryable: boolean
  code?: string
  details?: any
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

class ErrorHandlingService {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  }

  /**
   * Analyze and categorize an error
   */
  analyzeError(error: any): ErrorInfo {
    // Network errors
    if (this.isNetworkError(error)) {
      return {
        type: 'network',
        severity: 'high',
        message: error.message || 'Network connection failed',
        userMessage: 'Connection lost. Please check your internet connection and try again.',
        action: 'retry',
        retryable: true,
        code: 'NETWORK_ERROR',
        details: error
      }
    }

    // Supabase auth errors
    if (this.isSupabaseAuthError(error)) {
      return this.handleSupabaseAuthError(error)
    }

    // Supabase database errors
    if (this.isSupabaseDatabaseError(error)) {
      return this.handleSupabaseDatabaseError(error)
    }

    // Validation errors
    if (this.isValidationError(error)) {
      return {
        type: 'validation',
        severity: 'low',
        message: error.message || 'Validation failed',
        userMessage: error.message || 'Please check your input and try again.',
        action: 'none',
        retryable: false,
        code: 'VALIDATION_ERROR',
        details: error
      }
    }

    // Default unknown error
    return {
      type: 'unknown',
      severity: 'medium',
      message: error.message || 'An unexpected error occurred',
      userMessage: 'Something went wrong. Please try again or contact support if the problem persists.',
      action: 'retry',
      retryable: true,
      code: 'UNKNOWN_ERROR',
      details: error
    }
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    if (!error) return false

    const networkIndicators = [
      'fetch',
      'network',
      'connection',
      'timeout',
      'offline',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'NetworkError'
    ]

    const errorString = JSON.stringify(error).toLowerCase()
    const messageString = (error.message || '').toLowerCase()

    return networkIndicators.some(indicator => 
      errorString.includes(indicator) || messageString.includes(indicator)
    ) || !navigator.onLine
  }

  /**
   * Check if error is from Supabase auth
   */
  private isSupabaseAuthError(error: any): boolean {
    return error?.code?.startsWith?.('auth') || 
           error?.name === 'AuthError' ||
           error?.message?.includes?.('auth') ||
           error?.status === 401 ||
           error?.status === 403
  }

  /**
   * Check if error is from Supabase database
   */
  private isSupabaseDatabaseError(error: any): boolean {
    return error?.code?.startsWith?.('PGRST') ||
           error?.hint ||
           error?.details ||
           (error?.status >= 400 && error?.status < 500)
  }

  /**
   * Check if error is validation-related
   */
  private isValidationError(error: any): boolean {
    const validationIndicators = [
      'validation',
      'invalid',
      'required',
      'format',
      'length',
      'pattern'
    ]

    const messageString = (error.message || '').toLowerCase()
    return validationIndicators.some(indicator => 
      messageString.includes(indicator)
    )
  }

  /**
   * Handle Supabase authentication errors
   */
  private handleSupabaseAuthError(error: any): ErrorInfo {
    const message = error.message || ''

    // Rate limiting
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return {
        type: 'auth',
        severity: 'medium',
        message: message,
        userMessage: 'Too many attempts. Please wait a few minutes before trying again.',
        action: 'none',
        retryable: false,
        code: 'RATE_LIMITED'
      }
    }

    // Invalid credentials
    if (message.includes('invalid') && message.includes('credentials')) {
      return {
        type: 'auth',
        severity: 'low',
        message: message,
        userMessage: 'Invalid email or password. Please check your credentials and try again.',
        action: 'none',
        retryable: false,
        code: 'INVALID_CREDENTIALS'
      }
    }

    // Email not confirmed
    if (message.includes('email') && (message.includes('confirm') || message.includes('verify'))) {
      return {
        type: 'auth',
        severity: 'medium',
        message: message,
        userMessage: 'Please verify your email address before signing in. Check your inbox for a verification link.',
        action: 'none',
        retryable: false,
        code: 'EMAIL_NOT_VERIFIED'
      }
    }

    // Session expired
    if (message.includes('session') || message.includes('token') || error.status === 401) {
      return {
        type: 'auth',
        severity: 'high',
        message: message,
        userMessage: 'Your session has expired. Please sign in again.',
        action: 'logout',
        retryable: false,
        code: 'SESSION_EXPIRED'
      }
    }

    // Generic auth error
    return {
      type: 'auth',
      severity: 'medium',
      message: message,
      userMessage: 'Authentication failed. Please try signing in again.',
      action: 'logout',
      retryable: false,
      code: 'AUTH_ERROR'
    }
  }

  /**
   * Handle Supabase database errors
   */
  private handleSupabaseDatabaseError(error: any): ErrorInfo {
    const message = error.message || ''

    // Permission denied
    if (error.status === 403 || message.includes('permission') || message.includes('denied')) {
      return {
        type: 'server',
        severity: 'high',
        message: message,
        userMessage: 'You don\'t have permission to perform this action.',
        action: 'none',
        retryable: false,
        code: 'PERMISSION_DENIED'
      }
    }

    // Not found
    if (error.status === 404 || message.includes('not found')) {
      return {
        type: 'client',
        severity: 'medium',
        message: message,
        userMessage: 'The requested data was not found.',
        action: 'refresh',
        retryable: false,
        code: 'NOT_FOUND'
      }
    }

    // Server error
    if (error.status >= 500) {
      return {
        type: 'server',
        severity: 'high',
        message: message,
        userMessage: 'Server error. Please try again later or contact support.',
        action: 'retry',
        retryable: true,
        code: 'SERVER_ERROR'
      }
    }

    // Generic database error
    return {
      type: 'server',
      severity: 'medium',
      message: message,
      userMessage: 'Database operation failed. Please try again.',
      action: 'retry',
      retryable: true,
      code: 'DATABASE_ERROR'
    }
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig }
    let lastError: any
    let delay = config.baseDelay

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        const errorInfo = this.analyzeError(error)

        // Don't retry if error is not retryable
        if (!errorInfo.retryable || attempt === config.maxAttempts) {
          throw error
        }

        // Log retry attempt
        console.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}):`, errorInfo.message)
        console.log(`Retrying in ${delay}ms...`)

        // Wait before retry
        await this.delay(delay)

        // Increase delay for next attempt (exponential backoff)
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay)
      }
    }

    throw lastError
  }

  /**
   * Check network connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false
    }

    try {
      // Try to reach Supabase
      const { error } = await supabase.from('connectivity_check').select('*').limit(1)
      return !error || error.code !== 'PGRST301' // PGRST301 is "relation does not exist" which means we're connected
    } catch (error) {
      return false
    }
  }

  /**
   * Get user-friendly error message based on error analysis
   */
  getUserMessage(error: any): string {
    const errorInfo = this.analyzeError(error)
    return errorInfo.userMessage
  }

  /**
   * Get suggested action for error
   */
  getSuggestedAction(error: any): ErrorInfo['action'] {
    const errorInfo = this.analyzeError(error)
    return errorInfo.action
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: any): boolean {
    const errorInfo = this.analyzeError(error)
    return errorInfo.retryable
  }

  /**
   * Log error with context
   */
  logError(error: any, context?: string): void {
    const errorInfo = this.analyzeError(error)
    
    const logData = {
      timestamp: new Date().toISOString(),
      context,
      type: errorInfo.type,
      severity: errorInfo.severity,
      code: errorInfo.code,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage,
      retryable: errorInfo.retryable,
      action: errorInfo.action,
      details: errorInfo.details,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      url: window.location.href
    }

    // Log based on severity
    switch (errorInfo.severity) {
      case 'critical':
        console.error('CRITICAL ERROR:', logData)
        break
      case 'high':
        console.error('HIGH SEVERITY ERROR:', logData)
        break
      case 'medium':
        console.warn('MEDIUM SEVERITY ERROR:', logData)
        break
      case 'low':
        console.log('LOW SEVERITY ERROR:', logData)
        break
    }

    // In a production app, you would also send this to an error reporting service
    // like Sentry, LogRocket, or a custom logging endpoint
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService() 