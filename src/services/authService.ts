import { supabase } from '../lib/supabase'
import { errorHandlingService } from './errorHandlingService'
import type { RegisterCredentials, PasswordResetRequest } from '../types/auth'

export interface RegistrationResult {
  user: any
  session: any
  needsEmailVerification: boolean
}

export interface EmailVerificationStatus {
  isVerified: boolean
  email?: string
}

class AuthService {
  /**
   * Register a new user with email verification
   */
  async registerWithEmailVerification(credentials: RegisterCredentials): Promise<RegistrationResult> {
    const { email, password } = credentials
    
    try {
      return await errorHandlingService.executeWithRetry(async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`
          }
        })

        if (error) {
          errorHandlingService.logError(error, 'registerWithEmailVerification')
          throw error
        }

        // Check if user needs email verification
        const needsEmailVerification = !data.session && !!data.user
        
        return {
          user: data.user,
          session: data.session,
          needsEmailVerification
        }
      }, { maxAttempts: 2 })
    } catch (error) {
      const userMessage = errorHandlingService.getUserMessage(error)
      const enhancedError = new Error(userMessage)
      ;(enhancedError as any).originalError = error
      throw enhancedError
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<void> {
    try {
      await errorHandlingService.executeWithRetry(async () => {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`
          }
        })

        if (error) {
          errorHandlingService.logError(error, 'resendEmailVerification')
          throw error
        }
      }, { maxAttempts: 2 })
    } catch (error) {
      const userMessage = errorHandlingService.getUserMessage(error)
      const enhancedError = new Error(userMessage)
      ;(enhancedError as any).originalError = error
      throw enhancedError
    }
  }

  /**
   * Check email verification status
   */
  async checkEmailVerificationStatus(): Promise<EmailVerificationStatus> {
    const { data: { user } } = await supabase.auth.getUser()
    
    return {
      isVerified: !!user?.email_confirmed_at,
      email: user?.email
    }
  }

  /**
   * Handle email confirmation from URL parameters
   */
  async confirmEmail(): Promise<void> {
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }

    if (!data.session) {
      throw new Error('No session found after email confirmation')
    }
  }

  /**
   * Sign in with email and password with error handling
   */
  async signIn(credentials: { email: string; password: string }) {
    try {
      return await errorHandlingService.executeWithRetry(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (error) {
          errorHandlingService.logError(error, 'signIn')
          throw error
        }

        return data
      }, { maxAttempts: 2 }) // Retry once for auth operations
    } catch (error) {
      // Re-throw with enhanced error information
      const userMessage = errorHandlingService.getUserMessage(error)
      const enhancedError = new Error(userMessage)
      ;(enhancedError as any).originalError = error
      throw enhancedError
    }
  }

  /**
   * Sign out with error handling
   */
  async signOut() {
    try {
      return await errorHandlingService.executeWithRetry(async () => {
        const { error } = await supabase.auth.signOut()

        if (error) {
          errorHandlingService.logError(error, 'signOut')
          throw error
        }
      }, { maxAttempts: 1 }) // Don't retry logout operations
    } catch (error) {
      errorHandlingService.logError(error, 'signOut')
      // For logout, we don't want to throw errors - just log them
      console.warn('Logout warning:', error)
    }
  }

  /**
   * Request password reset (alias for resetPassword for backward compatibility)
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    await this.resetPassword(request.email)
  }

  /**
   * Reset password with error handling
   */
  async resetPassword(email: string) {
    try {
      return await errorHandlingService.executeWithRetry(async () => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })

        if (error) {
          errorHandlingService.logError(error, 'resetPassword')
          throw error
        }

        return data
      }, { maxAttempts: 2 })
    } catch (error) {
      const userMessage = errorHandlingService.getUserMessage(error)
      const enhancedError = new Error(userMessage)
      ;(enhancedError as any).originalError = error
      throw enhancedError
    }
  }

  /**
   * Update password with error handling
   */
  async updatePassword(password: string) {
    try {
      return await errorHandlingService.executeWithRetry(async () => {
        const { data, error } = await supabase.auth.updateUser({
          password: password
        })

        if (error) {
          errorHandlingService.logError(error, 'updatePassword')
          throw error
        }

        return data
      }, { maxAttempts: 2 })
    } catch (error) {
      const userMessage = errorHandlingService.getUserMessage(error)
      const enhancedError = new Error(userMessage)
      ;(enhancedError as any).originalError = error
      throw enhancedError
    }
  }

  /**
   * Get current session with error handling
   */
  async getCurrentSession() {
    try {
      return await errorHandlingService.executeWithRetry(async () => {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          errorHandlingService.logError(error, 'getCurrentSession')
          throw error
        }

        return session
      }, { maxAttempts: 2 })
    } catch (error) {
      errorHandlingService.logError(error, 'getCurrentSession')
      return null
    }
  }

  /**
   * Get current user with error handling
   */
  async getCurrentUser() {
    try {
      return await errorHandlingService.executeWithRetry(async () => {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          errorHandlingService.logError(error, 'getCurrentUser')
          throw error
        }

        return user
      }, { maxAttempts: 2 })
    } catch (error) {
      errorHandlingService.logError(error, 'getCurrentUser')
      return null
    }
  }

  /**
   * Refresh session with error handling
   */
  async refreshSession() {
    try {
      return await errorHandlingService.executeWithRetry(async () => {
        const { data, error } = await supabase.auth.refreshSession()

        if (error) {
          errorHandlingService.logError(error, 'refreshSession')
          throw error
        }

        return data
      }, { maxAttempts: 2 })
    } catch (error) {
      const userMessage = errorHandlingService.getUserMessage(error)
      const enhancedError = new Error(userMessage)
      ;(enhancedError as any).originalError = error
      throw enhancedError
    }
  }
}

// Export singleton instance
export const authService = new AuthService()