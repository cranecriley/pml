import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingButton } from '../ui/LoadingButton'
import { passwordResetService } from '../../services/passwordResetService'

interface PasswordResetFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const result = await resetPassword.execute({ email })
      setResetResult(result)
      setIsSubmitted(true)
      
      if (result.success && onSuccess) {
        onSuccess()
      }
    } catch (error) {
      // Error is handled by the useAuth hook
      console.error('Password reset request failed:', error)
    }
  }

  const handleTryAgain = () => {
    setIsSubmitted(false)
    setResetResult(null)
    setEmail('')
  }

  if (isSubmitted && resetResult) {
    const instructions = passwordResetService.getPasswordResetInstructions(email)
    
    return (
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
          <p className="text-green-600 font-medium mb-4">{resetResult.message}</p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              {instructions.nextSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Troubleshooting:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              {instructions.troubleshooting.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-700">{instructions.securityNote}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleTryAgain}
            className="w-full px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
          >
            Send Another Reset Email
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h2>
        <p className="text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email address"
            required
            disabled={resetPassword.loading}
          />
        </div>

        {resetPassword.error && (
          <ErrorMessage message={resetPassword.error} />
        )}

        <LoadingButton
          type="submit"
          isLoading={resetPassword.loading}
          disabled={!email.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send Reset Instructions
        </LoadingButton>
      </form>

      {onCancel && (
        <div className="mt-6">
          <button
            onClick={onCancel}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  )
}