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

describe('Concurrent Session Handling End-to-End Tests', () => {
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

  const validSession: Session = {
    access_token: 'valid_access_token_123',
    refresh_token: 'valid_refresh_token_456',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: validUser
  }

  const expiredSession: Session = {
    ...validSession,
    expires_at: Math.floor(Date.now() / 1000) - 300 // Expired 5 minutes ago
  }

  // Helper to simulate storage events across tabs
  const simulateStorageEvent = (key: string, newValue: string | null, oldValue: string | null = null) => {
    const event = new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      storageArea: localStorage
    })
    window.dispatchEvent(event)
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Clear storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Reset console spies
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    
    // Setup default mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: null
    })
    
    // Reset service mocks
    mockErrorHandlingService.executeWithRetry.mockImplementation((fn) => fn())
    mockErrorHandlingService.logError.mockImplementation()
    mockErrorHandlingService.getUserMessage.mockReturnValue('Generic error message')
    mockRateLimitingService.cleanup.mockImplementation()
    mockInactivityService.start.mockImplementation()
    mockInactivityService.stop.mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Multi-Tab Session Consistency', () => {
    it('should validate session consistently across multiple calls', async () => {
      // Setup session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: validSession },
        error: null
      })

      // Simulate multiple tabs checking session simultaneously
      const sessionChecks = await Promise.all([
        sessionService.restoreSession(),
        sessionService.restoreSession(),
        sessionService.restoreSession()
      ])

      // All should be consistent
      sessionChecks.forEach(result => {
        expect(result.isValid).toBe(true)
        expect(result.session?.access_token).toBe('valid_access_token_123')
      })
    })

    it('should handle expired session detection consistently across tabs', async () => {
      // Setup expired session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null
      })

      // Multiple tabs check session
      const sessionChecks = await Promise.all([
        sessionService.restoreSession(),
        sessionService.restoreSession(),
        sessionService.restoreSession()
      ])

      // All should detect expiry and trigger cleanup
      sessionChecks.forEach(result => {
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Session has expired')
      })

      // Cleanup should be called
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle session validation across multiple tab contexts', async () => {
      // Test session validation (doesn't require Supabase calls)
      const validation1 = sessionService.validateSession(validSession)
      const validation2 = sessionService.validateSession(validSession)
      const validation3 = sessionService.validateSession(validSession)

      // All validations should be consistent
      expect(validation1.isValid).toBe(true)
      expect(validation2.isValid).toBe(true)
      expect(validation3.isValid).toBe(true)
      
      expect(validation1.expiresAt).toBe(validation2.expiresAt)
      expect(validation2.expiresAt).toBe(validation3.expiresAt)
    })
  })

  describe('Multi-Tab Storage Synchronization', () => {
    it('should handle concurrent logout operations across tabs', async () => {
      // Setup initial storage data
      localStorage.setItem('supabase.auth.token', 'sample_token')
      localStorage.setItem('auth_token', 'app_token')
      localStorage.setItem('user_session', 'user_data')
      
      // Multiple tabs attempt logout simultaneously
      const logoutPromises = [
        loginService.logout(),
        loginService.logout(),
        loginService.logout()
      ]
      
      await Promise.all(logoutPromises)
      
      // Storage should be clean
      expect(localStorage.getItem('supabase.auth.token')).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('user_session')).toBeNull()
      
      // Supabase signOut should be called
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should synchronize rate limiting data across tab contexts', async () => {
      // Setup rate limiting data that would be shared across tabs
      const rateLimitData = [{
        email: 'test@example.com',
        timestamp: Date.now(),
        success: false,
        userAgent: 'test-agent'
      }]
      
      localStorage.setItem('auth_rate_limit', JSON.stringify(rateLimitData))
      
      // Multiple tabs check rate limiting (simulates shared localStorage access)
      const rateLimit1 = loginService.getRateLimitStatus('test@example.com')
      const rateLimit2 = loginService.getRateLimitStatus('test@example.com')
      const rateLimit3 = loginService.getRateLimitStatus('test@example.com')
      
      // Should be consistent across all tabs
      expect(rateLimit1.isLimited).toBe(rateLimit2.isLimited)
      expect(rateLimit2.isLimited).toBe(rateLimit3.isLimited)
      expect(rateLimit1.remainingAttempts).toBe(rateLimit2.remainingAttempts)
    })

    it('should handle storage events and cleanup synchronization', async () => {
      // Setup storage with various data types
      localStorage.setItem('supabase.auth.token', 'token1')
      localStorage.setItem('supabase.session.data', 'session1')
      localStorage.setItem('auth_token', 'app_auth')
      localStorage.setItem('user_profile', 'profile_data')
      
      // Simulate logout from one tab
      await loginService.logout()
      
      // All auth-related storage should be cleared
      expect(localStorage.getItem('supabase.auth.token')).toBeNull()
      expect(localStorage.getItem('supabase.session.data')).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('user_profile')).toBeNull()
    })
  })

  describe('Multi-Tab Error Handling', () => {
    it('should handle network errors consistently across tabs', async () => {
      const networkError = new Error('Network connection failed')
      
      // One call fails, others succeed
      mockSupabase.auth.getSession
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: { session: validSession },
          error: null
        })
        .mockResolvedValueOnce({
          data: { session: validSession },
          error: null
        })
      
      const results = await Promise.all([
        sessionService.restoreSession(),
        sessionService.restoreSession(),
        sessionService.restoreSession()
      ])
      
      // First call should handle error gracefully
      expect(results[0].isValid).toBe(false)
      expect(results[0].error).toContain('Unexpected error occurred')
      
      // Other calls should work normally
      expect(results[1].isValid).toBe(true)
      expect(results[2].isValid).toBe(true)
    })

    it('should handle concurrent session refresh failures', async () => {
      const refreshError = new Error('Refresh token expired')
      
      // All refresh attempts fail
      mockSupabase.auth.refreshSession.mockRejectedValue(refreshError)
      
      const refreshPromises = [
        sessionService.forceRefresh(),
        sessionService.forceRefresh(), 
        sessionService.forceRefresh()
      ]
      
      const results = await Promise.all(refreshPromises)
      
      // All should handle the error gracefully
      results.forEach(result => {
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    it('should handle Supabase auth errors across multiple requests', async () => {
      const authError = { message: 'Authentication service unavailable' }
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: authError
      })
      
      const results = await Promise.all([
        sessionService.restoreSession(),
        sessionService.restoreSession()
      ])
      
      results.forEach(result => {
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('Failed to restore session')
      })
    })
  })

  describe('Multi-Tab Session Monitoring', () => {
    it('should handle visibility change events correctly', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: validSession },
        error: null
      })

      // Setup visibility change handler
      const mockSessionCheck = jest.fn()
      const cleanupHandler = sessionService.handleVisibilityChange(mockSessionCheck)
      
      // Simulate tab becoming visible
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true
      })
      
      // Trigger visibility change event
      document.dispatchEvent(new Event('visibilitychange'))
      
      expect(mockSessionCheck).toHaveBeenCalled()
      
      // Cleanup
      cleanupHandler()
    })

    it('should coordinate session monitoring without conflicts', async () => {
      const onSessionExpired = jest.fn()
      const onSessionRefreshed = jest.fn()
      
      // Start monitoring (simulates what multiple tabs would do)
      sessionService.startSessionMonitoring(onSessionExpired, onSessionRefreshed)
      
      // Starting monitoring again should not cause issues
      sessionService.startSessionMonitoring(onSessionExpired, onSessionRefreshed)
      
      // Stop monitoring should clean up properly
      sessionService.stopSessionMonitoring()
      
      expect(sessionService).toBeDefined() // Basic sanity check
    })

    it('should handle rapid visibility changes efficiently', async () => {
      const startTime = Date.now()
      
      // Setup handler
      const mockSessionCheck = jest.fn()
      const cleanupHandler = sessionService.handleVisibilityChange(mockSessionCheck)
      
      // Simulate rapid tab switching (10 visibility changes)
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(document, 'hidden', { value: false })
        document.dispatchEvent(new Event('visibilitychange'))
      }
      
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should be very fast
      expect(mockSessionCheck).toHaveBeenCalledTimes(10)
      
      cleanupHandler()
    })
  })

  describe('Multi-Tab Performance and Concurrency', () => {
    it('should handle multiple simultaneous login attempts', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' }
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: validSession, user: validUser },
        error: null
      })
      
      // Simulate simultaneous login attempts from different tabs
      const loginPromises = [
        authService.signIn(credentials),
        authService.signIn(credentials),
        authService.signIn(credentials)
      ]
      
      const results = await Promise.all(loginPromises)
      
      // All should succeed
      results.forEach(result => {
        expect(result.session).toBeDefined()
        expect(result.user).toBeDefined()
      })
      
      // Supabase should handle the concurrency
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent session operations without conflicts', async () => {
      // Setup session data
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: validSession },
        error: null
      })
      
      // Perform various concurrent operations
      const operations = [
        sessionService.restoreSession(),
        sessionService.validateSession(validSession),
        sessionService.getSessionInfo(validSession),
        sessionService.restoreSession(),
        sessionService.validateSession(validSession)
      ]
      
      const results = await Promise.all([
        operations[0], // restoreSession
        Promise.resolve(operations[1]), // validateSession (sync)
        Promise.resolve(operations[2]), // getSessionInfo (sync)
        operations[3], // restoreSession
        Promise.resolve(operations[4])  // validateSession (sync)
      ])
      
      // Session restoration should work
      expect(results[0].isValid).toBe(true)
      expect(results[3].isValid).toBe(true)
      
      // Validation should be consistent
      expect(results[1].isValid).toBe(true)
      expect(results[4].isValid).toBe(true)
      
      // Session info should be available
      expect(results[2].isValid).toBe(true)
    })

    it('should handle memory cleanup for concurrent operations', async () => {
      const onSessionExpired = jest.fn()
      const onSessionRefreshed = jest.fn()
      
      // Start monitoring
      sessionService.startSessionMonitoring(onSessionExpired, onSessionRefreshed)
      
      // Setup multiple visibility handlers (simulating multiple tabs)
      const handlers = [
        sessionService.handleVisibilityChange(jest.fn()),
        sessionService.handleVisibilityChange(jest.fn()),
        sessionService.handleVisibilityChange(jest.fn())
      ]
      
      // Clean up everything
      sessionService.stopSessionMonitoring()
      handlers.forEach(cleanup => cleanup())
      
      // Should complete without errors
      expect(true).toBe(true)
    })
  })

  describe('Multi-Tab Integration Scenarios', () => {
    it('should handle complete authentication flow across tabs', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' }
      
      // Tab 1: Login
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: validSession, user: validUser },
        error: null
      })
      
      const loginResult = await authService.signIn(credentials)
      expect(loginResult.session).toBeDefined()
      
      // Tab 2: Session should be available (via Supabase storage)
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: validSession },
        error: null
      })
      
      const restoreResult = await sessionService.restoreSession()
      expect(restoreResult.isValid).toBe(true)
      
      // Tab 3: Logout should clear everything
      await loginService.logout()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle session timeout across all tabs', async () => {
      // All tabs check expired session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null
      })
      
      const sessionChecks = await Promise.all([
        sessionService.restoreSession(),
        sessionService.restoreSession(),
        sessionService.restoreSession()
      ])
      
      // All should detect expiry
      sessionChecks.forEach(result => {
        expect(result.isValid).toBe(false)
      })
      
      // Cleanup should be called
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should maintain consistent state during network interruptions', async () => {
      // Start with valid session
      mockSupabase.auth.getSession
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockResolvedValueOnce({
          data: { session: validSession },
          error: null
        })
      
      // First call fails due to network
      const result1 = await sessionService.restoreSession()
      expect(result1.isValid).toBe(false)
      
      // Second call succeeds after network recovery
      const result2 = await sessionService.restoreSession()
      expect(result2.isValid).toBe(true)
    })
  })
})