import { authService } from './authService'
import { validateEmail, validatePassword } from '../utils/validation'
import type { LoginCredentials } from '../types/auth'

export interface LoginResult {
  user: any
  session: any
  needsEmailVerification: boolean
}

export interface LoginValidationResult {
  isValid: boolean
  errors: {
    email?: string
    password?: string
  }
}

class LoginService {
  /**
   * Validate login credentials before attempting authentication
   */
  validateLoginCredentials(credentials: LoginCredentials): LoginValidationResult {
    const errors: { email?: string; password?: string } = {}
    
    const emailError = validateEmail(credentials.email)
    if (emailError) {
      errors.email = emailError
    }
    
    const passwordError = validatePassword(credentials.password)
    if (passwordError) {
      errors.password = passwordError
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Attempt to log in user with email and password
   */
  async loginWithEmailPassword(credentials: LoginCredentials): Promise<LoginResult> {
    // Validate credentials first
    const validation = this.validateLoginCredentials(credentials)
    if (!validation.isValid) {
      throw new Error('Invalid credentials provided')
    }

    try {
      const authResult = await authService.signIn(credentials)
      
      // Check if user needs email verification
      const needsEmailVerification = !authResult.session && !!authResult.user && !authResult.user.email_confirmed_at
      
      if (needsEmailVerification) {
        throw new Error('Please verify your email address before logging in. Check your inbox for a verification link.')
      }

      return {
        user: authResult.user,
        session: authResult.session,
        needsEmailVerification: false
      }
    } catch (error: any) {
      // Handle specific Supabase auth errors
      if (error.message) {
        // Common Supabase auth error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.')
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before logging in. Check your inbox for a verification link.')
        }
        if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a few minutes before trying again.')
        }
        if (error.message.includes('User not found')) {
          throw new Error('No account found with this email address. Please check your email or create a new account.')
        }
      }
      
      // Re-throw the error if it's already user-friendly, otherwise provide a generic message
      throw error.message ? error : new Error('Login failed. Please try again.')
    }
  }

  /**
   * Handle login with rate limiting check
   */
  async loginWithRateLimit(credentials: LoginCredentials, maxAttempts: number = 5): Promise<LoginResult> {
    // In a real implementation, you might track failed attempts in localStorage or server-side
    // For now, we'll rely on Supabase's built-in rate limiting
    
    try {
      return await this.loginWithEmailPassword(credentials)
    } catch (error: any) {
      // If it's a rate limit error, provide helpful guidance
      if (error.message.includes('Too many requests') || error.message.includes('rate limit')) {
        throw new Error(`Too many failed login attempts. Please wait 15 minutes before trying again, or try resetting your password.`)
      }
      throw error
    }
  }

  /**
   * Check if user is currently logged in
   */
  async checkCurrentLoginStatus() {
    try {
      const session = await authService.getCurrentSession()
      const user = await authService.getCurrentUser()
      
      return {
        isLoggedIn: !!session && !!user,
        user,
        session
      }
    } catch (error) {
      return {
        isLoggedIn: false,
        user: null,
        session: null
      }
    }
  }

  /**
   * Handle logout
   */
  async logout(): Promise<void> {
    try {
      await authService.signOut()
    } catch (error: any) {
      // Even if logout fails on the server, we should clear local state
      console.warn('Logout warning:', error.message)
      throw new Error('Logout completed, but there may have been a connection issue.')
    }
  }

  /**
   * Handle "Remember Me" functionality (if needed in the future)
   */
  async loginWithRememberMe(credentials: LoginCredentials, rememberMe: boolean = false): Promise<LoginResult> {
    // For now, Supabase handles session persistence automatically
    // In the future, you could implement custom session duration here
    return await this.loginWithEmailPassword(credentials)
  }
}

// Export singleton instance
export const loginService = new LoginService() 