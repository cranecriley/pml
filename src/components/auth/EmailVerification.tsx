import React, { useEffect, useState } from 'react'
import { authService } from '../../services/authService'
import { ErrorMessage, LoadingSpinner } from '../ui'

interface EmailConfirmationProps {
  onConfirmationSuccess: () => void
  onConfirmationError: (error: string) => void
}

export const EmailConfirmation: React.FC<EmailConfirmationProps> = ({
  onConfirmationSuccess,
  onConfirmationError
}) => {
  const [isConfirming, setIsConfirming] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        await authService.confirmEmail()
        onConfirmationSuccess()
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to confirm email'
        setError(errorMessage)
        onConfirmationError(errorMessage)
      } finally {
        setIsConfirming(false)
      }
    }

    confirmEmail()
  }, [onConfirmationSuccess, onConfirmationError])

  if (isConfirming) {
    return (
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" color="blue" className="mx-auto" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">Confirming your email...</h3>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Email confirmation failed</h3>
          <p className="mt-2 text-sm text-gray-600">
            There was a problem confirming your email address.
          </p>
        </div>
        <ErrorMessage message={error} />
        <div className="space-y-2">
          <button
            onClick={() => window.location.href = '/register'}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            Try registering again
          </button>
          <p className="text-xs text-gray-500">
            Or contact support if the problem persists.
          </p>
        </div>
      </div>
    )
  }

  // Success state - this will typically not be shown as user will be redirected
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Email confirmed successfully!</h3>
        <p className="mt-2 text-sm text-gray-600">
          Your account has been verified. Redirecting you now...
        </p>
      </div>
    </div>
  )
} 