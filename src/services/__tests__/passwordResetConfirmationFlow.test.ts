// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      setSession: jest.fn(),
      verifyOtp: jest.fn(),
      exchangeCodeForSession: jest.fn(),
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

// Get the mocked modules
const mockSupabase = jest.requireMock('../../lib/supabase').supabase
const mockErrorHandlingService = jest.requireMock('../errorHandlingService').errorHandlingService

describe('Password Reset Confirmation Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default successful executeWithRetry behavior
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
      try {
        return await fn()
      } catch (error) {
        throw error
      }
    })
    mockErrorHandlingService.getUserMessage.mockReturnValue('Password reset confirmation failed. Please try again.')
  })

  const validNewPassword = 'NewSecurePassword123!'
  const validUser = {
    id: 'user_123',
    email: 'user@example.com',
    email_confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  const validSession = {
    access_token: 'token_123',
    refresh_token: 'refresh_123',
    expires_at: Date.now() + 3600000,
    user: validUser
  }

  describe('Successful Password Reset Confirmation Scenarios', () => {
    it('should successfully update password after clicking reset link', async () => {
      // Simulate user has valid session after clicking reset link
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })

      const mockUpdateResponse = {
        user: {
          ...validUser,
          updated_at: new Date().toISOString()
        }
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: mockUpdateResponse,
        error: null
      })

      // First verify session exists
      const session = await authService.getCurrentSession()
      expect(session).toBe(validSession)

      // Then update password
      const result = await authService.updatePassword(validNewPassword)

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: validNewPassword
      })
      expect(result).toBe(mockUpdateResponse)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle password update with different password formats', async () => {
      const testPasswords = [
        'SimplePass123!',
        'C0mpl3x_P@ssw0rd_W1th_Sp3c1@l_Ch@r@ct3rs!',
        'Unicode密码123!',
        'МойПароль123!',
        'عبورکلمه123!'
      ]

      for (const password of testPasswords) {
        const mockResponse = {
          user: {
            ...validUser,
            updated_at: new Date().toISOString()
          }
        }

        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: mockResponse,
          error: null
        })

        const result = await authService.updatePassword(password)
        
        expect(result).toBe(mockResponse)
        expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
          password: password
        })
      }
    })

    it('should successfully get user after password update', async () => {
      // Update password first
      const mockUpdateResponse = {
        user: {
          ...validUser,
          updated_at: new Date().toISOString()
        }
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: mockUpdateResponse,
        error: null
      })

      await authService.updatePassword(validNewPassword)

      // Then get current user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUpdateResponse.user },
        error: null
      })

      const currentUser = await authService.getCurrentUser()
      expect(currentUser).toBe(mockUpdateResponse.user)
    })

    it('should handle session refresh after password update', async () => {
      // Update password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: validUser },
        error: null
      })

      await authService.updatePassword(validNewPassword)

      // Refresh session
      const refreshedSession = {
        ...validSession,
        access_token: 'new_token_456',
        expires_at: Date.now() + 3600000
      }

      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: refreshedSession, user: validUser },
        error: null
      })

      const result = await authService.refreshSession()
      expect(result?.session).toBe(refreshedSession)
    })

    it('should handle email confirmation flow', async () => {
      // Simulate successful email confirmation with session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })

      await expect(authService.confirmEmail()).resolves.toBeUndefined()
      expect(mockSupabase.auth.getSession).toHaveBeenCalled()
    })

    it('should handle empty password update response gracefully', async () => {
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await authService.updatePassword(validNewPassword)
      expect(result).toBeNull()
    })
  })

  describe('Password Reset Confirmation Error Scenarios', () => {
    it('should handle expired reset token', async () => {
      const expiredTokenError = {
        message: 'Token has expired',
        status: 401
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: expiredTokenError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your password reset link has expired. Please request a new password reset.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Your password reset link has expired. Please request a new password reset.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        expiredTokenError,
        'updatePassword'
      )
    })

    it('should handle invalid reset token', async () => {
      const invalidTokenError = {
        message: 'Invalid token',
        status: 401
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: invalidTokenError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Invalid password reset link. Please request a new password reset.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Invalid password reset link. Please request a new password reset.')
    })

    it('should handle weak password validation errors', async () => {
      const weakPasswords = [
        '123',
        'password',
        'abc',
        '12345678',
        'Password1'
      ]

      for (const weakPassword of weakPasswords) {
        const weakPasswordError = {
          message: 'Password does not meet requirements',
          status: 400
        }

        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: null,
          error: weakPasswordError
        })

        mockErrorHandlingService.getUserMessage.mockReturnValue('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.')

        await expect(authService.updatePassword(weakPassword))
          .rejects.toThrow('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.')
      }
    })

    it('should handle session expiration during password update', async () => {
      const sessionExpiredError = {
        message: 'JWT expired',
        status: 401
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: sessionExpiredError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your session has expired. Please request a new password reset link.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Your session has expired. Please request a new password reset link.')
    })

    it('should handle user not found during password update', async () => {
      const userNotFoundError = {
        message: 'User not found',
        status: 404
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: userNotFoundError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('User account not found. Please contact support.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('User account not found. Please contact support.')
    })

    it('should handle email confirmation without session', async () => {
      // Simulate no session after clicking email link
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      })

      await expect(authService.confirmEmail())
        .rejects.toThrow('No session found after email confirmation')
    })

    it('should handle email confirmation with session error', async () => {
      const sessionError = {
        message: 'Failed to retrieve session',
        status: 500
      }

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: sessionError
      })

      await expect(authService.confirmEmail())
        .rejects.toEqual(sessionError)
    })

    it('should handle account disabled during password reset', async () => {
      const accountDisabledError = {
        message: 'Account disabled',
        status: 423
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: accountDisabledError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your account has been disabled. Please contact support for assistance.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Your account has been disabled. Please contact support for assistance.')
    })
  })

  describe('Network and Infrastructure Error Scenarios', () => {
    it('should handle network connection failures during password update', async () => {
      const networkError = new Error('Network request failed')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(networkError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Connection failed. Please check your internet connection and try again.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toMatchObject({
          message: 'Connection failed. Please check your internet connection and try again.',
          originalError: networkError
        })
    })

    it('should handle timeout errors during password update', async () => {
      const timeoutError = new Error('Request timeout')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(timeoutError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Password update request timed out. Please try again.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toMatchObject({
          message: 'Password update request timed out. Please try again.',
          originalError: timeoutError
        })
    })

    it('should handle server errors during password update', async () => {
      const serverError = {
        message: 'Internal server error',
        status: 500
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: serverError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Server error occurred. Please try again later.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Server error occurred. Please try again later.')
    })

    it('should handle service unavailable errors', async () => {
      const serviceUnavailableError = {
        message: 'Service unavailable',
        status: 503
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: serviceUnavailableError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Authentication service is temporarily unavailable. Please try again in a few minutes.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Authentication service is temporarily unavailable. Please try again in a few minutes.')
    })

    it('should handle database connection errors', async () => {
      const databaseError = {
        message: 'Database connection failed',
        status: 502
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: databaseError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Database connection error. Please try again later.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Database connection error. Please try again later.')
    })
  })

  describe('Password Reset Confirmation Edge Cases', () => {
    it('should handle very long passwords', async () => {
      // Test with 1000+ character password
      const longPassword = 'A1!' + 'a'.repeat(1000)

      const mockResponse = {
        user: {
          ...validUser,
          updated_at: new Date().toISOString()
        }
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      const result = await authService.updatePassword(longPassword)
      expect(result).toBe(mockResponse)
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: longPassword
      })
    })

    it('should handle passwords with special Unicode characters', async () => {
      const unicodePasswords = [
        'Пароль123!@#',
        '密码123!@#',
        'كلمة123!@#',
        '🔒SecurePass123!',
        'Émoticon🎉123!'
      ]

      for (const password of unicodePasswords) {
        const mockResponse = {
          user: {
            ...validUser,
            updated_at: new Date().toISOString()
          }
        }

        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: mockResponse,
          error: null
        })

        const result = await authService.updatePassword(password)
        expect(result).toBe(mockResponse)
      }
    })

    it('should handle concurrent password update attempts', async () => {
      const password1 = 'Password123!'
      const password2 = 'DifferentPass456!'

      const mockResponse1 = {
        user: { ...validUser, updated_at: '2023-01-01T10:00:00Z' }
      }
      const mockResponse2 = {
        user: { ...validUser, updated_at: '2023-01-01T10:01:00Z' }
      }

      mockSupabase.auth.updateUser
        .mockResolvedValueOnce({
          data: mockResponse1,
          error: null
        })
        .mockResolvedValueOnce({
          data: mockResponse2,
          error: null
        })

      const [result1, result2] = await Promise.allSettled([
        authService.updatePassword(password1),
        authService.updatePassword(password2)
      ])

      expect(result1.status).toBe('fulfilled')
      expect(result2.status).toBe('fulfilled')
      
      if (result1.status === 'fulfilled' && result2.status === 'fulfilled') {
        expect(result1.value).toBe(mockResponse1)
        expect(result2.value).toBe(mockResponse2)
      }
    })

    it('should handle empty password strings', async () => {
      const emptyPasswords = ['', '   ', '\t\n']

      for (const emptyPassword of emptyPasswords) {
        const emptyPasswordError = {
          message: 'Password cannot be empty',
          status: 400
        }

        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: null,
          error: emptyPasswordError
        })

        mockErrorHandlingService.getUserMessage.mockReturnValue('Password cannot be empty.')

        await expect(authService.updatePassword(emptyPassword))
          .rejects.toThrow('Password cannot be empty.')
      }
    })

    it('should handle password update with same password', async () => {
      const samePasswordError = {
        message: 'New password must be different from current password',
        status: 400
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: samePasswordError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your new password must be different from your current password.')

      await expect(authService.updatePassword('currentPassword123!'))
        .rejects.toThrow('Your new password must be different from your current password.')
    })

    it('should handle multiple rapid password change attempts', async () => {
      const rapidChangeError = {
        message: 'Too many password change attempts',
        status: 429
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: rapidChangeError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Too many password change attempts. Please wait before trying again.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Too many password change attempts. Please wait before trying again.')
    })
  })

  describe('Session Management During Reset Confirmation', () => {
    it('should verify session exists before password update', async () => {
      // First check session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })

      const session = await authService.getCurrentSession()
      expect(session).toBe(validSession)

      // Then update password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: validUser },
        error: null
      })

      await authService.updatePassword(validNewPassword)
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: validNewPassword
      })
    })

    it('should handle session refresh failure after password update', async () => {
      // Update password successfully
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: validUser },
        error: null
      })

      await authService.updatePassword(validNewPassword)

      // But session refresh fails
      const refreshError = {
        message: 'Failed to refresh session',
        status: 401
      }

      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: refreshError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Session refresh failed. Please sign in again.')

      await expect(authService.refreshSession())
        .rejects.toThrow('Session refresh failed. Please sign in again.')
    })

    it('should handle logout after successful password update', async () => {
      // Update password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: validUser },
        error: null
      })

      await authService.updatePassword(validNewPassword)

      // Then logout
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })

      await authService.signOut()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle getting current user after password update', async () => {
      // Update password
      const updatedUser = {
        ...validUser,
        updated_at: new Date().toISOString()
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: updatedUser },
        error: null
      })

      await authService.updatePassword(validNewPassword)

      // Get current user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: updatedUser },
        error: null
      })

      const currentUser = await authService.getCurrentUser()
      expect(currentUser).toBe(updatedUser)
    })

    it('should handle null session during confirmation flow', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      })

      const session = await authService.getCurrentSession()
      expect(session).toBeNull()
    })
  })

  describe('Integration with Error Handling Service', () => {
    it('should properly retry password update on transient failures', async () => {
      const networkError = new Error('Network error')
      
      // Mock executeWithRetry to throw error on first attempt
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(networkError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Network error occurred. Please try again.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toMatchObject({
          message: 'Network error occurred. Please try again.',
          originalError: networkError
        })

      // Verify retry configuration
      jest.clearAllMocks()
      mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
        return await fn()
      })
      
      const mockResponse = { user: validUser }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      const result = await authService.updatePassword(validNewPassword)
      expect(result).toBe(mockResponse)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should log all password update errors appropriately', async () => {
      const updateError = new Error('Password update failed')
      
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: updateError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Password update failed. Please try again.')

      try {
        await authService.updatePassword(validNewPassword)
      } catch {
        // Expected to throw
      }

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        updateError,
        'updatePassword'
      )
    })

    it('should enhance error messages for better user experience', async () => {
      const technicalError = {
        message: 'PGRST301: JWT expired',
        status: 401
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: technicalError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your password reset session has expired. Please request a new password reset link.')

      await expect(authService.updatePassword(validNewPassword))
        .rejects.toThrow('Your password reset session has expired. Please request a new password reset link.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        technicalError,
        'updatePassword'
      )
      expect(mockErrorHandlingService.getUserMessage).toHaveBeenCalledWith(technicalError)
    })

    it('should handle retry configurations correctly for all operations', async () => {
      // Password update uses maxAttempts: 2
      const mockResponse = { user: validUser }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      await authService.updatePassword(validNewPassword)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )

      // Session operations also use maxAttempts: 2
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })

      await authService.getCurrentSession()
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenLastCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )

      // Refresh session uses maxAttempts: 2
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: validSession, user: validUser },
        error: null
      })

      await authService.refreshSession()
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenLastCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })
  })
}) 