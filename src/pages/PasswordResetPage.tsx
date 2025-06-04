import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PasswordResetForm } from '../components/auth/PasswordResetForm'
import { AuthLayout } from '../components/auth/AuthLayout'
import { useAuth } from '../hooks/useAuth'

export const PasswordResetPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  const handleResetSuccess = () => {
    // The PasswordResetForm handles its own success state
    // This is just for any additional success handling if needed
    console.log('Password reset email sent successfully')
  }

  const handleCancel = () => {
    navigate('/login')
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

  // Don't render if user is already authenticated
  if (user) {
    return null
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email address and we'll send you a reset link"
    >
      <div className="space-y-6">
        <PasswordResetForm
          onSuccess={handleResetSuccess}
          onCancel={handleCancel}
        />

        {/* Navigation Links */}
        <div className="space-y-4 text-center">
          <div className="text-sm">
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-500 transition-colors font-medium"
            >
              ← Back to Sign In
            </Link>
          </div>
          
          <div className="text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Create one here
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}