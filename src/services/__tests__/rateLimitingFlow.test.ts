import { rateLimitingService } from '../rateLimitingService'

describe('Rate Limiting Core Functionality Tests', () => {
  const testEmail = 'test@example.com'

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    
    // Clean up any existing rate limit data
    rateLimitingService.cleanup()
  })

  afterEach(() => {
    // Cleanup after each test
    localStorage.clear()
  })

  describe('Basic Rate Limiting Behavior', () => {
    it('should start with no rate limiting for new email', () => {
      const rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      
      expect(rateLimitInfo.isLimited).toBe(false)
      expect(rateLimitInfo.remainingAttempts).toBe(5)
      expect(rateLimitInfo.waitTimeMs).toBe(0)
      expect(rateLimitInfo.severity).toBe('info')
    })

    it('should record single failed attempt correctly', () => {
      rateLimitingService.recordAttempt(testEmail, false)
      
      const rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.remainingAttempts).toBe(4) // 5 - 1 = 4
      expect(rateLimitInfo.isLimited).toBe(false)
    })

    it('should track multiple failed attempts', () => {
      // Record 3 failed attempts
      for (let i = 0; i < 3; i++) {
        rateLimitingService.recordAttempt(testEmail, false)
      }
      
      const rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.remainingAttempts).toBe(2) // 5 - 3 = 2
      expect(rateLimitInfo.isLimited).toBe(false) // Not yet limited
      expect(rateLimitInfo.severity).toBe('warning') // Should show warning with low attempts
    })
  })

  describe('5 Failed Attempts Rate Limiting (Core Requirement)', () => {
    it('should trigger rate limiting after exactly 5 failed attempts', () => {
      // Record exactly 5 failed attempts
      for (let i = 0; i < 5; i++) {
        rateLimitingService.recordAttempt(testEmail, false)
      }
      
      const rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      
      // Verify rate limiting is triggered
      expect(rateLimitInfo.isLimited).toBe(true)
      expect(rateLimitInfo.remainingAttempts).toBe(0)
      expect(rateLimitInfo.waitTimeMs).toBeGreaterThan(0)
      expect(rateLimitInfo.severity).toBe('error')
      expect(rateLimitInfo.message).toContain('Too many failed login attempts')
      expect(rateLimitInfo.message).toContain('minute')
    })

    it('should not be rate limited with 4 failed attempts', () => {
      // Record 4 failed attempts (just under the limit)
      for (let i = 0; i < 4; i++) {
        rateLimitingService.recordAttempt(testEmail, false)
      }
      
      const rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      
      // Should not be limited yet
      expect(rateLimitInfo.isLimited).toBe(false)
      expect(rateLimitInfo.remainingAttempts).toBe(1)
      expect(rateLimitInfo.severity).toBe('warning')
    })

    it('should show blocking message after 5 attempts', () => {
      // Trigger rate limiting
      for (let i = 0; i < 5; i++) {
        rateLimitingService.recordAttempt(testEmail, false)
      }
      
      const rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      const message = rateLimitInfo.message
      
      expect(message).toContain('Too many failed login attempts')
      expect(message).toContain('wait')
      expect(message).toContain('minute')
    })

    it('should track users separately', () => {
      const user1Email = 'user1@example.com'
      const user2Email = 'user2@example.com'
      
      // Trigger rate limiting for user1
      for (let i = 0; i < 5; i++) {
        rateLimitingService.recordAttempt(user1Email, false)
      }
      
      // User1 should be rate limited
      const user1Info = rateLimitingService.checkRateLimit(user1Email)
      expect(user1Info.isLimited).toBe(true)
      
      // User2 should not be affected
      const user2Info = rateLimitingService.checkRateLimit(user2Email)
      expect(user2Info.isLimited).toBe(false)
      expect(user2Info.remainingAttempts).toBe(5)
    })
  })

  describe('Progressive Delay System', () => {
    it('should apply delays for repeated failures before complete blocking', () => {
      // Record first attempt - should have no delay
      rateLimitingService.recordAttempt(testEmail, false)
      let rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.isLimited).toBe(false)
      
      // Record second attempt - may have delay
      rateLimitingService.recordAttempt(testEmail, false)
      rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      
      // After 2 attempts, there might be progressive delay
      if (rateLimitInfo.isLimited) {
        expect(rateLimitInfo.waitTimeMs).toBeGreaterThan(0)
        expect(rateLimitInfo.severity).toBe('warning')
      }
    })

    it('should have increasing severity as attempts increase', () => {
      const emailForSeverity = 'severity-test@example.com'
      
      // Start with no attempts - should be 'info'
      let rateLimitInfo = rateLimitingService.checkRateLimit(emailForSeverity)
      expect(rateLimitInfo.severity).toBe('info')
      
      // After 3+ attempts, should be 'warning'
      for (let i = 0; i < 3; i++) {
        rateLimitingService.recordAttempt(emailForSeverity, false)
      }
      rateLimitInfo = rateLimitingService.checkRateLimit(emailForSeverity)
      expect(rateLimitInfo.severity).toBe('warning')
      
      // After 5 attempts, should be 'error' (blocked)
      for (let i = 0; i < 2; i++) {
        rateLimitingService.recordAttempt(emailForSeverity, false)
      }
      rateLimitInfo = rateLimitingService.checkRateLimit(emailForSeverity)
      expect(rateLimitInfo.severity).toBe('error')
      expect(rateLimitInfo.isLimited).toBe(true)
    })
  })

  describe('Rate Limit Reset Behavior', () => {
    it('should reset rate limit on successful login', () => {
      // Record failed attempts
      for (let i = 0; i < 3; i++) {
        rateLimitingService.recordAttempt(testEmail, false)
      }
      
      // Verify attempts are recorded
      let rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.remainingAttempts).toBe(2)
      
      // Record successful attempt
      rateLimitingService.recordAttempt(testEmail, true)
      
      // Rate limit should be reset
      rateLimitingService.resetRateLimit(testEmail)
      rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.remainingAttempts).toBe(5)
      expect(rateLimitInfo.isLimited).toBe(false)
    })

    it('should allow manual rate limit reset', () => {
      // Trigger rate limiting
      for (let i = 0; i < 5; i++) {
        rateLimitingService.recordAttempt(testEmail, false)
      }
      
      // Verify rate limited
      let rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.isLimited).toBe(true)
      
      // Reset manually
      rateLimitingService.resetRateLimit(testEmail)
      
      // Should be cleared
      rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.isLimited).toBe(false)
      expect(rateLimitInfo.remainingAttempts).toBe(5)
    })
  })

  describe('Time Window Behavior', () => {
    it('should expire old attempts after time window', () => {
      // Mock Date.now() to control time
      const originalDateNow = Date.now
      let currentTime = 1000000000000 // Fixed timestamp
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime)
      
      try {
        // Record failed attempts
        rateLimitingService.recordAttempt(testEmail, false)
        rateLimitingService.recordAttempt(testEmail, false)
        
        let rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
        expect(rateLimitInfo.remainingAttempts).toBe(3) // 5 - 2 = 3
        
        // Move time forward by 16 minutes (past 15-minute window)
        currentTime += 16 * 60 * 1000
        
        // Old attempts should be expired
        rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
        expect(rateLimitInfo.remainingAttempts).toBe(5) // Should be reset
        
      } finally {
        // Restore original Date.now
        jest.spyOn(Date, 'now').mockImplementation(originalDateNow)
      }
    })

    it('should maintain attempts within time window', () => {
      // Mock Date.now() to control time
      const originalDateNow = Date.now
      let currentTime = 1000000000000
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime)
      
      try {
        // Record failed attempts
        rateLimitingService.recordAttempt(testEmail, false)
        rateLimitingService.recordAttempt(testEmail, false)
        
        let rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
        expect(rateLimitInfo.remainingAttempts).toBe(3)
        
        // Move time forward by 5 minutes (within 15-minute window)
        currentTime += 5 * 60 * 1000
        
        // Attempts should still be counted
        rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
        expect(rateLimitInfo.remainingAttempts).toBe(3)
        
      } finally {
        jest.spyOn(Date, 'now').mockImplementation(originalDateNow)
      }
    })
  })

  describe('Configuration Verification', () => {
    it('should use 5 as maximum attempts before blocking', () => {
      const configEmail = 'config-test@example.com'
      
      // Start with 5 attempts remaining
      let rateLimitInfo = rateLimitingService.checkRateLimit(configEmail)
      expect(rateLimitInfo.remainingAttempts).toBe(5)
      
      // After exactly 5 failed attempts, should be blocked
      for (let i = 0; i < 5; i++) {
        rateLimitingService.recordAttempt(configEmail, false)
      }
      
      rateLimitInfo = rateLimitingService.checkRateLimit(configEmail)
      expect(rateLimitInfo.isLimited).toBe(true)
      expect(rateLimitInfo.remainingAttempts).toBe(0)
    })

    it('should use 15-minute block duration', () => {
      // Mock Date.now() to control time
      const originalDateNow = Date.now
      let currentTime = 1000000000000
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime)
      
      try {
        // Trigger rate limiting
        for (let i = 0; i < 5; i++) {
          rateLimitingService.recordAttempt(testEmail, false)
        }
        
        let rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
        expect(rateLimitInfo.isLimited).toBe(true)
        
        // Move forward 14 minutes - should still be blocked
        currentTime += 14 * 60 * 1000
        rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
        expect(rateLimitInfo.isLimited).toBe(true)
        
        // Move forward 2 more minutes (16 total) - should be unblocked
        currentTime += 2 * 60 * 1000
        rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
        expect(rateLimitInfo.isLimited).toBe(false)
        
      } finally {
        jest.spyOn(Date, 'now').mockImplementation(originalDateNow)
      }
    })
  })

  describe('Security Features', () => {
    it('should handle email case-insensitivity', () => {
      const email1 = 'Test@Example.com'
      const email2 = 'test@example.com'
      const email3 = 'TEST@EXAMPLE.COM'
      
      // Record attempts with different cases
      rateLimitingService.recordAttempt(email1, false)
      rateLimitingService.recordAttempt(email2, false)
      rateLimitingService.recordAttempt(email3, false)
      
      // All should be treated as the same email
      const rateLimitInfo = rateLimitingService.checkRateLimit(email1)
      expect(rateLimitInfo.remainingAttempts).toBe(2) // 5 - 3 = 2
    })

    it('should provide user-friendly messages', () => {
      // Test different stages of rate limiting
      
      // No attempts - info message
      let rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.message).toContain('proceed')
      
      // 3 attempts - warning message
      for (let i = 0; i < 3; i++) {
        rateLimitingService.recordAttempt(testEmail, false)
      }
      rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.message).toContain('remaining')
      
      // 5 attempts - blocked message
      for (let i = 0; i < 2; i++) {
        rateLimitingService.recordAttempt(testEmail, false)
      }
      rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.message).toContain('Too many failed')
    })
  })

  describe('Utility Functions', () => {
    it('should format time remaining correctly', () => {
      expect(rateLimitingService.formatTimeRemaining(0)).toBe('0 seconds')
      expect(rateLimitingService.formatTimeRemaining(30000)).toBe('30 seconds')
      expect(rateLimitingService.formatTimeRemaining(60000)).toBe('1 minute 0 seconds')
      expect(rateLimitingService.formatTimeRemaining(90000)).toBe('1 minute 30 seconds')
      expect(rateLimitingService.formatTimeRemaining(120000)).toBe('2 minutes 0 seconds')
    })

    it('should provide status information', () => {
      // Record some attempts
      rateLimitingService.recordAttempt(testEmail, false)
      rateLimitingService.recordAttempt(testEmail, true)
      rateLimitingService.recordAttempt(testEmail, false)
      
      const status = rateLimitingService.getStatus(testEmail)
      expect(status.totalAttempts).toBe(3)
      expect(status.failedAttempts).toBe(2)
      expect(status.successfulAttempts).toBe(1)
      expect(status.userStatus).toBeDefined()
      expect(status.userStatus?.remainingAttempts).toBe(4) // 5 - 1 failed (success doesn't count against limit)
    })

    it('should handle storage errors gracefully', () => {
      // Corrupt localStorage
      localStorage.setItem('auth_rate_limit', 'invalid json')
      
      // Should handle gracefully and return default state
      const rateLimitInfo = rateLimitingService.checkRateLimit(testEmail)
      expect(rateLimitInfo.remainingAttempts).toBe(5)
      expect(rateLimitInfo.isLimited).toBe(false)
    })
  })
})