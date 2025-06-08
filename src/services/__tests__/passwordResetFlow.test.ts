// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
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
import type { PasswordResetRequest } from '../../types/auth'

// Get the mocked modules
const mockSupabase = jest.requireMock('../../lib/supabase').supabase
const mockErrorHandlingService = jest.requireMock('../errorHandlingService').errorHandlingService

describe('Password Reset Flow Integration Tests', () => {
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
    mockErrorHandlingService.getUserMessage.mockReturnValue('Password reset failed. Please try again.')
  })

  const validEmail = 'user@example.com'
  const validPasswordResetRequest: PasswordResetRequest = {
    email: validEmail
  }

  describe('Successful Password Reset Request Scenarios', () => {
    it('should successfully send password reset email', async () => {
      const mockResponse = {
        message: 'Password reset email sent successfully'
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      const result = await authService.resetPassword(validEmail)

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        validEmail,
        {
          redirectTo: 'http://localhost/auth/reset-password'
        }
      )
      expect(result).toBe(mockResponse)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle requestPasswordReset method (alias)', async () => {
      const mockResponse = {
        message: 'Password reset email sent successfully'
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      await authService.requestPasswordReset(validPasswordResetRequest)

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        validEmail,
        {
          redirectTo: 'http://localhost/auth/reset-password'
        }
      )
    })

    it('should handle password reset for different email formats', async () => {
      const testEmails = [
        'user@gmail.com',
        'test.user@company.co.uk',
        'user+tag@example.org',
        'admin@subdomain.university.edu',
        'user_name@domain-name.com'
      ]

      for (const email of testEmails) {
        const mockResponse = { message: 'Reset email sent' }

        mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
          data: mockResponse,
          error: null
        })

        const result = await authService.resetPassword(email)
        
        expect(result).toBe(mockResponse)
        expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          email,
          expect.objectContaining({
            redirectTo: 'http://localhost/auth/reset-password'
          })
        )
      }
    })

    it('should handle empty response data gracefully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await authService.resetPassword(validEmail)
      expect(result).toBeNull()
    })

    it('should handle undefined response data gracefully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: undefined,
        error: null
      })

      const result = await authService.resetPassword(validEmail)
      expect(result).toBeUndefined()
    })
  })

  describe('Password Reset Request Error Scenarios', () => {
    it('should handle user not found error', async () => {
      const userNotFoundError = {
        message: 'User not found',
        status: 404
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: userNotFoundError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('No account found with this email address. Please check your email or sign up for a new account.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toThrow('No account found with this email address. Please check your email or sign up for a new account.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        userNotFoundError,
        'resetPassword'
      )
    })

    it('should handle invalid email format error', async () => {
      const invalidEmails = [
        'invalid-email',
        'user@',
        '@domain.com',
        'user@domain',
        'user..double@domain.com',
        ''
      ]

      for (const email of invalidEmails) {
        const invalidEmailError = {
          message: 'Invalid email format',
          status: 400
        }

        mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
          data: null,
          error: invalidEmailError
        })

        mockErrorHandlingService.getUserMessage.mockReturnValue('Please enter a valid email address.')

        await expect(authService.resetPassword(email))
          .rejects.toThrow('Please enter a valid email address.')
      }
    })

    it('should handle rate limiting error', async () => {
      const rateLimitError = {
        message: 'Too many requests',
        status: 429
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: rateLimitError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Too many password reset requests. Please wait before requesting another.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toThrow('Too many password reset requests. Please wait before requesting another.')
    })

    it('should handle email service unavailable error', async () => {
      const emailServiceError = {
        message: 'Email service unavailable',
        status: 503
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: emailServiceError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Email service is temporarily unavailable. Please try again later.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toThrow('Email service is temporarily unavailable. Please try again later.')
    })

    it('should handle server error during email sending', async () => {
      const serverError = {
        message: 'Internal server error',
        status: 500
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: serverError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Server error occurred. Please try again later.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toThrow('Server error occurred. Please try again later.')
    })

    it('should handle account disabled/suspended error', async () => {
      const accountDisabledError = {
        message: 'Account disabled',
        status: 423
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: accountDisabledError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your account has been disabled. Please contact support for assistance.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toThrow('Your account has been disabled. Please contact support for assistance.')
    })

    it('should handle email delivery failure', async () => {
      const emailDeliveryError = {
        message: 'Email delivery failed',
        status: 502
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: emailDeliveryError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Failed to send password reset email. Please try again.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toThrow('Failed to send password reset email. Please try again.')
    })
  })

  describe('Network and Infrastructure Error Scenarios', () => {
    it('should handle network connection failures', async () => {
      const networkError = new Error('Network request failed')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(networkError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Connection failed. Please check your internet connection and try again.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toMatchObject({
          message: 'Connection failed. Please check your internet connection and try again.',
          originalError: networkError
        })
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(timeoutError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Password reset request timed out. Please try again.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toMatchObject({
          message: 'Password reset request timed out. Please try again.',
          originalError: timeoutError
        })
    })

    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('ENOTFOUND: DNS lookup failed')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(dnsError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Cannot connect to authentication server. Please check your connection.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toMatchObject({
          message: 'Cannot connect to authentication server. Please check your connection.',
          originalError: dnsError
        })
    })

    it('should handle SSL/TLS certificate errors', async () => {
      const sslError = new Error('SSL certificate verification failed')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(sslError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Secure connection could not be established. Please try again.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toMatchObject({
          message: 'Secure connection could not be established. Please try again.',
          originalError: sslError
        })
    })

    it('should handle CORS errors', async () => {
      const corsError = new Error('CORS policy blocked request')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(corsError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Request blocked by security policy. Please contact support.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toMatchObject({
          message: 'Request blocked by security policy. Please contact support.',
          originalError: corsError
        })
    })
  })

  describe('Password Reset Flow Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      // Create email near RFC 5321 limit (320 characters total)
      const longLocalPart = 'a'.repeat(64) // Max local part length
      const longDomain = 'b'.repeat(60) + '.example.com' // Long domain
      const longEmail = `${longLocalPart}@${longDomain}`

      const mockResponse = { message: 'Reset email sent' }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      const result = await authService.resetPassword(longEmail)
      expect(result).toBe(mockResponse)
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        longEmail,
        expect.any(Object)
      )
    })

    it('should handle special characters in email addresses', async () => {
      const specialEmails = [
        'user+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com',
        'user123@sub-domain.example.co.uk'
      ]

      for (const email of specialEmails) {
        const mockResponse = { message: 'Reset email sent' }

        mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
          data: mockResponse,
          error: null
        })

        const result = await authService.resetPassword(email)
        expect(result).toBe(mockResponse)
      }
    })

    it('should handle case sensitivity in email addresses', async () => {
      const emailVariations = [
        'User@Example.com',
        'USER@EXAMPLE.COM',
        'user@EXAMPLE.com',
        'User@example.COM'
      ]

      for (const email of emailVariations) {
        const mockResponse = { message: 'Reset email sent' }

        mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
          data: mockResponse,
          error: null
        })

        const result = await authService.resetPassword(email)
        expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          email,
          expect.any(Object)
        )
      }
    })

    it('should handle international domain names', async () => {
      const internationalEmails = [
        'user@münchen.de',
        'test@москва.рф',
        'admin@测试.中国'
      ]

      for (const email of internationalEmails) {
        const mockResponse = { message: 'Reset email sent' }

        mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
          data: mockResponse,
          error: null
        })

        const result = await authService.resetPassword(email)
        expect(result).toBe(mockResponse)
      }
    })

    it('should handle concurrent password reset requests', async () => {
      const email1 = 'user1@example.com'
      const email2 = 'user2@example.com'

      const mockResponse1 = { message: 'Reset email sent to user1' }
      const mockResponse2 = { message: 'Reset email sent to user2' }

      mockSupabase.auth.resetPasswordForEmail
        .mockResolvedValueOnce({
          data: mockResponse1,
          error: null
        })
        .mockResolvedValueOnce({
          data: mockResponse2,
          error: null
        })

      const [result1, result2] = await Promise.allSettled([
        authService.resetPassword(email1),
        authService.resetPassword(email2)
      ])

      expect(result1.status).toBe('fulfilled')
      expect(result2.status).toBe('fulfilled')
      
      if (result1.status === 'fulfilled' && result2.status === 'fulfilled') {
        expect(result1.value).toBe(mockResponse1)
        expect(result2.value).toBe(mockResponse2)
      }
    })

    it('should handle multiple reset requests for same email', async () => {
      const email = 'user@example.com'

      // First request succeeds
      const mockResponse1 = { message: 'Reset email sent' }
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: mockResponse1,
        error: null
      })

      const result1 = await authService.resetPassword(email)
      expect(result1).toBe(mockResponse1)

      // Second request gets rate limited
      const rateLimitError = {
        message: 'Too many requests',
        status: 429
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: rateLimitError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Too many password reset requests. Please wait before requesting another.')

      await expect(authService.resetPassword(email))
        .rejects.toThrow('Too many password reset requests. Please wait before requesting another.')
    })
  })

  describe('Password Update After Reset', () => {
    it('should successfully update password after reset', async () => {
      const newPassword = 'NewSecurePassword123!'
      const mockUser = {
        id: 'user_123',
        email: validEmail,
        updated_at: new Date().toISOString()
      }

      const mockResponse = {
        user: mockUser
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      const result = await authService.updatePassword(newPassword)

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword
      })
      expect(result).toBe(mockResponse)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle password update errors', async () => {
      const newPassword = 'NewPassword123!'
      const passwordUpdateError = {
        message: 'Password update failed',
        status: 400
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: passwordUpdateError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Failed to update password. Please try again.')

      await expect(authService.updatePassword(newPassword))
        .rejects.toThrow('Failed to update password. Please try again.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        passwordUpdateError,
        'updatePassword'
      )
    })

    it('should handle session expiration during password update', async () => {
      const newPassword = 'NewPassword123!'
      const sessionExpiredError = {
        message: 'JWT expired',
        status: 401
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: sessionExpiredError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your session has expired. Please request a new password reset link.')

      await expect(authService.updatePassword(newPassword))
        .rejects.toThrow('Your session has expired. Please request a new password reset link.')
    })

    it('should handle weak password errors during update', async () => {
      const weakPassword = '123'
      const weakPasswordError = {
        message: 'Password too weak',
        status: 400
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: weakPasswordError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Password must be at least 8 characters long and contain uppercase, lowercase, and special characters.')

      await expect(authService.updatePassword(weakPassword))
        .rejects.toThrow('Password must be at least 8 characters long and contain uppercase, lowercase, and special characters.')
    })
  })

  describe('Integration with Error Handling Service', () => {
    it('should properly retry password reset on transient failures', async () => {
      const networkError = new Error('Network error')
      
      // Mock executeWithRetry to throw error on first attempt
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(networkError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Network error occurred. Please try again.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toMatchObject({
          message: 'Network error occurred. Please try again.',
          originalError: networkError
        })

      // Verify retry configuration
      jest.clearAllMocks()
      mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
        return await fn()
      })
      
      const mockResponse = { message: 'Reset email sent successfully' }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      const result = await authService.resetPassword(validEmail)
      expect(result).toBe(mockResponse)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should log all password reset errors appropriately', async () => {
      const resetError = new Error('Password reset failed')
      
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: resetError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Password reset failed. Please try again.')

      try {
        await authService.resetPassword(validEmail)
      } catch {
        // Expected to throw
      }

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        resetError,
        'resetPassword'
      )
    })

    it('should enhance error messages for better user experience', async () => {
      const technicalError = {
        message: 'PGRST204: User not found',
        status: 404
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: technicalError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('We couldn\'t find an account with that email address. Please check your email or create a new account.')

      await expect(authService.resetPassword(validEmail))
        .rejects.toThrow('We couldn\'t find an account with that email address. Please check your email or create a new account.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        technicalError,
        'resetPassword'
      )
      expect(mockErrorHandlingService.getUserMessage).toHaveBeenCalledWith(technicalError)
    })

    it('should handle retry configurations correctly for different operations', async () => {
      // Password reset uses maxAttempts: 2
      const mockResponse = { message: 'Reset email sent' }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: mockResponse,
        error: null
      })

      await authService.resetPassword(validEmail)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )

      // Password update also uses maxAttempts: 2
      const mockUserResponse = { user: { id: 'user_123' } }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: mockUserResponse,
        error: null
      })

      await authService.updatePassword('NewPassword123!')
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenLastCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })
  })
})