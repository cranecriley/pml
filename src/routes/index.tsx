import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { PasswordResetPage } from '../pages/PasswordResetPage'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { EmailConfirmation } from '../components/auth/EmailVerification'
import { PasswordResetConfirm } from '../components/auth/PasswordResetConfirm'
import { AuthLayout } from '../components/auth/AuthLayout'

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

// Placeholder components for protected routes
const DashboardPage = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600">Welcome to your language learning dashboard!</p>
      </div>
    </div>
  </div>
)

const WelcomePage = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome!</h1>
        <p className="text-gray-600 mb-4">
          Thank you for joining our language learning platform. Let's get you started!
        </p>
        <p className="text-sm text-gray-500">
          This is where new users would be guided through the initial setup process.
        </p>
      </div>
    </div>
  </div>
)

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