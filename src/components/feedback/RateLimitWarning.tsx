import React, { useState, useEffect } from 'react'
import { rateLimitingService, type RateLimitInfo } from '../../services/rateLimitingService'

interface RateLimitWarningProps {
  email: string
  className?: string
  onRateLimitChange?: (isLimited: boolean) => void
}

export const RateLimitWarning: React.FC<RateLimitWarningProps> = ({
  email,
  className = '',
  onRateLimitChange
}) => {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Update rate limit info when email changes
  useEffect(() => {
    if (!email) {
      setRateLimitInfo(null)
      return
    }

    const updateRateLimitInfo = () => {
      const info = rateLimitingService.checkRateLimit(email)
      setRateLimitInfo(info)
      setTimeRemaining(info.waitTimeMs)
      
      // Notify parent component of rate limit status
      if (onRateLimitChange) {
        onRateLimitChange(info.isLimited)
      }
    }

    updateRateLimitInfo()
    
    // Update every second if rate limited
    const interval = setInterval(() => {
      updateRateLimitInfo()
    }, 1000)

    return () => clearInterval(interval)
  }, [email, onRateLimitChange])

  // Update countdown timer
  useEffect(() => {
    if (!rateLimitInfo?.isLimited || timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1000)
        if (newTime === 0) {
          // Rate limit expired, refresh info
          setTimeout(() => {
            const info = rateLimitingService.checkRateLimit(email)
            setRateLimitInfo(info)
            if (onRateLimitChange) {
              onRateLimitChange(info.isLimited)
            }
          }, 100)
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [rateLimitInfo?.isLimited, email, onRateLimitChange])

  if (!rateLimitInfo || (!rateLimitInfo.isLimited && rateLimitInfo.severity === 'info')) {
    return null
  }

  const getSeverityStyles = () => {
    switch (rateLimitInfo.severity) {
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          icon: '🚫'
        }
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          icon: '⚠️'
        }
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          icon: 'ℹ️'
        }
    }
  }

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return '0 seconds'
    
    const minutes = Math.floor(ms / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }

  const styles = getSeverityStyles()

  return (
    <div className={`${styles.bgColor} ${styles.borderColor} border rounded-md p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg" role="img" aria-label={rateLimitInfo.severity}>
            {styles.icon}
          </span>
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${styles.textColor}`}>
              {rateLimitInfo.isLimited ? 'Login Temporarily Limited' : 'Login Attempts Warning'}
            </h4>
            
            {rateLimitInfo.isLimited && timeRemaining > 0 && (
              <div className={`text-sm font-mono ${styles.textColor} bg-white px-2 py-1 rounded`}>
                {formatTimeRemaining(timeRemaining)}
              </div>
            )}
          </div>
          
          <div className={`mt-1 text-sm ${styles.textColor}`}>
            <p>{rateLimitInfo.message}</p>
            
            {/* Progress bar for remaining attempts */}
            {!rateLimitInfo.isLimited && rateLimitInfo.remainingAttempts < 5 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Attempts remaining</span>
                  <span>{rateLimitInfo.remainingAttempts}/5</span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      rateLimitInfo.remainingAttempts <= 1 ? 'bg-red-500' :
                      rateLimitInfo.remainingAttempts <= 2 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${(rateLimitInfo.remainingAttempts / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Countdown progress bar */}
            {rateLimitInfo.isLimited && rateLimitInfo.resetTime && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Time remaining</span>
                  <span>{formatTimeRemaining(timeRemaining)}</span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                    style={{ 
                      width: `${Math.max(0, (timeRemaining / rateLimitInfo.waitTimeMs) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional help for blocked users */}
          {rateLimitInfo.isLimited && rateLimitInfo.severity === 'error' && (
            <div className="mt-3 p-3 bg-white rounded border">
              <h5 className={`text-xs font-medium ${styles.textColor} mb-2`}>
                While you wait, you can:
              </h5>
              <ul className={`text-xs ${styles.textColor} space-y-1`}>
                <li>• Check that you're using the correct email address</li>
                <li>• Make sure your password is correct</li>
                <li>• Try resetting your password if you're unsure</li>
                <li>• Contact support if you need immediate assistance</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact version for inline display
export const RateLimitIndicator: React.FC<{
  email: string
  className?: string
}> = ({ email, className = '' }) => {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  useEffect(() => {
    if (!email) return

    const updateInfo = () => {
      const info = rateLimitingService.checkRateLimit(email)
      setRateLimitInfo(info)
    }

    updateInfo()
    const interval = setInterval(updateInfo, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [email])

  if (!rateLimitInfo || rateLimitInfo.severity === 'info') {
    return null
  }

  const getIndicatorColor = () => {
    switch (rateLimitInfo.severity) {
      case 'error': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-blue-500'
    }
  }

  const getTooltip = () => {
    if (rateLimitInfo.isLimited) {
      return `Login limited: ${rateLimitingService.formatTimeRemaining(rateLimitInfo.waitTimeMs)} remaining`
    }
    return `${rateLimitInfo.remainingAttempts} attempts remaining`
  }

  return (
    <div className={`flex items-center ${className}`} title={getTooltip()}>
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
      {rateLimitInfo.isLimited && (
        <span className="ml-2 text-xs text-gray-600">
          {rateLimitingService.formatTimeRemaining(rateLimitInfo.waitTimeMs)}
        </span>
      )}
    </div>
  )
}