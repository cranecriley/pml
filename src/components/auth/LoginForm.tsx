import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { validateEmail, validatePassword } from '../../utils/validation'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingButton } from '../ui/LoadingButton'
import { RateLimitWarning } from '../feedback/RateLimitWarning'

interface LoginFormProps {
  onSuccess?: () => void
  className?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, className = '' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [isRateLimited, setIsRateLimited] = useState(false)

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    
    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError
    
    const passwordError = validatePassword(password)
    if (passwordError) errors.password = passwordError
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setValidationErrors({})

    if (isRateLimited) {
      setError('Please wait before attempting to login again.')
      return
    }

    if (!validateForm()) return
    
    try {
      await login(credentials)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
      if (err.isRateLimited) {
        setError(err.message)
        return
      }
      
      // Error handling is managed by parent component
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to your account to continue
        </p>
      </div>

      {email && (
        <RateLimitWarning 
          email={email}
          onRateLimitChange={setIsRateLimited}
          className="mb-4"
        />
      )}

      {error && <ErrorMessage message={error} />}

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
            className={`w-full px-3 py-2 sm:py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm ${
              validationErrors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your email"
            required
            disabled={isLoading}
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
              className={`w-full px-3 py-2 sm:py-3 pr-10 sm:pr-12 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm ${
                validationErrors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 touch-manipulation"
              disabled={isLoading}
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
            loading={isLoading}
            disabled={isRateLimited}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRateLimited ? 'Please Wait...' : 'Sign In'}
          </LoadingButton>
        </div>

        <div className="flex items-center justify-between">
          <Link
            to="/auth/password-reset"
            className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
          >
            Forgot your password?
          </Link>
          <Link
            to="/auth/register"
            className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
          >
            Create an account
          </Link>
        </div>
      </form>
    </div>
  )
}