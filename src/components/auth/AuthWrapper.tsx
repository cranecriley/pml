import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAuth as useAuthHook } from '../../hooks/useAuth'
import { InactivityWarning } from './InactivityWarning'
import { NetworkStatus } from '../feedback/NetworkStatus'

interface AuthWrapperProps {
  children: React.ReactNode
}

/**
 * AuthWrapper component that wraps the app and handles inactivity warnings
 * Should be placed inside the AuthProvider but outside of routing components
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { inactivityWarning, extendSession, dismissInactivityWarning } = useAuth()
  const { logout } = useAuthHook()

  const handleLogout = async () => {
    await logout.execute()
  }

  return (
    <>
      {/* Network Status - Shows at top when there are connection issues */}
      <NetworkStatus position="top" />
      
      {/* Main content */}
      {children}

      {/* Inactivity Warning Modal */}
      <InactivityWarning
        isVisible={inactivityWarning.isVisible}
        timeRemaining={inactivityWarning.timeRemaining}
        onExtendSession={extendSession}
        onLogout={handleLogout}
        onDismiss={dismissInactivityWarning}
      />
    </>
  )
} 