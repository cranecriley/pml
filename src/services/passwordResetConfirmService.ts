import { supabase } from '../lib/supabase'
import { validatePassword, validatePasswordConfirm } from '../utils/validation'

export interface PasswordResetConfirmRequest {
  newPassword: string
  confirmPassword: string
}

export interface PasswordResetConfirmResult {
  success: boolean
  message: string
  shouldRedirectToLogin?: boolean
}

export interface PasswordResetConfirmValidation {
  isValid: boolean
  errors: {
    newPassword?: string
    confirmPassword?: string
  }
}

class PasswordResetConfirmService {
  /**
   * Validate password reset confirmation data
   */
  validateResetConfirm(request: PasswordResetConfirmRequest): PasswordResetConfirmValidation {
    const errors: { newPassword?: string; confirmPassword?: string } = {}
    
    const passwordError = validatePassword(request.newPassword)
    if (passwordError) {
      errors.newPassword = passwordError
    }
    
    const confirmPasswordError = validatePasswordConfirm(request.newPassword, request.confirmPassword)
    if (confirmPasswordError) {
      errors.confirmPassword = confirmPasswordError
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Update password using reset token
   * This method expects to be called when the user arrives via a password reset link
   */
  async updatePasswordWithToken(request: PasswordResetConfirmRequest): Promise<PasswordResetConfirmResult> {
    // Validate passwords first
    const validation = this.validateResetConfirm(request)
    if (!validation.isValid) {
      throw new Error('Please check your password requirements and try again')
    }

    try {
      // Update the user's password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: request.newPassword
      })

      if (error) {
        throw error
      }

      return {
        success: true,
        message: 'Password updated successfully! You can now sign in with your new password.',
        shouldRedirectToLogin: true
      }
    } catch (error: any) {
      // Handle specific Supabase errors
      if (error.message) {
        if (error.message.includes('Password should be at least')) {
          throw new Error('Password must be at least 8 characters long.')
        }
        
        if (error.message.includes('weak password') || error.message.includes('password strength')) {
          throw new Error('Please choose a stronger password with a mix of letters, numbers, and symbols.')
        }
        
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          throw new Error('This password reset link has expired or is invalid. Please request a new password reset.')
        }
        
        if (error.message.includes('session_not_found') || error.message.includes('not authenticated')) {
          throw new Error('Your session has expired. Please request a new password reset link.')
        }
        
        if (error.message.includes('same password') || error.message.includes('must be different')) {
          throw new Error('Your new password must be different from your current password.')
        }
      }
      
      // Generic error message for unexpected errors
      throw new Error('Unable to update password. Please try again or request a new password reset link.')
    }
  }

  /**
   * Check if user has a valid session for password reset
   */
  async checkResetSession(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        return {
          isValid: false,
          error: 'Invalid or expired password reset session. Please request a new password reset.'
        }
      }
      
      if (!session) {
        return {
          isValid: false,
          error: 'No active password reset session found. Please click the password reset link from your email.'
        }
      }
      
      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: 'Unable to verify password reset session. Please try again.'
      }
    }
  }

  /**
   * Get password requirements for display
   */
  getPasswordRequirements(): {
    title: string
    requirements: string[]
    tips: string[]
  } {
    return {
      title: 'Password Requirements',
      requirements: [
        'At least 8 characters long',
        'Contains at least one letter',
        'Can include numbers and special characters',
        'Must be different from your current password'
      ],
      tips: [
        'Use a mix of uppercase and lowercase letters',
        'Include numbers and special characters for extra security',
        'Avoid common words or personal information',
        'Consider using a passphrase with multiple words'
      ]
    }
  }

  /**
   * Handle successful password reset completion
   */
  async handleResetSuccess(): Promise<void> {
    try {
      // Sign out to ensure clean state
      await supabase.auth.signOut()
    } catch (error) {
      // Even if signout fails, we don't want to throw an error
      console.warn('Warning during post-reset cleanup:', error)
    }
  }

  /**
   * Get security tips for after password reset
   */
  getSecurityTips(): {
    title: string
    tips: string[]
    warning: string
  } {
    return {
      title: 'Security Tips',
      tips: [
        'Sign in with your new password to verify it works',
        'Update your password manager with the new password',
        'Review your account activity for any suspicious access',
        'Consider enabling additional security measures in the future'
      ],
      warning: 'If you did not request this password reset, please contact support immediately.'
    }
  }

  /**
   * Handle password reset errors with user-friendly messages
   */
  getErrorGuidance(errorMessage: string): {
    userMessage: string
    actions: string[]
    severity: 'warning' | 'error'
  } {
    if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
      return {
        userMessage: 'This password reset link has expired or is no longer valid.',
        actions: [
          'Request a new password reset from the login page',
          'Check that you clicked the most recent reset link',
          'Make sure you\'re using the complete link from your email'
        ],
        severity: 'warning'
      }
    }
    
    if (errorMessage.includes('session') || errorMessage.includes('authenticated')) {
      return {
        userMessage: 'Your password reset session has expired.',
        actions: [
          'Request a new password reset',
          'Click the reset link within 1 hour of receiving it',
          'Don\'t close your browser before completing the reset'
        ],
        severity: 'warning'
      }
    }
    
    if (errorMessage.includes('weak') || errorMessage.includes('strength')) {
      return {
        userMessage: 'Please choose a stronger password.',
        actions: [
          'Use at least 8 characters',
          'Mix uppercase and lowercase letters',
          'Include numbers and special characters',
          'Avoid common words or personal information'
        ],
        severity: 'error'
      }
    }
    
    return {
      userMessage: 'An error occurred while updating your password.',
      actions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Request a new password reset if the problem persists'
      ],
      severity: 'error'
    }
  }
}

// Export singleton instance
export const passwordResetConfirmService = new PasswordResetConfirmService()