import { supabase } from '../lib/supabase'
import type { LoginCredentials, RegisterCredentials, PasswordResetRequest } from '../types/auth'

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
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`
      }
    })

    if (error) {
      throw error
    }

    // Check if user needs email verification
    const needsEmailVerification = !data.session && !!data.user
    
    return {
      user: data.user,
      session: data.session,
      needsEmailVerification
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`
      }
    })

    if (error) {
      throw error
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
   * Sign in user
   */
  async signIn(credentials: LoginCredentials) {
    const { email, password } = credentials
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    const { email } = request
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      throw error
    }
  }

  /**
   * Update user password
   */
  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      throw error
    }
  }

  /**
   * Get current user session
   */
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }

    return session
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      throw error
    }

    return user
  }
}

// Export singleton instance
export const authService = new AuthService()