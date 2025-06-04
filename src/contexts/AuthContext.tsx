import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { loginService } from '../services/loginService'
import { authService } from '../services/authService'
import { passwordResetService } from '../services/passwordResetService'
import { passwordResetConfirmService } from '../services/passwordResetConfirmService'
import { sessionService } from '../services/sessionService'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>
  updatePassword: (password: string) => Promise<void>
  confirmPasswordReset: (newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string; shouldRedirectToLogin?: boolean }>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const cleanupRefs = useRef<(() => void)[]>([])

  useEffect(() => {
    // Session restoration and monitoring setup
    const initializeAuth = async () => {
      try {
        // Restore session on app load
        const restoreResult = await sessionService.restoreSession()
        
        if (restoreResult.isValid && restoreResult.session) {
          setSession(restoreResult.session)
          setUser(restoreResult.user)
        } else {
          setSession(null)
          setUser(null)
          if (restoreResult.error) {
            console.warn('Session restore failed:', restoreResult.error)
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session)
          setUser(session?.user ?? null)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          // Stop session monitoring when signed out
          sessionService.stopSessionMonitoring()
        }
        
        setLoading(false)
      }
    )

    // Start session monitoring for authenticated users
    const startMonitoring = () => {
      sessionService.startSessionMonitoring(
        // On session expired
        () => {
          console.log('Session expired, signing out')
          setSession(null)
          setUser(null)
          // Note: Don't call signOut here to avoid infinite loop
        },
        // On session refreshed
        (newSession) => {
          console.log('Session refreshed automatically')
          setSession(newSession)
          setUser(newSession.user)
        }
      )
    }

    // Start monitoring if we have a session
    if (session) {
      startMonitoring()
    }

    // Handle browser visibility changes for session validation
    const cleanupVisibilityHandler = sessionService.handleVisibilityChange(async () => {
      if (session) {
        const restoreResult = await sessionService.restoreSession()
        if (!restoreResult.isValid) {
          setSession(null)
          setUser(null)
        }
      }
    })

    // Store cleanup functions
    cleanupRefs.current = [
      () => subscription.unsubscribe(),
      () => sessionService.stopSessionMonitoring(),
      cleanupVisibilityHandler
    ]

    // Cleanup on unmount
    return () => {
      cleanupRefs.current.forEach(cleanup => cleanup())
    }
  }, [session?.access_token]) // Re-run when session token changes

  const signUp = async (email: string, password: string) => {
    const result = await authService.registerWithEmailVerification({
      email,
      password,
      confirmPassword: password
    })

    if (result.needsEmailVerification) {
      throw new Error('VERIFICATION_REQUIRED')
    }
  }

  const signIn = async (email: string, password: string) => {
    await loginService.loginWithRateLimit({ email, password })
  }

  const signOut = async () => {
    // Stop session monitoring before signing out
    sessionService.stopSessionMonitoring()
    await loginService.logout()
  }

  const resetPassword = async (email: string) => {
    const result = await passwordResetService.requestPasswordResetWithRateLimit({ email })
    return {
      success: result.success,
      message: result.message
    }
  }

  const updatePassword = async (password: string) => {
    await authService.updatePassword(password)
  }

  const confirmPasswordReset = async (newPassword: string, confirmPassword: string) => {
    const result = await passwordResetConfirmService.updatePasswordWithToken({
      newPassword,
      confirmPassword
    })
    
    if (result.success) {
      // Clean up session after successful password reset
      await passwordResetConfirmService.handleResetSuccess()
    }
    
    return result
  }

  const refreshSession = async () => {
    try {
      const refreshResult = await sessionService.forceRefresh()
      if (refreshResult.isValid && refreshResult.session) {
        setSession(refreshResult.session)
        setUser(refreshResult.user)
      } else {
        throw new Error(refreshResult.error || 'Failed to refresh session')
      }
    } catch (error) {
      console.error('Manual session refresh failed:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    confirmPasswordReset,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}