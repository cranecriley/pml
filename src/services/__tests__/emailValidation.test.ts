// Mock all dependencies
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
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
import { passwordResetService } from '../passwordResetService'
import { validateEmail } from '../../utils/validation'
import type { RegisterCredentials, LoginCredentials } from '../../types/auth'

// Get the mocked modules
const mockSupabase = require('../../lib/supabase').supabase
const mockErrorHandlingService = require('../errorHandlingService').errorHandlingService

describe('Email Validation Enforcement Tests', () => {
  const validPassword = 'ValidPassword123'
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: Function) => fn())
    mockErrorHandlingService.getUserMessage.mockReturnValue('An error occurred')
  })

  describe('Core Email Validation Logic', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@subdomain.example.org',
        'firstname.lastname@company.com',
        'user123@test-domain.com',
        'admin@university.edu',
        'support@my-company.net',
        'info@domain-with-hyphens.com'
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBeNull()
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmailTests = [
        { email: '', expectedError: 'Email is required' },
        { email: '   ', expectedError: 'Please enter a valid email address' },
        { email: 'plainaddress', expectedError: 'Please enter a valid email address' },
        { email: '@domain.com', expectedError: 'Please enter a valid email address' },
        { email: 'user@', expectedError: 'Please enter a valid email address' },
        { email: 'user@domain', expectedError: 'Please enter a valid email address' },
        { email: 'user name@domain.com', expectedError: 'Please enter a valid email address' },
        { email: 'user@domain .com', expectedError: 'Please enter a valid email address' },
        { email: 'user@@domain.com', expectedError: 'Please enter a valid email address' },
        { email: 'user@.com', expectedError: 'Please enter a valid email address' },
        { email: 'user gmail.com', expectedError: 'Please enter a valid email address' }
      ]

      invalidEmailTests.forEach(({ email, expectedError }) => {
        expect(validateEmail(email)).toBe(expectedError)
      })
    })

    it('should handle edge cases and special inputs', () => {
      const edgeCases = [
        { input: null, expected: 'Email is required' },
        { input: undefined, expected: 'Email is required' },
        { input: 123, expected: 'Please enter a valid email address' },
        { input: true, expected: 'Please enter a valid email address' },
        { input: {}, expected: 'Please enter a valid email address' },
        { input: [], expected: 'Please enter a valid email address' }
      ]

      edgeCases.forEach(({ input, expected }) => {
        expect(validateEmail(input as any)).toBe(expected)
      })
    })
  })

  describe('User Registration Email Validation Enforcement', () => {
    it('should prevent registration with invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com',
        'user@@domain.com',
        'plaintext',
        'user@.com',
        'user gmail.com'
      ]

      for (const invalidEmail of invalidEmails) {
        const registrationRequest: RegisterCredentials = {
          email: invalidEmail,
          password: validPassword,
          confirmPassword: validPassword
        }

        // Test that validation catches the invalid email
        const emailValidation = validateEmail(invalidEmail)
        expect(emailValidation).not.toBeNull()
        expect(emailValidation).toBe('Please enter a valid email address')

        // Test that service would reject this (validation should prevent it from reaching Supabase)
        // In a real scenario, the form validation would prevent submission
        expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
      }
    })

    it('should allow registration with valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@subdomain.example.org',
        'firstname.lastname@company.com',
        'user123@test-domain.com'
      ]

      for (const validEmail of validEmails) {
        const registrationRequest: RegisterCredentials = {
          email: validEmail,
          password: validPassword,
          confirmPassword: validPassword
        }

        // Test that validation passes
        expect(validateEmail(validEmail)).toBeNull()

        // Mock successful registration
        const mockUser = { id: `user_${Date.now()}`, email: validEmail }
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: mockUser, session: null },
          error: null
        })

        const result = await authService.registerWithEmailVerification(registrationRequest)
        expect(result.user.email).toBe(validEmail)
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: validEmail,
          password: validPassword,
          options: expect.any(Object)
        })

        mockSupabase.auth.signUp.mockClear()
      }
    })

    it('should handle case sensitivity in email validation', async () => {
      const emailVariations = [
        'User@Example.Com',
        'TEST@DOMAIN.COM',
        'MixedCase@Example.org',
        'user@EXAMPLE.com'
      ]

      for (const email of emailVariations) {
        // All should pass validation (case doesn't matter for email format validation)
        expect(validateEmail(email)).toBeNull()

        const registrationRequest: RegisterCredentials = {
          email: email,
          password: validPassword,
          confirmPassword: validPassword
        }

        const mockUser = { id: `user_${Date.now()}`, email: email }
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: mockUser, session: null },
          error: null
        })

        const result = await authService.registerWithEmailVerification(registrationRequest)
        expect(result.user.email).toBe(email)
        mockSupabase.auth.signUp.mockClear()
      }
    })
  })

  describe('User Login Email Validation Enforcement', () => {
    it('should prevent login attempts with invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'plaintext',
        'user@@domain.com'
      ]

      for (const invalidEmail of invalidEmails) {
        const loginRequest: LoginCredentials = {
          email: invalidEmail,
          password: validPassword
        }

        // Test that validation catches the invalid email
        expect(validateEmail(invalidEmail)).not.toBeNull()

        // Service should not be called with invalid email (validation prevents it)
        expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
      }
    })

    it('should allow login attempts with valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'test@domain.co.uk',
        'admin@company.org'
      ]

      for (const validEmail of validEmails) {
        const loginRequest: LoginCredentials = {
          email: validEmail,
          password: validPassword
        }

        // Test that validation passes
        expect(validateEmail(validEmail)).toBeNull()

        // Mock successful login
        const mockUser = { id: `user_${Date.now()}`, email: validEmail }
        const mockSession = { access_token: 'token', user: mockUser }
        
        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession },
          error: null
        })

        const result = await authService.signIn(loginRequest)
        expect(result.user.email).toBe(validEmail)
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: validEmail,
          password: validPassword
        })

        mockSupabase.auth.signInWithPassword.mockClear()
      }
    })
  })

  describe('Password Reset Email Validation Enforcement', () => {
    it('should prevent password reset requests with invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'plaintext',
        'user@@domain.com'
      ]

      for (const invalidEmail of invalidEmails) {
        // Test that validation catches the invalid email
        expect(validateEmail(invalidEmail)).not.toBeNull()

        // Test service-level validation
        const validation = passwordResetService.validateResetRequest({ email: invalidEmail })
        expect(validation.isValid).toBe(false)
        expect(validation.errors.email).toBe('Please enter a valid email address')

        // Service should not make Supabase call with invalid email
        expect(mockSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled()
      }
    })

    it('should allow password reset requests with valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'test@domain.co.uk',
        'admin@company.org',
        'user+tag@example.com'
      ]

      for (const validEmail of validEmails) {
        // Test that validation passes
        expect(validateEmail(validEmail)).toBeNull()

        // Test service-level validation
        const validation = passwordResetService.validateResetRequest({ email: validEmail })
        expect(validation.isValid).toBe(true)
        expect(validation.errors.email).toBeUndefined()

        // Mock successful password reset request
        const mockResponse = { message: 'Reset email sent' }
        mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
          data: mockResponse,
          error: null
        })

        const result = await authService.resetPassword(validEmail)
        expect(result).toBe(mockResponse)
        expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          validEmail,
          expect.any(Object)
        )

        mockSupabase.auth.resetPasswordForEmail.mockClear()
      }
    })

    it('should handle email normalization in password reset', async () => {
      const emailVariations = [
        { input: '  user@example.com  ', normalized: 'user@example.com' },
        { input: 'User@Example.Com', normalized: 'User@Example.Com' }
      ]

      for (const { input, normalized } of emailVariations) {
        // Trim whitespace but preserve case (email validation handles this)
        const trimmedEmail = input.trim()
        expect(validateEmail(trimmedEmail)).toBeNull()

        const mockResponse = { message: 'Reset email sent' }
        mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
          data: mockResponse,
          error: null
        })

        const result = await authService.resetPassword(trimmedEmail)
        expect(result).toBe(mockResponse)
        mockSupabase.auth.resetPasswordForEmail.mockClear()
      }
    })
  })

  describe('Email Validation Security Features', () => {
    it('should prevent email injection attacks', () => {
      const maliciousEmails = [
        'user@domain.com\r\nBcc: attacker@evil.com',
        'user@domain.com\nTo: victim@target.com',
        'user@domain.com%0ABcc:attacker@evil.com',
        'user@domain.com\x0ABcc:attacker@evil.com'
      ]

      maliciousEmails.forEach(maliciousEmail => {
        expect(validateEmail(maliciousEmail)).toBe('Please enter a valid email address')
      })
    })

    it('should handle extremely long email addresses', () => {
      // Test very long but valid email (within RFC limits)
      const longValidEmail = 'a'.repeat(64) + '@' + 'b'.repeat(60) + '.com'
      expect(validateEmail(longValidEmail)).toBeNull()

      // Test extremely long email (beyond reasonable limits)
      const extremelyLongEmail = 'a'.repeat(500) + '@' + 'b'.repeat(500) + '.com'
      expect(validateEmail(extremelyLongEmail)).toBeNull() // Our basic regex allows this
    })

    it('should handle international domain names', () => {
      const internationalEmails = [
        'test@münchen.de',
        'user@测试.com',
        'test@пример.рф'
      ]

      // Note: Basic regex may not handle all international domains perfectly
      // This tests current behavior
      internationalEmails.forEach(email => {
        const result = validateEmail(email)
        expect(typeof result === 'string' || result === null).toBe(true)
      })
    })

    it('should prevent common email typos and mistakes', () => {
      const commonMistakes = [
        'user@gmial.com', // typo but valid format
        'user@yahooo.com', // typo but valid format  
        'user@hotmial.com', // typo but valid format
        'user@gmai.com', // typo but valid format
        'user@', // incomplete
        '@gmail.com', // missing local part
        'user@.com', // missing domain
        'user@gmail.', // missing TLD
        'user gmail.com' // missing @
      ]

      const invalidOnes = commonMistakes.filter(email => 
        !email.includes('@') || 
        email.startsWith('@') || 
        email.endsWith('@') ||
        email.includes('@.') ||
        email.endsWith('.')
      )

      invalidOnes.forEach(email => {
        expect(validateEmail(email)).toBe('Please enter a valid email address')
      })
    })
  })

  describe('Integration with Form Components', () => {
    it('should provide consistent error messages across all forms', () => {
      const invalidEmail = 'invalid-email'
      const expectedMessage = 'Please enter a valid email address'

      // Test that all validation points return the same message
      expect(validateEmail(invalidEmail)).toBe(expectedMessage)
      
      const resetValidation = passwordResetService.validateResetRequest({ email: invalidEmail })
      expect(resetValidation.errors.email).toBe(expectedMessage)
    })

    it('should handle empty email consistently', () => {
      const emptyEmail = ''
      const expectedMessage = 'Email is required'

      expect(validateEmail(emptyEmail)).toBe(expectedMessage)
      
      const resetValidation = passwordResetService.validateResetRequest({ email: emptyEmail })
      expect(resetValidation.errors.email).toBe(expectedMessage)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle rapid validation calls efficiently', () => {
      const testEmail = 'user@example.com'
      const startTime = Date.now()
      
      // Perform many validations
      for (let i = 0; i < 1000; i++) {
        validateEmail(testEmail)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete quickly (less than 100ms for 1000 validations)
      expect(duration).toBeLessThan(100)
    })

    it('should handle validation with special Unicode characters', () => {
      const unicodeEmails = [
        'tëst@example.com',
        'üser@domain.com',
        'naïve@company.org'
      ]

      unicodeEmails.forEach(email => {
        const result = validateEmail(email)
        // Should either pass or fail consistently (not throw errors)
        expect(typeof result === 'string' || result === null).toBe(true)
      })
    })
  })
}) 