interface InactivityConfig {
  timeoutMs: number
  warningMs: number
  checkIntervalMs: number
  activityEvents: string[]
}

interface InactivityCallbacks {
  onWarning: (timeRemaining: number) => void
  onTimeout: () => void
  onActivity: () => void
}

class InactivityService {
  private config: InactivityConfig
  private callbacks: InactivityCallbacks | null = null
  private lastActivity: number = Date.now()
  private warningTimeout: NodeJS.Timeout | null = null
  private logoutTimeout: NodeJS.Timeout | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private isActive: boolean = false
  private hasWarned: boolean = false

  constructor(config?: Partial<InactivityConfig>) {
    this.config = {
      timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
      warningMs: 5 * 60 * 1000, // 5 minutes before timeout
      checkIntervalMs: 60 * 1000, // Check every minute
      activityEvents: [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click',
        'focus'
      ],
      ...config
    }
  }

  /**
   * Start monitoring user inactivity
   */
  start(callbacks: InactivityCallbacks): void {
    this.callbacks = callbacks
    this.isActive = true
    this.hasWarned = false
    this.updateActivity()
    
    // Add activity event listeners
    this.addActivityListeners()
    
    // Start monitoring interval
    this.startMonitoring()
    
    console.log('Inactivity monitoring started', {
      timeoutHours: this.config.timeoutMs / (1000 * 60 * 60),
      warningMinutes: this.config.warningMs / (1000 * 60)
    })
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    this.isActive = false
    this.callbacks = null
    
    // Clear all timeouts and intervals
    this.clearTimeouts()
    
    // Remove event listeners
    this.removeActivityListeners()
    
    console.log('Inactivity monitoring stopped')
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    const now = Date.now()
    const wasInactive = now - this.lastActivity > this.config.timeoutMs
    
    this.lastActivity = now
    this.hasWarned = false
    
    // Clear existing timeouts
    this.clearTimeouts()
    
    // Set new timeouts
    this.scheduleWarning()
    this.scheduleLogout()
    
    // Notify of activity if we were previously inactive
    if (wasInactive && this.callbacks?.onActivity) {
      this.callbacks.onActivity()
    }
  }

  /**
   * Get time remaining until timeout
   */
  getTimeRemaining(): number {
    const elapsed = Date.now() - this.lastActivity
    return Math.max(0, this.config.timeoutMs - elapsed)
  }

  /**
   * Get time until warning
   */
  getTimeUntilWarning(): number {
    const elapsed = Date.now() - this.lastActivity
    const warningTime = this.config.timeoutMs - this.config.warningMs
    return Math.max(0, warningTime - elapsed)
  }

  /**
   * Check if user is currently inactive
   */
  isInactive(): boolean {
    return this.getTimeRemaining() === 0
  }

  /**
   * Check if warning should be shown
   */
  shouldShowWarning(): boolean {
    const timeRemaining = this.getTimeRemaining()
    return timeRemaining > 0 && timeRemaining <= this.config.warningMs
  }

  /**
   * Manually trigger warning (for testing)
   */
  triggerWarning(): void {
    if (this.callbacks?.onWarning) {
      const timeRemaining = this.getTimeRemaining()
      this.callbacks.onWarning(timeRemaining)
      this.hasWarned = true
    }
  }

  /**
   * Manually trigger logout (for testing)
   */
  triggerLogout(): void {
    if (this.callbacks?.onTimeout) {
      this.callbacks.onTimeout()
    }
    this.stop()
  }

  /**
   * Extend session (reset inactivity timer)
   */
  extendSession(): void {
    this.updateActivity()
    console.log('Session extended due to user activity')
  }

  /**
   * Get current inactivity status
   */
  getStatus(): {
    isActive: boolean
    lastActivity: string
    timeRemaining: string
    timeUntilWarning: string
    hasWarned: boolean
  } {
    const timeRemaining = this.getTimeRemaining()
    const timeUntilWarning = this.getTimeUntilWarning()
    
    return {
      isActive: this.isActive,
      lastActivity: new Date(this.lastActivity).toISOString(),
      timeRemaining: this.formatTime(timeRemaining),
      timeUntilWarning: this.formatTime(timeUntilWarning),
      hasWarned: this.hasWarned
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<InactivityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.isActive) {
      // Restart with new config
      const currentCallbacks = this.callbacks
      this.stop()
      if (currentCallbacks) {
        this.start(currentCallbacks)
      }
    }
  }

  private addActivityListeners(): void {
    this.config.activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true })
    })
  }

  private removeActivityListeners(): void {
    this.config.activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity)
    })
  }

  private handleActivity = (): void => {
    if (this.isActive) {
      this.updateActivity()
    }
  }

  private startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      if (!this.isActive) return

      const timeRemaining = this.getTimeRemaining()
      
      // Check if we should show warning
      if (!this.hasWarned && this.shouldShowWarning() && this.callbacks?.onWarning) {
        this.callbacks.onWarning(timeRemaining)
        this.hasWarned = true
      }
      
      // Check if timeout reached
      if (timeRemaining === 0 && this.callbacks?.onTimeout) {
        this.callbacks.onTimeout()
        this.stop()
      }
    }, this.config.checkIntervalMs)
  }

  private scheduleWarning(): void {
    const timeUntilWarning = this.getTimeUntilWarning()
    
    if (timeUntilWarning > 0) {
      this.warningTimeout = setTimeout(() => {
        if (this.isActive && !this.hasWarned && this.callbacks?.onWarning) {
          const timeRemaining = this.getTimeRemaining()
          this.callbacks.onWarning(timeRemaining)
          this.hasWarned = true
        }
      }, timeUntilWarning)
    }
  }

  private scheduleLogout(): void {
    const timeRemaining = this.getTimeRemaining()
    
    if (timeRemaining > 0) {
      this.logoutTimeout = setTimeout(() => {
        if (this.isActive && this.callbacks?.onTimeout) {
          this.callbacks.onTimeout()
          this.stop()
        }
      }, timeRemaining)
    }
  }

  private clearTimeouts(): void {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout)
      this.warningTimeout = null
    }
    
    if (this.logoutTimeout) {
      clearTimeout(this.logoutTimeout)
      this.logoutTimeout = null
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private formatTime(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }
}

// Export singleton instance with default 24-hour timeout
export const inactivityService = new InactivityService({
  timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
  warningMs: 5 * 60 * 1000, // 5 minutes warning
  checkIntervalMs: 60 * 1000 // Check every minute
})

// Export class for custom instances
export { InactivityService }
export type { InactivityConfig, InactivityCallbacks } 