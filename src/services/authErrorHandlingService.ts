import { AuthError } from '@supabase/supabase-js'

export interface AuthErrorInfo {
  userMessage: string
  technicalMessage?: string
  category: 'network' | 'authentication' | 'validation' | 'rate_limit' | 'server' | 'client' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoveryActions: Array<{
    label: string
    action: string
    description?: string
    priority: 'primary' | 'secondary'
  }>
  helpText?: string
  contactSupport?: boolean
}

export interface ErrorContext {
  userEmail?: string
  lastSuccessfulLogin?: Date
  attemptCount?: number
  userAgent?: string
  timestamp: Date
}

class AuthErrorHandlingService {
  /**
   * Process authentication errors and return user-friendly information
   */
  processAuthError(error: any, _context?: ErrorContext): AuthErrorInfo {
    // Handle Supabase AuthError objects
    if (error instanceof AuthError || error?.message) {
      return this.categorizeSupabaseError(error, _context)
    }

    // Handle custom rate limiting errors
    if (error?.isRateLimited) {
      return this.handleRateLimitError(error, _context)
    }

    // Handle network errors
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error, _context)
    }

    // Handle validation errors
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, _context)
    }

    // Default unknown error
    return this.handleUnknownError(error, _context)
  }

  /**
   * Categorize Supabase authentication errors
   */
  private categorizeSupabaseError(error: AuthError | any, _context?: ErrorContext): AuthErrorInfo {
    const message = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status

    // Invalid credentials
    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return {
        userMessage: 'The email or password you entered is incorrect.',
        technicalMessage: error.message,
        category: 'authentication',
        severity: 'medium',
        recoveryActions: [
          {
            label: 'Try Again',
            action: 'retry',
            description: 'Double-check your email and password',
            priority: 'primary'
          },
          {
            label: 'Reset Password',
            action: 'reset_password',
            description: 'Get a new password if you\'ve forgotten it',
            priority: 'secondary'
          }
        ],
        helpText: 'Make sure your email is spelled correctly and check that Caps Lock is off when entering your password.',
      }
    }

    // Email not confirmed
    if (message.includes('email not confirmed') || message.includes('email not verified')) {
      return {
        userMessage: 'Please verify your email address before signing in.',
        technicalMessage: error.message,
        category: 'authentication',
        severity: 'medium',
        recoveryActions: [
          {
            label: 'Check Email',
            action: 'check_email',
            description: 'Look for the verification email in your inbox',
            priority: 'primary'
          },
          {
            label: 'Resend Email',
            action: 'resend_verification',
            description: 'Send another verification email',
            priority: 'secondary'
          }
        ],
        helpText: 'Check your spam folder if you don\'t see the verification email. The email may take a few minutes to arrive.',
      }
    }

    // User not found / signup required
    if (message.includes('user not found') || message.includes('no account found')) {
      return {
        userMessage: 'No account found with this email address.',
        technicalMessage: error.message,
        category: 'authentication',
        severity: 'medium',
        recoveryActions: [
          {
            label: 'Create Account',
            action: 'sign_up',
            description: 'Register for a new account',
            priority: 'primary'
          },
          {
            label: 'Try Different Email',
            action: 'retry',
            description: 'Use a different email address',
            priority: 'secondary'
          }
        ],
        helpText: 'You may have signed up with a different email address, or you might need to create a new account.',
      }
    }

    // Too many requests / rate limiting
    if (message.includes('too many requests') || message.includes('rate limit') || errorCode === 429) {
      return {
        userMessage: 'Too many login attempts. Please wait a few minutes before trying again.',
        technicalMessage: error.message,
        category: 'rate_limit',
        severity: 'medium',
        recoveryActions: [
          {
            label: 'Wait and Retry',
            action: 'wait_retry',
            description: 'Wait 15 minutes before attempting to log in again',
            priority: 'primary'
          },
          {
            label: 'Reset Password',
            action: 'reset_password',
            description: 'Reset your password if you\'re unsure of it',
            priority: 'secondary'
          }
        ],
        helpText: 'This is a security measure to protect your account. The wait time helps prevent unauthorized access attempts.',
      }
    }

    // Password too weak (during registration/reset)
    if (message.includes('password') && (message.includes('weak') || message.includes('short') || message.includes('requirements'))) {
      return {
        userMessage: 'Your password doesn\'t meet the security requirements.',
        technicalMessage: error.message,
        category: 'validation',
        severity: 'low',
        recoveryActions: [
          {
            label: 'Choose Stronger Password',
            action: 'retry',
            description: 'Create a password that meets all requirements',
            priority: 'primary'
          }
        ],
        helpText: 'Your password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.',
      }
    }

    // Email already registered
    if (message.includes('already registered') || message.includes('already exists') || message.includes('already taken')) {
      return {
        userMessage: 'An account with this email already exists.',
        technicalMessage: error.message,
        category: 'authentication',
        severity: 'medium',
        recoveryActions: [
          {
            label: 'Sign In Instead',
            action: 'sign_in',
            description: 'Use your existing account',
            priority: 'primary'
          },
          {
            label: 'Reset Password',
            action: 'reset_password',
            description: 'Reset your password if you\'ve forgotten it',
            priority: 'secondary'
          }
        ],
        helpText: 'You may have already created an account with this email. Try signing in instead.',
      }
    }

    // Session expired
    if (message.includes('session') && (message.includes('expired') || message.includes('invalid'))) {
      return {
        userMessage: 'Your session has expired. Please sign in again.',
        technicalMessage: error.message,
        category: 'authentication',
        severity: 'medium',
        recoveryActions: [
          {
            label: 'Sign In Again',
            action: 'sign_in',
            description: 'Start a new session',
            priority: 'primary'
          }
        ],
        helpText: 'For security reasons, sessions expire after a period of inactivity.',
      }
    }

    // Server errors (5xx)
    if (errorCode >= 500 && errorCode < 600) {
      return {
        userMessage: 'Our servers are experiencing issues. Please try again in a few minutes.',
        technicalMessage: error.message,
        category: 'server',
        severity: 'high',
        recoveryActions: [
          {
            label: 'Try Again',
            action: 'retry',
            description: 'Attempt the action again',
            priority: 'primary'
          }
        ],
        helpText: 'This is a temporary issue on our end. If the problem persists, please contact support.',
        contactSupport: true
      }
    }

    // Client errors (4xx)
    if (errorCode >= 400 && errorCode < 500 && errorCode !== 401 && errorCode !== 429) {
      return {
        userMessage: 'There was a problem with your request. Please check your information and try again.',
        technicalMessage: error.message,
        category: 'client',
        severity: 'medium',
        recoveryActions: [
          {
            label: 'Check Information',
            action: 'retry',
            description: 'Verify your email and password are correct',
            priority: 'primary'
          }
        ],
        helpText: 'Make sure all fields are filled out correctly and try again.',
      }
    }

    // Generic Supabase error
    return {
      userMessage: 'Authentication failed. Please check your credentials and try again.',
      technicalMessage: error.message,
      category: 'authentication',
      severity: 'medium',
      recoveryActions: [
        {
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt to sign in again',
          priority: 'primary'
        },
        {
          label: 'Reset Password',
          action: 'reset_password',
          description: 'Get a new password',
          priority: 'secondary'
        }
      ],
      helpText: 'Double-check your email and password, then try again.',
    }
  }

  /**
   * Handle rate limiting errors with specific guidance
   */
  private handleRateLimitError(error: any, _context?: ErrorContext): AuthErrorInfo {
    const waitTime = error.waitTimeMs ? Math.ceil(error.waitTimeMs / (1000 * 60)) : 15

    return {
      userMessage: error.message || `Too many failed attempts. Please wait ${waitTime} minute${waitTime !== 1 ? 's' : ''} before trying again.`,
      technicalMessage: `Rate limited. Wait time: ${error.waitTimeMs}ms`,
      category: 'rate_limit',
      severity: 'medium',
      recoveryActions: [
        {
          label: `Wait ${waitTime} Minutes`,
          action: 'wait',
          description: 'Security cooldown period',
          priority: 'primary'
        },
        {
          label: 'Reset Password',
          action: 'reset_password',
          description: 'If you\'re unsure of your password',
          priority: 'secondary'
        }
      ],
      helpText: 'This security measure protects your account from unauthorized access attempts. Use this time to double-check your credentials.',
    }
  }

  /**
   * Handle network connectivity errors
   */
  private handleNetworkError(error: any, _context?: ErrorContext): AuthErrorInfo {
    return {
      userMessage: 'Unable to connect to our servers. Please check your internet connection and try again.',
      technicalMessage: error.message || 'Network connectivity error',
      category: 'network',
      severity: 'high',
      recoveryActions: [
        {
          label: 'Check Connection',
          action: 'check_network',
          description: 'Verify your internet connection',
          priority: 'primary'
        },
        {
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt to reconnect',
          priority: 'secondary'
        }
      ],
      helpText: 'Make sure you\'re connected to the internet and that our service isn\'t blocked by your network.',
    }
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(error: any, _context?: ErrorContext): AuthErrorInfo {
    return {
      userMessage: 'Please check your information and try again.',
      technicalMessage: error.message || 'Validation error',
      category: 'validation',
      severity: 'low',
      recoveryActions: [
        {
          label: 'Fix Information',
          action: 'retry',
          description: 'Correct the highlighted fields',
          priority: 'primary'
        }
      ],
      helpText: 'Make sure all required fields are filled out correctly and meet the specified requirements.',
    }
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(error: any, _context?: ErrorContext): AuthErrorInfo {
    return {
      userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      technicalMessage: error?.message || error?.toString() || 'Unknown error',
      category: 'unknown',
      severity: 'high',
      recoveryActions: [
        {
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt the action again',
          priority: 'primary'
        }
      ],
      helpText: 'If this error continues to occur, please contact our support team for assistance.',
      contactSupport: true
    }
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    const message = error?.message?.toLowerCase() || ''
    const name = error?.name?.toLowerCase() || ''
    
    return (
      name.includes('networkerror') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('offline') ||
      error?.code === 'NETWORK_ERROR' ||
      error?.type === 'network'
    )
  }

  /**
   * Check if error is validation-related
   */
  private isValidationError(error: any): boolean {
    const message = error?.message?.toLowerCase() || ''
    
    return (
      message.includes('invalid') && (
        message.includes('email') ||
        message.includes('format') ||
        message.includes('required')
      ) ||
      error?.code === 'VALIDATION_ERROR' ||
      error?.type === 'validation'
    )
  }

  /**
   * Get contextual help based on user behavior patterns
   */
  getContextualHelp(errorInfo: AuthErrorInfo, context?: ErrorContext): string[] {
    const tips: string[] = []

    if (context?.attemptCount && context.attemptCount > 3) {
      tips.push('Multiple failed attempts detected. Consider resetting your password if you\'re unsure of it.')
    }

    if (context?.lastSuccessfulLogin) {
      const daysSinceLastLogin = Math.floor((Date.now() - context.lastSuccessfulLogin.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLastLogin > 30) {
        tips.push('It\'s been a while since your last login. Your password may have been changed or expired.')
      }
    }

    if (errorInfo.category === 'authentication') {
      tips.push('Remember that passwords are case-sensitive.')
      tips.push('Make sure you\'re using the same email address you registered with.')
    }

    if (errorInfo.category === 'network') {
      tips.push('Try refreshing the page or switching to a different network.')
      tips.push('If you\'re on a corporate network, check if our service is accessible.')
    }

    return tips
  }

  /**
   * Generate user-friendly error message with recovery suggestions
   */
  formatErrorForUser(errorInfo: AuthErrorInfo, context?: ErrorContext): {
    title: string
    message: string
    actions: AuthErrorInfo['recoveryActions']
    helpText?: string
    tips?: string[]
  } {
    const title = this.getErrorTitle(errorInfo.category)
    const tips = this.getContextualHelp(errorInfo, context)

    return {
      title,
      message: errorInfo.userMessage,
      actions: errorInfo.recoveryActions,
      helpText: errorInfo.helpText,
      tips: tips.length > 0 ? tips : undefined
    }
  }

  /**
   * Get appropriate error title based on category
   */
  private getErrorTitle(category: AuthErrorInfo['category']): string {
    switch (category) {
      case 'authentication':
        return 'Sign In Problem'
      case 'validation':
        return 'Information Required'
      case 'rate_limit':
        return 'Too Many Attempts'
      case 'network':
        return 'Connection Problem'
      case 'server':
        return 'Service Temporarily Unavailable'
      case 'client':
        return 'Request Problem'
      default:
        return 'Unexpected Error'
    }
  }

  /**
   * Log error for analytics and debugging
   */
  logError(errorInfo: AuthErrorInfo, context?: ErrorContext): void {
    const logData = {
      category: errorInfo.category,
      severity: errorInfo.severity,
      userMessage: errorInfo.userMessage,
      technicalMessage: errorInfo.technicalMessage,
      timestamp: new Date().toISOString(),
      userAgent: context?.userAgent || navigator.userAgent,
      attemptCount: context?.attemptCount,
      userEmail: context?.userEmail ? this.maskEmail(context.userEmail) : undefined
    }

    if (errorInfo.severity === 'high' || errorInfo.severity === 'critical') {
      console.error('Auth Error (High Severity):', logData)
    } else {
      console.warn('Auth Error:', logData)
    }

    // In production, send to analytics service
    // analytics.track('auth_error', logData)
  }

  /**
   * Mask email for privacy in logs
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`
    }
    return `${local.substring(0, 2)}***@${domain}`
  }
}

// Export singleton instance
export const authErrorHandlingService = new AuthErrorHandlingService()