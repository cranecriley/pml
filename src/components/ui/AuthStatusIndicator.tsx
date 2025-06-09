import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useGlobalLoadingState } from './GlobalLoadingState'

interface AuthStatusIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  showInProduction?: boolean
}

export const AuthStatusIndicator: React.FC<AuthStatusIndicatorProps> = ({
  position = 'bottom-right',
  showInProduction = false
}) => {
  const { user, session, postLoginRouting, inactivityWarning } = useAuth()
  const { isAnyLoading, loadingStates } = useGlobalLoadingState()

  // Don't show in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const getStatusColor = () => {
    if (isAnyLoading) return 'bg-yellow-100 border-yellow-300 text-yellow-800'
    if (user) return 'bg-green-100 border-green-300 text-green-800'
    return 'bg-gray-100 border-gray-300 text-gray-800'
  }

  const getStatusIcon = () => {
    if (isAnyLoading) {
      return (
        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }
    if (user) {
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  }

  const getActiveOperations = () => {
    return Object.entries(loadingStates)
      .filter(([_, loading]) => loading)
      .map(([operation, _]) => operation)
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-40`}>
      <div className={`border rounded-lg p-2 shadow-lg ${getStatusColor()} backdrop-blur-sm`}>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <div className="text-xs">
            <div className="font-medium">
              {isAnyLoading ? 'Loading...' : user ? 'Authenticated' : 'Not Authenticated'}
            </div>
            {isAnyLoading && getActiveOperations().length > 0 && (
              <div className="text-xs opacity-75">
                {getActiveOperations().join(', ')}
              </div>
            )}
            {user && !isAnyLoading && (
              <div className="text-xs opacity-75">
                {user.email?.split('@')[0]}
              </div>
            )}
            {postLoginRouting && !isAnyLoading && (
              <div className="text-xs opacity-75">
                {postLoginRouting.isNewUser ? 'New' : 'Returning'}
              </div>
            )}
            {inactivityWarning.isVisible && (
              <div className="text-xs text-red-600 font-medium">
                ⚠️ {Math.ceil(inactivityWarning.timeRemaining / 60)}m
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthStatusIndicator 