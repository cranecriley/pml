import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { validateEmail, validatePassword } from '../../utils/validation'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingButton } from '../ui/LoadingButton'
import { LoginErrorDialog } from '../feedback/AuthErrorDialog'
import { LoginSuccessMessage } from '../feedback/SuccessMessage'

interface LoginFormProps {
  onSuccess?: () => void
  className?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, className = '' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [lastError, setLastError] = useState<any>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [isRateLimited, setIsRateLimited] = useState(false)

  const { login, user } = useAuth()

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    
    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError
    
    const passwordError = validatePassword(password)
    if (passwordError) errors.password = passwordError
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleError = (err: any) => {
    console.error('Login error:', err)
    
    setLastError(err)
    setAttemptCount(prev => prev + 1)
    
    // Show enhanced error dialog for specific error types
    const shouldShowDialog = (
      err.isRateLimited ||
      err.message?.includes('Invalid login credentials') ||
      err.message?.includes('Email not confirmed') ||
      err.message?.includes('User not found') ||
      err.message?.includes('Too many requests') ||
      err.message?.includes('network') ||
      err.message?.includes('server')
    )
    
    if (shouldShowDialog) {
      setShowErrorDialog(true)
    } else {
      // For simple errors, just show inline message
      setError(err.message || 'Login failed. Please try again.')
    }
  }

  const handleSuccess = () => {
    // Show success message first
    setShowSuccessMessage(true)
    
    // Reset attempt count on success
    setAttemptCount(0)
    
    // Auto redirect after showing success message
    setTimeout(() => {
      if (onSuccess) {
        onSuccess()
      }
    }, 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setValidationErrors({})
    setShowErrorDialog(false)
    setShowSuccessMessage(false)

    if (isRateLimited) {
      setError('Please wait before attempting to login again.')
      return
    }

    if (!validateForm()) {
      return
    }
    
    try {
      await login.execute({ email, password })
      
      // Handle success with message
      handleSuccess()
      
    } catch (err: any) {
      handleError(err)
    }
  }

  const handleSuccessMessageContinue = () => {
    setShowSuccessMessage(false)
    if (onSuccess) {
      onSuccess()
    }
  }

  // If showing success message, render it
  if (showSuccessMessage) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoginSuccessMessage
          userName={user?.email}
          onContinue={handleSuccessMessageContinue}
          variant="card"
          className="animate-in fade-in duration-500"
        />
      </div>
    )
  }

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 sm:py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm transition-colors duration-200 ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
              required
              disabled={login.loading}
            />
            {validationErrors.email && (
              <ErrorMessage message={validationErrors.email} variant="inline" />
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 sm:py-3 pr-10 sm:pr-12 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm transition-colors duration-200 ${
                  validationErrors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                required
                disabled={login.loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 touch-manipulation transition-colors duration-200"
                disabled={login.loading}
              >
                {showPassword ? (
                  <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {validationErrors.password && (
              <ErrorMessage message={validationErrors.password} variant="inline" />
            )}
          </div>

          <div>
            <LoadingButton
              type="submit"
              disabled={isRateLimited}
              variant="primary"
              size="md"
              className="w-full transition-all duration-200"
            >
              {isRateLimited ? 'Please Wait...' : 'Sign In'}
            </LoadingButton>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/auth/password-reset"
              className="text-sm text-blue-600 hover:text-blue-500 hover:underline transition-colors duration-200"
            >
              Forgot your password?
            </Link>
            <Link
              to="/auth/register"
              className="text-sm text-blue-600 hover:text-blue-500 hover:underline transition-colors duration-200"
            >
              Create an account
            </Link>
          </div>
        </form>
      </div>

      {/* Enhanced Error Dialog */}
      <LoginErrorDialog
        error={lastError}
        isVisible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        userEmail={email}
        attemptCount={attemptCount}
      />
    </>
  )
}