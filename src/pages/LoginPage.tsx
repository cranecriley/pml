import React, { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LoginForm } from '../components/auth/LoginForm'
import { AuthLayout } from '../components/auth/AuthLayout'
import { useAuth } from '../hooks/useAuth'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, login, postLoginRouting, getPostLoginPath } = useAuth()

  // Get the intended destination from location state or use post-login routing
  const getDestination = () => {
    // If there's a specific page they were trying to access, use that
    if (location.state?.from?.pathname) {
      return location.state.from.pathname
    }
    // Otherwise use the post-login routing logic
    return getPostLoginPath()
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      const destination = getDestination()
      navigate(destination, { replace: true })
    }
  }, [user, loading, navigate, postLoginRouting])

  const handleLogin = async (email: string, password: string) => {
    await login.execute({ email, password })
    // Navigation will be handled by the useEffect above when user state updates
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <AuthLayout
        title="Loading..."
        subtitle="Please wait while we check your authentication status"
      >
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthLayout>
    )
  }

  // Don't render login form if user is already authenticated
  if (user) {
    return null
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <div className="space-y-6">
        <LoginForm
          onSubmit={handleLogin}
          isLoading={login.loading}
          error={login.error || undefined}
        />

        {/* Navigation Links */}
        <div className="space-y-4 text-center">
          {/* Register Link */}
          <div className="text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link
              to="/register"
              state={{ from: location.state?.from }}
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Create one here
            </Link>
          </div>

          {/* Password Reset Link */}
          <div className="text-sm">
            <Link
              to="/reset-password"
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Redirect Info */}
        {location.state?.from && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-center">
            <p className="text-sm text-blue-700">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              You'll be redirected to your requested page after signing in.
            </p>
          </div>
        )}

        {/* Post-login routing info */}
        {!location.state?.from && postLoginRouting && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center">
            <p className="text-sm text-green-700">
              {postLoginRouting.isNewUser ? (
                <>
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New to our platform? You'll be guided through the welcome process.
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Welcome back! You'll be taken to your dashboard.
                </>
              )}
            </p>
          </div>
        )}

        {/* Demo Info (for development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
            <p className="text-xs text-gray-600 font-medium mb-1">Development Mode</p>
            <p className="text-xs text-gray-500">
              Use any valid email format and a password with at least 8 characters.
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  )
} 