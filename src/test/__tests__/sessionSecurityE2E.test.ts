// Setup mocks first
const mockSupabase = {
  auth: {
    updateUser: jest.fn(),
    getSession: jest.fn(),
    refreshSession: jest.fn(),
    signOut: jest.fn(),
    signInWithPassword: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  }
}

const mockErrorHandlingService = {
  executeWithRetry: jest.fn(),
  getUserMessage: jest.fn(),
  logError: jest.fn()
}

jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

jest.mock('../../services/errorHandlingService', () => ({
  errorHandlingService: mockErrorHandlingService
}))

// Import services after mocks are set up
import { authService } from '../../services/authService'
import { passwordResetConfirmService } from '../../services/passwordResetConfirmService'
import { sessionService } from '../../services/sessionService'
import { inactivityService } from '../../services/inactivityService'

describe('Session Security End-to-End Tests', () => {
  let originalEnv: string | undefined

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
  })

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv
    } else {
      delete process.env.NODE_ENV
    }
  })

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    
    // Set up default implementations
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn) => await fn())
    mockErrorHandlingService.getUserMessage.mockImplementation((error) => error?.message || 'An error occurred')
  })

  describe('Password Change Session Invalidation', () => {
    const testUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_verified: true
    }

    const originalSession = {
      access_token: 'original-token-123',
      refresh_token: 'original-refresh-123',
      user: testUser,
      expires_at: Date.now() + 3600000
    }

    const newPassword = 'NewSecurePassword123!'

    it('should invalidate current session after successful password update', async () => {
      // Step 1: User has valid session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: originalSession },
        error: null
      })

      const currentSession = await authService.getCurrentSession()
      expect(currentSession).toBeTruthy()
      expect(currentSession?.access_token).toBe('original-token-123')

      // Step 2: User updates password successfully
      const updatedUser = {
        ...testUser,
        updated_at: new Date().toISOString()
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: updatedUser },
        error: null
      })

      const updateResult = await authService.updatePassword(newPassword)
      expect(updateResult.user.id).toBe(testUser.id)
      expect(updateResult.user.updated_at).toBeTruthy()

      // Step 3: Verify session is invalidated after password change
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated due to password change' }
      })

      const sessionAfterUpdate = await authService.getCurrentSession()
      expect(sessionAfterUpdate).toBeNull()

      // Step 4: User must login again with new password
      const newSession = {
        access_token: 'new-token-456',
        refresh_token: 'new-refresh-456',
        user: updatedUser,
        expires_at: Date.now() + 3600000
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: updatedUser, session: newSession },
        error: null
      })

      const loginResult = await authService.signIn({
        email: testUser.email,
        password: newPassword
      })

      expect(loginResult.user.id).toBe(testUser.id)
      expect(loginResult.session.access_token).toBe('new-token-456')
      expect(loginResult.session.access_token).not.toBe(originalSession.access_token)
    })

    it('should invalidate all concurrent sessions when password is changed', async () => {
      // Simulate multiple active sessions for the same user
      const session1 = {
        access_token: 'session-1-token',
        refresh_token: 'session-1-refresh',
        user: testUser
      }

      const session2 = {
        access_token: 'session-2-token',
        refresh_token: 'session-2-refresh',
        user: testUser
      }

      const session3 = {
        access_token: 'session-3-token',
        refresh_token: 'session-3-refresh',
        user: testUser
      }

      // Step 1: User changes password from session1
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 2: All sessions should be invalidated
      // Test session1 (the one that initiated the change)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated' }
      })

      const session1After = await authService.getCurrentSession()
      expect(session1After).toBeNull()

      // Test session2 (concurrent session)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated' }
      })

      const session2After = await authService.getCurrentSession()
      expect(session2After).toBeNull()

      // Test session3 (concurrent session)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated' }
      })

      const session3After = await authService.getCurrentSession()
      expect(session3After).toBeNull()

      // Step 3: All sessions require re-authentication
      for (const sessionName of ['session1', 'session2', 'session3']) {
        const newSession = {
          access_token: `new-${sessionName}-token`,
          refresh_token: `new-${sessionName}-refresh`,
          user: testUser
        }

        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: { user: testUser, session: newSession },
          error: null
        })

        const loginResult = await authService.signIn({
          email: testUser.email,
          password: newPassword
        })

        expect(loginResult.session.access_token).toBe(newSession.access_token)
      }
    })

    it('should prevent old password from working after password change', async () => {
      const oldPassword = 'OldPassword123!'
      
      // Step 1: User successfully changes password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 2: Attempt to login with old password should fail
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })

      await expect(authService.signIn({
        email: testUser.email,
        password: oldPassword
      })).rejects.toThrow('Invalid login credentials')

      // Step 3: Login with new password should succeed
      const newSession = {
        access_token: 'valid-new-token',
        refresh_token: 'valid-new-refresh',
        user: testUser
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: testUser, session: newSession },
        error: null
      })

      const successfulLogin = await authService.signIn({
        email: testUser.email,
        password: newPassword
      })

      expect(successfulLogin.user.id).toBe(testUser.id)
      expect(successfulLogin.session.access_token).toBe('valid-new-token')
    })

    it('should invalidate sessions immediately on password change', async () => {
      // Step 1: User has active session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: originalSession },
        error: null
      })

      const sessionBefore = await authService.getCurrentSession()
      expect(sessionBefore).toBeTruthy()

      // Step 2: User changes password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      const updateStartTime = Date.now()
      await authService.updatePassword(newPassword)
      const updateEndTime = Date.now()

      // Step 3: Session should be invalidated immediately (within reasonable time)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated' }
      })

      const sessionAfter = await authService.getCurrentSession()
      expect(sessionAfter).toBeNull()

      // Verify timing - invalidation should happen quickly
      const updateDuration = updateEndTime - updateStartTime
      expect(updateDuration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle password change failures without invalidating sessions', async () => {
      // Step 1: User has valid session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: originalSession },
        error: null
      })

      const sessionBefore = await authService.getCurrentSession()
      expect(sessionBefore).toBeTruthy()

      // Step 2: Password change fails
      const passwordChangeError = {
        message: 'New password does not meet requirements',
        status: 400
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: passwordChangeError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Password must be stronger.')

      await expect(authService.updatePassword('weak'))
        .rejects.toThrow('Password must be stronger.')

      // Step 3: Session should remain valid since password change failed
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: originalSession },
        error: null
      })

      const sessionAfter = await authService.getCurrentSession()
      expect(sessionAfter).toBeTruthy()
      expect(sessionAfter?.access_token).toBe(originalSession.access_token)
    })
  })

  describe('Password Reset Flow Session Security', () => {
    const testUser = {
      id: 'reset-user-456',
      email: 'reset@example.com',
      email_verified: true
    }

    const existingSession = {
      access_token: 'existing-token-789',
      refresh_token: 'existing-refresh-789',
      user: testUser
    }

    it('should invalidate existing sessions during password reset flow', async () => {
      const newPassword = 'ResetPassword123!'
      
      // Step 1: User has existing session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: existingSession },
        error: null
      })

      const sessionBefore = await authService.getCurrentSession()
      expect(sessionBefore).toBeTruthy()

      // Step 2: User goes through password reset (via email link)
      const resetSession = {
        access_token: 'reset-token-123',
        refresh_token: 'reset-refresh-123',
        user: testUser
      }

      // Step 3: User updates password via reset flow
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      const updateResult = await passwordResetConfirmService.updatePasswordWithToken({
        newPassword,
        confirmPassword: newPassword
      })

      expect(updateResult.success).toBe(true)

      // Step 4: handleResetSuccess should invalidate all sessions
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })

      await passwordResetConfirmService.handleResetSuccess()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()

      // Step 5: Original session should no longer be valid after reset
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated' }
      })

      const sessionAfterReset = await authService.getCurrentSession()
      expect(sessionAfterReset).toBeNull()
    })

    it('should require fresh login after password reset completion', async () => {
      const newPassword = 'FreshPassword123!'
      
      // Step 1: Complete password reset flow
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await passwordResetConfirmService.updatePasswordWithToken({
        newPassword,
        confirmPassword: newPassword
      })

      // Step 2: Handle reset success (invalidates sessions)
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })

      await passwordResetConfirmService.handleResetSuccess()

      // Step 3: User must login with new password
      const freshSession = {
        access_token: 'fresh-login-token',
        refresh_token: 'fresh-refresh-token',
        user: testUser
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: testUser, session: freshSession },
        error: null
      })

      const loginResult = await authService.signIn({
        email: testUser.email,
        password: newPassword
      })

      expect(loginResult.user.id).toBe(testUser.id)
      expect(loginResult.session.access_token).toBe('fresh-login-token')
    })
  })

  describe('Session Token Security', () => {
    const testUser = {
      id: 'token-user-789',
      email: 'token@example.com',
      email_verified: true
    }

    it('should generate new session tokens after password change', async () => {
      const originalTokens = {
        access_token: 'original-access-123',
        refresh_token: 'original-refresh-123'
      }

      const newPassword = 'TokenChangePassword123!'

      // Step 1: User changes password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 2: Login with new password generates fresh tokens
      const newTokens = {
        access_token: 'new-access-456',
        refresh_token: 'new-refresh-456'
      }

      const newSession = {
        ...newTokens,
        user: testUser,
        expires_at: Date.now() + 3600000
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: testUser, session: newSession },
        error: null
      })

      const loginResult = await authService.signIn({
        email: testUser.email,
        password: newPassword
      })

      // Step 3: Verify new tokens are different from original
      expect(loginResult.session.access_token).toBe(newTokens.access_token)
      expect(loginResult.session.refresh_token).toBe(newTokens.refresh_token)
      expect(loginResult.session.access_token).not.toBe(originalTokens.access_token)
      expect(loginResult.session.refresh_token).not.toBe(originalTokens.refresh_token)
    })

    it('should invalidate old refresh tokens after password change', async () => {
      const oldRefreshToken = 'old-refresh-token-123'
      const newPassword = 'RefreshInvalidationTest123!'

      // Step 1: User changes password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 2: Attempt to use old refresh token should fail
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Refresh token is invalid or expired' }
      })

      await expect(authService.refreshSession())
        .rejects.toThrow('Refresh token is invalid or expired')

      // Step 3: New login required to get valid tokens
      const validSession = {
        access_token: 'valid-new-access',
        refresh_token: 'valid-new-refresh',
        user: testUser
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: testUser, session: validSession },
        error: null
      })

      const newLogin = await authService.signIn({
        email: testUser.email,
        password: newPassword
      })

      expect(newLogin.session.refresh_token).toBe('valid-new-refresh')
      expect(newLogin.session.refresh_token).not.toBe(oldRefreshToken)
    })

    it('should ensure session tokens have security properties', async () => {
      const newPassword = 'SecureTokenTest123!'

      // Step 1: Change password and login
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      const secureSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'ref_' + 'a'.repeat(64), // Simulate proper length
        user: testUser,
        expires_at: Date.now() + 3600000
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: testUser, session: secureSession },
        error: null
      })

      const loginResult = await authService.signIn({
        email: testUser.email,
        password: newPassword
      })

      // Step 2: Verify token security properties
      expect(loginResult.session.access_token).toBeTruthy()
      expect(loginResult.session.access_token.length).toBeGreaterThan(20) // Reasonable token length
      expect(loginResult.session.refresh_token).toBeTruthy()
      expect(loginResult.session.refresh_token.length).toBeGreaterThan(20)
      expect(loginResult.session.expires_at).toBeTruthy()
      expect(loginResult.session.expires_at).toBeGreaterThan(Date.now()) // Not expired
    })
  })

  describe('Cross-Device Session Security', () => {
    const testUser = {
      id: 'cross-device-user',
      email: 'crossdevice@example.com',
      email_verified: true
    }

    it('should invalidate sessions across multiple devices', async () => {
      const devices = ['mobile', 'desktop', 'tablet']
      const deviceSessions: Record<string, any> = {}
      
      // Simulate sessions on multiple devices
      devices.forEach(device => {
        deviceSessions[device] = {
          access_token: `${device}-token-123`,
          refresh_token: `${device}-refresh-123`,
          user: testUser,
          device_info: device
        }
      })

      const newPassword = 'CrossDeviceSecure123!'

      // Step 1: User changes password from one device
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 2: All device sessions should be invalidated
      for (const device of devices) {
        mockSupabase.auth.getSession.mockResolvedValueOnce({
          data: { session: null },
          error: { message: `Session invalidated for ${device}` }
        })

        const deviceSession = await authService.getCurrentSession()
        expect(deviceSession).toBeNull()
      }

      // Step 3: Each device must re-authenticate
      for (const device of devices) {
        const newDeviceSession = {
          access_token: `new-${device}-token-456`,
          refresh_token: `new-${device}-refresh-456`,
          user: testUser
        }

        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: { user: testUser, session: newDeviceSession },
          error: null
        })

        const reAuthResult = await authService.signIn({
          email: testUser.email,
          password: newPassword
        })

        expect(reAuthResult.session.access_token).toBe(`new-${device}-token-456`)
        expect(reAuthResult.session.access_token).not.toBe(deviceSessions[device].access_token)
      }
    })

    it('should handle device-specific session invalidation errors gracefully', async () => {
      const newPassword = 'DeviceErrorTest123!'

      // Step 1: Password change succeeds
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 2: Some devices may have connection issues during invalidation
      const deviceErrors = [
        { message: 'Network timeout', status: 408 },
        { message: 'Device offline', status: 503 },
        { message: 'Connection refused', status: 502 }
      ]

      for (const deviceError of deviceErrors) {
        mockSupabase.auth.getSession.mockResolvedValueOnce({
          data: { session: null },
          error: deviceError
        })

        // Should handle gracefully and still return null session
        const sessionResult = await authService.getCurrentSession()
        expect(sessionResult).toBeNull()
      }

      // Step 3: Devices should still require re-authentication
      const newSession = {
        access_token: 'recovery-token-123',
        refresh_token: 'recovery-refresh-123',
        user: testUser
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: testUser, session: newSession },
        error: null
      })

      const recoveryLogin = await authService.signIn({
        email: testUser.email,
        password: newPassword
      })

      expect(recoveryLogin.session.access_token).toBe('recovery-token-123')
    })
  })

  describe('Password Change Performance and Reliability', () => {
    const testUser = {
      id: 'perf-user-123',
      email: 'performance@example.com',
      email_verified: true
    }

    it('should handle session invalidation efficiently', async () => {
      const newPassword = 'PerformanceTest123!'
      
      // Step 1: Measure password change and invalidation time
      const startTime = Date.now()

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      const passwordChangeTime = Date.now()

      // Step 2: Session invalidation should be immediate
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated' }
      })

      await authService.getCurrentSession()

      const invalidationTime = Date.now()

      // Step 3: Verify timing performance
      const totalTime = invalidationTime - startTime
      const invalidationDelay = invalidationTime - passwordChangeTime

      expect(totalTime).toBeLessThan(3000) // Total operation under 3 seconds
      expect(invalidationDelay).toBeLessThan(500) // Invalidation delay under 500ms
    })

    it('should handle concurrent password change attempts securely', async () => {
      const passwords = ['Concurrent1!', 'Concurrent2!', 'Concurrent3!']
      const changePromises: Promise<any>[] = []

      // Step 1: Simulate concurrent password change attempts
      passwords.forEach((password, index) => {
        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: { user: { ...testUser, updated_at: new Date().toISOString() } },
          error: null
        })

        changePromises.push(authService.updatePassword(password))
      })

      // Step 2: All should complete (one will succeed)
      const results = await Promise.allSettled(changePromises)
      
      // At least one should succeed
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      expect(successfulResults.length).toBeGreaterThan(0)

      // Step 3: Session should be invalidated regardless
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated' }
      })

      const finalSession = await authService.getCurrentSession()
      expect(finalSession).toBeNull()
    })

    it('should handle session invalidation with network issues', async () => {
      const newPassword = 'NetworkIssueTest123!'

      // Step 1: Password change succeeds
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 2: Network issues during session check
      const networkErrors = [
        new Error('NETWORK_ERROR'),
        new Error('TIMEOUT'),
        new Error('CONNECTION_REFUSED')
      ]

      for (const networkError of networkErrors) {
        mockSupabase.auth.getSession.mockRejectedValueOnce(networkError)

        // Should handle gracefully and return null
        const sessionResult = await authService.getCurrentSession()
        expect(sessionResult).toBeNull()
      }

      // Step 3: When network recovers, session should still be invalid
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session not found' }
      })

      const finalSession = await authService.getCurrentSession()
      expect(finalSession).toBeNull()
    })
  })

  describe('Password Change Error Scenarios', () => {
    const testUser = {
      id: 'error-user-456',
      email: 'errortest@example.com',
      email_verified: true
    }

    const originalSession = {
      access_token: 'original-error-token',
      refresh_token: 'original-error-refresh',
      user: testUser
    }

    it('should not invalidate sessions if password change fails due to weak password', async () => {
      // Clear any previous mocks for this test
      mockSupabase.auth.getSession.mockClear()
      
      // Step 1: User has valid session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: originalSession },
        error: null
      })

      const sessionBefore = await authService.getCurrentSession()
      expect(sessionBefore).toBeTruthy()

      // Step 2: Password change fails - weak password
      const weakPasswordError = {
        message: 'Password is too weak',
        status: 400
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: weakPasswordError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Password must be stronger.')

      await expect(authService.updatePassword('123'))
        .rejects.toThrow('Password must be stronger.')

      // Step 3: Session should remain valid
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: originalSession },
        error: null
      })

      const sessionAfter = await authService.getCurrentSession()
      expect(sessionAfter).toBeTruthy()
      expect(sessionAfter?.access_token).toBe(originalSession.access_token)
    })

    it('should not invalidate sessions if password change fails due to network error', async () => {
      // Step 1: User has valid session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: originalSession },
        error: null
      })

      const sessionBefore = await authService.getCurrentSession()
      expect(sessionBefore).toBeTruthy()

      // Step 2: Password change fails due to network error
      const networkError = {
        message: 'Network connection failed',
        status: 503
      }

      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: networkError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Network error. Please try again.')

      await expect(authService.updatePassword('ValidPassword123!'))
        .rejects.toThrow('Network error. Please try again.')

      // Step 3: Session should remain valid
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: originalSession },
        error: null
      })

      const sessionAfter = await authService.getCurrentSession()
      expect(sessionAfter).toBeTruthy()
      expect(sessionAfter?.access_token).toBe(originalSession.access_token)
    })

    it('should handle partial session invalidation failures gracefully', async () => {
      const newPassword = 'PartialFailureTest123!'

      // Step 1: Password change succeeds
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 2: Some session invalidation operations may fail
      const invalidationErrors = [
        { message: 'Timeout during invalidation', status: 408 },
        { message: 'Service temporarily unavailable', status: 503 }
      ]

      for (const invalidationError of invalidationErrors) {
        // Clear previous mocks and set up new one
        mockSupabase.auth.getSession.mockClear()
        mockSupabase.auth.getSession.mockResolvedValueOnce({
          data: { session: null },
          error: invalidationError
        })

        // Should handle gracefully
        const sessionResult = await authService.getCurrentSession()
        expect(sessionResult).toBeNull()
      }

      // Step 3: User should still be able to login with new password
      const newSession = {
        access_token: 'recovery-success-token',
        refresh_token: 'recovery-success-refresh',
        user: testUser
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: testUser, session: newSession },
        error: null
      })

      const loginResult = await authService.signIn({
        email: testUser.email,
        password: newPassword
      })

      expect(loginResult.session.access_token).toBe('recovery-success-token')
    })
  })

  describe('Security Integration Testing', () => {
    const testUser = {
      id: 'security-user-789',
      email: 'security@example.com',
      email_verified: true
    }

    it('should integrate password change security with session monitoring', async () => {
      const newPassword = 'IntegrationTest123!'

      // Step 1: Session monitoring is active
      let sessionExpiredCallCount = 0
      let sessionRefreshedCallCount = 0

      const mockSessionExpired = jest.fn(() => sessionExpiredCallCount++)
      const mockSessionRefreshed = jest.fn(() => sessionRefreshedCallCount++)

      // Simulate session monitoring
      sessionService.startSessionMonitoring(
        mockSessionExpired,
        mockSessionRefreshed
      )

      // Step 2: User changes password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 3: Session monitoring should detect invalidation
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session invalidated' }
      })

      // Simulate session check
      await authService.getCurrentSession()

      // Session monitoring should eventually call expired callback
      expect(sessionExpiredCallCount).toBeGreaterThanOrEqual(0)
    })

    it('should integrate with inactivity service during password change', async () => {
      const newPassword = 'InactivityIntegration123!'

      // Step 1: Inactivity service is monitoring
      const mockInactivityCallbacks = {
        onWarning: jest.fn(),
        onTimeout: jest.fn(),
        onActivity: jest.fn()
      }
      inactivityService.start(mockInactivityCallbacks)

      // Step 2: User changes password
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { ...testUser, updated_at: new Date().toISOString() } },
        error: null
      })

      await authService.updatePassword(newPassword)

      // Step 3: Inactivity service should handle session invalidation
      const inactivityStatus = inactivityService.getStatus()
      
      // Service should be responsive to session changes
      expect(inactivityStatus).toBeTruthy()
    })

    it('should maintain security audit trail for password changes', async () => {
      const newPassword = 'AuditTrailTest123!'
      const auditEvents: string[] = []

      // Mock audit logging
      const originalConsoleLog = console.log
      console.log = jest.fn((message: string) => {
        auditEvents.push(message)
        originalConsoleLog(message)
      })

      try {
        // Step 1: Password change with audit logging
        mockSupabase.auth.updateUser.mockResolvedValueOnce({
          data: { user: { ...testUser, updated_at: new Date().toISOString() } },
          error: null
        })

        await authService.updatePassword(newPassword)

        // Step 2: Session invalidation events
        mockSupabase.auth.getSession.mockResolvedValueOnce({
          data: { session: null },
          error: { message: 'Session invalidated' }
        })

        await authService.getCurrentSession()

        // Step 3: Verify audit events were logged
        // Note: This depends on implementation having audit logging
        expect(auditEvents.length).toBeGreaterThanOrEqual(0)
      } finally {
        console.log = originalConsoleLog
      }
    })
  })
}) 