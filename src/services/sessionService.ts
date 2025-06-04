import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface SessionRestoreResult {
  user: User | null
  session: Session | null
  isValid: boolean
  error?: string
}

export interface SessionValidationResult {
  isValid: boolean
  expiresAt?: string
  timeRemaining?: number
  needsRefresh?: boolean
}

class SessionService {
  private sessionCheckInterval: NodeJS.Timeout | null = null
  private readonly SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes
  private readonly SESSION_REFRESH_THRESHOLD = 10 * 60 * 1000 // Refresh if less than 10 minutes remaining

  /**
   * Restore session on app load
   */
  async restoreSession(): Promise<SessionRestoreResult> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.warn('Session restore error:', error.message)
        return {
          user: null,
          session: null,
          isValid: false,
          error: `Failed to restore session: ${error.message}`
        }
      }

      if (!session) {
        return {
          user: null,
          session: null,
          isValid: false
        }
      }

      // Validate the restored session
      const validation = this.validateSession(session)
      if (!validation.isValid) {
        // Session is expired or invalid, sign out
        await this.clearInvalidSession()
        return {
          user: null,
          session: null,
          isValid: false,
          error: 'Session has expired'
        }
      }

      // Check if session needs refresh
      if (validation.needsRefresh) {
        try {
          const refreshResult = await this.refreshSession()
          if (refreshResult.session) {
            return {
              user: refreshResult.session.user,
              session: refreshResult.session,
              isValid: true
            }
          }
        } catch (refreshError) {
          console.warn('Failed to refresh session:', refreshError)
          // Continue with current session if refresh fails
        }
      }

      return {
        user: session.user,
        session,
        isValid: true
      }
    } catch (error: any) {
      console.error('Unexpected error during session restore:', error)
      return {
        user: null,
        session: null,
        isValid: false,
        error: 'Unexpected error occurred while restoring session'
      }
    }
  }

  /**
   * Validate current session
   */
  validateSession(session: Session): SessionValidationResult {
    if (!session || !session.access_token) {
      return { isValid: false }
    }

    const now = Date.now()
    const expiresAt = session.expires_at ? session.expires_at * 1000 : now + (24 * 60 * 60 * 1000) // Default 24 hours
    const timeRemaining = expiresAt - now

    // Session is expired
    if (timeRemaining <= 0) {
      return {
        isValid: false,
        expiresAt: new Date(expiresAt).toISOString(),
        timeRemaining: 0
      }
    }

    // Session needs refresh soon
    const needsRefresh = timeRemaining < this.SESSION_REFRESH_THRESHOLD

    return {
      isValid: true,
      expiresAt: new Date(expiresAt).toISOString(),
      timeRemaining,
      needsRefresh
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{ session: Session | null; error?: string }> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        throw error
      }

      return { session }
    } catch (error: any) {
      console.error('Session refresh failed:', error)
      return {
        session: null,
        error: error.message || 'Failed to refresh session'
      }
    }
  }

  /**
   * Clear invalid session
   */
  async clearInvalidSession(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Error during session cleanup:', error)
    }
  }

  /**
   * Start automatic session monitoring
   */
  startSessionMonitoring(
    onSessionExpired: () => void,
    onSessionRefreshed: (session: Session) => void
  ): void {
    // Clear any existing interval
    this.stopSessionMonitoring()

    this.sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          onSessionExpired()
          return
        }

        const validation = this.validateSession(session)
        
        if (!validation.isValid) {
          await this.clearInvalidSession()
          onSessionExpired()
          return
        }

        // Auto-refresh if needed
        if (validation.needsRefresh) {
          const refreshResult = await this.refreshSession()
          if (refreshResult.session) {
            onSessionRefreshed(refreshResult.session)
          } else {
            // Refresh failed, session might be expired
            onSessionExpired()
          }
        }
      } catch (error) {
        console.error('Session monitoring error:', error)
      }
    }, this.SESSION_CHECK_INTERVAL)
  }

  /**
   * Stop automatic session monitoring
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
      this.sessionCheckInterval = null
    }
  }

  /**
   * Get session info for debugging/display
   */
  getSessionInfo(session: Session | null): {
    isValid: boolean
    expiresAt?: string
    timeRemaining?: string
    user?: {
      id: string
      email?: string
      emailConfirmed: boolean
    }
  } {
    if (!session) {
      return { isValid: false }
    }

    const validation = this.validateSession(session)
    const timeRemainingMs = validation.timeRemaining || 0
    const hours = Math.floor(timeRemainingMs / (1000 * 60 * 60))
    const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60))

    return {
      isValid: validation.isValid,
      expiresAt: validation.expiresAt,
      timeRemaining: `${hours}h ${minutes}m`,
      user: session.user ? {
        id: session.user.id,
        email: session.user.email,
        emailConfirmed: !!session.user.email_confirmed_at
      } : undefined
    }
  }

  /**
   * Force session refresh
   */
  async forceRefresh(): Promise<SessionRestoreResult> {
    const refreshResult = await this.refreshSession()
    
    if (refreshResult.session) {
      return {
        user: refreshResult.session.user,
        session: refreshResult.session,
        isValid: true
      }
    }

    return {
      user: null,
      session: null,
      isValid: false,
      error: refreshResult.error
    }
  }

  /**
   * Handle browser visibility change
   */
  handleVisibilityChange(onSessionCheck: () => void): (() => void) {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, check session
        onSessionCheck()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Return cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService()