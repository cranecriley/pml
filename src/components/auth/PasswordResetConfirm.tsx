import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingButton } from '../ui/LoadingButton'
import { passwordResetConfirmService } from '../../services/passwordResetConfirmService'

interface PasswordResetConfirmProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export const PasswordResetConfirm: React.FC<PasswordResetConfirmProps> = ({
  onSuccess,
  onError
}) => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [successResult, setSuccessResult] = useState<{ success: boolean; message: string; shouldRedirectToLogin?: boolean } | null>(null)
  
  const { confirmPasswordReset } = useAuth()

  // Check session validity on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionCheck = await passwordResetConfirmService.checkResetSession()
        setIsSessionValid(sessionCheck.isValid)
        if (!sessionCheck.isValid && sessionCheck.error) {
          setSessionError(sessionCheck.error)
          if (onError) {
            onError(sessionCheck.error)
          }
        }
      } catch (error) {
        setIsSessionValid(false)
        setSessionError('Unable to verify password reset session.')
      }
    }

    checkSession()
  }, [onError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const result = await confirmPasswordReset.execute(newPassword, confirmPassword)
      setSuccessResult(result)
      setIsCompleted(true)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      // Error is handled by the useAuth hook
      console.error('Password reset confirmation failed:', error)
    }
  }

  const handleRequestNewReset = () => {
    // Redirect to password reset request page
    window.location.href = '/reset-password'
  }

  const handleGoToLogin = () => {
    // Redirect to login page
    window.location.href = '/login'
  }

  // Session validation loading state
  if (isSessionValid === null) {
    return (
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Reset Link</h2>
          <p className="text-gray-600">Please wait while we verify your password reset link...</p>
        </div>
      </div>
    )
  }

  // Invalid session state
  if (!isSessionValid) {
    const guidance = passwordResetConfirmService.getErrorGuidance(sessionError || 'Session expired')
    
    return (
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Link Issue</h2>
          <p className="text-red-600 font-medium mb-4">{guidance.userMessage}</p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What to do next:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              {guidance.actions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleRequestNewReset}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Request New Password Reset
          </button>
          
          <button
            onClick={handleGoToLogin}
            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  // Success state
  if (isCompleted && successResult) {
    const securityTips = passwordResetConfirmService.getSecurityTips()
    
    return (
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated Successfully!</h2>
          <p className="text-green-600 font-medium mb-4">{successResult.message}</p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{securityTips.title}:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              {securityTips.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-amber-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-amber-700">{securityTips.warning}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleGoToLogin}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In with New Password
          </button>
        </div>
      </div>
    )
  }

  // Password reset form
  const requirements = passwordResetConfirmService.getPasswordRequirements()
  
  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h2>
        <p className="text-gray-600">
          Please choose a strong new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password"
              required
              disabled={confirmPasswordReset.loading}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              disabled={confirmPasswordReset.loading}
            >
              {showNewPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your new password"
              required
              disabled={confirmPasswordReset.loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              disabled={confirmPasswordReset.loading}
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {confirmPasswordReset.error && (
          <ErrorMessage message={confirmPasswordReset.error} />
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">{requirements.title}:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            {requirements.requirements.map((req, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1 h-1 bg-blue-400 rounded-full mr-2"></span>
                {req}
              </li>
            ))}
          </ul>
        </div>

        <LoadingButton
          type="submit"
          isLoading={confirmPasswordReset.loading}
          disabled={!newPassword.trim() || !confirmPassword.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Update Password
        </LoadingButton>
      </form>

      <div className="mt-6">
        <button
          onClick={handleRequestNewReset}
          className="w-full text-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Need a new reset link?
        </button>
      </div>
    </div>
  )
}