import { useState } from 'react'
import { useAuth as useAuthContext } from '../contexts/AuthContext'
import { loginService } from '../services/loginService'
import { sessionService } from '../services/sessionService'
import type { LoginCredentials, RegisterCredentials, PasswordResetRequest } from '../types/auth'

interface UseAuthReturn {
  // State
  user: any
  session: any
  loading: boolean
  
  // Auth methods with their own loading states
  login: {
    execute: (credentials: LoginCredentials) => Promise<void>
    loading: boolean
    error: string | null
  }
  
  register: {
    execute: (credentials: RegisterCredentials) => Promise<void>
    loading: boolean
    error: string | null
  }
  
  logout: {
    execute: () => Promise<void>
    loading: boolean
    error: string | null
  }
  
  resetPassword: {
    execute: (request: PasswordResetRequest) => Promise<{ success: boolean; message: string }>
    loading: boolean
    error: string | null
  }
  
  updatePassword: {
    execute: (password: string) => Promise<void>
    loading: boolean
    error: string | null
  }
  
  confirmPasswordReset: {
    execute: (newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string; shouldRedirectToLogin?: boolean }>
    loading: boolean
    error: string | null
  }
  
  refreshSession: {
    execute: () => Promise<void>
    loading: boolean
    error: string | null
  }
  
  // Utility methods
  clearErrors: () => void
  checkLoginStatus: () => Promise<boolean>
  getSessionInfo: () => ReturnType<typeof sessionService.getSessionInfo>
}

export const useAuth = (): UseAuthReturn => {
  const { user, session, loading: contextLoading, signUp, signOut, resetPassword: resetPasswordContext, updatePassword: updatePasswordContext, confirmPasswordReset: confirmPasswordResetContext, refreshSession: refreshSessionContext } = useAuthContext()
  
  // Individual loading states for each operation
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [updatePasswordLoading, setUpdatePasswordLoading] = useState(false)
  const [confirmPasswordResetLoading, setConfirmPasswordResetLoading] = useState(false)
  const [refreshSessionLoading, setRefreshSessionLoading] = useState(false)
  
  // Individual error states for each operation
  const [loginError, setLoginError] = useState<string | null>(null)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null)
  const [updatePasswordError, setUpdatePasswordError] = useState<string | null>(null)
  const [confirmPasswordResetError, setConfirmPasswordResetError] = useState<string | null>(null)
  const [refreshSessionError, setRefreshSessionError] = useState<string | null>(null)

  const handleError = (error: any): string => {
    if (error?.message) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'An unexpected error occurred'
  }

  const login = {
    execute: async (credentials: LoginCredentials) => {
      setLoginLoading(true)
      setLoginError(null)
      
      try {
        // Use the enhanced login service
        await loginService.loginWithRateLimit(credentials)
      } catch (error) {
        const errorMessage = handleError(error)
        setLoginError(errorMessage)
        throw error
      } finally {
        setLoginLoading(false)
      }
    },
    loading: loginLoading,
    error: loginError
  }

  const register = {
    execute: async (credentials: RegisterCredentials) => {
      setRegisterLoading(true)
      setRegisterError(null)
      
      try {
        await signUp(credentials.email, credentials.password)
      } catch (error: any) {
        let errorMessage = handleError(error)
        
        // Handle special verification required case
        if (error.message === 'VERIFICATION_REQUIRED') {
          errorMessage = 'Registration successful! Please check your email for a verification link.'
        }
        
        setRegisterError(errorMessage)
        throw error
      } finally {
        setRegisterLoading(false)
      }
    },
    loading: registerLoading,
    error: registerError
  }

  const logout = {
    execute: async () => {
      setLogoutLoading(true)
      setLogoutError(null)
      
      try {
        await signOut()
      } catch (error) {
        const errorMessage = handleError(error)
        setLogoutError(errorMessage)
        throw error
      } finally {
        setLogoutLoading(false)
      }
    },
    loading: logoutLoading,
    error: logoutError
  }

  const resetPassword = {
    execute: async (request: PasswordResetRequest) => {
      setResetPasswordLoading(true)
      setResetPasswordError(null)
      
      try {
        const result = await resetPasswordContext(request.email)
        // The result now contains success status and message
        if (!result.success) {
          throw new Error(result.message)
        }
        return result
      } catch (error) {
        const errorMessage = handleError(error)
        setResetPasswordError(errorMessage)
        throw error
      } finally {
        setResetPasswordLoading(false)
      }
    },
    loading: resetPasswordLoading,
    error: resetPasswordError
  }

  const updatePassword = {
    execute: async (password: string) => {
      setUpdatePasswordLoading(true)
      setUpdatePasswordError(null)
      
      try {
        await updatePasswordContext(password)
      } catch (error) {
        const errorMessage = handleError(error)
        setUpdatePasswordError(errorMessage)
        throw error
      } finally {
        setUpdatePasswordLoading(false)
      }
    },
    loading: updatePasswordLoading,
    error: updatePasswordError
  }

  const confirmPasswordReset = {
    execute: async (newPassword: string, confirmPassword: string) => {
      setConfirmPasswordResetLoading(true)
      setConfirmPasswordResetError(null)
      
      try {
        const result = await confirmPasswordResetContext(newPassword, confirmPassword)
        return result
      } catch (error) {
        const errorMessage = handleError(error)
        setConfirmPasswordResetError(errorMessage)
        throw error
      } finally {
        setConfirmPasswordResetLoading(false)
      }
    },
    loading: confirmPasswordResetLoading,
    error: confirmPasswordResetError
  }

  const refreshSession = {
    execute: async () => {
      setRefreshSessionLoading(true)
      setRefreshSessionError(null)
      
      try {
        await refreshSessionContext()
      } catch (error) {
        const errorMessage = handleError(error)
        setRefreshSessionError(errorMessage)
        throw error
      } finally {
        setRefreshSessionLoading(false)
      }
    },
    loading: refreshSessionLoading,
    error: refreshSessionError
  }

  const clearErrors = () => {
    setLoginError(null)
    setRegisterError(null)
    setLogoutError(null)
    setResetPasswordError(null)
    setUpdatePasswordError(null)
    setConfirmPasswordResetError(null)
    setRefreshSessionError(null)
  }

  const checkLoginStatus = async (): Promise<boolean> => {
    try {
      const status = await loginService.checkCurrentLoginStatus()
      return status.isLoggedIn
    } catch (error) {
      return false
    }
  }

  const getSessionInfo = () => {
    return sessionService.getSessionInfo(session)
  }

  return {
    user,
    session,
    loading: contextLoading,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    confirmPasswordReset,
    refreshSession,
    clearErrors,
    checkLoginStatus,
    getSessionInfo
  }
} 