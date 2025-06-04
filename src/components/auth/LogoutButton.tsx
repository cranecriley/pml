import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoadingButton } from '../ui/LoadingButton'

interface LogoutButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  showConfirmation?: boolean
  redirectTo?: string
  className?: string
  children?: React.ReactNode
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  showConfirmation = true,
  redirectTo = '/login',
  className = '',
  children
}) => {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleLogoutClick = () => {
    if (showConfirmation) {
      setShowConfirmDialog(true)
    } else {
      handleLogout()
    }
  }

  const handleLogout = async () => {
    try {
      await logout.execute()
      setShowConfirmDialog(false)
      
      // Navigate to login or specified route after logout
      navigate(redirectTo, { replace: true })
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if logout fails, we should probably still redirect
      // since the session might be in an invalid state
      navigate(redirectTo, { replace: true })
    }
  }

  const handleCancelLogout = () => {
    setShowConfirmDialog(false)
  }

  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors'
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }
    
    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500'
    }
    
    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`
  }

  return (
    <>
      <LoadingButton
        onClick={handleLogoutClick}
        isLoading={logout.loading}
        loadingText="Signing out..."
        className={getButtonStyles()}
        disabled={logout.loading}
      >
        {children || (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </>
        )}
      </LoadingButton>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Sign Out</h3>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                Are you sure you want to sign out? You'll need to sign in again to access your account.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-700">
                    <p>Your session will be completely cleared and you'll be redirected to the login page.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row gap-3 sm:gap-3 sm:justify-end">
              <button
                onClick={handleCancelLogout}
                disabled={logout.loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              
              <LoadingButton
                onClick={handleLogout}
                isLoading={logout.loading}
                loadingText="Signing out..."
                variant="danger"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                Sign Out
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Simple logout link variant
export const LogoutLink: React.FC<{
  className?: string
  children?: React.ReactNode
}> = ({ className = '', children }) => {
  return (
    <LogoutButton
      variant="ghost"
      size="sm"
      showConfirmation={false}
      className={`text-left ${className}`}
    >
      {children || 'Sign Out'}
    </LogoutButton>
  )
} 