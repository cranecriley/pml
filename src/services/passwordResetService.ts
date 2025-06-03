import { authService } from './authService'
import { validateEmail } from '../utils/validation'
import type { PasswordResetRequest } from '../types/auth'

export interface PasswordResetResult {
  success: boolean
  message: string
  email: string
}

export interface PasswordResetValidation {
  isValid: boolean
  errors: {
    email?: string
  }
}

class PasswordResetService {
  /**
   * Validate password reset request
   */
  validateResetRequest(request: PasswordResetRequest): PasswordResetValidation {
    const errors: { email?: string } = {}
    
    const emailError = validateEmail(request.email)
    if (emailError) {
      errors.email = emailError
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetResult> {
    // Validate email first
    const validation = this.validateResetRequest(request)
    if (!validation.isValid) {
      throw new Error('Please provide a valid email address')
    }

    try {
      await authService.requestPasswordReset(request)
      
      return {
        success: true,
        message: `Password reset instructions have been sent to ${request.email}. Please check your inbox and spam folder.`,
        email: request.email
      }
    } catch (error: any) {
      // Handle specific Supabase errors
      if (error.message) {
        if (error.message.includes('User not found') || error.message.includes('Email not found')) {
          // For security reasons, we don't want to reveal if an email exists or not
          // So we return success even if the email doesn't exist
          return {
            success: true,
            message: `If an account with ${request.email} exists, password reset instructions have been sent.`,
            email: request.email
          }
        }
        
        if (error.message.includes('Email rate limit exceeded') || error.message.includes('Too many requests')) {
          throw new Error('Too many password reset requests. Please wait a few minutes before trying again.')
        }
        
        if (error.message.includes('Invalid email')) {
          throw new Error('Please provide a valid email address.')
        }
      }
      
      // For any other error, provide a generic message
      throw new Error('Unable to send password reset email. Please try again later.')
    }
  }

  /**
   * Request password reset with rate limiting
   */
  async requestPasswordResetWithRateLimit(request: PasswordResetRequest): Promise<PasswordResetResult> {
    try {
      return await this.requestPasswordReset(request)
    } catch (error: any) {
      // Enhanced rate limiting error handling
      if (error.message.includes('Too many requests') || error.message.includes('rate limit')) {
        throw new Error('Too many password reset attempts. Please wait 5 minutes before requesting another reset.')
      }
      throw error
    }
  }

  /**
   * Check if email is associated with an account (for UX purposes)
   * Note: This should be used carefully to avoid revealing if accounts exist
   */
  async checkEmailExists(email: string): Promise<boolean> {
    // Validate email format first
    const emailError = validateEmail(email)
    if (emailError) {
      return false
    }

    try {
      // We don't actually want to expose this information for security reasons
      // Instead, we'll always return true and let the reset request handle it securely
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get helpful instructions for password reset
   */
  getPasswordResetInstructions(email: string): {
    nextSteps: string[]
    troubleshooting: string[]
    securityNote: string
  } {
    return {
      nextSteps: [
        `Check your email inbox for a message from your language learning app`,
        `Look for an email with the subject "Reset your password"`,
        `Click the "Reset Password" button or link in the email`,
        `You'll be redirected to create a new password`,
        `Choose a strong password that's at least 8 characters long`
      ],
      troubleshooting: [
        `Check your spam or junk folder`,
        `Make sure you entered the correct email address: ${email}`,
        `Wait a few minutes - emails can sometimes be delayed`,
        `Try requesting another reset if you don't receive the email within 10 minutes`
      ],
      securityNote: `For security reasons, password reset links expire after 1 hour. If your link has expired, you'll need to request a new one.`
    }
  }

  /**
   * Validate that a password reset is legitimate (could be expanded for additional security)
   */
  validateResetAttempt(email: string): boolean {
    // Basic validation - could be expanded with more security checks
    const emailError = validateEmail(email)
    return !emailError
  }

  /**
   * Log password reset attempts (for security monitoring)
   * In a real app, this might send data to an analytics service
   */
  logPasswordResetAttempt(email: string, success: boolean, errorType?: string): void {
    const logData = {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Partially mask email for privacy
      success,
      errorType,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }
    
    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset attempt:', logData)
    }
    
    // In production, you might send this to your analytics/monitoring service
    // analytics.track('password_reset_attempt', logData)
  }
}

// Export singleton instance
export const passwordResetService = new PasswordResetService()