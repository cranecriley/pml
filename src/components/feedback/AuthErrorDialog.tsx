import React, { useState } from 'react'
import { authErrorHandlingService, type ErrorContext } from '../../services/authErrorHandlingService'

interface AuthErrorDialogProps {
  error: any
  isVisible: boolean
  onClose: () => void
  onAction?: (action: string) => void
  context?: ErrorContext
  variant?: 'dialog' | 'inline' | 'banner'
  className?: string
}

export const AuthErrorDialog: React.FC<AuthErrorDialogProps> = ({
  error,
  isVisible,
  onClose,
  onAction,
  context,
  variant = 'dialog',
  className = ''
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  if (!isVisible || !error) return null

  // Process the error using our enhanced error handling service
  const errorInfo = authErrorHandlingService.processAuthError(error, context)
  const formattedError = authErrorHandlingService.formatErrorForUser(errorInfo, context)
  
  // Log the error for analytics
  authErrorHandlingService.logError(errorInfo, context)

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action)
    }
    
    // Handle common actions automatically
    switch (action) {
      case 'retry':
        onClose()
        break
      case 'reset_password':
        // This would typically navigate to password reset
        window.location.href = '/auth/password-reset'
        break
      case 'sign_up':
        window.location.href = '/auth/register'
        break
      case 'sign_in':
        window.location.href = '/auth/login'
        break
      case 'check_email':
        // This could open email client or show instructions
        break
      case 'check_network':
        // This could run network diagnostics
        window.location.reload()
        break
      default:
        onClose()
    }
  }

  const getSeverityIcon = () => {
    switch (errorInfo.severity) {
      case 'critical':
      case 'high':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      case 'medium':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  const getCategoryColor = () => {
    switch (errorInfo.category) {
      case 'authentication':
        return 'border-yellow-200 bg-yellow-50'
      case 'network':
        return 'border-blue-200 bg-blue-50'
      case 'rate_limit':
        return 'border-orange-200 bg-orange-50'
      case 'validation':
        return 'border-purple-200 bg-purple-50'
      case 'server':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  if (variant === 'inline') {
    return (
      <div className={`border rounded-lg p-4 ${getCategoryColor()} ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">
              {formattedError.title}
            </h3>
            <div className="mt-2 text-sm text-gray-700">
              <p>{formattedError.message}</p>
            </div>
            {formattedError.actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {formattedError.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action.action)}
                    className={`text-sm px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      action.priority === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={`border-l-4 p-4 ${getCategoryColor()} ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              {formattedError.title}
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              {formattedError.message}
            </p>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onClose}
                className="inline-flex bg-yellow-50 rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Dialog variant (default)
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            {getSeverityIcon()}
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {formattedError.title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {formattedError.message}
                </p>
              </div>

              {/* Help Text */}
              {formattedError.helpText && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    💡 {formattedError.helpText}
                  </p>
                </div>
              )}

              {/* Tips */}
              {formattedError.tips && formattedError.tips.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Helpful Tips:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {formattedError.tips.map((tip, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact Support */}
              {errorInfo.contactSupport && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    If this problem continues, please contact our support team with the error details below.
                  </p>
                </div>
              )}

              {/* Technical Details (Collapsible) */}
              {errorInfo.technicalMessage && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {showTechnicalDetails ? 'Hide' : 'Show'} technical details
                  </button>
                  {showTechnicalDetails && (
                    <div className="mt-2 p-3 bg-gray-100 rounded-md">
                      <p className="text-xs font-mono text-gray-600 break-all">
                        {errorInfo.technicalMessage}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Error Category: {errorInfo.category} | Severity: {errorInfo.severity}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            {formattedError.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(action.action)}
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm ${
                  action.priority === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 sm:col-start-2'
                    : 'mt-3 bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-indigo-500 sm:mt-0 sm:col-start-1'
                }`}
              >
                {action.label}
                {action.description && (
                  <span className="ml-2 text-xs opacity-75">({action.description})</span>
                )}
              </button>
            ))}
            
            {/* Close button if no actions or as fallback */}
            {formattedError.actions.length === 0 && (
              <button
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Preset components for common scenarios
export const LoginErrorDialog: React.FC<{
  error: any
  isVisible: boolean
  onClose: () => void
  userEmail?: string
  attemptCount?: number
}> = ({ error, isVisible, onClose, userEmail, attemptCount }) => {
  const context: ErrorContext = {
    userEmail,
    attemptCount,
    timestamp: new Date(),
    userAgent: navigator.userAgent
  }

  return (
    <AuthErrorDialog
      error={error}
      isVisible={isVisible}
      onClose={onClose}
      context={context}
      variant="dialog"
    />
  )
}

export const RegisterErrorDialog: React.FC<{
  error: any
  isVisible: boolean
  onClose: () => void
  userEmail?: string
}> = ({ error, isVisible, onClose, userEmail }) => {
  const context: ErrorContext = {
    userEmail,
    timestamp: new Date(),
    userAgent: navigator.userAgent
  }

  return (
    <AuthErrorDialog
      error={error}
      isVisible={isVisible}
      onClose={onClose}
      context={context}
      variant="dialog"
    />
  )
}