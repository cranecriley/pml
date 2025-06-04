import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  loadingText,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = "flex justify-center items-center border rounded-md shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
  
  const variantClasses = {
    primary: "border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
    danger: "border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 sm:py-2 text-base sm:text-sm",
    lg: "px-6 py-3 text-lg"
  }

  const fullSizeClass = props.type === 'submit' ? 'w-full' : ''

  const getSpinnerColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return 'white'
      case 'secondary':
        return 'blue'
      default:
        return 'blue'
    }
  }

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullSizeClass} ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center">
          <LoadingSpinner size="sm" color={getSpinnerColor()} className="-ml-1 mr-3" />
          {loadingText || children}
        </div>
      ) : (
        children
      )}
    </button>
  )
}