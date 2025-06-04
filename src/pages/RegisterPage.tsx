import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { RegisterForm } from '../components/auth/RegisterForm'
import { AuthLayout } from '../components/auth/AuthLayout'
import { useAuth } from '../hooks/useAuth'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, register } = useAuth()
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/dashboard'

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from])

  const handleRegister = async (email: string, password: string) => {
    try {
      await register.execute({ email, password, confirmPassword: password })
      setRegistrationSuccess(true)
    } catch (error: any) {
      // Check if this is the email verification required case
      if (error.message === 'VERIFICATION_REQUIRED') {
        setRegistrationSuccess(true)
      }
      // Other errors will be handled by the form component
    }
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

  // Don't render register form if user is already authenticated
  if (user) {
    return null
  }

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <AuthLayout
        title="Registration Successful!"
        subtitle="Please check your email to verify your account"
      >
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-green-700">
                <h3 className="font-medium mb-1">Account Created Successfully</h3>
                <p>We've sent a verification email to your inbox. Please click the link in the email to activate your account and complete the registration process.</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="text-sm text-blue-700">
              <h4 className="font-medium mb-2">Next Steps:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>Return here to sign in with your new account</li>
              </ol>
            </div>
          </div>

          <div className="text-center space-y-4">
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Sign In
            </Link>
            
            <div className="text-sm">
              <button
                onClick={() => setRegistrationSuccess(false)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back to Registration
              </button>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join us to start your language learning journey"
    >
      <div className="space-y-6">
        <RegisterForm
          onSubmit={handleRegister}
          isLoading={register.loading}
          error={register.error || undefined}
        />

        {/* Navigation Links */}
        <div className="space-y-4 text-center">
          {/* Login Link */}
          <div className="text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in here
            </Link>
          </div>
        </div>

        {/* Requirements Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Account Requirements:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Valid email address (you'll need to verify it)</li>
            <li>• Password with at least 8 characters</li>
            <li>• You must be 18 years or older</li>
          </ul>
        </div>

        {/* Demo Info (for development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
            <p className="text-xs text-gray-600 font-medium mb-1">Development Mode</p>
            <p className="text-xs text-gray-500">
              Use any valid email format and a password with at least 8 characters.
              Check the browser console for email verification links.
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  )
} 