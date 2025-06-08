// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      resend: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      refreshSession: jest.fn(),
    }
  }
}))

// Mock the errorHandlingService
jest.mock('../errorHandlingService', () => ({
  errorHandlingService: {
    executeWithRetry: jest.fn(),
    logError: jest.fn(),
    getUserMessage: jest.fn(),
  }
}))

import { authService } from '../authService'
import type { RegisterCredentials, PasswordResetRequest } from '../../types/auth'

// Get the mocked modules
const mockSupabase = jest.requireMock('../../lib/supabase').supabase
const mockErrorHandlingService = jest.requireMock('../errorHandlingService').errorHandlingService

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default successful executeWithRetry behavior - actually execute the function
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
      try {
        return await fn()
      } catch (error) {
        // If the function throws, let it throw - this is what executeWithRetry would do
        throw error
      }
    })
    mockErrorHandlingService.getUserMessage.mockReturnValue('User friendly error message')
  })

  describe('registerWithEmailVerification', () => {
    const mockCredentials: RegisterCredentials = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    }

    it('should successfully register user with email verification needed', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockResponse = {
        data: { user: mockUser, session: null },
        error: null
      }
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse)

      const result = await authService.registerWithEmailVerification(mockCredentials)

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: mockCredentials.email,
        password: mockCredentials.password,
        options: {
          emailRedirectTo: 'http://localhost/auth/confirm'
        }
      })
      expect(result).toEqual({
        user: mockUser,
        session: null,
        needsEmailVerification: true
      })
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should successfully register user with immediate session', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockSession = { access_token: 'token123' }
      const mockResponse = {
        data: { user: mockUser, session: mockSession },
        error: null
      }
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse)

      const result = await authService.registerWithEmailVerification(mockCredentials)

      expect(result).toEqual({
        user: mockUser,
        session: mockSession,
        needsEmailVerification: false
      })
    })

    it('should handle Supabase registration error and enhance it', async () => {
      const mockError = new Error('Email already registered')
      const mockResponse = {
        data: { user: null, session: null },
        error: mockError
      }
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse)

      await expect(authService.registerWithEmailVerification(mockCredentials))
        .rejects.toThrow('User friendly error message')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'registerWithEmailVerification'
      )
    })

    it('should handle and enhance errors with user messages', async () => {
      const originalError = new Error('Database error')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Registration failed. Please try again.')

      await expect(authService.registerWithEmailVerification(mockCredentials))
        .rejects.toMatchObject({
          message: 'Registration failed. Please try again.',
          originalError: originalError
        })

      expect(mockErrorHandlingService.getUserMessage).toHaveBeenCalledWith(originalError)
    })

    it('should use correct retry configuration', async () => {
      const mockResponse = {
        data: { user: { id: '123' }, session: null },
        error: null
      }
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse)

      await authService.registerWithEmailVerification(mockCredentials)

      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })
  })

  describe('resendEmailVerification', () => {
    const testEmail = 'test@example.com'

    it('should successfully resend email verification', async () => {
      const mockResponse = { error: null }
      mockSupabase.auth.resend.mockResolvedValue(mockResponse)

      await authService.resendEmailVerification(testEmail)

      expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: testEmail,
        options: {
          emailRedirectTo: 'http://localhost/auth/confirm'
        }
      })
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle Supabase resend error and enhance it', async () => {
      const mockError = new Error('Rate limit exceeded')
      const mockResponse = { error: mockError }
      mockSupabase.auth.resend.mockResolvedValue(mockResponse)

      await expect(authService.resendEmailVerification(testEmail))
        .rejects.toThrow('User friendly error message')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'resendEmailVerification'
      )
    })

    it('should enhance errors with user-friendly messages', async () => {
      const originalError = new Error('Network error')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Please check your connection.')

      await expect(authService.resendEmailVerification(testEmail))
        .rejects.toMatchObject({
          message: 'Please check your connection.',
          originalError: originalError
        })
    })
  })

  describe('checkEmailVerificationStatus', () => {
    it('should return verified status for confirmed user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        email_confirmed_at: '2023-01-01T00:00:00.000Z'
      }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await authService.checkEmailVerificationStatus()

      expect(result).toEqual({
        isVerified: true,
        email: 'test@example.com'
      })
    })

    it('should return unverified status for unconfirmed user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        email_confirmed_at: null
      }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await authService.checkEmailVerificationStatus()

      expect(result).toEqual({
        isVerified: false,
        email: 'test@example.com'
      })
    })

    it('should handle no user case', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await authService.checkEmailVerificationStatus()

      expect(result).toEqual({
        isVerified: false,
        email: undefined
      })
    })
  })

  describe('confirmEmail', () => {
    it('should successfully confirm email with valid session', async () => {
      const mockSession = { access_token: 'token123' }
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      await expect(authService.confirmEmail()).resolves.toBeUndefined()
    })

    it('should throw error when no session found', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await expect(authService.confirmEmail())
        .rejects.toThrow('No session found after email confirmation')
    })

    it('should throw error when getSession fails', async () => {
      const mockError = new Error('Session retrieval failed')
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError
      })

      await expect(authService.confirmEmail()).rejects.toThrow('Session retrieval failed')
    })
  })

  describe('signIn', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'password123'
    }

    it('should successfully sign in user', async () => {
      const mockData = {
        user: { id: '123', email: 'test@example.com' },
        session: { access_token: 'token123' }
      }
      const mockResponse = { data: mockData, error: null }
      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockResponse)

      const result = await authService.signIn(mockCredentials)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: mockCredentials.email,
        password: mockCredentials.password
      })
      expect(result).toBe(mockData)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle invalid credentials error and enhance it', async () => {
      const mockError = new Error('Invalid login credentials')
      const mockResponse = { data: null, error: mockError }
      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockResponse)

      await expect(authService.signIn(mockCredentials))
        .rejects.toThrow('User friendly error message')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'signIn'
      )
    })

    it('should enhance sign-in errors with user messages', async () => {
      const originalError = new Error('Auth error')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Sign in failed. Please try again.')

      await expect(authService.signIn(mockCredentials))
        .rejects.toMatchObject({
          message: 'Sign in failed. Please try again.',
          originalError: originalError
        })
    })
  })

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      const mockResponse = { error: null }
      mockSupabase.auth.signOut.mockResolvedValue(mockResponse)

      await authService.signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 1 }
      )
    })

    it('should handle sign out error gracefully without throwing', async () => {
      const mockError = new Error('Sign out failed')
      const mockResponse = { error: mockError }
      mockSupabase.auth.signOut.mockResolvedValue(mockResponse)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await expect(authService.signOut()).resolves.toBeUndefined()

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'signOut'
      )
      expect(consoleSpy).toHaveBeenCalledWith('Logout warning:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should log errors from executeWithRetry without throwing', async () => {
      const originalError = new Error('Network error during logout')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await expect(authService.signOut()).resolves.toBeUndefined()

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        originalError,
        'signOut'
      )
      expect(consoleSpy).toHaveBeenCalledWith('Logout warning:', originalError)
      
      consoleSpy.mockRestore()
    })
  })

  describe('requestPasswordReset', () => {
    const mockRequest: PasswordResetRequest = {
      email: 'test@example.com'
    }

    it('should call resetPassword with email from request', async () => {
      const mockData = { message: 'Reset email sent' }
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: mockData,
        error: null
      })

      await authService.requestPasswordReset(mockRequest)

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        mockRequest.email,
        {
          redirectTo: 'http://localhost/auth/reset-password'
        }
      )
    })
  })

  describe('resetPassword', () => {
    const testEmail = 'test@example.com'

    it('should successfully send password reset email', async () => {
      const mockData = { message: 'Reset email sent' }
      const mockResponse = { data: mockData, error: null }
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue(mockResponse)

      const result = await authService.resetPassword(testEmail)

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        testEmail,
        {
          redirectTo: 'http://localhost/auth/reset-password'
        }
      )
      expect(result).toBe(mockData)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle reset password error and enhance it', async () => {
      const mockError = new Error('User not found')
      const mockResponse = { data: null, error: mockError }
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue(mockResponse)

      await expect(authService.resetPassword(testEmail))
        .rejects.toThrow('User friendly error message')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'resetPassword'
      )
    })

    it('should enhance reset password errors', async () => {
      const originalError = new Error('Email service unavailable')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Password reset failed.')

      await expect(authService.resetPassword(testEmail))
        .rejects.toMatchObject({
          message: 'Password reset failed.',
          originalError: originalError
        })
    })
  })

  describe('updatePassword', () => {
    const newPassword = 'newPassword123'

    it('should successfully update password', async () => {
      const mockData = { user: { id: '123' } }
      const mockResponse = { data: mockData, error: null }
      mockSupabase.auth.updateUser.mockResolvedValue(mockResponse)

      const result = await authService.updatePassword(newPassword)

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword
      })
      expect(result).toBe(mockData)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle update password error and enhance it', async () => {
      const mockError = new Error('Password update failed')
      const mockResponse = { data: null, error: mockError }
      mockSupabase.auth.updateUser.mockResolvedValue(mockResponse)

      await expect(authService.updatePassword(newPassword))
        .rejects.toThrow('User friendly error message')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'updatePassword'
      )
    })

    it('should enhance update password errors', async () => {
      const originalError = new Error('Invalid session')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Session expired. Please sign in again.')

      await expect(authService.updatePassword(newPassword))
        .rejects.toMatchObject({
          message: 'Session expired. Please sign in again.',
          originalError: originalError
        })
    })
  })

  describe('getCurrentSession', () => {
    it('should successfully get current session', async () => {
      const mockSession = { access_token: 'token123' }
      const mockResponse = {
        data: { session: mockSession },
        error: null
      }
      mockSupabase.auth.getSession.mockResolvedValue(mockResponse)

      const result = await authService.getCurrentSession()

      expect(result).toBe(mockSession)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle session retrieval error and return null', async () => {
      const mockError = new Error('Session retrieval failed')
      const mockResponse = {
        data: { session: null },
        error: mockError
      }
      mockSupabase.auth.getSession.mockResolvedValue(mockResponse)

      const result = await authService.getCurrentSession()

      expect(result).toBeNull()
      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'getCurrentSession'
      )
    })

    it('should handle executeWithRetry failure and return null', async () => {
      const originalError = new Error('Network error')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)

      const result = await authService.getCurrentSession()

      expect(result).toBeNull()
      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        originalError,
        'getCurrentSession'
      )
    })
  })

  describe('getCurrentUser', () => {
    it('should successfully get current user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockResponse = {
        data: { user: mockUser },
        error: null
      }
      mockSupabase.auth.getUser.mockResolvedValue(mockResponse)

      const result = await authService.getCurrentUser()

      expect(result).toBe(mockUser)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle user retrieval error and return null', async () => {
      const mockError = new Error('User retrieval failed')
      const mockResponse = {
        data: { user: null },
        error: mockError
      }
      mockSupabase.auth.getUser.mockResolvedValue(mockResponse)

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'getCurrentUser'
      )
    })

    it('should handle executeWithRetry failure and return null', async () => {
      const originalError = new Error('Authentication failed')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        originalError,
        'getCurrentUser'
      )
    })
  })

  describe('refreshSession', () => {
    it('should successfully refresh session', async () => {
      const mockData = {
        session: { access_token: 'newToken123' },
        user: { id: '123' }
      }
      const mockResponse = { data: mockData, error: null }
      mockSupabase.auth.refreshSession.mockResolvedValue(mockResponse)

      const result = await authService.refreshSession()

      expect(result).toBe(mockData)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle session refresh error and enhance it', async () => {
      const mockError = new Error('Refresh token expired')
      const mockResponse = { data: null, error: mockError }
      mockSupabase.auth.refreshSession.mockResolvedValue(mockResponse)

      await expect(authService.refreshSession())
        .rejects.toThrow('User friendly error message')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        mockError,
        'refreshSession'
      )
    })

    it('should enhance session refresh errors', async () => {
      const originalError = new Error('Token malformed')
      mockErrorHandlingService.executeWithRetry.mockRejectedValue(originalError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Session refresh failed. Please sign in again.')

      await expect(authService.refreshSession())
        .rejects.toMatchObject({
          message: 'Session refresh failed. Please sign in again.',
          originalError: originalError
        })
    })
  })

  describe('Error Handling Integration', () => {
    it('should properly pass retry configuration to errorHandlingService', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: '123' }, session: null },
        error: null
      })

      await authService.registerWithEmailVerification({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      })

      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should use different retry configs for different operations', async () => {
      // Sign out uses maxAttempts: 1
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })
      await authService.signOut()
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenLastCalledWith(
        expect.any(Function),
        { maxAttempts: 1 }
      )

      // Sign in uses maxAttempts: 2
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null
      })
      await authService.signIn({ email: 'test@example.com', password: 'pass' })
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenLastCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should enhance all errors with user-friendly messages', async () => {
      const methods = [
        'registerWithEmailVerification',
        'resendEmailVerification', 
        'resetPassword',
        'updatePassword',
        'refreshSession'
      ]

      for (const method of methods) {
        const originalError = new Error(`${method} failed`)
        mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(originalError)
        mockErrorHandlingService.getUserMessage.mockReturnValueOnce(`${method} user message`)

        const authMethod = authService[method as keyof typeof authService] as Function
        const testArgs = method === 'registerWithEmailVerification' 
          ? [{ email: 'test@example.com', password: 'pass', confirmPassword: 'pass' }]
          : method === 'resendEmailVerification' || method === 'resetPassword'
          ? ['test@example.com']
          : method === 'updatePassword'
          ? ['newpassword']
          : []

        await expect(authMethod.apply(authService, testArgs))
          .rejects.toMatchObject({
            message: `${method} user message`,
            originalError: originalError
          })

        expect(mockErrorHandlingService.getUserMessage).toHaveBeenCalledWith(originalError)
      }
    })
  })

  describe('URL Generation', () => {
    it('should use correct redirect URLs for different operations', async () => {
      // Registration redirect
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: {}, session: null },
        error: null
      })
      await authService.registerWithEmailVerification({
        email: 'test@example.com',
        password: 'pass',
        confirmPassword: 'pass'
      })
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { emailRedirectTo: 'http://localhost/auth/confirm' }
        })
      )

      // Email verification resend redirect
      mockSupabase.auth.resend.mockResolvedValue({ error: null })
      await authService.resendEmailVerification('test@example.com')
      expect(mockSupabase.auth.resend).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { emailRedirectTo: 'http://localhost/auth/confirm' }
        })
      )

      // Password reset redirect
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      })
      await authService.resetPassword('test@example.com')
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'http://localhost/auth/reset-password' }
      )
    })
  })
}) 