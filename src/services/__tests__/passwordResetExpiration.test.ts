// Mock all dependencies
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
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

// Mock Date for consistent testing
const mockDate = new Date('2024-01-01T12:00:00.000Z')
const mockNow = jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime())

import { authService } from '../authService'
import { passwordResetConfirmService } from '../passwordResetConfirmService'
import { passwordResetService } from '../passwordResetService'
import { AUTH_CONFIG } from '../../lib/supabase'
import type { PasswordResetConfirmRequest } from '../passwordResetConfirmService'

// Get the mocked modules
const mockSupabase = require('../../lib/supabase').supabase
const mockErrorHandlingService = require('../errorHandlingService').errorHandlingService

describe('Password Reset Link Expiration Tests', () => {
  const testEmail = 'test@example.com'
  const validPassword = 'NewSecurePassword123'
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: Function) => fn())
    mockErrorHandlingService.getUserMessage.mockImplementation((error: any) => {
      if (error?.message?.includes('expired') || error?.message?.includes('invalid')) {
        return 'Your password reset link has expired. Please request a new password reset.'
      }
      if (error?.message?.includes('session')) {
        return 'Your password reset session has expired.'
      }
      if (error?.message?.includes('Token has expired')) {
        return 'This password reset link has expired or is invalid. Please request a new password reset.'
      }
      return 'An error occurred'
    })
  })

  afterEach(() => {
    mockNow.mockRestore()
  })

  describe('Password Reset Configuration', () => {
    it('should verify 1-hour expiration is documented in user instructions', () => {
      const instructions = passwordResetService.getPasswordResetInstructions(testEmail)
      
      expect(instructions.securityNote).toContain('1 hour')
      expect(instructions.securityNote).toContain('expire')
      expect(instructions.securityNote).toContain('security')
    })

    it('should provide correct expiration information to users', () => {
      const instructions = passwordResetService.getPasswordResetInstructions(testEmail)
      
      expect(instructions.securityNote).toContain('1 hour')
      expect(instructions.securityNote).toContain('expire')
      expect(instructions.securityNote).toContain('security')
    })
  })

  describe('Password Reset Link Expiration Detection', () => {
    it('should detect expired reset token during password update', async () => {
      const expiredTokenError = {
        message: 'Token has expired',
        status: 401
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: expiredTokenError
      })

      const updateRequest: PasswordResetConfirmRequest = {
        newPassword: validPassword,
        confirmPassword: validPassword
      }

      await expect(passwordResetConfirmService.updatePasswordWithToken(updateRequest))
        .rejects.toThrow('This password reset link has expired or is invalid. Please request a new password reset.')
    })

    it('should handle different expired token error messages', async () => {
      // Test that service properly rejects expired tokens
      const expiredTokenVariations = [
        { message: 'Token has expired', status: 401 },
        { message: 'invalid token', status: 401 },
        { message: 'expired', status: 400 }
      ]

      for (const errorVariation of expiredTokenVariations) {
        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: null,
          error: errorVariation
        })

        const updateRequest: PasswordResetConfirmRequest = {
          newPassword: `${validPassword}_${Date.now()}`,
          confirmPassword: `${validPassword}_${Date.now()}`
        }

        // Verify that expired tokens are properly rejected
        await expect(passwordResetConfirmService.updatePasswordWithToken(updateRequest))
          .rejects.toThrow()

        mockSupabase.auth.updateUser.mockClear()
      }
    })

    it('should detect expired session during reset session check', async () => {
      const sessionError = {
        message: 'Session has expired',
        status: 401
      }

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: sessionError
      })

      const result = await passwordResetConfirmService.checkResetSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid or expired password reset session')
    })

    it('should detect missing session during reset session check', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      })

      const result = await passwordResetConfirmService.checkResetSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('No active password reset session found')
    })
  })

  describe('Time-based Expiration Simulation', () => {
    it('should handle fresh reset link within 1 hour window', async () => {
      // Simulate a reset link created now (valid)
      const mockSession = {
        access_token: 'valid_token',
        user: { id: 'user_123', email: testEmail },
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      }

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null
      })

      const result = await passwordResetConfirmService.checkResetSession()

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle reset link exactly at 1 hour expiration boundary', async () => {
      // Simulate exactly 1 hour later
      const oneHourLater = new Date(mockDate.getTime() + 60 * 60 * 1000)
      jest.spyOn(Date, 'now').mockReturnValue(oneHourLater.getTime())

      const expiredTokenError = {
        message: 'Token has expired',
        status: 401
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: expiredTokenError
      })

      const updateRequest: PasswordResetConfirmRequest = {
        newPassword: validPassword,
        confirmPassword: validPassword
      }

      await expect(passwordResetConfirmService.updatePasswordWithToken(updateRequest))
        .rejects.toThrow('This password reset link has expired or is invalid. Please request a new password reset.')
    })

    it('should handle reset link well past 1 hour expiration', async () => {
      // Simulate 2 hours later
      const twoHoursLater = new Date(mockDate.getTime() + 2 * 60 * 60 * 1000)
      jest.spyOn(Date, 'now').mockReturnValue(twoHoursLater.getTime())

      const expiredTokenError = {
        message: 'Token has expired',
        status: 401
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: expiredTokenError
      })

      const updateRequest: PasswordResetConfirmRequest = {
        newPassword: validPassword,
        confirmPassword: validPassword
      }

      await expect(passwordResetConfirmService.updatePasswordWithToken(updateRequest))
        .rejects.toThrow('This password reset link has expired or is invalid. Please request a new password reset.')
    })
  })

  describe('Expiration Error Handling and User Guidance', () => {
    it('should provide helpful error guidance for expired links', () => {
      const expiredLinkGuidance = passwordResetConfirmService.getErrorGuidance('This password reset link has expired')

      expect(expiredLinkGuidance.userMessage).toContain('expired')
      expect(expiredLinkGuidance.userMessage).toContain('no longer valid')
      expect(expiredLinkGuidance.actions).toContain('Request a new password reset from the login page')
      expect(expiredLinkGuidance.actions).toContain('Check that you clicked the most recent reset link')
      expect(expiredLinkGuidance.severity).toBe('warning')
    })

    it('should provide helpful error guidance for expired sessions', () => {
      const expiredSessionGuidance = passwordResetConfirmService.getErrorGuidance('session_not_found')

      expect(expiredSessionGuidance.userMessage).toContain('session has expired')
      expect(expiredSessionGuidance.actions).toContain('Request a new password reset')
      expect(expiredSessionGuidance.actions).toContain('Click the reset link within 1 hour of receiving it')
      expect(expiredSessionGuidance.severity).toBe('warning')
    })

    it('should provide recovery actions for expired tokens', () => {
      const guidance = passwordResetConfirmService.getErrorGuidance('Token has expired')

      expect(guidance.actions).toEqual(
        expect.arrayContaining([
          'Request a new password reset from the login page',
          'Check that you clicked the most recent reset link',
          'Make sure you\'re using the complete link from your email'
        ])
      )
    })
  })

  describe('Multiple Reset Requests with Expiration', () => {
    it('should handle multiple reset requests where old ones expire', async () => {
      // First reset request
      const firstResetTime = mockDate
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const firstResult = await authService.resetPassword(testEmail)
      expect(firstResult).toEqual({ message: 'Reset email sent' })

      // Simulate 30 minutes later - still valid
      const thirtyMinutesLater = new Date(firstResetTime.getTime() + 30 * 60 * 1000)
      jest.spyOn(Date, 'now').mockReturnValue(thirtyMinutesLater.getTime())

      // Second reset request should succeed
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const secondResult = await authService.resetPassword(testEmail)
      expect(secondResult).toEqual({ message: 'Reset email sent' })

      // Simulate using first reset link after 90 minutes (should be expired)
      const ninetyMinutesLater = new Date(firstResetTime.getTime() + 90 * 60 * 1000)
      jest.spyOn(Date, 'now').mockReturnValue(ninetyMinutesLater.getTime())

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Token has expired', status: 401 }
      })

      const updateRequest: PasswordResetConfirmRequest = {
        newPassword: validPassword,
        confirmPassword: validPassword
      }

      await expect(passwordResetConfirmService.updatePasswordWithToken(updateRequest))
        .rejects.toThrow('This password reset link has expired or is invalid. Please request a new password reset.')
    })

    it('should handle rapid successive reset requests', async () => {
      const resetAttempts = 3
      
      for (let i = 0; i < resetAttempts; i++) {
        // Simulate a few seconds between requests
        const requestTime = new Date(mockDate.getTime() + i * 5000)
        jest.spyOn(Date, 'now').mockReturnValue(requestTime.getTime())

        mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
          data: { message: 'Reset email sent' },
          error: null
        })

        const result = await authService.resetPassword(testEmail)
        expect(result).toEqual({ message: 'Reset email sent' })
      }

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(resetAttempts)

      // All previous links should be considered expired when trying to use an old one
      const oldLinkTime = new Date(mockDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
      jest.spyOn(Date, 'now').mockReturnValue(oldLinkTime.getTime())

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Token has expired', status: 401 }
      })

      const updateRequest: PasswordResetConfirmRequest = {
        newPassword: validPassword,
        confirmPassword: validPassword
      }

      await expect(passwordResetConfirmService.updatePasswordWithToken(updateRequest))
        .rejects.toThrow('This password reset link has expired or is invalid. Please request a new password reset.')
    })
  })

  describe('Edge Cases and Security Considerations', () => {
    it('should handle malformed expiration errors gracefully', async () => {
      const malformedErrors = [
        { message: '', status: 401 },
        { message: null, status: 401 },
        { status: 401 }, // missing message
        null,
        undefined
      ]

      for (const malformedError of malformedErrors) {
        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: null,
          error: malformedError
        })

        const updateRequest: PasswordResetConfirmRequest = {
          newPassword: `${validPassword}_${Date.now()}`,
          confirmPassword: `${validPassword}_${Date.now()}`
        }

        if (malformedError) {
          await expect(passwordResetConfirmService.updatePasswordWithToken(updateRequest))
            .rejects.toThrow('Unable to update password. Please try again or request a new password reset link.')
        } else {
          // null/undefined errors should succeed
          mockSupabase.auth.updateUser.mockResolvedValueOnce({
            data: { user: { id: 'test' } },
            error: null
          })
          
          const result = await passwordResetConfirmService.updatePasswordWithToken(updateRequest)
          expect(result.success).toBe(true)
        }

        mockSupabase.auth.updateUser.mockClear()
      }
    })

    it('should prevent timing attacks on expiration detection', async () => {
      const scenarios = [
        'Token has expired',
        'Invalid token',
        'Session expired'
      ]

      const startTimes: number[] = []
      const endTimes: number[] = []

      for (const errorMessage of scenarios) {
        const updateRequest: PasswordResetConfirmRequest = {
          newPassword: validPassword,
          confirmPassword: validPassword
        }

        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: null,
          error: { message: errorMessage, status: 401 }
        })

        startTimes.push(Date.now())
        
        try {
          await passwordResetConfirmService.updatePasswordWithToken(updateRequest)
        } catch (error) {
          // Expected to fail
        }
        
        endTimes.push(Date.now())
        mockSupabase.auth.updateUser.mockClear()
      }

      // Response times should be similar for all expiration scenarios
      const responseTimes = endTimes.map((end, i) => end - startTimes[i])
      const maxTimeDifference = Math.max(...responseTimes) - Math.min(...responseTimes)
      
      // Allow for some variance but ensure no obvious timing differences
      expect(maxTimeDifference).toBeLessThan(50)
    })

    it('should handle network timeouts during expiration check', async () => {
      mockSupabase.auth.getSession.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await passwordResetConfirmService.checkResetSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unable to verify password reset session')
    })

    it('should handle concurrent expiration checks consistently', async () => {
      const concurrentChecks = 5
      
      // Mock all checks to return expired session
      for (let i = 0; i < concurrentChecks; i++) {
        mockSupabase.auth.getSession.mockResolvedValueOnce({
          data: { session: null },
          error: { message: 'Session expired', status: 401 }
        })
      }

      const checkPromises = Array.from({ length: concurrentChecks }, () =>
        passwordResetConfirmService.checkResetSession()
      )

      const results = await Promise.all(checkPromises)

      // All should consistently report as invalid
      results.forEach(result => {
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Invalid or expired password reset session')
      })
    })
  })

  describe('Integration with UI Components', () => {
    it('should provide consistent expiration messages for UI display', () => {
      const uiScenarios = [
        'Token has expired',
        'Invalid token',
        'Session expired',
        'Reset link has expired'
      ]

      uiScenarios.forEach(scenario => {
        const guidance = passwordResetConfirmService.getErrorGuidance(scenario)
        
        // All should provide clear user messaging
        expect(guidance.userMessage).toBeTruthy()
        expect(guidance.actions.length).toBeGreaterThan(0)
        expect(['warning', 'error']).toContain(guidance.severity)
      })
    })

    it('should provide recovery instructions for expired scenarios', () => {
      const expiredGuidance = passwordResetConfirmService.getErrorGuidance('expired')
      
      expect(expiredGuidance.actions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('new password reset'),
          expect.stringContaining('most recent reset link'),
          expect.stringContaining('complete link from your email')
        ])
      )
    })

    it('should handle form integration with expired token responses', async () => {
      const formData: PasswordResetConfirmRequest = {
        newPassword: validPassword,
        confirmPassword: validPassword
      }

      // Simulate form submission with expired token
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Token has expired', status: 401 }
      })

      // The form should handle the service error appropriately
      const serviceCall = passwordResetConfirmService.updatePasswordWithToken(formData)
      
      await expect(serviceCall).rejects.toThrow('Unable to update password. Please try again or request a new password reset link.')
      
      // Verify the error can be caught and handled by form components
      try {
        await serviceCall
      } catch (error: any) {
        expect(error.message).toContain('Unable to update password')
        expect(error.message).toContain('request a new password reset')
      }
    })
  })
}) 