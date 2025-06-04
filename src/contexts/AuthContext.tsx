import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { loginService } from '../services/loginService'
import { authService } from '../services/authService'
import { passwordResetService } from '../services/passwordResetService'
import { passwordResetConfirmService } from '../services/passwordResetConfirmService'
import { sessionService } from '../services/sessionService'
import { inactivityService } from '../services/inactivityService'
import { userProfileService, type PostLoginRouting } from '../services/userProfileService'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  postLoginRouting: PostLoginRouting | null
  inactivityWarning: {
    isVisible: boolean
    timeRemaining: number
  }
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>
  updatePassword: (password: string) => Promise<void>
  confirmPasswordReset: (newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string; shouldRedirectToLogin?: boolean }>
  refreshSession: () => Promise<void>
  extendSession: () => void
  dismissInactivityWarning: () => void
  completeOnboarding: () => Promise<void>
  getPostLoginPath: () => string
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
  const [postLoginRouting, setPostLoginRouting] = useState<PostLoginRouting | null>(null)
  const [inactivityWarning, setInactivityWarning] = useState({
    isVisible: false,
    timeRemaining: 0
  })
  const cleanupRefs = useRef<(() => void)[]>([])

  // Function to handle post-login routing determination
  const determinePostLoginRouting = async (user: User) => {
    try {
      const routing = await userProfileService.checkUserStatus(user)
      setPostLoginRouting(routing)
      console.log('Post-login routing determined:', routing)
      return routing
    } catch (error) {
      console.error('Failed to determine post-login routing:', error)
      // Set default routing on error
      const defaultRouting: PostLoginRouting = {
        shouldGoToWelcome: false,
        shouldGoToDashboard: true,
        redirectPath: '/dashboard',
        isNewUser: false,
        isReturningUser: true
      }
      setPostLoginRouting(defaultRouting)
      return defaultRouting
    }
  }

  useEffect(() => {
    // Session restoration and monitoring setup
    const initializeAuth = async () => {
      try {
        // Restore session on app load
        const restoreResult = await sessionService.restoreSession()
        
        if (restoreResult.isValid && restoreResult.session && restoreResult.user) {
          setSession(restoreResult.session)
          setUser(restoreResult.user)
          
          // Determine post-login routing for restored session
          await determinePostLoginRouting(restoreResult.user)
          
          // Start inactivity monitoring for authenticated users
          startInactivityMonitoring()
        } else {
          setSession(null)
          setUser(null)
          setPostLoginRouting(null)
          if (restoreResult.error) {
            console.warn('Session restore failed:', restoreResult.error)
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        setSession(null)
        setUser(null)
        setPostLoginRouting(null)
      } finally {
        setLoading(false)
      }
    }

    const startInactivityMonitoring = () => {
      inactivityService.start({
        onWarning: (timeRemaining) => {
          console.log('Inactivity warning triggered, time remaining:', timeRemaining)
          setInactivityWarning({
            isVisible: true,
            timeRemaining
          })
        },
        onTimeout: () => {
          console.log('Inactivity timeout reached, logging out')
          handleInactivityLogout()
        },
        onActivity: () => {
          // Dismiss warning if user becomes active
          setInactivityWarning(prev => ({
            ...prev,
            isVisible: false
          }))
        }
      })
    }

    const handleInactivityLogout = async () => {
      try {
        setInactivityWarning({ isVisible: false, timeRemaining: 0 })
        setPostLoginRouting(null)
        await signOut()
        // Could show a toast notification here about the automatic logout
      } catch (error) {
        console.error('Error during inactivity logout:', error)
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
          
          // Determine routing for new sign-ins
          if (session?.user && event === 'SIGNED_IN') {
            await determinePostLoginRouting(session.user)
          }
          
          // Start inactivity monitoring when user signs in
          if (session?.user) {
            startInactivityMonitoring()
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setPostLoginRouting(null)
          setInactivityWarning({ isVisible: false, timeRemaining: 0 })
          
          // Stop both session and inactivity monitoring when signed out
          sessionService.stopSessionMonitoring()
          inactivityService.stop()
        }
        
        setLoading(false)
      }
    )

    // Start session monitoring for authenticated users
    const startSessionMonitoring = () => {
      sessionService.startSessionMonitoring(
        // On session expired
        () => {
          console.log('Session expired, signing out')
          inactivityService.stop()
          setSession(null)
          setUser(null)
          setInactivityWarning({ isVisible: false, timeRemaining: 0 })
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
      startSessionMonitoring()
    }

    // Handle browser visibility changes for session validation
    const cleanupVisibilityHandler = sessionService.handleVisibilityChange(async () => {
      if (session) {
        const restoreResult = await sessionService.restoreSession()
        if (!restoreResult.isValid) {
          inactivityService.stop()
          setSession(null)
          setUser(null)
          setInactivityWarning({ isVisible: false, timeRemaining: 0 })
        }
      }
    })

    // Store cleanup functions
    cleanupRefs.current = [
      () => subscription.unsubscribe(),
      () => sessionService.stopSessionMonitoring(),
      () => inactivityService.stop(),
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
    // Stop both session and inactivity monitoring before signing out
    sessionService.stopSessionMonitoring()
    inactivityService.stop()
    setInactivityWarning({ isVisible: false, timeRemaining: 0 })
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

  const extendSession = () => {
    inactivityService.extendSession()
    setInactivityWarning({ isVisible: false, timeRemaining: 0 })
  }

  const dismissInactivityWarning = () => {
    setInactivityWarning(prev => ({
      ...prev,
      isVisible: false
    }))
  }

  const completeOnboarding = async () => {
    if (!user) {
      throw new Error('No user logged in')
    }

    try {
      await userProfileService.completeOnboarding(user.id)
      
      // Update routing to reflect completed onboarding
      setPostLoginRouting({
        shouldGoToWelcome: false,
        shouldGoToDashboard: true,
        redirectPath: '/dashboard',
        isNewUser: false,
        isReturningUser: true
      })
      
      console.log('Onboarding completed successfully')
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      throw error
    }
  }

  const getPostLoginPath = (): string => {
    return postLoginRouting?.redirectPath || '/dashboard'
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    postLoginRouting,
    inactivityWarning,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    confirmPasswordReset,
    refreshSession,
    extendSession,
    dismissInactivityWarning,
    completeOnboarding,
    getPostLoginPath,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}