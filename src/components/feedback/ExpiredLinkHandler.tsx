import React, { useState, useEffect } from 'react'

export interface ExpiredLinkInfo {
  type: 'password_reset' | 'email_verification' | 'magic_link' | 'unknown'
  userEmail?: string
  linkToken?: string
  expiryTime?: Date
  originalAction?: string
}

interface ExpiredLinkHandlerProps {
  linkInfo: ExpiredLinkInfo
  onRetry?: (type: string, email?: string) => void
  onCancel?: () => void
  className?: string
  variant?: 'page' | 'modal' | 'card'
}

export const ExpiredLinkHandler: React.FC<ExpiredLinkHandlerProps> = ({
  linkInfo,
  onRetry,
  onCancel,
  className = '',
  variant = 'page'
}) => {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retrySuccess, setRetrySuccess] = useState(false)
  const [retryError, setRetryError] = useState('')

  const handleRetry = async () => {
    if (!onRetry) return

    setIsRetrying(true)
    setRetryError('')

    try {
      await onRetry(linkInfo.type, linkInfo.userEmail)
      setRetrySuccess(true)
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setRetrySuccess(false)
      }, 3000)
    } catch (error: any) {
      setRetryError(error.message || 'Failed to resend. Please try again.')
    } finally {
      setIsRetrying(false)
    }
  }

  const getTypeInfo = () => {
    switch (linkInfo.type) {
      case 'password_reset':
        return {
          title: 'Password Reset Link Expired',
          description: 'This password reset link has expired for security reasons.',
          icon: (
            <svg className="h-12 w-12 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
          retryLabel: 'Request New Reset Link',
          retryDescription: 'We\'ll send a fresh password reset link to your email',
          helpText: 'Password reset links expire after 1 hour to keep your account secure.',
          tips: [
            'Check your email for more recent reset links',
            'Make sure to complete the reset within 1 hour',
            'Contact support if you continue having issues'
          ]
        }
      case 'email_verification':
        return {
          title: 'Email Verification Link Expired',
          description: 'This email verification link is no longer valid.',
          icon: (
            <svg className="h-12 w-12 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          retryLabel: 'Resend Verification Email',
          retryDescription: 'We\'ll send a new verification link to your email address',
          helpText: 'Email verification links expire after 24 hours for security.',
          tips: [
            'Check your spam folder for the new email',
            'Verification emails may take a few minutes to arrive',
            'Make sure to verify your email as soon as possible'
          ]
        }
      case 'magic_link':
        return {
          title: 'Sign-in Link Expired',
          description: 'This magic sign-in link is no longer valid.',
          icon: (
            <svg className="h-12 w-12 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          ),
          retryLabel: 'Request New Sign-in Link',
          retryDescription: 'We\'ll send a fresh magic link to your email',
          helpText: 'Magic links expire after 15 minutes to keep your account secure.',
          tips: [
            'Sign-in links are single-use only',
            'Links expire quickly for security reasons',
            'You can always sign in with your password instead'
          ]
        }
      default:
        return {
          title: 'Link Expired',
          description: 'This authentication link is no longer valid.',
          icon: (
            <svg className="h-12 w-12 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          retryLabel: 'Request New Link',
          retryDescription: 'We\'ll send you a fresh link',
          helpText: 'Authentication links expire for security reasons.',
          tips: [
            'Check your email for more recent links',
            'Contact support if you need assistance'
          ]
        }
    }
  }

  const typeInfo = getTypeInfo()

  const renderContent = () => (
    <div className="text-center">
      {/* Icon */}
      <div className="mx-auto flex items-center justify-center">
        {typeInfo.icon}
      </div>

      {/* Title and Description */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900">
          {typeInfo.title}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {typeInfo.description}
        </p>
      </div>

      {/* User Email Display */}
      {linkInfo.userEmail && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Email:</span> {linkInfo.userEmail}
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 {typeInfo.helpText}
        </p>
      </div>

      {/* Tips */}
      {typeInfo.tips.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Helpful Tips:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {typeInfo.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {retrySuccess && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                New link sent successfully!
              </p>
              <p className="mt-1 text-sm text-green-700">
                Check your email for the new link. It may take a few minutes to arrive.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {retryError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                Failed to send new link
              </p>
              <p className="mt-1 text-sm text-red-700">
                {retryError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying || retrySuccess}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </>
            ) : retrySuccess ? (
              <>
                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Sent!
              </>
            ) : (
              typeInfo.retryLabel
            )}
          </button>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Sign In
          </button>
        )}
      </div>

      {/* Additional Help */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Need help? Contact our support team for assistance.
        </p>
      </div>
    </div>
  )

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        {renderContent()}
      </div>
    )
  }

  // Page variant (default)
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow rounded-lg p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

// Hook to detect expired links from URL parameters
export const useExpiredLinkDetection = () => {
  const [expiredLinkInfo, setExpiredLinkInfo] = useState<ExpiredLinkInfo | null>(null)

  useEffect(() => {
    const checkForExpiredLink = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')
      const type = urlParams.get('type')
      const email = urlParams.get('email')

      // Check for Supabase expired link errors
      if (error === 'access_denied' && errorDescription?.includes('expired')) {
        const linkType = type === 'recovery' ? 'password_reset' : 
                        type === 'signup' ? 'email_verification' :
                        type === 'magiclink' ? 'magic_link' : 'unknown'

        setExpiredLinkInfo({
          type: linkType as any,
          userEmail: email || undefined,
          originalAction: type || undefined
        })
      }

      // Check for other expired link indicators
      if (window.location.pathname.includes('expired') || 
          urlParams.get('status') === 'expired' ||
          errorDescription?.includes('token') && errorDescription?.includes('expired')) {
        
        setExpiredLinkInfo({
          type: 'unknown',
          userEmail: email || undefined
        })
      }
    }

    checkForExpiredLink()
  }, [])

  const clearExpiredLink = () => {
    setExpiredLinkInfo(null)
    // Clean up URL parameters
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')
    url.searchParams.delete('type')
    url.searchParams.delete('email')
    url.searchParams.delete('status')
    window.history.replaceState({}, '', url.toString())
  }

  return {
    expiredLinkInfo,
    clearExpiredLink,
    hasExpiredLink: expiredLinkInfo !== null
  }
}

// Preset components for specific scenarios
export const PasswordResetExpiredHandler: React.FC<{
  userEmail?: string
  onRetry?: (email: string) => void
  onCancel?: () => void
  variant?: 'page' | 'modal' | 'card'
}> = ({ userEmail, onRetry, onCancel, variant = 'page' }) => {
  const handleRetry = async (_type: string, email?: string) => {
    if (onRetry && email) {
      await onRetry(email)
    }
  }

  return (
    <ExpiredLinkHandler
      linkInfo={{ type: 'password_reset', userEmail }}
      onRetry={handleRetry}
      onCancel={onCancel}
      variant={variant}
    />
  )
}

export const EmailVerificationExpiredHandler: React.FC<{
  userEmail?: string
  onRetry?: (email: string) => void
  onCancel?: () => void
  variant?: 'page' | 'modal' | 'card'
}> = ({ userEmail, onRetry, onCancel, variant = 'page' }) => {
  const handleRetry = async (_type: string, email?: string) => {
    if (onRetry && email) {
      await onRetry(email)
    }
  }

  return (
    <ExpiredLinkHandler
      linkInfo={{ type: 'email_verification', userEmail }}
      onRetry={handleRetry}
      onCancel={onCancel}
      variant={variant}
    />
  )
}