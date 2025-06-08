// Mock all the services and hooks
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
    }
  }
}))

jest.mock('../../services/loginService', () => ({
  loginService: {
    loginWithRateLimit: jest.fn(),
    logout: jest.fn(),
    checkCurrentLoginStatus: jest.fn(),
  }
}))

jest.mock('../../services/authService', () => ({
  authService: {
    registerWithEmailVerification: jest.fn(),
    updatePassword: jest.fn(),
  }
}))

jest.mock('../../services/passwordResetService', () => ({
  passwordResetService: {
    requestPasswordResetWithRateLimit: jest.fn(),
  }
}))

jest.mock('../../services/passwordResetConfirmService', () => ({
  passwordResetConfirmService: {
    updatePasswordWithToken: jest.fn(),
    handleResetSuccess: jest.fn(),
  }
}))

jest.mock('../../services/sessionService', () => ({
  sessionService: {
    restoreSession: jest.fn(),
    startSessionMonitoring: jest.fn(),
    stopSessionMonitoring: jest.fn(),
    forceRefresh: jest.fn(),
    handleVisibilityChange: jest.fn(),
    getSessionInfo: jest.fn(),
  }
}))

jest.mock('../../services/inactivityService', () => ({
  inactivityService: {
    start: jest.fn(),
    stop: jest.fn(),
    extendSession: jest.fn(),
    getStatus: jest.fn(),
  }
}))

jest.mock('../../services/userProfileService', () => ({
  userProfileService: {
    checkUserStatus: jest.fn(),
    completeOnboarding: jest.fn(),
  }
}))

import React from 'react'
import { render, screen, act, waitFor, renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

// Get the mocked modules
const mockSupabase = jest.requireMock('../../lib/supabase').supabase
const mockLoginService = jest.requireMock('../../services/loginService').loginService
const mockAuthService = jest.requireMock('../../services/authService').authService
const mockPasswordResetService = jest.requireMock('../../services/passwordResetService').passwordResetService
const mockPasswordResetConfirmService = jest.requireMock('../../services/passwordResetConfirmService').passwordResetConfirmService
const mockSessionService = jest.requireMock('../../services/sessionService').sessionService
const mockInactivityService = jest.requireMock('../../services/inactivityService').inactivityService
const mockUserProfileService = jest.requireMock('../../services/userProfileService').userProfileService

// Test component to access AuthContext
const TestComponent: React.FC = () => {
  const auth = useAuth()
  
  return (
    <div>
      <div data-testid="user-email">{auth.user?.email || 'No user'}</div>
      <div data-testid="session-token">{auth.session?.access_token || 'No session'}</div>
      <div data-testid="loading">{auth.loading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="post-login-path">{auth.getPostLoginPath()}</div>
      <div data-testid="inactivity-warning">
        {auth.inactivityWarning.isVisible ? `Warning: ${auth.inactivityWarning.timeRemaining}s` : 'No warning'}
      </div>
      <button onClick={() => auth.signIn('test@example.com', 'password123')}>Sign In</button>
      <button onClick={() => auth.signOut()}>Sign Out</button>
      <button onClick={() => auth.signUp('test@example.com', 'password123')}>Sign Up</button>
      <button onClick={() => auth.resetPassword('test@example.com')}>Reset Password</button>
      <button onClick={() => auth.updatePassword('newPassword123')}>Update Password</button>
      <button onClick={() => auth.refreshSession()}>Refresh Session</button>
      <button onClick={() => auth.extendSession()}>Extend Session</button>
      <button onClick={() => auth.dismissInactivityWarning()}>Dismiss Warning</button>
      <button onClick={() => auth.completeOnboarding()}>Complete Onboarding</button>
    </div>
  )
}

describe('AuthContext State Management Integration Tests', () => {
  const validUser = {
    id: 'user_123',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const validSession = {
    access_token: 'access_token_123',
    refresh_token: 'refresh_token_123',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: validUser
  }

  const mockPostLoginRouting = {
    shouldGoToWelcome: false,
    shouldGoToDashboard: true,
    redirectPath: '/dashboard',
    isNewUser: false,
    isReturningUser: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
    
    mockSessionService.restoreSession.mockResolvedValue({
      user: null,
      session: null,
      isValid: false
    })
    
    mockSessionService.handleVisibilityChange.mockReturnValue(jest.fn())
    mockUserProfileService.checkUserStatus.mockResolvedValue(mockPostLoginRouting)
    mockInactivityService.getStatus.mockReturnValue({ isActive: true, timeRemaining: 300 })
    mockSessionService.getSessionInfo.mockReturnValue({ isValid: false })
  })

  describe('Initial State and Session Restoration', () => {
    it('should initialize with loading state and restore session', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initially should be loading
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')

      // Wait for session restoration
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('session-token')).toHaveTextContent('access_token_123')
      expect(mockSessionService.restoreSession).toHaveBeenCalled()
      expect(mockUserProfileService.checkUserStatus).toHaveBeenCalledWith(validUser)
      expect(mockInactivityService.start).toHaveBeenCalled()
    })

    it('should handle failed session restoration', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: null,
        session: null,
        isValid: false,
        error: 'Session expired'
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      expect(screen.getByTestId('session-token')).toHaveTextContent('No session')
      expect(mockSessionService.restoreSession).toHaveBeenCalled()
      expect(mockUserProfileService.checkUserStatus).not.toHaveBeenCalled()
      expect(mockInactivityService.start).not.toHaveBeenCalled()
    })

    it('should handle session restoration error gracefully', async () => {
      mockSessionService.restoreSession.mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      expect(screen.getByTestId('session-token')).toHaveTextContent('No session')
    })

    it('should set default post-login routing on error', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      mockUserProfileService.checkUserStatus.mockRejectedValue(new Error('Profile service error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      expect(screen.getByTestId('post-login-path')).toHaveTextContent('/dashboard')
    })
  })

  describe('Auth State Changes via Supabase Events', () => {
    let authStateChangeCallback: (event: string, session: any) => void

    beforeEach(() => {
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: (event: string, session: any) => void) => {
        authStateChangeCallback = callback
        return {
          data: { subscription: { unsubscribe: jest.fn() } }
        }
      })
    })

    it('should handle SIGNED_IN event and update state', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      // Simulate SIGNED_IN event
      await act(async () => {
        await authStateChangeCallback('SIGNED_IN', validSession)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      expect(screen.getByTestId('session-token')).toHaveTextContent('access_token_123')
      expect(mockUserProfileService.checkUserStatus).toHaveBeenCalledWith(validUser)
      expect(mockInactivityService.start).toHaveBeenCalled()
    })

    it('should handle TOKEN_REFRESHED event', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      const refreshedSession = {
        ...validSession,
        access_token: 'new_access_token_456'
      }

      // Simulate TOKEN_REFRESHED event
      await act(async () => {
        await authStateChangeCallback('TOKEN_REFRESHED', refreshedSession)
      })

      await waitFor(() => {
        expect(screen.getByTestId('session-token')).toHaveTextContent('new_access_token_456')
      })

      expect(mockInactivityService.start).toHaveBeenCalled()
    })

    it('should handle SIGNED_OUT event and clear state', async () => {
      // Start with authenticated state
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      // Simulate SIGNED_OUT event
      await act(async () => {
        await authStateChangeCallback('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      })

      expect(screen.getByTestId('session-token')).toHaveTextContent('No session')
      expect(mockSessionService.stopSessionMonitoring).toHaveBeenCalled()
      expect(mockInactivityService.stop).toHaveBeenCalled()
    })
  })

  describe('Authentication Methods', () => {
    it('should handle successful sign up', async () => {
      mockAuthService.registerWithEmailVerification.mockResolvedValue({
        needsEmailVerification: false,
        user: validUser
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      await act(async () => {
        screen.getByText('Sign Up').click()
      })

      expect(mockAuthService.registerWithEmailVerification).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      })
    })

    it('should handle sign up requiring email verification', async () => {
      mockAuthService.registerWithEmailVerification.mockResolvedValue({
        needsEmailVerification: true,
        user: validUser
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should throw VERIFICATION_REQUIRED error
      await expect(result.current.signUp('test@example.com', 'password123'))
        .rejects.toThrow('VERIFICATION_REQUIRED')
    })

    it('should handle sign in', async () => {
      // Clear the needsEmailVerification mock to prevent interference
      mockAuthService.registerWithEmailVerification.mockResolvedValue({
        needsEmailVerification: false,
        user: validUser
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      await act(async () => {
        screen.getByText('Sign In').click()
      })

      expect(mockLoginService.loginWithRateLimit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should handle sign out with cleanup', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      await act(async () => {
        screen.getByText('Sign Out').click()
      })

      expect(mockSessionService.stopSessionMonitoring).toHaveBeenCalled()
      expect(mockInactivityService.stop).toHaveBeenCalled()
      expect(mockLoginService.logout).toHaveBeenCalled()
    })

    it('should handle password reset request', async () => {
      mockPasswordResetService.requestPasswordResetWithRateLimit.mockResolvedValue({
        success: true,
        message: 'Password reset email sent'
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      await act(async () => {
        screen.getByText('Reset Password').click()
      })

      expect(mockPasswordResetService.requestPasswordResetWithRateLimit).toHaveBeenCalledWith({
        email: 'test@example.com'
      })
    })

    it('should handle password update', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      await act(async () => {
        screen.getByText('Update Password').click()
      })

      expect(mockAuthService.updatePassword).toHaveBeenCalledWith('newPassword123')
    })

    it('should handle password reset confirmation', async () => {
      mockPasswordResetConfirmService.updatePasswordWithToken.mockResolvedValue({
        success: true,
        message: 'Password updated successfully'
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      await act(async () => {
        const response = await result.current.confirmPasswordReset('newPassword123', 'newPassword123')
        expect(response.success).toBe(true)
      })

      expect(mockPasswordResetConfirmService.updatePasswordWithToken).toHaveBeenCalledWith({
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      })
      expect(mockPasswordResetConfirmService.handleResetSuccess).toHaveBeenCalled()
    })
  })

  describe('Session Management', () => {
    it('should start session monitoring for authenticated users', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      expect(mockSessionService.startSessionMonitoring).toHaveBeenCalled()
    })

    it('should handle session expiration', async () => {
      let onSessionExpired: () => void

      mockSessionService.startSessionMonitoring.mockImplementation((expiredCallback: () => void) => {
        onSessionExpired = expiredCallback
      })

      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      // Simulate session expiration
      act(() => {
        onSessionExpired()
      })

      expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      expect(screen.getByTestId('session-token')).toHaveTextContent('No session')
      expect(mockInactivityService.stop).toHaveBeenCalled()
    })

    it('should handle session refresh', async () => {
      let onSessionRefreshed: (session: any) => void

      mockSessionService.startSessionMonitoring.mockImplementation((_expiredCallback: () => void, refreshedCallback: (session: any) => void) => {
        onSessionRefreshed = refreshedCallback
      })

      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('session-token')).toHaveTextContent('access_token_123')
      })

      const refreshedSession = {
        ...validSession,
        access_token: 'refreshed_token_789'
      }

      // Simulate session refresh
      act(() => {
        onSessionRefreshed(refreshedSession)
      })

      expect(screen.getByTestId('session-token')).toHaveTextContent('refreshed_token_789')
    })

    it('should handle manual session refresh', async () => {
      mockSessionService.forceRefresh.mockResolvedValue({
        user: validUser,
        session: {
          ...validSession,
          access_token: 'manually_refreshed_token'
        },
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      await act(async () => {
        screen.getByText('Refresh Session').click()
      })

      expect(mockSessionService.forceRefresh).toHaveBeenCalled()
    })

    it('should handle browser visibility changes', async () => {
      let visibilityCallback: () => void

      mockSessionService.handleVisibilityChange.mockImplementation((callback: () => void) => {
        visibilityCallback = callback
        return jest.fn()
      })

      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      // Clear the call count since initialization happened
      jest.clearAllMocks()
      mockSessionService.restoreSession.mockClear()

      // Simulate visibility change with invalid session
      mockSessionService.restoreSession.mockResolvedValueOnce({
        user: null,
        session: null,
        isValid: false
      })

      await act(async () => {
        await visibilityCallback()
      })

      expect(mockSessionService.restoreSession).toHaveBeenCalledTimes(1)
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      })
    })
  })

  describe('Inactivity Management', () => {
    it('should start inactivity monitoring for authenticated users', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      expect(mockInactivityService.start).toHaveBeenCalled()
    })

    it('should handle inactivity warning', async () => {
      let onWarning: (timeRemaining: number) => void

      mockInactivityService.start.mockImplementation((config: { onWarning: (timeRemaining: number) => void }) => {
        onWarning = config.onWarning
      })

      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      // Simulate inactivity warning
      act(() => {
        onWarning(60)
      })

      expect(screen.getByTestId('inactivity-warning')).toHaveTextContent('Warning: 60s')
    })

    it('should handle inactivity timeout and auto-logout', async () => {
      let onTimeout: () => void

      mockInactivityService.start.mockImplementation((config: { onTimeout: () => void }) => {
        onTimeout = config.onTimeout
      })

      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      // Simulate inactivity timeout
      await act(async () => {
        onTimeout()
      })

      expect(mockSessionService.stopSessionMonitoring).toHaveBeenCalled()
      expect(mockInactivityService.stop).toHaveBeenCalled()
      expect(mockLoginService.logout).toHaveBeenCalled()
    })

    it('should dismiss inactivity warning on user activity', async () => {
      let onActivity: () => void

      mockInactivityService.start.mockImplementation((config: { onActivity: () => void, onWarning: (timeRemaining: number) => void }) => {
        onActivity = config.onActivity
      })

      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      // First show warning
      act(() => {
        // Simulate warning
        mockInactivityService.start.mock.calls[0][0].onWarning(30)
      })

      expect(screen.getByTestId('inactivity-warning')).toHaveTextContent('Warning: 30s')

      // Then simulate user activity
      act(() => {
        onActivity()
      })

      expect(screen.getByTestId('inactivity-warning')).toHaveTextContent('No warning')
    })

    it('should extend session manually', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      await act(async () => {
        screen.getByText('Extend Session').click()
      })

      expect(mockInactivityService.extendSession).toHaveBeenCalled()
    })

    it('should dismiss inactivity warning manually', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      await act(async () => {
        screen.getByText('Dismiss Warning').click()
      })

      expect(screen.getByTestId('inactivity-warning')).toHaveTextContent('No warning')
    })
  })

  describe('User Onboarding and Routing', () => {
    it('should complete onboarding and update routing', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      })

      await act(async () => {
        screen.getByText('Complete Onboarding').click()
      })

      expect(mockUserProfileService.completeOnboarding).toHaveBeenCalledWith('user_123')
    })

    it('should handle onboarding completion error', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      mockUserProfileService.completeOnboarding.mockRejectedValue(new Error('Onboarding failed'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      await waitFor(() => {
        expect(result.current.user).toBeTruthy()
      })

      await expect(result.current.completeOnboarding()).rejects.toThrow('Onboarding failed')
    })

    it('should handle onboarding without authenticated user', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.completeOnboarding()).rejects.toThrow('No user logged in')
    })

    it('should return correct post-login path', async () => {
      mockSessionService.restoreSession.mockResolvedValue({
        user: validUser,
        session: validSession,
        isValid: true
      })

      const customRouting = {
        shouldGoToWelcome: true,
        shouldGoToDashboard: false,
        redirectPath: '/welcome',
        isNewUser: true,
        isReturningUser: false
      }

      mockUserProfileService.checkUserStatus.mockResolvedValue(customRouting)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-login-path')).toHaveTextContent('/welcome')
      })
    })

    it('should return default path when no routing set', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('post-login-path')).toHaveTextContent('/dashboard')
      })
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should cleanup all subscriptions and services on unmount', async () => {
      const unsubscribeMock = jest.fn()
      const visibilityCleanupMock = jest.fn()

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } }
      })

      mockSessionService.handleVisibilityChange.mockReturnValue(visibilityCleanupMock)

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      unmount()

      expect(unsubscribeMock).toHaveBeenCalled()
      expect(mockSessionService.stopSessionMonitoring).toHaveBeenCalled()
      expect(mockInactivityService.stop).toHaveBeenCalled()
      expect(visibilityCleanupMock).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication method errors gracefully', async () => {
      mockLoginService.loginWithRateLimit.mockRejectedValue(new Error('Login failed'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.signIn('test@example.com', 'password123'))
        .rejects.toThrow('Login failed')
    })

    it('should handle session refresh errors', async () => {
      mockSessionService.forceRefresh.mockResolvedValue({
        user: null,
        session: null,
        isValid: false,
        error: 'Refresh failed'
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.refreshSession()).rejects.toThrow('Refresh failed')
    })
  })
})

// Test hook usage outside provider
describe('useAuth Hook Error Handling', () => {
  it('should throw error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })
}) 