// Mock Date.now for testing time-based functionality
const originalDateNow = Date.now
const mockDateNow = jest.fn()

// Mock timers
jest.useFakeTimers()

import { InactivityService } from '../../services/inactivityService'

describe('24-Hour Inactivity Timeout End-to-End Tests', () => {
  let inactivityService: InactivityService
  let mockCallbacks: {
    onWarning: jest.Mock
    onTimeout: jest.Mock
    onActivity: jest.Mock
  }

  const HOUR_MS = 60 * 60 * 1000
  const MINUTE_MS = 60 * 1000
  const DAY_MS = 24 * HOUR_MS

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    
    // Setup mock date
    mockDateNow.mockImplementation(() => 1700000000000) // Fixed timestamp
    Date.now = mockDateNow
    
    // Create fresh service instance
    inactivityService = new InactivityService({
      timeoutMs: DAY_MS, // 24 hours
      warningMs: 5 * MINUTE_MS, // 5 minutes warning
      checkIntervalMs: MINUTE_MS // Check every minute
    })
    
    // Setup mock callbacks
    mockCallbacks = {
      onWarning: jest.fn(),
      onTimeout: jest.fn(),
      onActivity: jest.fn()
    }
  })

  afterEach(() => {
    if (inactivityService) {
      inactivityService.stop()
    }
    
    // Restore original Date.now
    Date.now = originalDateNow
    
    jest.useRealTimers()
    jest.useFakeTimers()
  })

  describe('24-Hour Timeout Functionality', () => {
    it('should not timeout before 24 hours', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance time to just before 24 hours (23 hours 59 minutes)
      const advanceTime = DAY_MS - MINUTE_MS
      mockDateNow.mockReturnValue(mockDateNow() + advanceTime)
      jest.advanceTimersByTime(advanceTime)
      
      expect(mockCallbacks.onTimeout).not.toHaveBeenCalled()
      expect(inactivityService.getTimeRemaining()).toBeGreaterThan(0)
    })

    it('should trigger warning 5 minutes before 24-hour timeout', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance time to warning threshold (23 hours 55 minutes)
      const advanceTime = DAY_MS - 5 * MINUTE_MS
      mockDateNow.mockReturnValue(mockDateNow() + advanceTime)
      jest.advanceTimersByTime(advanceTime)
      
      expect(mockCallbacks.onWarning).toHaveBeenCalledWith(5 * MINUTE_MS)
      expect(mockCallbacks.onTimeout).not.toHaveBeenCalled()
      expect(inactivityService.shouldShowWarning()).toBe(true)
    })

    it('should trigger automatic logout after exactly 24 hours', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance time to exactly 24 hours
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS)
      jest.advanceTimersByTime(DAY_MS)
      
      expect(mockCallbacks.onTimeout).toHaveBeenCalled()
      expect(inactivityService.isInactive()).toBe(true)
      expect(inactivityService.getTimeRemaining()).toBe(0)
    })

    it('should provide accurate time remaining calculations', () => {
      inactivityService.start(mockCallbacks)
      
      // Check time remaining at different intervals
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS)
      
      // 1 hour later
      mockDateNow.mockReturnValue(mockDateNow() + HOUR_MS)
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS - HOUR_MS)
      
      // 13 hours total
      mockDateNow.mockReturnValue(mockDateNow() + 12 * HOUR_MS)
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS - 13 * HOUR_MS)
      
      // 23 hours total
      mockDateNow.mockReturnValue(mockDateNow() + 10 * HOUR_MS)
      expect(inactivityService.getTimeRemaining()).toBe(HOUR_MS)
    })

    it('should correctly identify when session is inactive', () => {
      inactivityService.start(mockCallbacks)
      
      // Should not be inactive initially
      expect(inactivityService.isInactive()).toBe(false)
      
      // Advance past timeout
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS + HOUR_MS)
      
      expect(inactivityService.isInactive()).toBe(true)
      expect(inactivityService.getTimeRemaining()).toBe(0)
    })
  })

  describe('Activity Detection and Reset', () => {
    it('should reset timeout when updateActivity is called', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance time to near timeout
      const nearTimeoutTime = mockDateNow() + DAY_MS - HOUR_MS
      mockDateNow.mockReturnValue(nearTimeoutTime)
      expect(inactivityService.getTimeRemaining()).toBe(HOUR_MS)
      
      // Update activity (simulates user interaction)
      inactivityService.updateActivity()
      
      // Timer should reset to full 24 hours
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS)
    })

    it('should extend session when extendSession is called', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance near timeout
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS - HOUR_MS)
      expect(inactivityService.getTimeRemaining()).toBe(HOUR_MS)
      
      // Extend session
      inactivityService.extendSession()
      
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS)
    })

    it('should call onActivity callback when updateActivity detects previous inactivity', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance past timeout to make user inactive
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS + HOUR_MS)
      expect(inactivityService.isInactive()).toBe(true)
      
      // Update activity after being inactive
      inactivityService.updateActivity()
      
      expect(mockCallbacks.onActivity).toHaveBeenCalled()
    })
  })

  describe('Warning System', () => {
    it('should show warning exactly at the warning threshold', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance to exactly 5 minutes before timeout
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS - 5 * MINUTE_MS)
      
      expect(inactivityService.shouldShowWarning()).toBe(true)
      expect(inactivityService.getTimeRemaining()).toBe(5 * MINUTE_MS)
    })

    it('should provide countdown in getTimeRemaining', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance to warning period
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS - 4 * MINUTE_MS)
      
      expect(inactivityService.getTimeRemaining()).toBe(4 * MINUTE_MS)
      expect(inactivityService.shouldShowWarning()).toBe(true)
    })

    it('should handle manual warning trigger', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance to warning period
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS - 2 * MINUTE_MS)
      
      // Manually trigger warning
      inactivityService.triggerWarning()
      
      expect(mockCallbacks.onWarning).toHaveBeenCalledWith(2 * MINUTE_MS)
    })

    it('should handle manual logout trigger', () => {
      inactivityService.start(mockCallbacks)
      
      // Manually trigger logout
      inactivityService.triggerLogout()
      
      expect(mockCallbacks.onTimeout).toHaveBeenCalled()
    })
  })

  describe('Service Lifecycle Management', () => {
    it('should start monitoring when service is started', () => {
      inactivityService.start(mockCallbacks)
      
      const status = inactivityService.getStatus()
      expect(status.isActive).toBe(true)
    })

    it('should stop monitoring and cleanup when service is stopped', () => {
      inactivityService.start(mockCallbacks)
      
      // Verify it's running
      const statusBefore = inactivityService.getStatus()
      expect(statusBefore.isActive).toBe(true)
      
      inactivityService.stop()
      
      const statusAfter = inactivityService.getStatus()
      expect(statusAfter.isActive).toBe(false)
    })

    it('should handle multiple start/stop cycles', () => {
      // Start and stop multiple times
      for (let i = 0; i < 3; i++) {
        inactivityService.start(mockCallbacks)
        expect(inactivityService.getStatus().isActive).toBe(true)
        
        inactivityService.stop()
        expect(inactivityService.getStatus().isActive).toBe(false)
      }
    })

    it('should handle stop being called when not started', () => {
      // Should not throw error
      expect(() => inactivityService.stop()).not.toThrow()
    })
  })

  describe('Configuration and Status', () => {
    it('should provide accurate status information', () => {
      inactivityService.start(mockCallbacks)
      
      const status = inactivityService.getStatus()
      
      expect(status.isActive).toBe(true)
      expect(status.hasWarned).toBe(false)
      expect(status.timeRemaining).toContain('24h') // Should show 24 hours
      expect(status.lastActivity).toBeDefined()
    })

    it('should update status as time progresses', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance time
      mockDateNow.mockReturnValue(mockDateNow() + HOUR_MS)
      
      const status = inactivityService.getStatus()
      expect(status.timeRemaining).toContain('23h') // Should show 23 hours
    })

    it('should handle custom configuration', () => {
      const customService = new InactivityService({
        timeoutMs: 2 * HOUR_MS, // 2 hours instead of 24
        warningMs: 10 * MINUTE_MS // 10 minutes warning
      })
      
      customService.start(mockCallbacks)
      
      // Should timeout after 2 hours
      mockDateNow.mockReturnValue(mockDateNow() + 2 * HOUR_MS)
      jest.advanceTimersByTime(2 * HOUR_MS)
      
      expect(mockCallbacks.onTimeout).toHaveBeenCalled()
      
      customService.stop()
    })

    it('should show correct time until warning', () => {
      inactivityService.start(mockCallbacks)
      
      // At start, time until warning should be 24h - 5min
      expect(inactivityService.getTimeUntilWarning()).toBe(DAY_MS - 5 * MINUTE_MS)
      
      // After advancing time
      mockDateNow.mockReturnValue(mockDateNow() + HOUR_MS)
      expect(inactivityService.getTimeUntilWarning()).toBe(DAY_MS - 5 * MINUTE_MS - HOUR_MS)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing callbacks gracefully', () => {
      const partialCallbacks = {
        onTimeout: mockCallbacks.onTimeout
        // Missing onWarning and onActivity
      } as any
      
      expect(() => inactivityService.start(partialCallbacks)).not.toThrow()
      
      // Should still work for provided callbacks
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS)
      jest.advanceTimersByTime(DAY_MS)
      expect(mockCallbacks.onTimeout).toHaveBeenCalled()
    })

    it('should handle very large time advances', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance way beyond timeout (7 days)
      mockDateNow.mockReturnValue(mockDateNow() + 7 * DAY_MS)
      
      expect(inactivityService.getTimeRemaining()).toBe(0)
      expect(inactivityService.isInactive()).toBe(true)
    })

    it('should handle time calculations at boundaries', () => {
      inactivityService.start(mockCallbacks)
      
      // Test exact warning boundary
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS - 5 * MINUTE_MS)
      expect(inactivityService.shouldShowWarning()).toBe(true)
      expect(inactivityService.getTimeRemaining()).toBe(5 * MINUTE_MS)
      
      // Test exact timeout boundary
      mockDateNow.mockReturnValue(mockDateNow() + 5 * MINUTE_MS)
      expect(inactivityService.getTimeRemaining()).toBe(0)
      expect(inactivityService.isInactive()).toBe(true)
    })

    it('should maintain consistency after activity reset', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance to warning period
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS - 3 * MINUTE_MS)
      expect(inactivityService.shouldShowWarning()).toBe(true)
      
      // Reset activity
      inactivityService.updateActivity()
      
      // Should no longer show warning
      expect(inactivityService.shouldShowWarning()).toBe(false)
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS)
    })
  })

  describe('Warning and Timeout Workflow', () => {
    it('should follow complete 24-hour inactivity workflow', () => {
      inactivityService.start(mockCallbacks)
      
      // Start: 24 hours remaining
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS)
      expect(inactivityService.shouldShowWarning()).toBe(false)
      expect(inactivityService.isInactive()).toBe(false)
      
      // After 20 hours: still no warning
      mockDateNow.mockReturnValue(mockDateNow() + 20 * HOUR_MS)
      expect(inactivityService.getTimeRemaining()).toBe(4 * HOUR_MS)
      expect(inactivityService.shouldShowWarning()).toBe(false)
      
      // After 23 hours 55 minutes: warning should appear
      mockDateNow.mockReturnValue(mockDateNow() + 3 * HOUR_MS + 55 * MINUTE_MS)
      expect(inactivityService.getTimeRemaining()).toBe(5 * MINUTE_MS)
      expect(inactivityService.shouldShowWarning()).toBe(true)
      
      // After 24 hours: should be inactive
      mockDateNow.mockReturnValue(mockDateNow() + 5 * MINUTE_MS)
      expect(inactivityService.getTimeRemaining()).toBe(0)
      expect(inactivityService.isInactive()).toBe(true)
    })

    it('should reset properly when activity occurs during warning period', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance to warning period
      mockDateNow.mockReturnValue(mockDateNow() + DAY_MS - 2 * MINUTE_MS)
      expect(inactivityService.shouldShowWarning()).toBe(true)
      expect(inactivityService.getTimeRemaining()).toBe(2 * MINUTE_MS)
      
      // User activity resets timer
      inactivityService.updateActivity()
      
      // Should be back to full 24 hours
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS)
      expect(inactivityService.shouldShowWarning()).toBe(false)
      expect(inactivityService.isInactive()).toBe(false)
    })

    it('should handle inactivity periods longer than 24 hours', () => {
      inactivityService.start(mockCallbacks)
      
      // Advance way past 24 hours (3 days)
      mockDateNow.mockReturnValue(mockDateNow() + 3 * DAY_MS)
      
      expect(inactivityService.getTimeRemaining()).toBe(0)
      expect(inactivityService.isInactive()).toBe(true)
      expect(inactivityService.shouldShowWarning()).toBe(false) // No warning when already timed out
      
      // Activity should still reset
      inactivityService.updateActivity()
      expect(inactivityService.getTimeRemaining()).toBe(DAY_MS)
      expect(inactivityService.isInactive()).toBe(false)
    })
  })

  describe('Time Format and Display', () => {
    it('should format time remaining correctly', () => {
      const startTime = 1700000000000
      mockDateNow.mockReturnValue(startTime)
      inactivityService.start(mockCallbacks)
      
      const status = inactivityService.getStatus()
      expect(status.timeRemaining).toMatch(/\d+h \d+m/)
      
      // After 1 hour
      mockDateNow.mockReturnValue(startTime + HOUR_MS)
      const statusAfterHour = inactivityService.getStatus()
      expect(statusAfterHour.timeRemaining).toContain('23h')
      
      // Close to timeout (30 minutes remaining)
      mockDateNow.mockReturnValue(startTime + DAY_MS - 30 * MINUTE_MS)
      const statusNearTimeout = inactivityService.getStatus()
      expect(statusNearTimeout.timeRemaining).toContain('30m') // 30 minutes remaining
    })

    it('should provide ISO timestamp for last activity', () => {
      inactivityService.start(mockCallbacks)
      
      const status = inactivityService.getStatus()
      expect(status.lastActivity).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/)
      
      // Advance time slightly and update activity
      const newTime = mockDateNow() + 1000 // 1 second later
      mockDateNow.mockReturnValue(newTime)
      inactivityService.updateActivity()
      
      const updatedStatus = inactivityService.getStatus()
      expect(updatedStatus.lastActivity).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/)
      expect(updatedStatus.lastActivity).not.toBe(status.lastActivity)
    })
  })
})