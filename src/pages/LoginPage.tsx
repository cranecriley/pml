import React, { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LoginForm } from '../components/auth/LoginForm'
import { AuthLayout } from '../components/auth/AuthLayout'
import { useAuth } from '../hooks/useAuth'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, login } = useAuth()

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/dashboard'

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from])

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