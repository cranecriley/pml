import React, { useState, useEffect } from 'react'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export type ActionState = 'idle' | 'loading' | 'success' | 'error' | 'warning'

export interface ActionFeedbackProps {
  state: ActionState
  message?: string
  successMessage?: string
  errorMessage?: string
  warningMessage?: string
  loadingMessage?: string
  className?: string
  variant?: 'inline' | 'toast' | 'banner' | 'modal'
  duration?: number
  onDismiss?: () => void
  showProgress?: boolean
  progress?: number
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }>
}

export const ActionFeedback: React.FC<ActionFeedbackProps> = ({
  state,
  message,
  successMessage,
  errorMessage,
  warningMessage,
  loadingMessage,
  className = '',
  variant = 'inline',
  duration = 5000,
  onDismiss,
  showProgress = false,
  progress = 0,
  actions = []
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  // Auto-dismiss for success messages
  useEffect(() => {
    if (state === 'success' && duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [state, duration])

  // Trigger entrance animation
  useEffect(() => {
    if (state !== 'idle') {
      setShouldAnimate(true)
    }
  }, [state])

  const handleDismiss = () => {
    setShouldAnimate(false)
    setTimeout(() => {
      setIsVisible(false)
      if (onDismiss) {
        onDismiss()
      }
    }, 300) // Wait for exit animation
  }

  const getCurrentMessage = () => {
    switch (state) {
      case 'loading':
        return loadingMessage || message || 'Processing...'
      case 'success':
        return successMessage || message || 'Action completed successfully!'
      case 'error':
        return errorMessage || message || 'An error occurred. Please try again.'
      case 'warning':
        return warningMessage || message || 'Please check your input.'
      default:
        return message || ''
    }
  }

  const getStateStyles = () => {
    const baseStyles = {
      colors: '',
      icon: '',
      bgClass: '',
      borderClass: '',
      textClass: ''
    }

    switch (state) {
      case 'loading':
        return {
          ...baseStyles,
          colors: 'blue',
          bgClass: 'bg-blue-50',
          borderClass: 'border-blue-200',
          textClass: 'text-blue-800',
          icon: <LoadingSpinner size="sm" color="blue" />
        }
      case 'success':
        return {
          ...baseStyles,
          colors: 'green',
          bgClass: 'bg-green-50',
          borderClass: 'border-green-200',
          textClass: 'text-green-800',
          icon: (
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )
        }
      case 'error':
        return {
          ...baseStyles,
          colors: 'red',
          bgClass: 'bg-red-50',
          borderClass: 'border-red-200',
          textClass: 'text-red-800',
          icon: (
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        }
      case 'warning':
        return {
          ...baseStyles,
          colors: 'yellow',
          bgClass: 'bg-yellow-50',
          borderClass: 'border-yellow-200',
          textClass: 'text-yellow-800',
          icon: (
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        }
      default:
        return baseStyles
    }
  }

  if (state === 'idle' || !isVisible) {
    return null
  }

  const styles = getStateStyles()
  const currentMessage = getCurrentMessage()

  const getAnimationClasses = () => {
    const baseAnimation = shouldAnimate ? 'animate-in' : 'animate-out'
    
    switch (variant) {
      case 'toast':
        return `transform transition-all duration-300 ease-in-out ${
          shouldAnimate 
            ? 'translate-x-0 opacity-100 scale-100' 
            : 'translate-x-full opacity-0 scale-95'
        }`
      case 'banner':
        return `transform transition-all duration-300 ease-in-out ${
          shouldAnimate 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0'
        }`
      case 'modal':
        return `transform transition-all duration-300 ease-in-out ${
          shouldAnimate 
            ? 'scale-100 opacity-100' 
            : 'scale-95 opacity-0'
        }`
      default:
        return `transition-all duration-300 ease-in-out ${
          shouldAnimate 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-2'
        }`
    }
  }

  const getContainerClasses = () => {
    const animationClasses = getAnimationClasses()
    
    switch (variant) {
      case 'toast':
        return `fixed top-4 right-4 max-w-sm w-full ${styles.bgClass} ${styles.borderClass} border rounded-lg shadow-lg z-50 ${animationClasses}`
      case 'banner':
        return `w-full ${styles.bgClass} ${styles.borderClass} border-l-4 shadow-sm ${animationClasses}`
      case 'modal':
        return `fixed inset-0 flex items-center justify-center z-50 ${animationClasses}`
      default:
        return `${styles.bgClass} ${styles.borderClass} border rounded-md ${animationClasses}`
    }
  }

  const renderModalContent = () => (
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div className="p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {styles.icon}
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-lg font-medium ${styles.textClass}`}>
              {state === 'success' ? 'Success' : state === 'error' ? 'Error' : 'Notice'}
            </h3>
            <div className={`mt-2 text-sm ${styles.textClass}`}>
              {currentMessage}
            </div>
            {showProgress && state === 'loading' && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                action.variant === 'primary' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  : action.variant === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500'
              }`}
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  if (variant === 'modal') {
    return (
      <div className={getContainerClasses()}>
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={handleDismiss} />
        {renderModalContent()}
      </div>
    )
  }

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {styles.icon}
          </div>
          
          <div className="ml-3 flex-1">
            <div className={`text-sm font-medium ${styles.textClass}`}>
              {currentMessage}
            </div>
            
            {showProgress && state === 'loading' && (
              <div className="mt-3">
                <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}

            {actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`text-xs font-medium px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      action.variant === 'primary' 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                        : action.variant === 'danger'
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                        : 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(variant === 'toast' || variant === 'banner') && (
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleDismiss}
                className={`inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Quick feedback components for common scenarios
export const LoginFeedback: React.FC<{
  state: ActionState
  className?: string
}> = ({ state, className = '' }) => {
  const messages = {
    loading: 'Signing you in...',
    success: 'Welcome back! Redirecting...',
    error: 'Login failed. Please check your credentials.',
    warning: 'Please complete all required fields.'
  }

  return (
    <ActionFeedback
      state={state}
      loadingMessage={messages.loading}
      successMessage={messages.success}
      errorMessage={messages.error}
      warningMessage={messages.warning}
      className={className}
      variant="inline"
      showProgress={state === 'loading'}
      progress={state === 'loading' ? 65 : 0}
    />
  )
}

export const RegisterFeedback: React.FC<{
  state: ActionState
  className?: string
}> = ({ state, className = '' }) => {
  const messages = {
    loading: 'Creating your account...',
    success: 'Account created! Please check your email for verification.',
    error: 'Registration failed. Please try again.',
    warning: 'Please check your input and try again.'
  }

  return (
    <ActionFeedback
      state={state}
      loadingMessage={messages.loading}
      successMessage={messages.success}
      errorMessage={messages.error}
      warningMessage={messages.warning}
      className={className}
      variant="inline"
      duration={8000} // Longer for email verification instruction
    />
  )
} 