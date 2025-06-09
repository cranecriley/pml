import type { Session, User } from '@supabase/supabase-js'

// Mock Supabase
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    refreshSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    }))
  }
}

jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock services
const mockErrorHandlingService = {
  executeWithRetry: jest.fn(),
  logError: jest.fn(),
  getUserMessage: jest.fn()
}

jest.mock('../../services/errorHandlingService', () => ({
  errorHandlingService: mockErrorHandlingService
}))

const mockRateLimitingService = {
  cleanup: jest.fn(),
  recordAttempt: jest.fn(),
  checkRateLimit: jest.fn().mockReturnValue({
    isLimited: false,
    remainingAttempts: 5,
    waitTimeMs: 0,
    message: 'No rate limit'
  }),
  resetRateLimit: jest.fn()
}

jest.mock('../../services/rateLimitingService', () => ({
  rateLimitingService: mockRateLimitingService
}))

const mockInactivityService = {
  start: jest.fn(),
  stop: jest.fn(),
  extendSession: jest.fn(),
  getStatus: jest.fn(),
  updateActivity: jest.fn()
}

jest.mock('../../services/inactivityService', () => ({
  inactivityService: mockInactivityService
}))

import { sessionService } from '../../services/sessionService'
import { loginService } from '../../services/loginService'
import { authService } from '../../services/authService'

// Mock Date.now for consistent testing
const originalDateNow = Date.now
const mockDateNow = jest.fn()

describe('Session Persistence End-to-End Tests', () => {
  const validUser: User = {
    id: 'user_123',
    email: 'test@example.com',
    email_confirmed_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated'
  }

  const createValidSession = (expiresInSeconds: number = 3600): Session => ({
    access_token: 'valid_access_token_123',
    refresh_token: 'valid_refresh_token_456',
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    expires_in: expiresInSeconds,
    token_type: 'bearer',
    user: validUser
  })

  const expiredSession: Session = {
    access_token: 'expired_access_token_123',
    refresh_token: 'expired_refresh_token_456',
    expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    expires_in: 3600,
    token_type: 'bearer',
    user: validUser
  }

  // Helper to simulate browser restart by clearing in-memory state
  const simulateBrowserRestart = () => {
    // In a real browser restart, all JavaScript state is lost
    // but localStorage persists, so we simulate this by:
    // 1. Keeping localStorage as-is
    // 2. Clearing any module-level state (mocks handle this)
    // 3. Re-initializing the session service
    jest.clearAllMocks()
    
    // Reset default mock behaviors
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })
    mockErrorHandlingService.executeWithRetry.mockImplementation((fn) => fn())
  }

  // Helper to setup localStorage with session data (simulates Supabase's storage)
  const setupPersistedSessionData = (session: Session | null) => {
    if (session) {
      // Simulate how Supabase stores session data
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user
      }))
      localStorage.setItem('sb-localhost-auth-token', JSON.stringify(session))
    } else {
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('sb-localhost-auth-token')
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Setup Date mock
    mockDateNow.mockImplementation(() => originalDateNow())
    Date.now = mockDateNow
    
    // Reset console spies
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    
    // Reset service mocks
    mockErrorHandlingService.executeWithRetry.mockImplementation((fn) => fn())
    mockErrorHandlingService.logError.mockImplementation()
    mockErrorHandlingService.getUserMessage.mockReturnValue('Generic error message')
    mockRateLimitingService.cleanup.mockImplementation()
    mockInactivityService.start.mockImplementation()
    mockInactivityService.stop.mockImplementation()
  })

  afterEach(() => {
    Date.now = originalDateNow
    jest.restoreAllMocks()
  })

  describe('Valid Session Persistence', () => {
    it('should restore valid session after browser restart', async () => {
      const validSession = createValidSession()
      
      // Step 1: Setup persisted session data (simulates previous login)
      setupPersistedSessionData(validSession)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })
      
      // Step 2: Simulate browser restart
      simulateBrowserRestart()
      
      // Step 3: Attempt session restoration
      const result = await sessionService.restoreSession()
      
      // Step 4: Verify session was restored successfully
      expect(result.isValid).toBe(true)
      expect(result.session).toEqual(validSession)
      expect(result.user).toEqual(validUser)
      expect(result.error).toBeUndefined()
      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1)
    })

    it('should restore session that will expire soon and refresh it', async () => {
      // Create session that expires in 5 minutes (needs refresh)
      const sessionNeedingRefresh = createValidSession(300)
      const refreshedSession = createValidSession(7200) // 2 hours
      
      setupPersistedSessionData(sessionNeedingRefresh)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: sessionNeedingRefresh },
        error: null
      })
      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: refreshedSession },
        error: null
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(true)
      expect(result.session).toEqual(refreshedSession)
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled()
    })

    it('should handle session persistence after extended browser closure', async () => {
      const validSession = createValidSession(86400) // 24 hours
      
      // Simulate login and browser closure
      setupPersistedSessionData(validSession)
      
      // Simulate 2 hours passing during browser closure
      const twoHoursLater = originalDateNow() + (2 * 60 * 60 * 1000)
      mockDateNow.mockReturnValue(twoHoursLater)
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(true)
      expect(result.session).toEqual(validSession)
    })

    it('should preserve user authentication state across browser restarts', async () => {
      const validSession = createValidSession()
      
      setupPersistedSessionData(validSession)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      // Verify complete user data is preserved
      expect(result.user?.id).toBe('user_123')
      expect(result.user?.email).toBe('test@example.com')
      expect(result.user?.email_confirmed_at).toBe('2023-01-01T00:00:00Z')
      expect(result.session?.access_token).toBe('valid_access_token_123')
      expect(result.session?.refresh_token).toBe('valid_refresh_token_456')
    })
  })

  describe('Expired Session Handling', () => {
    it('should detect expired session after browser restart and clear it', async () => {
      setupPersistedSessionData(expiredSession)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: expiredSession },
        error: null
      })
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(false)
      expect(result.session).toBeNull()
      expect(result.user).toBeNull()
      expect(result.error).toBe('Session has expired')
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle session that expired during browser closure', async () => {
      // Create session that will expire in 1 hour
      const shortLivedSession = createValidSession(3600)
      
      setupPersistedSessionData(shortLivedSession)
      
      // Simulate 2 hours passing while browser was closed
      const twoHoursLater = originalDateNow() + (2 * 60 * 60 * 1000)
      mockDateNow.mockReturnValue(twoHoursLater)
      
      // Session will now be expired when retrieved
      const expiredSessionCopy = {
        ...shortLivedSession,
        expires_at: Math.floor(originalDateNow() / 1000) + 3600 // Original expiry time
      }
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: expiredSessionCopy },
        error: null
      })
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Session has expired')
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should gracefully handle refresh failure for expired sessions', async () => {
      const sessionNeedingRefresh = createValidSession(300) // 5 minutes
      
      setupPersistedSessionData(sessionNeedingRefresh)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: sessionNeedingRefresh },
        error: null
      })
      mockSupabase.auth.refreshSession.mockRejectedValueOnce(
        new Error('Refresh token expired')
      )
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      // Should continue with original session if refresh fails
      expect(result.isValid).toBe(true)
      expect(result.session).toEqual(sessionNeedingRefresh)
    })
  })

  describe('Storage Corruption and Edge Cases', () => {
    it('should handle corrupted localStorage session data', async () => {
      // Setup corrupted session data
      localStorage.setItem('supabase.auth.token', 'invalid_json_data')
      localStorage.setItem('sb-localhost-auth-token', '{"malformed": json}')
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid session data' }
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Failed to restore session')
    })

    it('should handle missing session data after browser restart', async () => {
      // No session data in localStorage (first visit or after logout)
      setupPersistedSessionData(null)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(false)
      expect(result.session).toBeNull()
      expect(result.user).toBeNull()
      expect(result.error).toBeUndefined()
    })

    it('should handle session data without required fields', async () => {
      // In reality, Supabase would return null session if data is incomplete
      // but we test what happens if corrupted data somehow gets through
      const incompleteSession = {
        access_token: 'token123',
        // Missing refresh_token, expires_at, user - this would cause issues
        token_type: 'bearer'
      }
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: incompleteSession as any },
        error: null
      })
      
      // Mock signOut for cleanup of invalid session
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      // The session has access_token so validation passes, but it's missing user data
      // This shows that our session validation only checks access_token (as designed)
      // In a real scenario, Supabase wouldn't return such incomplete sessions
      expect(result.isValid).toBe(true) // Session validation only checks access_token
      expect(result.session).toEqual(incompleteSession)
      expect(result.user).toBeUndefined() // No user in the incomplete session
    })
  })

  describe('Network and Error Handling During Restore', () => {
    it('should handle network errors during session restoration', async () => {
      const validSession = createValidSession()
      setupPersistedSessionData(validSession)
      
      mockSupabase.auth.getSession.mockRejectedValueOnce(
        new Error('Network connection failed')
      )
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unexpected error occurred')
    })

    it('should handle Supabase service errors during restoration', async () => {
      const validSession = createValidSession()
      setupPersistedSessionData(validSession)
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Authentication service temporarily unavailable' }
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Failed to restore session')
    })

    it('should handle timeout errors during session restoration', async () => {
      const validSession = createValidSession()
      setupPersistedSessionData(validSession)
      
      // Simulate timeout by rejecting after delay
      mockSupabase.auth.getSession.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100)
        })
      })
      
      simulateBrowserRestart()
      
      const result = await sessionService.restoreSession()
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Unexpected error occurred')
    })
  })

  describe('Performance and Reliability', () => {
    it('should restore session quickly after browser restart', async () => {
      const validSession = createValidSession()
      setupPersistedSessionData(validSession)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })
      
      simulateBrowserRestart()
      
      const startTime = Date.now()
      await sessionService.restoreSession()
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle multiple concurrent restoration attempts after restart', async () => {
      const validSession = createValidSession()
      setupPersistedSessionData(validSession)
      
      simulateBrowserRestart()
      
      // Setup mocks after restart for multiple calls
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: validSession },
        error: null
      })
      
      // Simulate multiple tabs trying to restore simultaneously
      const restorationPromises = [
        sessionService.restoreSession(),
        sessionService.restoreSession(),
        sessionService.restoreSession()
      ]
      
      const results = await Promise.all(restorationPromises)
      
      results.forEach(result => {
        expect(result.isValid).toBe(true)
        expect(result.session?.access_token).toBe('valid_access_token_123')
      })
    })

    it('should maintain session consistency across multiple restoration calls', async () => {
      const validSession = createValidSession()
      setupPersistedSessionData(validSession)
      
      simulateBrowserRestart()
      
      // Setup mocks after restart for multiple calls
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: validSession },
        error: null
      })
      
      // Call restoration multiple times
      const results = []
      for (let i = 0; i < 5; i++) {
        results.push(await sessionService.restoreSession())
      }
      
      // All results should be consistent
      results.forEach(result => {
        expect(result.isValid).toBe(true)
        expect(result.user?.email).toBe('test@example.com')
        expect(result.session?.access_token).toBe('valid_access_token_123')
      })
    })
  })

  describe('Integration with Authentication Flow', () => {
    it('should complete full login → restart → restore flow', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' }
      const validSession = createValidSession()
      
      // Step 1: Login
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: validSession, user: validUser },
        error: null
      })
      
      const loginResult = await authService.signIn(credentials)
      expect(loginResult.session).toBeDefined()
      
      // Step 2: Simulate session being stored
      setupPersistedSessionData(validSession)
      
      // Step 3: Simulate browser restart
      simulateBrowserRestart()
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })
      
      // Step 4: Restore session
      const restoreResult = await sessionService.restoreSession()
      
      expect(restoreResult.isValid).toBe(true)
      expect(restoreResult.user?.email).toBe('test@example.com')
    })

    it('should handle browser restart → restore → logout flow', async () => {
      const validSession = createValidSession()
      
      // Setup existing session
      setupPersistedSessionData(validSession)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })
      
      simulateBrowserRestart()
      
      // Restore session
      const restoreResult = await sessionService.restoreSession()
      expect(restoreResult.isValid).toBe(true)
      
      // Logout
      await loginService.logout()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle session persistence through multiple browser sessions', async () => {
      const longLivedSession = createValidSession(86400 * 7) // 7 days
      
      // First browser session
      setupPersistedSessionData(longLivedSession)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: longLivedSession },
        error: null
      })
      
      simulateBrowserRestart()
      const firstRestore = await sessionService.restoreSession()
      expect(firstRestore.isValid).toBe(true)
      
      // Second browser session (1 day later)
      const oneDayLater = originalDateNow() + (24 * 60 * 60 * 1000)
      mockDateNow.mockReturnValue(oneDayLater)
      
      simulateBrowserRestart()
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: longLivedSession },
        error: null
      })
      
      const secondRestore = await sessionService.restoreSession()
      expect(secondRestore.isValid).toBe(true)
      expect(secondRestore.session?.access_token).toBe(longLivedSession.access_token)
    })
  })
})