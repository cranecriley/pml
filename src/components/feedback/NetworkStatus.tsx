import React, { useState, useEffect } from 'react'
import { errorHandlingService } from '../../services/errorHandlingService'

interface NetworkStatusProps {
  className?: string
  showWhenOnline?: boolean
  position?: 'top' | 'bottom' | 'inline'
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  className = '',
  showWhenOnline = false,
  position = 'top'
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isConnected, setIsConnected] = useState(true)
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Check detailed connectivity (not just browser online status)
  const checkConnectivity = async () => {
    setIsCheckingConnection(true)
    try {
      const connected = await errorHandlingService.checkConnectivity()
      setIsConnected(connected)
      setLastChecked(new Date())
    } catch (error) {
      setIsConnected(false)
    } finally {
      setIsCheckingConnection(false)
    }
  }

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      checkConnectivity()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial connectivity check
    if (isOnline) {
      checkConnectivity()
    }

    // Periodic connectivity check when online
    const intervalId = setInterval(() => {
      if (isOnline) {
        checkConnectivity()
      }
    }, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalId)
    }
  }, [isOnline])

  // Don't show if online and showWhenOnline is false
  if (isOnline && isConnected && !showWhenOnline) {
    return null
  }

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        type: 'offline' as const,
        message: 'No internet connection',
        icon: '📡',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200'
      }
    }

    if (isCheckingConnection) {
      return {
        type: 'checking' as const,
        message: 'Checking connection...',
        icon: '🔄',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200'
      }
    }

    if (!isConnected) {
      return {
        type: 'disconnected' as const,
        message: 'Connection to server lost',
        icon: '⚠️',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200'
      }
    }

    return {
      type: 'connected' as const,
      message: 'Connected',
      icon: '✅',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200'
    }
  }

  const statusInfo = getStatusInfo()

  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-50',
    bottom: 'fixed bottom-0 left-0 right-0 z-50',
    inline: 'relative'
  }

  const formatLastChecked = () => {
    if (!lastChecked) return ''
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastChecked.getTime()) / 1000)
    
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border px-4 py-2 text-sm transition-all duration-300`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <span className="text-base" role="img" aria-label={statusInfo.type}>
              {statusInfo.icon}
            </span>
            <div className="flex items-center space-x-2">
              <span className={`font-medium ${statusInfo.textColor}`}>
                {statusInfo.message}
              </span>
              {lastChecked && statusInfo.type === 'connected' && (
                <span className={`text-xs ${statusInfo.textColor} opacity-75`}>
                  (checked {formatLastChecked()})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Retry button for connection issues */}
            {(statusInfo.type === 'disconnected' || statusInfo.type === 'offline') && (
              <button
                onClick={checkConnectivity}
                disabled={isCheckingConnection}
                className={`${statusInfo.textColor} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded px-2 py-1 text-xs font-medium transition-opacity disabled:opacity-50`}
              >
                {isCheckingConnection ? 'Checking...' : 'Retry'}
              </button>
            )}

            {/* Spinning icon for checking status */}
            {isCheckingConnection && (
              <svg 
                className={`w-4 h-4 ${statusInfo.textColor} animate-spin`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                />
              </svg>
            )}

            {/* Dismiss button for inline display */}
            {position === 'inline' && statusInfo.type === 'connected' && (
              <button
                onClick={() => setIsConnected(false)}
                className={`${statusInfo.textColor} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded`}
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact version for use in headers/footers
export const NetworkStatusIndicator: React.FC<{
  className?: string
}> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    const checkConnectivity = async () => {
      if (isOnline) {
        try {
          const connected = await errorHandlingService.checkConnectivity()
          setIsConnected(connected)
        } catch (error) {
          setIsConnected(false)
        }
      }
    }

    const handleOnline = () => {
      setIsOnline(true)
      checkConnectivity()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    checkConnectivity()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isOnline])

  const getIndicatorColor = () => {
    if (!isOnline) return 'bg-red-500'
    if (!isConnected) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getTooltip = () => {
    if (!isOnline) return 'No internet connection'
    if (!isConnected) return 'Connection to server lost'
    return 'Connected'
  }

  return (
    <div className={`flex items-center ${className}`} title={getTooltip()}>
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
    </div>
  )
} 