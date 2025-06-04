import React, { useState, useEffect } from 'react'

export interface SuccessAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  icon?: React.ReactNode
}

interface SuccessMessageProps {
  title?: string
  message: string
  description?: string
  className?: string
  variant?: 'banner' | 'card' | 'toast' | 'inline' | 'modal'
  icon?: React.ReactNode
  actions?: SuccessAction[]
  autoDismiss?: boolean
  dismissAfter?: number
  onDismiss?: () => void
  showProgress?: boolean
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  title,
  message,
  description,
  className = '',
  variant = 'card',
  icon,
  actions = [],
  autoDismiss = false,
  dismissAfter = 5000,
  onDismiss,
  showProgress = false,
  animated = true,
  size = 'md'
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  // Auto-dismiss with progress bar
  useEffect(() => {
    if (autoDismiss && dismissAfter > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (dismissAfter / 100))
          if (newProgress <= 0) {
            handleDismiss()
            return 0
          }
          return newProgress
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [autoDismiss, dismissAfter])

  const handleDismiss = () => {
    if (animated) {
      setIsVisible(false)
      setTimeout(() => {
        if (onDismiss) onDismiss()
      }, 300)
    } else {
      if (onDismiss) onDismiss()
    }
  }

  const getDefaultIcon = () => {
    return (
      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-3',
          icon: 'h-5 w-5',
          title: 'text-sm font-medium',
          message: 'text-sm',
          description: 'text-xs'
        }
      case 'lg':
        return {
          container: 'p-6',
          icon: 'h-8 w-8',
          title: 'text-lg font-semibold',
          message: 'text-base',
          description: 'text-sm'
        }
      default:
        return {
          container: 'p-4',
          icon: 'h-6 w-6',
          title: 'text-base font-medium',
          message: 'text-sm',
          description: 'text-sm'
        }
    }
  }

  const sizeClasses = getSizeClasses()

  const getVariantClasses = () => {
    const baseClasses = `${animated && isVisible ? 'animate-in' : animated ? 'animate-out opacity-0' : ''}`
    
    switch (variant) {
      case 'banner':
        return `w-full bg-green-50 border-l-4 border-green-400 ${sizeClasses.container} ${baseClasses}`
      case 'toast':
        return `max-w-sm w-full bg-white border border-green-200 rounded-lg shadow-lg ${sizeClasses.container} ${baseClasses}`
      case 'inline':
        return `bg-green-50 border border-green-200 rounded-md ${sizeClasses.container} ${baseClasses}`
      case 'modal':
        return `bg-white rounded-lg shadow-xl ${sizeClasses.container} ${baseClasses}`
      default: // card
        return `bg-green-50 border border-green-200 rounded-lg ${sizeClasses.container} shadow-sm ${baseClasses}`
    }
  }

  const renderContent = () => (
    <div className="flex">
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center">
          {icon || getDefaultIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="ml-3 flex-1">
        {title && (
          <h3 className={`${sizeClasses.title} text-green-800`}>
            {title}
          </h3>
        )}
        <div className={`${sizeClasses.message} text-green-700 ${title ? 'mt-1' : ''}`}>
          {message}
        </div>
        {description && (
          <div className={`${sizeClasses.description} text-green-600 mt-2`}>
            {description}
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="mt-4 flex space-x-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${
                  action.variant === 'primary'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : action.variant === 'outline'
                    ? 'border border-green-600 text-green-600 hover:bg-green-50'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Auto-dismiss progress bar */}
        {autoDismiss && showProgress && (
          <div className="mt-3">
            <div className="w-full bg-green-200 rounded-full h-1">
              <div 
                className="bg-green-600 h-1 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {onDismiss && (variant === 'toast' || variant === 'banner' || variant === 'card') && (
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="inline-flex text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleDismiss} />
          
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
          
          <div className={`inline-block align-bottom text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${getVariantClasses()}`}>
            <div className="bg-green-50 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              {renderContent()}
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                onClick={handleDismiss}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Great!
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'toast') {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className={getVariantClasses()}>
          {renderContent()}
        </div>
      </div>
    )
  }

  return (
    <div className={`${getVariantClasses()} ${className}`}>
      {renderContent()}
    </div>
  )
}

// Preset success messages for common auth scenarios
export const LoginSuccessMessage: React.FC<{
  userName?: string
  onContinue?: () => void
  variant?: 'banner' | 'card' | 'toast'
  className?: string
}> = ({ userName, onContinue, variant = 'card', className = '' }) => {
  const actions: SuccessAction[] = onContinue ? [
    {
      label: 'Continue to Dashboard',
      onClick: onContinue,
      variant: 'primary',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      )
    }
  ] : []

  return (
    <SuccessMessage
      title="Welcome back!"
      message={userName ? `Successfully signed in as ${userName}` : 'You have successfully signed in'}
      description="Redirecting you to your dashboard..."
      variant={variant}
      actions={actions}
      autoDismiss={!onContinue}
      dismissAfter={3000}
      showProgress={!onContinue}
      className={className}
    />
  )
}

export const RegisterSuccessMessage: React.FC<{
  userEmail: string
  onResendEmail?: () => void
  variant?: 'banner' | 'card' | 'toast'
  className?: string
}> = ({ userEmail, onResendEmail, variant = 'card', className = '' }) => {
  const actions: SuccessAction[] = onResendEmail ? [
    {
      label: 'Resend Email',
      onClick: onResendEmail,
      variant: 'outline',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ] : []

  return (
    <SuccessMessage
      title="Account created successfully!"
      message={`We've sent a verification email to ${userEmail}`}
      description="Please check your inbox and click the verification link to complete your registration. Don't forget to check your spam folder!"
      variant={variant}
      actions={actions}
      autoDismiss={false}
      className={className}
    />
  )
}

export const PasswordResetSuccessMessage: React.FC<{
  userEmail: string
  onBackToLogin?: () => void
  variant?: 'banner' | 'card' | 'toast'
  className?: string
}> = ({ userEmail, onBackToLogin, variant = 'card', className = '' }) => {
  const actions: SuccessAction[] = onBackToLogin ? [
    {
      label: 'Back to Sign In',
      onClick: onBackToLogin,
      variant: 'primary',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
      )
    }
  ] : []

  return (
    <SuccessMessage
      title="Password reset email sent!"
      message={`We've sent password reset instructions to ${userEmail}`}
      description="Check your inbox for a reset link. The link will expire in 1 hour for security reasons."
      variant={variant}
      actions={actions}
      autoDismiss={false}
      className={className}
    />
  )
}

export const PasswordUpdateSuccessMessage: React.FC<{
  onContinue?: () => void
  variant?: 'banner' | 'card' | 'toast'
  className?: string
}> = ({ onContinue, variant = 'card', className = '' }) => {
  const actions: SuccessAction[] = onContinue ? [
    {
      label: 'Continue to Dashboard',
      onClick: onContinue,
      variant: 'primary'
    }
  ] : []

  return (
    <SuccessMessage
      title="Password updated successfully!"
      message="Your password has been changed and you're now signed in"
      description="Your account is secure with your new password."
      variant={variant}
      actions={actions}
      autoDismiss={!onContinue}
      dismissAfter={4000}
      className={className}
    />
  )
}

export const EmailVerificationSuccessMessage: React.FC<{
  onContinue?: () => void
  variant?: 'banner' | 'card' | 'toast'
  className?: string
}> = ({ onContinue, variant = 'card', className = '' }) => {
  const actions: SuccessAction[] = onContinue ? [
    {
      label: 'Start Learning',
      onClick: onContinue,
      variant: 'primary',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      )
    }
  ] : []

  return (
    <SuccessMessage
      title="Email verified successfully!"
      message="Your account has been activated and you're ready to start learning"
      description="Welcome to your language learning journey!"
      variant={variant}
      actions={actions}
      autoDismiss={!onContinue}
      dismissAfter={5000}
      className={className}
    />
  )
}