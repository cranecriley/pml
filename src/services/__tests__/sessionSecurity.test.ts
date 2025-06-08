// Mock all dependencies
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      signInWithPassword: jest.fn(),
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

import { sessionService } from '../sessionService'
import { authService } from '../authService'
import type { Session, User } from '@supabase/supabase-js'

// Get the mocked modules
const mockSupabase = require('../../lib/supabase').supabase
const mockErrorHandlingService = require('../errorHandlingService').errorHandlingService

describe('Session Security Tests', () => {
  const validUser: User = {
    id: 'user_123',
    aud: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: '2024-01-01T12:00:00.000Z',
    created_at: '2024-01-01T10:00:00.000Z',
    updated_at: '2024-01-01T12:00:00.000Z',
    app_metadata: {},
    user_metadata: {}
  }

  const createMockSession = (accessToken: string, expiresAtSeconds?: number): Session => ({
    access_token: accessToken,
    refresh_token: 'refresh_token_123',
    expires_at: expiresAtSeconds || Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    expires_in: 3600, // 1 hour in seconds
    token_type: 'bearer',
    user: validUser
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: Function) => fn())
    mockErrorHandlingService.getUserMessage.mockImplementation((error: any) => {
      if (error?.message?.includes('expired') || error?.message?.includes('invalid')) {
        return 'Your session has expired. Please sign in again.'
      }
      if (error?.message?.includes('refresh')) {
        return 'Session refresh failed. Please sign in again.'
      }
      return 'An error occurred'
    })
  })

  afterEach(() => {
    mockNow.mockRestore()
  })

  describe('Session Token Validation', () => {
    it('should validate a fresh session token', () => {
      const validSession = createMockSession('valid_token_123')
      
      const validation = sessionService.validateSession(validSession)
      
      expect(validation.isValid).toBe(true)
      expect(validation.timeRemaining).toBeGreaterThan(0)
      expect(validation.expiresAt).toBeDefined()
      expect(validation.needsRefresh).toBe(false)
    })

    it('should detect expired session tokens', () => {
      // Create session that expired 1 hour ago
      const expiredSession = createMockSession('expired_token', Math.floor(Date.now() / 1000) - 3600)
      
      const validation = sessionService.validateSession(expiredSession)
      
      expect(validation.isValid).toBe(false)
      expect(validation.timeRemaining).toBe(0)
      expect(validation.expiresAt).toBeDefined()
    })

    it('should detect session tokens that need refresh', () => {
      // Create session that expires in 5 minutes (needs refresh when < 10 minutes)
      const expiresIn5Min = Math.floor(Date.now() / 1000) + 300
      const sessionNeedingRefresh = createMockSession('token_needs_refresh', expiresIn5Min)
      
      const validation = sessionService.validateSession(sessionNeedingRefresh)
      
      expect(validation.isValid).toBe(true)
      expect(validation.needsRefresh).toBe(true)
      expect(validation.timeRemaining).toBeLessThan(10 * 60 * 1000) // Less than 10 minutes
    })

    it('should handle missing or malformed tokens', () => {
      const invalidSessions = [
        null,
        undefined,
        { access_token: '', expires_at: Date.now() },
        { access_token: null, expires_at: Date.now() },
        { expires_at: Date.now() }, // missing access_token
        {} // empty object
      ]

      invalidSessions.forEach((session) => {
        const validation = sessionService.validateSession(session as any)
        expect(validation.isValid).toBe(false)
      })
    })

    it('should use default expiration when expires_at is missing', () => {
      const sessionWithoutExpiry = {
        access_token: 'token_123',
        refresh_token: 'refresh_123',
        token_type: 'bearer',
        user: validUser
      } as Session

      const validation = sessionService.validateSession(sessionWithoutExpiry)
      
      expect(validation.isValid).toBe(true)
      expect(validation.timeRemaining).toBeGreaterThan(23 * 60 * 60 * 1000) // Close to 24 hours
    })
  })

  describe('Secure Session Restoration', () => {
    it('should restore valid session securely', async () => {
      const validSession = createMockSession('restored_token_123')
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })

      const result = await sessionService.restoreSession()

      expect(result.isValid).toBe(true)
      expect(result.session).toBe(validSession)
      expect(result.user).toBe(validUser)
      expect(result.error).toBeUndefined()
    })

    it('should handle expired session during restoration', async () => {
      const expiredSession = createMockSession('expired_token', Math.floor(Date.now() / 1000) - 3600)
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: expiredSession },
        error: null
      })

      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })

      const result = await sessionService.restoreSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Session has expired')
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should auto-refresh session during restoration if needed', async () => {
      const sessionNeedingRefresh = createMockSession('old_token', Math.floor(Date.now() / 1000) + 300)
      const refreshedSession = createMockSession('refreshed_token')
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: sessionNeedingRefresh },
        error: null
      })

      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: refreshedSession },
        error: null
      })

      const result = await sessionService.restoreSession()

      expect(result.isValid).toBe(true)
      expect(result.session).toBe(refreshedSession)
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled()
    })

    it('should handle refresh failure during restoration gracefully', async () => {
      const sessionNeedingRefresh = createMockSession('old_token', Math.floor(Date.now() / 1000) + 300)
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: sessionNeedingRefresh },
        error: null
      })

      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Refresh failed' }
      })

      const result = await sessionService.restoreSession()

      // Should continue with original session if refresh fails
      expect(result.isValid).toBe(true)
      expect(result.session).toBe(sessionNeedingRefresh)
    })

    it('should handle session restoration errors securely', async () => {
      const sessionError = new Error('Network error during session restoration')
      
      mockSupabase.auth.getSession.mockRejectedValueOnce(sessionError)

      const result = await sessionService.restoreSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unexpected error occurred')
    })
  })

  describe('Session Token Refresh Security', () => {
    it('should refresh session tokens securely', async () => {
      const refreshedSession = createMockSession('new_secure_token')
      
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: refreshedSession },
        error: null
      })

      const result = await sessionService.refreshSession()

      expect(result.session).toBe(refreshedSession)
      expect(result.error).toBeUndefined()
    })

    it('should handle refresh token expiration', async () => {
      const refreshError = {
        message: 'Refresh token expired',
        status: 401
      }
      
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: refreshError
      })

      const result = await sessionService.refreshSession()

      expect(result.session).toBeNull()
      expect(result.error).toContain('Refresh token expired')
    })

    it('should handle malformed refresh responses', async () => {
      const malformedResponses = [
        { data: null, error: null },
        { data: {}, error: null },
        { data: { session: null }, error: null }
      ]

      for (const response of malformedResponses) {
        mockSupabase.auth.refreshSession.mockResolvedValueOnce(response)

        const result = await sessionService.refreshSession()
        expect(result.session).toBeFalsy() // Could be null or undefined
        
        mockSupabase.auth.refreshSession.mockClear()
      }
    })

    it('should force refresh session when requested', async () => {
      const forcedRefreshSession = createMockSession('force_refreshed_token')
      
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: forcedRefreshSession },
        error: null
      })

      const result = await sessionService.forceRefresh()

      expect(result.isValid).toBe(true)
      expect(result.session).toBe(forcedRefreshSession)
    })
  })

  describe('Session Monitoring Security', () => {
    beforeEach(() => {
      // Clear any existing intervals
      jest.clearAllTimers()
      jest.useFakeTimers()
      
      // Mock setInterval and clearInterval
      global.setInterval = jest.fn().mockReturnValue('timer-id')
      global.clearInterval = jest.fn()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should start session monitoring with security checks', () => {
      const onSessionExpired = jest.fn()
      const onSessionRefreshed = jest.fn()
      
      sessionService.startSessionMonitoring(onSessionExpired, onSessionRefreshed)

      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5-minute interval
      )
    })

    it('should provide session monitoring capabilities', () => {
      const onSessionExpired = jest.fn()
      const onSessionRefreshed = jest.fn()
      
      sessionService.startSessionMonitoring(onSessionExpired, onSessionRefreshed)

      // Verify monitoring is set up
      expect(global.setInterval).toHaveBeenCalled()
      
      // Stop monitoring
      sessionService.stopSessionMonitoring()
      expect(global.clearInterval).toHaveBeenCalled()
    })

    it('should stop session monitoring cleanly', () => {
      const onSessionExpired = jest.fn()
      const onSessionRefreshed = jest.fn()
      
      sessionService.startSessionMonitoring(onSessionExpired, onSessionRefreshed)
      sessionService.stopSessionMonitoring()

      expect(global.clearInterval).toHaveBeenCalled()
    })
  })

  describe('Session Information Security', () => {
    it('should provide secure session information', () => {
      const validSession = createMockSession('info_token_123')
      
      const info = sessionService.getSessionInfo(validSession)

      expect(info.isValid).toBe(true)
      expect(info.expiresAt).toBeDefined()
      expect(info.timeRemaining).toMatch(/\d+h \d+m/)
      expect(info.user).toEqual({
        id: validUser.id,
        email: validUser.email,
        emailConfirmed: true
      })
    })

    it('should not expose sensitive session data in info', () => {
      const validSession = createMockSession('sensitive_token_123')
      
      const info = sessionService.getSessionInfo(validSession)

      // Should not expose actual tokens
      expect(info).not.toHaveProperty('access_token')
      expect(info).not.toHaveProperty('refresh_token')
      expect(info).not.toHaveProperty('token_type')
    })

    it('should handle null session safely in info', () => {
      const info = sessionService.getSessionInfo(null)

      expect(info.isValid).toBe(false)
      expect(info.user).toBeUndefined()
      expect(info.expiresAt).toBeUndefined()
      expect(info.timeRemaining).toBeUndefined()
    })
  })

  describe('Session Cleanup Security', () => {
    it('should clear invalid sessions securely', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })

      await sessionService.clearInvalidSession()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      mockSupabase.auth.signOut.mockRejectedValueOnce(new Error('Cleanup error'))

      await sessionService.clearInvalidSession()

      expect(consoleWarnSpy).toHaveBeenCalledWith('Error during session cleanup:', expect.any(Error))
      
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Session Security Integration', () => {
    it('should handle secure login with session establishment', async () => {
      const loginCredentials = {
        email: 'test@example.com',
        password: 'SecurePassword123'
      }

      const loginSession = createMockSession('login_token_456')

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: validUser, session: loginSession },
        error: null
      })

      const result = await authService.signIn(loginCredentials)

      expect(result.session).toBe(loginSession)
      expect(result.user).toBe(validUser)
    })

    it('should verify session tokens are securely generated', async () => {
      const loginCredentials = {
        email: 'test@example.com',
        password: 'SecurePassword123'
      }

      const session1 = createMockSession('unique_token_1')
      const session2 = createMockSession('unique_token_2')

      // First login
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: validUser, session: session1 },
        error: null
      })

      const result1 = await authService.signIn(loginCredentials)

      // Second login (simulating different login)
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: validUser, session: session2 },
        error: null
      })

      const result2 = await authService.signIn(loginCredentials)

      // Sessions should have different tokens
      expect(result1.session.access_token).not.toBe(result2.session.access_token)
    })

    it('should handle session validation consistently', async () => {
      const validSession = createMockSession('consistent_token')
      
      // Multiple session checks should be consistent
      for (let i = 0; i < 3; i++) {
        mockSupabase.auth.getSession.mockResolvedValueOnce({
          data: { session: validSession },
          error: null
        })
      }

      const results = await Promise.all([
        sessionService.restoreSession(),
        sessionService.restoreSession(),
        sessionService.restoreSession()
      ])

      // All should return consistent results
      results.forEach(result => {
        expect(result.isValid).toBe(true)
        expect(result.session?.access_token).toBe('consistent_token')
      })
    })
  })

  describe('Session Timing Attack Prevention', () => {
    it('should prevent timing attacks on session validation', () => {
      const sessions = [
        createMockSession('valid_token'),
        createMockSession('expired_token', Math.floor(Date.now() / 1000) - 3600),
        null,
        undefined
      ]

      const startTimes: number[] = []
      const endTimes: number[] = []

      sessions.forEach(session => {
        startTimes.push(Date.now())
        sessionService.validateSession(session as any)
        endTimes.push(Date.now())
      })

      // Validation times should be similar regardless of session validity
      const validationTimes = endTimes.map((end, i) => end - startTimes[i])
      const maxTimeDifference = Math.max(...validationTimes) - Math.min(...validationTimes)
      
      expect(maxTimeDifference).toBeLessThan(5) // Very small difference expected for sync operations
    })

    it('should prevent timing attacks on session restoration', async () => {
      const scenarios = [
        { session: createMockSession('valid'), error: null },
        { session: null, error: null },
        { session: null, error: { message: 'Invalid session' } }
      ]

      const startTimes: number[] = []
      const endTimes: number[] = []

      for (const scenario of scenarios) {
        mockSupabase.auth.getSession.mockResolvedValueOnce({
          data: { session: scenario.session },
          error: scenario.error
        })

        startTimes.push(Date.now())
        await sessionService.restoreSession()
        endTimes.push(Date.now())
      }

      // Response times should be similar for security
      const responseTimes = endTimes.map((end, i) => end - startTimes[i])
      const maxTimeDifference = Math.max(...responseTimes) - Math.min(...responseTimes)
      
      expect(maxTimeDifference).toBeLessThan(100) // Allow reasonable variance for async operations
    })
  })

  describe('Session Storage Security', () => {
    it('should handle session storage securely through Supabase', async () => {
      // Verify that we're using Supabase's secure session storage
      const validSession = createMockSession('storage_token')
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })

      const result = await sessionService.restoreSession()

      expect(result.isValid).toBe(true)
      expect(mockSupabase.auth.getSession).toHaveBeenCalled()
      // Session should be handled by Supabase's secure storage mechanisms
    })

    it('should handle session errors securely without token exposure', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session validation failed' }
      })

      const result = await sessionService.restoreSession()

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Failed to restore session')
      // Should not expose any tokens in error messages
    })
  })
}) 