import React from 'react'

export interface ProgressStep {
  id: string
  label: string
  description?: string
  status: 'pending' | 'active' | 'completed' | 'error'
}

interface ProgressIndicatorProps {
  steps: ProgressStep[]
  currentStepId?: string
  className?: string
  variant?: 'horizontal' | 'vertical' | 'minimal'
  showDescriptions?: boolean
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStepId,
  className = '',
  variant = 'horizontal',
  showDescriptions = false
}) => {
  const currentStepIndex = currentStepId ? steps.findIndex(step => step.id === currentStepId) : -1
  const progressPercentage = currentStepIndex >= 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0

  const getStepIcon = (step: ProgressStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'active':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center relative">
            <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-600 animate-spin border-t-transparent" />
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">{index + 1}</span>
          </div>
        )
    }
  }

  const getStepTextColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'active': return 'text-blue-600'
      default: return 'text-gray-500'
    }
  }

  if (variant === 'minimal') {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {currentStepId && (
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-900">
              {steps.find(s => s.id === currentStepId)?.label}
            </p>
            {showDescriptions && (
              <p className="text-xs text-gray-600 mt-1">
                {steps.find(s => s.id === currentStepId)?.description}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              {getStepIcon(step, index)}
              {index < steps.length - 1 && (
                <div className={`w-0.5 h-8 mt-2 ${
                  step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium ${getStepTextColor(step)}`}>
                {step.label}
              </h4>
              {showDescriptions && step.description && (
                <p className="text-xs text-gray-600 mt-1">{step.description}</p>
              )}
              {step.status === 'active' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Horizontal variant (default)
  return (
    <div className={`${className}`}>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center text-center max-w-[120px]">
            {getStepIcon(step, index)}
            <div className="mt-2">
              <h4 className={`text-xs font-medium ${getStepTextColor(step)}`}>
                {step.label}
              </h4>
              {showDescriptions && step.description && (
                <p className="text-xs text-gray-500 mt-1 break-words">
                  {step.description}
                </p>
              )}
            </div>
            {step.status === 'active' && (
              <div className="mt-2 w-16">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Connection lines */}
      <div className="absolute top-4 left-0 right-0 flex justify-between px-4 -z-10">
        {steps.slice(0, -1).map((step, index) => (
          <div 
            key={`line-${index}`}
            className={`flex-1 h-0.5 ${
              index < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'
            }`}
            style={{ marginLeft: index === 0 ? '16px' : '8px', marginRight: '8px' }}
          />
        ))}
      </div>
    </div>
  )
}

// Preset for common auth flows
export const AuthProgressIndicator: React.FC<{
  currentStep: 'credentials' | 'verification' | 'processing' | 'complete' | 'error'
  variant?: 'horizontal' | 'vertical' | 'minimal'
  className?: string
}> = ({ currentStep, variant = 'minimal', className = '' }) => {
  const steps: ProgressStep[] = [
    {
      id: 'credentials',
      label: 'Enter Credentials',
      description: 'Provide your email and password',
      status: currentStep === 'credentials' ? 'active' : 
              ['verification', 'processing', 'complete'].includes(currentStep) ? 'completed' : 'pending'
    },
    {
      id: 'verification',
      label: 'Verification',
      description: 'Validating your credentials',
      status: currentStep === 'verification' ? 'active' : 
              ['processing', 'complete'].includes(currentStep) ? 'completed' :
              currentStep === 'error' ? 'error' : 'pending'
    },
    {
      id: 'processing',
      label: 'Processing',
      description: 'Setting up your session',
      status: currentStep === 'processing' ? 'active' : 
              currentStep === 'complete' ? 'completed' :
              currentStep === 'error' ? 'error' : 'pending'
    },
    {
      id: 'complete',
      label: 'Complete',
      description: 'Welcome back!',
      status: currentStep === 'complete' ? 'completed' :
              currentStep === 'error' ? 'error' : 'pending'
    }
  ]

  return (
    <ProgressIndicator
      steps={steps}
      currentStepId={currentStep}
      variant={variant}
      className={className}
      showDescriptions={variant !== 'minimal'}
    />
  )
} 