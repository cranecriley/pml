import React, { useState } from 'react'
import { authService } from '../../services/authService'
import { ErrorMessage, LoadingButton } from '../ui'

interface EmailVerificationProps {
  email: string
  onVerificationComplete?: () => void
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  onVerificationComplete
}) => {
  const [isResending, setIsResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleResendVerification = async () => {
    setIsResending(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      await authService.resendEmailVerification(email)
      setResendSuccess(true)
    } catch (error: any) {
      setResendError(error.message || 'Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
        <p className="mt-2 text-sm text-gray-600">
          We've sent a verification link to <strong>{email}</strong>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Click the link in the email to verify your account and complete registration.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="text-sm text-blue-700">
          <p className="font-medium">What happens next?</p>
          <ul className="mt-2 space-y-1 text-left">
            <li>• Check your inbox (and spam folder)</li>
            <li>• Click the verification link in the email</li>
            <li>• You'll be redirected back to complete setup</li>
          </ul>
        </div>
      </div>

      {resendSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-600">
            ✓ Verification email sent successfully!
          </p>
        </div>
      )}

      {resendError && <ErrorMessage message={resendError} />}

      <div className="space-y-3">
        <LoadingButton
          onClick={handleResendVerification}
          isLoading={isResending}
          loadingText="Sending..."
          variant="secondary"
          size="md"
        >
          Resend verification email
        </LoadingButton>

        <p className="text-xs text-gray-500">
          Didn't receive the email? Check your spam folder or try resending.
        </p>
      </div>

      {onVerificationComplete && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onVerificationComplete}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Already verified? Continue
          </button>
        </div>
      )}
    </div>
  )
} 