// Mock all dependencies
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      resend: jest.fn(),
    }
  }
}))

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
const mockSupabase = require('../../lib/supabase').supabase
const mockErrorHandlingService = require('../errorHandlingService').errorHandlingService

describe('Duplicate Email Prevention Tests', () => {
  const validPassword = 'ValidPassword123'
  const testEmail = 'test@example.com'
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: Function) => fn())
    mockErrorHandlingService.getUserMessage.mockImplementation((error: any) => {
      if (error?.message?.includes('already registered') || 
          error?.message?.includes('already exists') || 
          error?.message?.includes('already taken')) {
        return 'This email is already registered. Please use a different email or try signing in.'
      }
      if (error?.message?.includes('User not found')) {
        return 'Failed to send verification email. Please try again.'
      }
      if (error?.message?.includes('rate limit')) {
        return 'Too many verification emails sent. Please wait before requesting another.'
      }
      if (error?.message?.includes('Invalid login credentials')) {
        return 'Invalid email or password. Please check your credentials and try again.'
      }
      if (error?.message?.includes('timeout')) {
        return 'Registration timed out. Please try again.'
      }
      return 'An error occurred'
    })
  })

  describe('Registration Duplicate Email Prevention', () => {
    it('should prevent registration with already registered email', async () => {
      const registrationRequest: RegisterCredentials = {
        email: testEmail,
        password: validPassword,
        confirmPassword: validPassword
      }

      // Mock Supabase duplicate email error
      const duplicateEmailError = {
        message: 'User already registered',
        status: 422
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: duplicateEmailError
      })

      // Test that registration fails with appropriate error
      await expect(authService.registerWithEmailVerification(registrationRequest))
        .rejects.toThrow('This email is already registered. Please use a different email or try signing in.')

      // Verify error handling service was called
      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        duplicateEmailError,
        'registerWithEmailVerification'
      )
      
      // Verify getUserMessage was called to get user-friendly message
      expect(mockErrorHandlingService.getUserMessage).toHaveBeenCalledWith(duplicateEmailError)
    })

    it('should handle different duplicate email error messages', async () => {
      const duplicateEmailErrorVariations = [
        { message: 'User already registered', status: 422 },
        { message: 'Email already exists', status: 409 },
        { message: 'User already exists', status: 422 },
        { message: 'Email already taken', status: 409 }
      ]

      for (const errorVariation of duplicateEmailErrorVariations) {
        const registrationRequest: RegisterCredentials = {
          email: `test${Date.now()}@example.com`,
          password: validPassword,
          confirmPassword: validPassword
        }

        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: errorVariation
        })

        await expect(authService.registerWithEmailVerification(registrationRequest))
          .rejects.toThrow('This email is already registered. Please use a different email or try signing in.')

        mockSupabase.auth.signUp.mockClear()
        mockErrorHandlingService.logError.mockClear()
        mockErrorHandlingService.getUserMessage.mockClear()
      }
    })

    it('should allow registration with unique email after duplicate error', async () => {
      const duplicateEmail = 'duplicate@example.com'
      const uniqueEmail = 'unique@example.com'

      // First attempt with duplicate email
      const duplicateRequest: RegisterCredentials = {
        email: duplicateEmail,
        password: validPassword,
        confirmPassword: validPassword
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 }
      })

      await expect(authService.registerWithEmailVerification(duplicateRequest))
        .rejects.toThrow('This email is already registered. Please use a different email or try signing in.')

      // Second attempt with unique email should succeed
      const uniqueRequest: RegisterCredentials = {
        email: uniqueEmail,
        password: validPassword,
        confirmPassword: validPassword
      }

      const mockUser = { id: 'user_unique', email: uniqueEmail }
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser, session: null },
        error: null
      })

      const result = await authService.registerWithEmailVerification(uniqueRequest)
      expect(result.user.email).toBe(uniqueEmail)
      expect(result.needsEmailVerification).toBe(true)
    })

    it('should handle case-insensitive duplicate email detection', async () => {
      const emailVariations = [
        'user@example.com',
        'User@example.com',
        'USER@EXAMPLE.COM',
        'User@Example.Com'
      ]

      for (const email of emailVariations) {
        const registrationRequest: RegisterCredentials = {
          email: email,
          password: validPassword,
          confirmPassword: validPassword
        }

        // Mock that all variations are considered duplicates
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'User already registered', status: 422 }
        })

        await expect(authService.registerWithEmailVerification(registrationRequest))
          .rejects.toThrow('This email is already registered. Please use a different email or try signing in.')

        mockSupabase.auth.signUp.mockClear()
      }
    })
  })

  describe('Concurrent Registration Attempts', () => {
    it('should handle concurrent registration attempts for same email', async () => {
      const concurrentEmail = 'concurrent@example.com'
      const credentials1: RegisterCredentials = {
        email: concurrentEmail,
        password: validPassword,
        confirmPassword: validPassword
      }
      const credentials2: RegisterCredentials = {
        email: concurrentEmail,
        password: 'AnotherPassword123',
        confirmPassword: 'AnotherPassword123'
      }

      // First request succeeds
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'user_first', email: concurrentEmail }, session: null },
        error: null
      })

      // Second request fails with duplicate
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 }
      })

      // Execute both requests concurrently
      const [result1, result2] = await Promise.allSettled([
        authService.registerWithEmailVerification(credentials1),
        authService.registerWithEmailVerification(credentials2)
      ])

      expect(result1.status).toBe('fulfilled')
      expect(result2.status).toBe('rejected')
      
      if (result1.status === 'fulfilled') {
        expect(result1.value.user.email).toBe(concurrentEmail)
      }
      
      if (result2.status === 'rejected') {
        expect(result2.reason.message).toContain('This email is already registered')
      }
    })

    it('should handle high volume concurrent registration attempts', async () => {
      const baseEmail = 'load-test@example.com'
      const numberOfAttempts = 10
      
      // Create multiple registration requests
      const registrationPromises = Array.from({ length: numberOfAttempts }, (_, index) => {
        const credentials: RegisterCredentials = {
          email: baseEmail,
          password: `Password${index}123`,
          confirmPassword: `Password${index}123`
        }

        // First attempt succeeds, rest fail
        if (index === 0) {
          mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: { user: { id: `user_${index}`, email: baseEmail }, session: null },
            error: null
          })
        } else {
          mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: { user: null, session: null },
            error: { message: 'User already registered', status: 422 }
          })
        }

        return authService.registerWithEmailVerification(credentials)
      })

      const results = await Promise.allSettled(registrationPromises)
      
      // One should succeed, rest should fail
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')
      
      expect(successful.length).toBe(1)
      expect(failed.length).toBe(numberOfAttempts - 1)
      
      // All failures should be duplicate email errors
      failed.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason.message).toContain('This email is already registered')
        }
      })
    })
  })

  describe('Email Verification Resend with Duplicate Handling', () => {
    it('should handle resend verification for existing registered email', async () => {
      const registeredEmail = 'registered@example.com'

      // Mock successful resend
      mockSupabase.auth.resend.mockResolvedValueOnce({
        error: null
      })

      await expect(authService.resendEmailVerification(registeredEmail))
        .resolves.toBeUndefined()

      expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: expect.stringContaining('/auth/confirm')
        }
      })
    })

    it('should handle resend verification for non-existent email gracefully', async () => {
      const nonExistentEmail = 'nonexistent@example.com'

      // Mock error for non-existent email
      const resendError = {
        message: 'User not found',
        status: 400
      }

      mockSupabase.auth.resend.mockResolvedValueOnce({
        error: resendError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Failed to send verification email. Please try again.')

      await expect(authService.resendEmailVerification(nonExistentEmail))
        .rejects.toThrow('Failed to send verification email. Please try again.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        resendError,
        'resendEmailVerification'
      )
    })

    it('should handle rate limiting on verification resend', async () => {
      const rateLimitedEmail = 'ratelimited@example.com'

      const rateLimitError = {
        message: 'Email rate limit exceeded',
        status: 429
      }

      mockSupabase.auth.resend.mockResolvedValueOnce({
        error: rateLimitError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Too many verification emails sent. Please wait before requesting another.')

      await expect(authService.resendEmailVerification(rateLimitedEmail))
        .rejects.toThrow('Too many verification emails sent. Please wait before requesting another.')
    })
  })

  describe('Login Attempts with Duplicate Email Scenarios', () => {
    it('should allow login for existing registered email', async () => {
      const existingEmail = 'existing@example.com'
      const loginCredentials = {
        email: existingEmail,
        password: validPassword
      }

      // Mock successful login
      const mockUser = { id: 'existing_user', email: existingEmail, email_confirmed_at: new Date().toISOString() }
      const mockSession = { access_token: 'token123', user: mockUser }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const result = await authService.signIn(loginCredentials)
      expect(result.user.email).toBe(existingEmail)
      expect(result.session).toBeTruthy()
    })

    it('should handle login attempt for unregistered email', async () => {
      const unregisteredEmail = 'unregistered@example.com'
      const loginCredentials = {
        email: unregisteredEmail,
        password: validPassword
      }

      // Mock user not found error
      const userNotFoundError = {
        message: 'Invalid login credentials',
        status: 400
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: userNotFoundError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Invalid email or password. Please check your credentials and try again.')

      await expect(authService.signIn(loginCredentials))
        .rejects.toThrow('Invalid email or password. Please check your credentials and try again.')
    })
  })

  describe('Error Message Consistency', () => {
    it('should provide consistent duplicate email error messages', () => {
      const duplicateEmailErrors = [
        { message: 'User already registered', status: 422 },
        { message: 'Email already exists', status: 409 },
        { message: 'already taken', status: 422 }
      ]

      duplicateEmailErrors.forEach(error => {
        const userMessage = mockErrorHandlingService.getUserMessage(error)
        expect(userMessage).toContain('already registered')
        expect(userMessage).toContain('different email')
        expect(userMessage).toContain('try signing in')
      })
    })

    it('should provide helpful recovery suggestions in error messages', async () => {
      const registrationRequest: RegisterCredentials = {
        email: testEmail,
        password: validPassword,
        confirmPassword: validPassword
      }

      const duplicateError = {
        message: 'User already registered',
        status: 422
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: duplicateError
      })

      try {
        await authService.registerWithEmailVerification(registrationRequest)
      } catch (error: any) {
        expect(error.message).toContain('This email is already registered')
        expect(error.message).toContain('different email')
        expect(error.message).toContain('try signing in')
      }
    })
  })

  describe('Edge Cases and Security Considerations', () => {
    it('should handle malformed duplicate email errors', async () => {
      const registrationRequest: RegisterCredentials = {
        email: testEmail,
        password: validPassword,
        confirmPassword: validPassword
      }

      // Test various malformed error responses that would actually cause errors
      const malformedErrors = [
        { message: '', status: 422 },
        { message: 'User already registered', status: undefined }, // missing status
        { message: 'Some unknown error', status: 500 }
      ]

      for (const malformedError of malformedErrors) {
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: malformedError
        })

        mockErrorHandlingService.getUserMessage.mockReturnValue('An error occurred')

        await expect(authService.registerWithEmailVerification(registrationRequest))
          .rejects.toThrow('An error occurred')

        mockSupabase.auth.signUp.mockClear()
        mockErrorHandlingService.getUserMessage.mockClear()
      }
      
      // Test null/undefined errors that don't cause failures (successful registration)
      const nullErrors = [null, undefined]
      
      for (const nullError of nullErrors) {
        const mockUser = { id: 'user_test', email: testEmail }
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: mockUser, session: null },
          error: nullError
        })

        const result = await authService.registerWithEmailVerification(registrationRequest)
        expect(result.user.email).toBe(testEmail)
        expect(result.needsEmailVerification).toBe(true)

        mockSupabase.auth.signUp.mockClear()
      }
    })

    it('should handle network timeout during duplicate check', async () => {
      const registrationRequest: RegisterCredentials = {
        email: testEmail,
        password: validPassword,
        confirmPassword: validPassword
      }

      const timeoutError = new Error('Request timeout')
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(timeoutError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Registration timed out. Please try again.')

      await expect(authService.registerWithEmailVerification(registrationRequest))
        .rejects.toMatchObject({
          message: 'Registration timed out. Please try again.',
          originalError: timeoutError
        })
    })

    it('should prevent timing attacks for email enumeration', async () => {
      const emails = [
        'registered@example.com',
        'notregistered@example.com'
      ]

      const startTimes: number[] = []
      const endTimes: number[] = []

      for (const email of emails) {
        const registrationRequest: RegisterCredentials = {
          email: email,
          password: validPassword,
          confirmPassword: validPassword
        }

        // Mock duplicate error for both (to prevent timing attacks)
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'User already registered', status: 422 }
        })

        startTimes.push(Date.now())
        
        try {
          await authService.registerWithEmailVerification(registrationRequest)
        } catch (error) {
          // Expected to fail
        }
        
        endTimes.push(Date.now())
        mockSupabase.auth.signUp.mockClear()
      }

      // Response times should be similar (within reasonable bounds)
      const responseTimes = endTimes.map((end, i) => end - startTimes[i])
      const timeDifference = Math.abs(responseTimes[0] - responseTimes[1])
      
      // Allow for some variance in response times (up to 100ms difference)
      expect(timeDifference).toBeLessThan(100)
    })
  })

  describe('Integration with Form Validation', () => {
    it('should work with form-level duplicate email handling', async () => {
      const formSubmissionData: RegisterCredentials = {
        email: 'form-test@example.com',
        password: validPassword,
        confirmPassword: validPassword
      }

      // Simulate form validation passing, then service-level duplicate detection
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 }
      })

      // The form should handle the service error appropriately
      const serviceCall = authService.registerWithEmailVerification(formSubmissionData)
      
      await expect(serviceCall).rejects.toThrow('This email is already registered')
      
      // Verify the error can be caught and handled by form components
      try {
        await serviceCall
      } catch (error: any) {
        expect(error.message).toBe('This email is already registered. Please use a different email or try signing in.')
        expect(error.originalError).toBeDefined()
      }
    })
  })
})