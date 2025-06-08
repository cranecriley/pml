// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      resend: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
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
import type { RegisterCredentials } from '../../types/auth'

// Get the mocked modules
const mockSupabase = jest.requireMock('../../lib/supabase').supabase
const mockErrorHandlingService = jest.requireMock('../errorHandlingService').errorHandlingService

describe('User Registration Flow Integration Tests', () => {
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
    mockErrorHandlingService.getUserMessage.mockReturnValue('Registration failed. Please try again.')
  })

  const validCredentials: RegisterCredentials = {
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!'
  }

  describe('Successful Registration Scenarios', () => {
    it('should complete full registration flow requiring email verification', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'newuser@example.com',
        email_confirmed_at: null,
        created_at: new Date().toISOString()
      }

      // Step 1: Initial registration
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null
      })

      const registrationResult = await authService.registerWithEmailVerification(validCredentials)

      expect(registrationResult).toEqual({
        user: mockUser,
        session: null,
        needsEmailVerification: true
      })

      // Step 2: Check verification status (should be unverified)
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      })

      const verificationStatus = await authService.checkEmailVerificationStatus()
      expect(verificationStatus).toEqual({
        isVerified: false,
        email: 'newuser@example.com'
      })

      // Step 3: Resend verification email if needed
      mockSupabase.auth.resend.mockResolvedValueOnce({
        error: null
      })

      await expect(authService.resendEmailVerification('newuser@example.com'))
        .resolves.toBeUndefined()

      // Step 4: Email confirmation (simulating user clicking email link)
      const mockSession = {
        access_token: 'verified_token_123',
        refresh_token: 'refresh_123',
        user: { ...mockUser, email_confirmed_at: new Date().toISOString() }
      }

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null
      })

      await expect(authService.confirmEmail()).resolves.toBeUndefined()

      // Step 5: Verify final status (should be verified)
      const verifiedUser = { ...mockUser, email_confirmed_at: new Date().toISOString() }
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: verifiedUser },
        error: null
      })

      const finalStatus = await authService.checkEmailVerificationStatus()
      expect(finalStatus.isVerified).toBe(true)
    })

    it('should handle immediate registration success without email verification', async () => {
      const mockUser = {
        id: 'user_456',
        email: 'verified@example.com',
        email_confirmed_at: new Date().toISOString()
      }
      const mockSession = {
        access_token: 'immediate_token_456',
        refresh_token: 'refresh_456',
        user: mockUser
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const result = await authService.registerWithEmailVerification(validCredentials)

      expect(result).toEqual({
        user: mockUser,
        session: mockSession,
        needsEmailVerification: false
      })

      // Verify user is immediately verified
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      })

      const status = await authService.checkEmailVerificationStatus()
      expect(status.isVerified).toBe(true)
    })

    it('should handle registration with different email domains', async () => {
      const testCases = [
        'user@gmail.com',
        'test@company.co.uk',
        'user123@university.edu',
        'admin@subdomain.example.org'
      ]

      for (const email of testCases) {
        const credentials = { ...validCredentials, email }
        const mockUser = { id: `user_${Date.now()}`, email }

        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: mockUser, session: null },
          error: null
        })

        const result = await authService.registerWithEmailVerification(credentials)
        
        expect(result.user.email).toBe(email)
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
          expect.objectContaining({ email })
        )
      }
    })
  })

  describe('Registration Error Scenarios', () => {
    it('should handle email already registered error', async () => {
      const duplicateEmailError = {
        message: 'User already registered',
        status: 422
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: duplicateEmailError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('This email is already registered. Please use a different email or try signing in.')

      await expect(authService.registerWithEmailVerification(validCredentials))
        .rejects.toThrow('This email is already registered. Please use a different email or try signing in.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        duplicateEmailError,
        'registerWithEmailVerification'
      )
    })

    it('should handle invalid email format errors', async () => {
      const invalidEmailCredentials = {
        ...validCredentials,
        email: 'invalid-email-format'
      }

      const invalidEmailError = {
        message: 'Invalid email format',
        status: 400
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: invalidEmailError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Please enter a valid email address.')

      await expect(authService.registerWithEmailVerification(invalidEmailCredentials))
        .rejects.toThrow('Please enter a valid email address.')
    })

    it('should handle weak password errors', async () => {
      const weakPasswordCredentials = {
        ...validCredentials,
        password: '123',
        confirmPassword: '123'
      }

      const weakPasswordError = {
        message: 'Password should be at least 6 characters',
        status: 400
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: weakPasswordError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Password must be at least 8 characters long and contain uppercase, lowercase, and special characters.')

      await expect(authService.registerWithEmailVerification(weakPasswordCredentials))
        .rejects.toThrow('Password must be at least 8 characters long and contain uppercase, lowercase, and special characters.')
    })

    it('should handle rate limiting during registration', async () => {
      const rateLimitError = {
        message: 'Too many requests',
        status: 429
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: rateLimitError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Too many registration attempts. Please wait a few minutes before trying again.')

      await expect(authService.registerWithEmailVerification(validCredentials))
        .rejects.toThrow('Too many registration attempts. Please wait a few minutes before trying again.')
    })

    it('should handle network errors during registration', async () => {
      const networkError = new Error('Network request failed')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(networkError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Connection failed. Please check your internet connection and try again.')

      await expect(authService.registerWithEmailVerification(validCredentials))
        .rejects.toMatchObject({
          message: 'Connection failed. Please check your internet connection and try again.',
          originalError: networkError
        })
    })

    it('should handle server errors during registration', async () => {
      const serverError = {
        message: 'Internal server error',
        status: 500
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: serverError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Server error occurred. Please try again later.')

      await expect(authService.registerWithEmailVerification(validCredentials))
        .rejects.toThrow('Server error occurred. Please try again later.')
    })
  })

  describe('Email Verification Flow Error Scenarios', () => {
    it('should handle errors during email verification resend', async () => {
      // First register successfully
      const mockUser = { id: 'user_123', email: validCredentials.email }
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null
      })

      await authService.registerWithEmailVerification(validCredentials)

      // Then fail on resend
      const resendError = {
        message: 'Email delivery failed',
        status: 503
      }

      mockSupabase.auth.resend.mockResolvedValueOnce({
        error: resendError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Failed to send verification email. Please try again.')

      await expect(authService.resendEmailVerification(validCredentials.email))
        .rejects.toThrow('Failed to send verification email. Please try again.')
    })

    it('should handle rate limiting on email verification resend', async () => {
      const rateLimitError = {
        message: 'Email rate limit exceeded',
        status: 429
      }

      mockSupabase.auth.resend.mockResolvedValueOnce({
        error: rateLimitError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Too many verification emails sent. Please wait before requesting another.')

      await expect(authService.resendEmailVerification(validCredentials.email))
        .rejects.toThrow('Too many verification emails sent. Please wait before requesting another.')
    })

    it('should handle email confirmation with invalid/expired session', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      })

      await expect(authService.confirmEmail())
        .rejects.toThrow('No session found after email confirmation')
    })

    it('should handle email confirmation session retrieval error', async () => {
      const sessionError = new Error('Session retrieval failed')

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: sessionError
      })

      await expect(authService.confirmEmail())
        .rejects.toThrow('Session retrieval failed')
    })
  })

  describe('Registration Flow Edge Cases', () => {
    it('should handle registration with maximum length email', async () => {
      // Create a very long but valid email (320 characters total - RFC 5321 limit)
      const longLocalPart = 'a'.repeat(64) // Max local part length
      const longDomain = 'b'.repeat(60) + '.example.com' // Long domain
      const longEmail = `${longLocalPart}@${longDomain}`
      
      const credentials = { ...validCredentials, email: longEmail }
      const mockUser = { id: 'user_long', email: longEmail }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null
      })

      const result = await authService.registerWithEmailVerification(credentials)
      expect(result.user.email).toBe(longEmail)
    })

    it('should handle registration with special characters in email', async () => {
      const specialEmails = [
        'user+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com'
      ]

      for (const email of specialEmails) {
        const credentials = { ...validCredentials, email }
        const mockUser = { id: `user_${Date.now()}`, email }

        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: mockUser, session: null },
          error: null
        })

        const result = await authService.registerWithEmailVerification(credentials)
        expect(result.user.email).toBe(email)
      }
    })

    it('should handle concurrent registration attempts for same email', async () => {
      const credentials1 = { ...validCredentials }
      const credentials2 = { ...validCredentials }

      // First attempt succeeds
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'user_1', email: validCredentials.email }, session: null },
        error: null
      })

      // Second attempt fails with duplicate email
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 }
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('This email is already registered.')

      const [result1, result2] = await Promise.allSettled([
        authService.registerWithEmailVerification(credentials1),
        authService.registerWithEmailVerification(credentials2)
      ])

      expect(result1.status).toBe('fulfilled')
      expect(result2.status).toBe('rejected')
      if (result2.status === 'rejected') {
        expect(result2.reason.message).toContain('This email is already registered.')
      }
    })

    it('should handle registration timeout scenarios', async () => {
      const timeoutError = new Error('Request timeout')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(timeoutError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Registration timed out. Please try again.')

      await expect(authService.registerWithEmailVerification(validCredentials))
        .rejects.toMatchObject({
          message: 'Registration timed out. Please try again.',
          originalError: timeoutError
        })
    })

    it('should handle empty or null registration responses', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null
      })

      const result = await authService.registerWithEmailVerification(validCredentials)
      
      expect(result).toEqual({
        user: null,
        session: null,
        needsEmailVerification: false
      })
    })
  })

  describe('Integration with Error Handling Service', () => {
    it('should properly retry registration on transient failures', async () => {
      const networkError = new Error('Network error')
      
      // Mock executeWithRetry to throw error (simulating network failure)
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(networkError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Network error occurred. Please try again.')

      // First call should fail with enhanced error
      await expect(authService.registerWithEmailVerification(validCredentials))
        .rejects.toMatchObject({
          message: 'Network error occurred. Please try again.',
          originalError: networkError
        })

      // Verify retry configuration is correct by testing a successful call
      jest.clearAllMocks()
      mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
        return await fn()
      })
      
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'user_success', email: validCredentials.email }, session: null },
        error: null
      })

      const result = await authService.registerWithEmailVerification(validCredentials)
      
      expect(result.user.id).toBe('user_success')
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should log all registration errors appropriately', async () => {
      const registrationError = new Error('Registration failed')
      
      // Mock the supabase call to return an error
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: registrationError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Registration failed. Please try again.')

      try {
        await authService.registerWithEmailVerification(validCredentials)
      } catch {
        // Expected to throw
      }

      // The error should be logged through executeWithRetry's internal flow
      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        registrationError,
        'registerWithEmailVerification'
      )
    })

    it('should enhance error messages for better user experience', async () => {
      const technicalError = {
        message: 'PGRST116: JWT expired',
        status: 401
      }

      // Mock supabase to return the technical error
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: technicalError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your session has expired. Please refresh the page and try again.')

      await expect(authService.registerWithEmailVerification(validCredentials))
        .rejects.toThrow('Your session has expired. Please refresh the page and try again.')

      // Verify the error was logged and enhanced
      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        technicalError,
        'registerWithEmailVerification'
      )
      expect(mockErrorHandlingService.getUserMessage).toHaveBeenCalledWith(technicalError)
    })
  })
})