import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from './LoadingSpinner'

interface GlobalLoadingStateProps {
  children: React.ReactNode
  showFullScreen?: boolean
}

export const GlobalLoadingState: React.FC<GlobalLoadingStateProps> = ({ 
  children, 
  showFullScreen = false 
}) => {
  const { loading, login, register, logout, resetPassword, updatePassword, refreshSession } = useAuth()

  // Determine if any auth operation is currently loading
  const authOperationLoading = login.loading || register.loading || logout.loading || 
                               resetPassword.loading || updatePassword.loading || refreshSession.loading

  // Show full screen loading during initial auth check
  if (loading && showFullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" color="blue" className="mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading PolyglotML</h2>
          <p className="text-gray-600">Checking your authentication status...</p>
        </div>
      </div>
    )
  }

  // Show loading overlay for auth operations
  if (authOperationLoading) {
    return (
      <div className="relative">
        {children}
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center">
              <LoadingSpinner size="md" color="blue" className="mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {login.loading && 'Signing you in...'}
                  {register.loading && 'Creating your account...'}
                  {logout.loading && 'Signing you out...'}
                  {resetPassword.loading && 'Sending password reset email...'}
                  {updatePassword.loading && 'Updating your password...'}
                  {refreshSession.loading && 'Refreshing your session...'}
                </p>
                <p className="text-xs text-gray-600 mt-1">Please wait</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook for components to check loading states
export const useGlobalLoadingState = () => {
  const { loading, login, register, logout, resetPassword, updatePassword, refreshSession } = useAuth()

  return {
    isInitialLoading: loading,
    isAuthOperationLoading: login.loading || register.loading || logout.loading || 
                            resetPassword.loading || updatePassword.loading || refreshSession.loading,
    loadingStates: {
      login: login.loading,
      register: register.loading,
      logout: logout.loading,
      resetPassword: resetPassword.loading,
      updatePassword: updatePassword.loading,
      refreshSession: refreshSession.loading
    },
    isAnyLoading: loading || login.loading || register.loading || logout.loading || 
                  resetPassword.loading || updatePassword.loading || refreshSession.loading
  }
}

export default GlobalLoadingState 