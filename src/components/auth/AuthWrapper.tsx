import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { InactivityWarning } from './InactivityWarning'

interface AuthWrapperProps {
  children: React.ReactNode
}

/**
 * AuthWrapper component that wraps the app and handles inactivity warnings
 * Should be placed inside the AuthProvider but outside of routing components
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { 
    user, 
    inactivityWarning, 
    extendSession, 
    dismissInactivityWarning,
    logout 
  } = useAuth()

  const handleExtendSession = () => {
    extendSession()
  }

  const handleLogout = async () => {
    await logout.execute()
  }

  const handleDismissWarning = () => {
    dismissInactivityWarning()
  }

  return (
    <>
      {children}
      
      {/* Show inactivity warning only for authenticated users */}
      {user && (
        <InactivityWarning
          isVisible={inactivityWarning.isVisible}
          timeRemaining={inactivityWarning.timeRemaining}
          onExtendSession={handleExtendSession}
          onLogout={handleLogout}
          onDismiss={handleDismissWarning}
        />
      )}
    </>
  )
} 