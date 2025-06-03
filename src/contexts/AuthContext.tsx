import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { loginService } from '../services/loginService'
import { authService } from '../services/authService'
import { passwordResetService } from '../services/passwordResetService'
import { passwordResetConfirmService } from '../services/passwordResetConfirmService'

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

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}