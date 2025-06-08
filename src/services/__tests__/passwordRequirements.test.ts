// Mock all dependencies
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
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
import { passwordResetConfirmService } from '../passwordResetConfirmService'
import type { PasswordResetConfirmRequest } from '../passwordResetConfirmService'
import { validatePassword, validatePasswordConfirm } from '../../utils/validation'
import type { RegisterCredentials, PasswordUpdateRequest } from '../../types/auth'

// Get the mocked modules
const mockSupabase = jest.requireMock('../../lib/supabase').supabase
const mockErrorHandlingService = jest.requireMock('../errorHandlingService').errorHandlingService

describe('Password Requirements Enforcement Tests', () => {
  const validEmail = 'user@example.com'
  const validPassword = 'SecurePassword123!'
  const validUser = {
    id: 'user_123',
    email: validEmail,
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
      return await fn()
    })
    
    mockErrorHandlingService.getUserMessage.mockReturnValue('Password must be at least 8 characters long.')
  })

  describe('Core Password Validation (Unit Level)', () => {
    describe('Minimum 8 Character Requirement', () => {
      it('should enforce exactly 8 characters as minimum', () => {
        // Test passwords under 8 characters
        const shortPasswords = ['', '1', '12', '123', '1234', '12345', '123456', '1234567']
        
        shortPasswords.forEach(password => {
          const result = validatePassword(password)
          if (password === '') {
            expect(result).toBe('Password is required')
          } else {
            expect(result).toBe('Password must be at least 8 characters long')
          }
        })
      })

      it('should accept exactly 8 characters', () => {
        const eightCharPasswords = [
          '12345678',
          'abcdefgh',
          'ABCDEFGH',
          'A1b2C3d4',
          '!@#$%^&*',
          'password',
          'PASSWORD',
          'Passw0rd',
          '        ', // 8 spaces
          'αβγδεζηθ'  // 8 Greek letters
        ]
        
        eightCharPasswords.forEach(password => {
          expect(validatePassword(password)).toBeNull()
        })
      })

      it('should accept passwords longer than 8 characters', () => {
        const longPasswords = [
          'VeryLongPassword123!',
          'a'.repeat(100),
          'SuperSecurePasswordWithLotsOfCharacters2024!@#',
          'This is a passphrase with spaces',
          '🔒SecurePassword123!🔑'
        ]
        
        longPasswords.forEach(password => {
          expect(validatePassword(password)).toBeNull()
        })
      })
    })

    describe('Password Confirmation Validation', () => {
      it('should enforce 8-character minimum for both password and confirmation', () => {
        const shortPassword = 'short'
        const validPassword = 'ValidPassword123'
        
        // Both passwords are short
        expect(validatePassword(shortPassword)).toBe('Password must be at least 8 characters long')
        expect(validatePasswordConfirm(shortPassword, shortPassword)).toBeNull() // Matching short passwords
        
        // One password is valid, one is short
        expect(validatePassword(validPassword)).toBeNull()
        expect(validatePasswordConfirm(validPassword, shortPassword)).toBe('Passwords do not match')
        expect(validatePasswordConfirm(shortPassword, validPassword)).toBe('Passwords do not match')
      })

      it('should accept matching 8+ character passwords', () => {
        const validPasswords = [
          'Password123',
          'VerySecurePassword2024!',
          'SimplePassword',
          '12345678',
          'αβγδεζηθικλμν'
        ]
        
        validPasswords.forEach(password => {
          expect(validatePassword(password)).toBeNull()
          expect(validatePasswordConfirm(password, password)).toBeNull()
        })
      })
    })
  })

  describe('User Registration Password Enforcement', () => {
    it('should prevent registration with passwords under 8 characters', async () => {
      const shortPasswords = ['1', 'short', 'abc123', '1234567']
      
      for (const shortPassword of shortPasswords) {
        const registrationRequest: RegisterCredentials = {
          email: validEmail,
          password: shortPassword,
          confirmPassword: shortPassword
        }

        // Test that validation catches the error before hitting Supabase
        const passwordError = validatePassword(shortPassword)
        expect(passwordError).toBe('Password must be at least 8 characters long')

        // Test service-level enforcement
        const weakPasswordError = {
          message: 'Password should be at least 8 characters',
          status: 400
        }

        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: weakPasswordError
        })

        mockErrorHandlingService.getUserMessage.mockReturnValue('Password must be at least 8 characters long.')

        await expect(authService.registerWithEmailVerification(registrationRequest))
          .rejects.toThrow('Password must be at least 8 characters long.')
      }
    })

    it('should allow registration with valid 8+ character passwords', async () => {
      const validPasswords = [
        'Password123',
        'SimplePassword',
        'VeryLongSecurePasswordWith123!',
        '12345678',
        'αβγδεζηθικ' // Greek characters
      ]
      
      for (const password of validPasswords) {
        const registrationRequest: RegisterCredentials = {
          email: validEmail,
          password: password,
          confirmPassword: password
        }

        // Validate password passes validation
        expect(validatePassword(password)).toBeNull()
        expect(validatePasswordConfirm(password, password)).toBeNull()

        // Mock successful registration
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: {
            user: validUser,
            session: null
          },
          error: null
        })

        const result = await authService.registerWithEmailVerification(registrationRequest)
        expect(result.user).toBeTruthy()
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: validEmail,
          password: password,
          options: expect.any(Object)
        })
      }
    })

    it('should handle Supabase-level password validation errors', async () => {
      const borderlinePassword = '1234567' // 7 characters - should be caught
      
      const registrationRequest: RegisterCredentials = {
        email: validEmail,
        password: borderlinePassword,
        confirmPassword: borderlinePassword
      }

      // Client-side validation should catch this first
      expect(validatePassword(borderlinePassword)).toBe('Password must be at least 8 characters long')

      // But if it somehow reaches Supabase, handle their error too
      const supabasePasswordError = {
        message: 'Password should be at least 8 characters',
        status: 400
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: supabasePasswordError
      })

      await expect(authService.registerWithEmailVerification(registrationRequest))
        .rejects.toThrow('Password must be at least 8 characters long.')
    })
  })

  describe('Password Update/Reset Enforcement', () => {
    it('should prevent password updates with passwords under 8 characters', async () => {
      const shortPasswords = ['new', 'pass', '123456', 'updated']
      
      for (const shortPassword of shortPasswords) {
        // Client-side validation should catch this
        expect(validatePassword(shortPassword)).toBe('Password must be at least 8 characters long')

        // Service-level enforcement
        const weakPasswordError = {
          message: 'Password should be at least 8 characters',
          status: 400
        }

        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: null,
          error: weakPasswordError
        })

        mockErrorHandlingService.getUserMessage.mockReturnValue('Password must be at least 8 characters long.')

        await expect(authService.updatePassword(shortPassword))
          .rejects.toThrow('Password must be at least 8 characters long.')
      }
    })

    it('should allow password updates with valid 8+ character passwords', async () => {
      const validPasswords = [
        'NewPassword123',
        'UpdatedSecurePass!',
        'MyNewPassword2024',
        '12345678',
        'ΝέοςΚωδικός123' // Greek "New Password"
      ]
      
      for (const password of validPasswords) {
        // Validate password passes validation
        expect(validatePassword(password)).toBeNull()

        // Mock successful update
        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: {
            user: {
              ...validUser,
              updated_at: new Date().toISOString()
            }
          },
          error: null
        })

        const result = await authService.updatePassword(password)
        expect(result.user).toBeTruthy()
        expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
          password: password
        })
      }
    })
  })

  describe('Password Reset Confirmation Enforcement', () => {
    it('should prevent password reset confirmation with passwords under 8 characters', async () => {
      const shortPasswords = ['reset', '1234567', 'new123', 'short']
      
      for (const shortPassword of shortPasswords) {
        const resetRequest: PasswordResetConfirmRequest = {
          newPassword: shortPassword,
          confirmPassword: shortPassword
        }

        // Test validation service
        const validation = passwordResetConfirmService.validateResetConfirm(resetRequest)
        expect(validation.isValid).toBe(false)
        expect(validation.errors.newPassword).toBe('Password must be at least 8 characters long')

        // Test service-level enforcement - the service throws a generic error for validation failures
        await expect(passwordResetConfirmService.updatePasswordWithToken(resetRequest))
          .rejects.toThrow('Please check your password requirements and try again')
      }
    })

    it('should allow password reset confirmation with valid 8+ character passwords', async () => {
      const validPasswords = [
        'ResetPassword123',
        'MyNewSecurePassword!',
        'FreshPassword2024',
        '12345678',
        'ΡίξτεPassword123' // Greek prefix
      ]
      
      for (const password of validPasswords) {
        const resetRequest: PasswordResetConfirmRequest = {
          newPassword: password,
          confirmPassword: password
        }

        // Test validation service passes
        const validation = passwordResetConfirmService.validateResetConfirm(resetRequest)
        expect(validation.isValid).toBe(true)
        expect(validation.errors).toEqual({})

        // Mock successful reset - need to mock the Supabase auth.updateUser call
        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: {
            user: {
              ...validUser,
              updated_at: new Date().toISOString()
            }
          },
          error: null
        })

        const result = await passwordResetConfirmService.updatePasswordWithToken(resetRequest)
        expect(result.success).toBe(true)
        expect(result.message).toBeTruthy()
        expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
          password: password
        })
      }
    })

    it('should handle mismatched password confirmation with 8+ character passwords', async () => {
      const password = 'ValidPassword123'
      const mismatchedConfirm = 'DifferentPassword456'
      
      const resetRequest: PasswordResetConfirmRequest = {
        newPassword: password,
        confirmPassword: mismatchedConfirm
      }

      // Both passwords meet length requirement individually
      expect(validatePassword(password)).toBeNull()
      expect(validatePassword(mismatchedConfirm)).toBeNull()
      
      // But confirmation validation should fail
      expect(validatePasswordConfirm(password, mismatchedConfirm)).toBe('Passwords do not match')

      // Service validation should catch this
      const validation = passwordResetConfirmService.validateResetConfirm(resetRequest)
      expect(validation.isValid).toBe(false)
      expect(validation.errors.confirmPassword).toBe('Passwords do not match')
      
      // Service should throw generic validation error
      await expect(passwordResetConfirmService.updatePasswordWithToken(resetRequest))
        .rejects.toThrow('Please check your password requirements and try again')
    })
  })

  describe('Error Message Consistency', () => {
    it('should provide consistent error messages across all validation points', () => {
      const shortPassword = 'short'
      const expectedMessage = 'Password must be at least 8 characters long'
      
      // Validation utility
      expect(validatePassword(shortPassword)).toBe(expectedMessage)
      
      // Password reset confirmation service
      const resetRequest: PasswordResetConfirmRequest = {
        newPassword: shortPassword,
        confirmPassword: shortPassword
      }
      
      const validation = passwordResetConfirmService.validateResetConfirm(resetRequest)
      expect(validation.errors.newPassword).toBe(expectedMessage)
    })

    it('should provide helpful password requirements information', () => {
      const requirements = passwordResetConfirmService.getPasswordRequirements()
      
      expect(requirements.title).toBe('Password Requirements')
      expect(requirements.requirements).toContain('At least 8 characters long')
      expect(requirements.requirements.length).toBeGreaterThan(1)
      expect(requirements.tips.length).toBeGreaterThan(0)
    })
  })

  describe('Boundary and Edge Cases', () => {
    it('should handle exactly 8-character passwords in all flows', async () => {
      const exactlyEightChar = '12345678'
      
      // Validation
      expect(validatePassword(exactlyEightChar)).toBeNull()
      expect(validatePasswordConfirm(exactlyEightChar, exactlyEightChar)).toBeNull()
      
      // Registration
      const registrationRequest: RegisterCredentials = {
        email: validEmail,
        password: exactlyEightChar,
        confirmPassword: exactlyEightChar
      }
      
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: validUser, session: null },
        error: null
      })
      
      const regResult = await authService.registerWithEmailVerification(registrationRequest)
      expect(regResult.user).toBeTruthy()
      
      // Password update
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: validUser },
        error: null
      })
      
      const updateResult = await authService.updatePassword(exactlyEightChar)
      expect(updateResult.user).toBeTruthy()
      
      // Password reset confirmation
      const resetRequest: PasswordResetConfirmRequest = {
        newPassword: exactlyEightChar,
        confirmPassword: exactlyEightChar
      }
      
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: validUser },
        error: null
      })
      
      const resetResult = await passwordResetConfirmService.updatePasswordWithToken(resetRequest)
      expect(resetResult.success).toBe(true)
    })

    it('should handle Unicode characters in password length calculation', async () => {
      const unicodePasswords = [
        'пароль12', // Russian - exactly 8 characters
        '密码测试1234', // Chinese - 8 characters
        'كلمة1234', // Arabic - 8 characters
        '🔒🔑🔐🛡️🔓🗝️🔏🔒', // 8 emojis
        'αβγδεζηθ', // 8 Greek letters
      ]
      
      for (const password of unicodePasswords) {
        // Should be accepted if actually 8+ characters
        const validation = validatePassword(password)
        if (password.length >= 8) {
          expect(validation).toBeNull()
        } else {
          expect(validation).toBe('Password must be at least 8 characters long')
        }
      }
    })

    it('should handle very long passwords without issues', async () => {
      const veryLongPassword = 'SecurePassword123!' + 'a'.repeat(1000)
      
      expect(validatePassword(veryLongPassword)).toBeNull()
      expect(validatePasswordConfirm(veryLongPassword, veryLongPassword)).toBeNull()
      
      // Should be accepted by all services
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: validUser },
        error: null
      })
      
      const result = await authService.updatePassword(veryLongPassword)
      expect(result.user).toBeTruthy()
    })
  })

  describe('Integration with Form Components', () => {
    it('should validate password requirements consistently with form validation', () => {
      // Test cases that form components would encounter
      const formTestCases = [
        { input: '', expected: 'Password is required' },
        { input: 'abc', expected: 'Password must be at least 8 characters long' },
        { input: '1234567', expected: 'Password must be at least 8 characters long' },
        { input: '12345678', expected: null },
        { input: 'ValidPassword123', expected: null },
        { input: '    ', expected: 'Password must be at least 8 characters long' }, // 4 spaces
        { input: '        ', expected: null }, // 8 spaces
      ]
      
      formTestCases.forEach(({ input, expected }) => {
        expect(validatePassword(input)).toBe(expected)
      })
    })

    it('should provide appropriate validation for password confirmation forms', () => {
      const password = 'ValidPassword123'
      const confirmationTestCases = [
        { confirm: '', expected: 'Please confirm your password' },
        { confirm: 'short', expected: 'Passwords do not match' },
        { confirm: 'ValidPassword124', expected: 'Passwords do not match' },
        { confirm: 'ValidPassword123', expected: null },
        { confirm: password, expected: null },
      ]
      
      confirmationTestCases.forEach(({ confirm, expected }) => {
        expect(validatePasswordConfirm(password, confirm)).toBe(expected)
      })
    })
  })

  describe('Security and Performance', () => {
    it('should validate password length efficiently for large inputs', () => {
      const startTime = performance.now()
      
      // Test with very long password
      const hugePAssword = 'a'.repeat(100000)
      const result = validatePassword(hugePAssword)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(result).toBeNull() // Should be valid
      expect(duration).toBeLessThan(100) // Should be fast (less than 100ms)
    })

    it('should not expose sensitive information in validation errors', () => {
      const sensitivePassword = 'MySecretPassword123!'
      
      // Even with a valid password, error messages shouldn't contain the password
      const mismatchError = validatePasswordConfirm(sensitivePassword, 'DifferentPassword')
      expect(mismatchError).toBe('Passwords do not match')
      expect(mismatchError).not.toContain(sensitivePassword)
      expect(mismatchError).not.toContain('DifferentPassword')
    })
  })
}) 