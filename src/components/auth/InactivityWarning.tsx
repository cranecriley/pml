import React, { useState, useEffect } from 'react'
import { LoadingButton } from '../ui/LoadingButton'

interface InactivityWarningProps {
  isVisible: boolean
  timeRemaining: number
  onExtendSession: () => void
  onLogout: () => void
  onDismiss?: () => void
}

export const InactivityWarning: React.FC<InactivityWarningProps> = ({
  isVisible,
  timeRemaining,
  onExtendSession,
  onLogout,
  onDismiss
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [displayTime, setDisplayTime] = useState(timeRemaining)

  // Update display time every second
  useEffect(() => {
    if (!isVisible) return

    setDisplayTime(timeRemaining)
    
    const interval = setInterval(() => {
      setDisplayTime(prev => Math.max(0, prev - 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible, timeRemaining])

  const handleExtendSession = () => {
    onExtendSession()
    if (onDismiss) {
      onDismiss()
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Session Expiring Soon</h3>
              <p className="text-sm text-gray-600">You'll be automatically logged out due to inactivity</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {formatTime(displayTime)}
            </div>
            <p className="text-gray-600">
              Time remaining before automatic logout
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Why am I seeing this?</p>
                <p>For security reasons, you'll be automatically logged out after 24 hours of inactivity. Any activity will reset the timer.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleExtendSession}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
            >
              Continue Session
            </button>
            
            <LoadingButton
              onClick={handleLogout}
              isLoading={isLoggingOut}
              variant="secondary"
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout Now'}
            </LoadingButton>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Session timeout: 24 hours of inactivity</span>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Simpler version for notifications/toasts
export const InactivityNotification: React.FC<{
  timeRemaining: number
  onExtend: () => void
  onDismiss: () => void
}> = ({ timeRemaining, onExtend, onDismiss }) => {
  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60))
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-amber-200 p-4 max-w-sm z-40">
      <div className="flex items-start">
        <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Session expiring soon</h4>
          <p className="text-xs text-gray-600 mb-3">
            You'll be logged out in {formatTime(timeRemaining)} due to inactivity.
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={onExtend}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              Stay logged in
            </button>
            <button
              onClick={onDismiss}
              className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}