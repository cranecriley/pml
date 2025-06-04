import { errorHandlingService } from './errorHandlingService'

export interface LoginAttempt {
  email: string
  timestamp: number
  success: boolean
  ip?: string
  userAgent?: string
}

export interface RateLimitInfo {
  isLimited: boolean
  remainingAttempts: number
  resetTime: number | null
  waitTimeMs: number
  message: string
  severity: 'info' | 'warning' | 'error'
}

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  progressiveDelayMs: number[]
  blockDurationMs: number
}

class RateLimitingService {
  private readonly storageKey = 'auth_rate_limit'
  private readonly defaultConfig: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    progressiveDelayMs: [0, 1000, 3000, 5000, 10000], // Progressive delays: 0s, 1s, 3s, 5s, 10s
    blockDurationMs: 15 * 60 * 1000 // 15 minutes block after max attempts
  }

  /**
   * Record a login attempt
   */
  recordAttempt(email: string, success: boolean): void {
    const attempts = this.getAttempts()
    const now = Date.now()

    const newAttempt: LoginAttempt = {
      email: email.toLowerCase(),
      timestamp: now,
      success,
      userAgent: navigator.userAgent
    }

    attempts.push(newAttempt)

    // Clean up old attempts (outside the window)
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.defaultConfig.windowMs
    )

    this.saveAttempts(validAttempts)

    // Log the attempt for monitoring
    this.logAttempt(newAttempt)
  }

  /**
   * Check if login is rate limited for a given email
   */
  checkRateLimit(email: string): RateLimitInfo {
    const attempts = this.getRecentFailedAttempts(email)
    const now = Date.now()

    // Check if user is currently blocked
    const lastAttempt = attempts[attempts.length - 1]
    if (lastAttempt && attempts.length >= this.defaultConfig.maxAttempts) {
      const timeSinceLastAttempt = now - lastAttempt.timestamp
      const waitTime = this.defaultConfig.blockDurationMs - timeSinceLastAttempt

      if (waitTime > 0) {
        return {
          isLimited: true,
          remainingAttempts: 0,
          resetTime: lastAttempt.timestamp + this.defaultConfig.blockDurationMs,
          waitTimeMs: waitTime,
          message: this.getBlockedMessage(waitTime),
          severity: 'error'
        }
      }
    }

    // Check progressive delay
    if (attempts.length > 0) {
      const delayIndex = Math.min(attempts.length - 1, this.defaultConfig.progressiveDelayMs.length - 1)
      const requiredDelay = this.defaultConfig.progressiveDelayMs[delayIndex]
      
      if (lastAttempt && requiredDelay > 0) {
        const timeSinceLastAttempt = now - lastAttempt.timestamp
        const remainingDelay = requiredDelay - timeSinceLastAttempt

        if (remainingDelay > 0) {
          return {
            isLimited: true,
            remainingAttempts: this.defaultConfig.maxAttempts - attempts.length,
            resetTime: lastAttempt.timestamp + requiredDelay,
            waitTimeMs: remainingDelay,
            message: this.getDelayMessage(remainingDelay, attempts.length),
            severity: 'warning'
          }
        }
      }
    }

    // Not rate limited
    const remainingAttempts = this.defaultConfig.maxAttempts - attempts.length
    return {
      isLimited: false,
      remainingAttempts,
      resetTime: null,
      waitTimeMs: 0,
      message: this.getAvailableMessage(remainingAttempts, attempts.length),
      severity: attempts.length > 2 ? 'warning' : 'info'
    }
  }

  /**
   * Get recent failed attempts for an email
   */
  private getRecentFailedAttempts(email: string): LoginAttempt[] {
    const attempts = this.getAttempts()
    const now = Date.now()
    const emailLower = email.toLowerCase()

    return attempts.filter(attempt => 
      attempt.email === emailLower &&
      !attempt.success &&
      (now - attempt.timestamp) < this.defaultConfig.windowMs
    ).sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Check if user should wait before next attempt
   */
  shouldWait(email: string): { shouldWait: boolean; waitTimeMs: number } {
    const rateLimitInfo = this.checkRateLimit(email)
    return {
      shouldWait: rateLimitInfo.isLimited,
      waitTimeMs: rateLimitInfo.waitTimeMs
    }
  }

  /**
   * Get user-friendly rate limit message
   */
  getRateLimitMessage(email: string): string {
    const rateLimitInfo = this.checkRateLimit(email)
    return rateLimitInfo.message
  }

  /**
   * Reset rate limit for an email (on successful login)
   */
  resetRateLimit(email: string): void {
    const attempts = this.getAttempts()
    const emailLower = email.toLowerCase()
    
    // Remove all attempts for this email
    const filteredAttempts = attempts.filter(attempt => attempt.email !== emailLower)
    this.saveAttempts(filteredAttempts)
  }

  /**
   * Clean up old attempts
   */
  cleanup(): void {
    const attempts = this.getAttempts()
    const now = Date.now()
    
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.defaultConfig.windowMs
    )
    
    this.saveAttempts(validAttempts)
  }

  /**
   * Get all stored attempts
   */
  private getAttempts(): LoginAttempt[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.warn('Failed to parse rate limit data:', error)
      return []
    }
  }

  /**
   * Save attempts to localStorage
   */
  private saveAttempts(attempts: LoginAttempt[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(attempts))
    } catch (error) {
      console.warn('Failed to save rate limit data:', error)
    }
  }

  /**
   * Generate message for blocked users
   */
  private getBlockedMessage(waitTimeMs: number): string {
    const minutes = Math.ceil(waitTimeMs / (1000 * 60))
    return `Too many failed login attempts. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before trying again.`
  }

  /**
   * Generate message for progressive delay
   */
  private getDelayMessage(waitTimeMs: number, attemptCount: number): string {
    const seconds = Math.ceil(waitTimeMs / 1000)
    const remaining = this.defaultConfig.maxAttempts - attemptCount
    
    return `Please wait ${seconds} second${seconds !== 1 ? 's' : ''} before your next attempt. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
  }

  /**
   * Generate message for available attempts
   */
  private getAvailableMessage(remainingAttempts: number, failedCount: number): string {
    if (failedCount === 0) {
      return 'You can proceed with login.'
    }
    
    if (remainingAttempts <= 2) {
      return `${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before temporary lockout.`
    }
    
    return `${failedCount} failed attempt${failedCount !== 1 ? 's' : ''}. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
  }

  /**
   * Log attempt for monitoring
   */
  private logAttempt(attempt: LoginAttempt): void {
    const logData = {
      email: attempt.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email for privacy
      success: attempt.success,
      timestamp: new Date(attempt.timestamp).toISOString(),
      userAgent: attempt.userAgent
    }

    if (attempt.success) {
      console.log('Successful login attempt:', logData)
    } else {
      console.warn('Failed login attempt:', logData)
    }

    // In production, you might send this to an analytics service
    // analytics.track('login_attempt', logData)
  }

  /**
   * Get current rate limit status for dashboard/debugging
   */
  getStatus(email?: string): {
    totalAttempts: number
    failedAttempts: number
    successfulAttempts: number
    userStatus?: RateLimitInfo
  } {
    const attempts = this.getAttempts()
    
    const status = {
      totalAttempts: attempts.length,
      failedAttempts: attempts.filter(a => !a.success).length,
      successfulAttempts: attempts.filter(a => a.success).length,
      userStatus: email ? this.checkRateLimit(email) : undefined
    }

    return status
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(ms: number): string {
    if (ms <= 0) return '0 seconds'
    
    const minutes = Math.floor(ms / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`
    }
    
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }

  /**
   * Check if an email has recent successful logins (for security insights)
   */
  hasRecentSuccessfulLogin(email: string, withinMs: number = 24 * 60 * 60 * 1000): boolean {
    const attempts = this.getAttempts()
    const now = Date.now()
    const emailLower = email.toLowerCase()

    return attempts.some(attempt => 
      attempt.email === emailLower &&
      attempt.success &&
      (now - attempt.timestamp) < withinMs
    )
  }
}

// Export singleton instance
export const rateLimitingService = new RateLimitingService()