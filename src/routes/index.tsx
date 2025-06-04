import React, { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { PasswordResetPage } from '../pages/PasswordResetPage'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { EmailConfirmation } from '../components/auth/EmailVerification'
import { PasswordResetConfirm } from '../components/auth/PasswordResetConfirm'
import { AuthLayout } from '../components/auth/AuthLayout'
import { LogoutButton, LogoutLink } from '../components/auth/LogoutButton'
import { useAuth } from '../hooks/useAuth'

// Wrapper component for email confirmation that handles callbacks
const EmailConfirmationPage: React.FC = () => {
  const navigate = useNavigate()

  const handleConfirmationSuccess = () => {
    console.log('Email confirmed successfully')
    // Redirect to login after successful confirmation
    setTimeout(() => {
      navigate('/login', { 
        replace: true,
        state: { message: 'Email confirmed! You can now sign in.' }
      })
    }, 2000)
  }

  const handleConfirmationError = (error: string) => {
    console.error('Email confirmation failed:', error)
    // Stay on the same page to show error
  }

  return (
    <AuthLayout
      title="Email Confirmation"
      subtitle="Confirming your email address"
    >
      <EmailConfirmation
        onConfirmationSuccess={handleConfirmationSuccess}
        onConfirmationError={handleConfirmationError}
      />
    </AuthLayout>
  )
}

// Enhanced Dashboard with logout functionality
const DashboardPage = () => {
  const { user } = useAuth()
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logout */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              {user?.email && (
                <p className="text-gray-600 mt-1">Welcome back, {user.email.split('@')[0]}!</p>
              )}
            </div>
            
            {/* User menu with logout */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>
                <LogoutButton
                  variant="secondary"
                  size="sm"
                  showConfirmation={true}
                />
              </div>
              
              {/* Mobile menu */}
              <div className="sm:hidden">
                <LogoutButton
                  variant="ghost"
                  size="sm"
                  showConfirmation={true}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </LogoutButton>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Language Learning Dashboard</h2>
              <p className="text-gray-600">Welcome to your personalized language learning experience!</p>
            </div>

            {/* Dashboard content */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Lessons Completed</p>
                    <p className="text-2xl font-bold text-blue-600">0</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">Current Streak</p>
                    <p className="text-2xl font-bold text-green-600">1 day</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-900">Study Time</p>
                    <p className="text-2xl font-bold text-purple-600">0 min</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to action */}
            <div className="mt-8 text-center">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium">
                Start Your First Lesson
              </button>
            </div>

            {/* Quick logout option in content */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Account Management
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Settings
                </button>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Profile
                </button>
                <LogoutLink className="text-sm text-gray-600 hover:text-gray-800 font-medium">
                  Sign Out
                </LogoutLink>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Enhanced Welcome Page with onboarding completion
const WelcomePage = () => {
  const navigate = useNavigate()
  const { user, completeOnboarding, postLoginRouting } = useAuth()
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCompleteOnboarding = async () => {
    if (!user) return

    setIsCompleting(true)
    setError(null)

    try {
      await completeOnboarding()
      
      // Show success message briefly, then redirect
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding')
    } finally {
      setIsCompleting(false)
    }
  }

  const handleSkipOnboarding = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header with logout option */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-gray-900">Welcome Setup</span>
            </div>
            
            <LogoutButton
              variant="ghost"
              size="sm"
              showConfirmation={true}
              className="text-gray-600 hover:text-gray-800"
            />
          </div>
        </div>
      </header>

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Welcome Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Your Language Learning Journey!</h1>
              <p className="text-lg text-gray-600 mb-4">
                {user?.email && `Hello ${user.email.split('@')[0]}`}, we're excited to have you here.
              </p>
              <p className="text-gray-600">
                Thank you for joining our language learning platform. Let's get you started on your path to fluency!
              </p>
            </div>

            {/* Features Overview */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Personalized Learning</h3>
                <p className="text-sm text-gray-600">Adaptive lessons that match your learning style and pace.</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Interactive Practice</h3>
                <p className="text-sm text-gray-600">Engaging exercises to build your speaking and comprehension skills.</p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Track Progress</h3>
                <p className="text-sm text-gray-600">Monitor your improvement with detailed analytics and achievements.</p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* User Status Info */}
            {postLoginRouting && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-700">
                  <strong>Account Status:</strong> {postLoginRouting.isNewUser ? 'New User - Welcome!' : 'Returning User'}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleCompleteOnboarding}
                disabled={isCompleting}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isCompleting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting up your account...
                  </div>
                ) : (
                  'Get Started - Complete Setup'
                )}
              </button>

              <button
                onClick={handleSkipOnboarding}
                disabled={isCompleting}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                Skip for Now - Go to Dashboard
              </button>
            </div>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-700 font-medium mb-1">Development Info:</p>
                <p className="text-xs text-yellow-600">
                  This welcome page demonstrates the new user onboarding flow. Completing setup will mark the user as no longer needing onboarding.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<PasswordResetPage />} />
      
      {/* Email verification routes */}
      <Route path="/auth/confirm" element={<EmailConfirmationPage />} />
      <Route path="/auth/reset-password" element={<PasswordResetConfirm />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      
      <Route path="/welcome" element={
        <ProtectedRoute>
          <WelcomePage />
        </ProtectedRoute>
      } />
      
      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch-all route */}
      <Route path="*" element={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
            <p className="text-gray-600 mb-4">Page not found</p>
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
              Go to Dashboard
            </a>
          </div>
        </div>
      } />
    </Routes>
  )
} 