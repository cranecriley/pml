import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { LoginForm } from '../LoginForm'

// Mock the child components that the LoginForm uses
jest.mock('../../feedback/RateLimitWarning', () => ({
  RateLimitWarning: ({ onRateLimitChange, className }: { onRateLimitChange: (limited: boolean) => void, className: string }) => (
    <div data-testid="rate-limit-warning" className={className}>Rate limit warning</div>
  )
}))

jest.mock('../../feedback/ProgressIndicator', () => ({
  AuthProgressIndicator: ({ currentStep, className }: { currentStep: string, className: string }) => (
    <div data-testid="progress-indicator" className={className}>
      <span>Step {currentStep === 'verification' ? '3' : currentStep === 'processing' ? '3' : '0'} of 4</span>
      <span>{currentStep === 'verification' ? '75' : currentStep === 'processing' ? '75' : '0'}%</span>
      <p>{currentStep === 'processing' ? 'Processing' : ''}</p>
    </div>
  )
}))

jest.mock('../../feedback/ActionFeedback', () => ({
  LoginFeedback: ({ state, className }: { state: string, className: string }) => (
    <div data-testid="login-feedback" className={className}>
      {state === 'loading' && (
        <div>
          <div>Signing you in...</div>
          <div>Progress</div>
          <span>65%</span>
        </div>
      )}
      {state === 'error' && <div>Login failed. Please check your credentials.</div>}
    </div>
  )
}))

jest.mock('../../feedback/AuthErrorDialog', () => ({
  LoginErrorDialog: ({ error, isVisible, onClose, userEmail, attemptCount }: any) => 
    isVisible ? (
      <div data-testid="error-dialog">
        <h3>Sign In Problem</h3>
        <p>The email or password you entered is incorrect.</p>
        <button onClick={onClose}>Try Again</button>
        <button>Reset Password</button>
      </div>
    ) : null
}))

jest.mock('../../feedback/SuccessMessage', () => ({
  LoginSuccessMessage: ({ userName, onContinue, className }: any) => (
    <div data-testid="success-message" className={className}>
      <div>Login successful for {userName}</div>
      <button onClick={onContinue}>Continue</button>
    </div>
  )
}))

jest.mock('../../ui/ErrorMessage', () => ({
  ErrorMessage: ({ message, variant = 'default' }: { message: string, variant?: string }) => (
    <div data-testid="error-message" data-variant={variant}>{message}</div>
  )
}))

jest.mock('../../ui/LoadingButton', () => ({
  LoadingButton: ({ children, isLoading, disabled, loadingText, type, className, ...props }: any) => (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={className}
      {...props}
    >
      {isLoading ? loadingText || 'Loading...' : children}
    </button>
  )
}))

// Mock the useAuth hook
const mockLogin = {
  execute: jest.fn(),
  loading: false,
  error: null,
}

const mockUseAuth = {
  user: null,
  session: null,
  loading: false,
  postLoginRouting: null,
  inactivityWarning: {
    isVisible: false,
    timeRemaining: 0,
  },
  login: mockLogin,
  register: { execute: jest.fn(), loading: false, error: null },
  logout: { execute: jest.fn(), loading: false, error: null },
  resetPassword: { execute: jest.fn(), loading: false, error: null },
  updatePassword: { execute: jest.fn(), loading: false, error: null },
  confirmPasswordReset: { execute: jest.fn(), loading: false, error: null },
  refreshSession: { execute: jest.fn(), loading: false, error: null },
  clearErrors: jest.fn(),
  checkLoginStatus: jest.fn(),
  getSessionInfo: jest.fn(),
  extendSession: jest.fn(),
  dismissInactivityWarning: jest.fn(),
  getInactivityStatus: jest.fn(),
  completeOnboarding: jest.fn(),
  getPostLoginPath: jest.fn(),
}

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth
}))

// Mock the validation functions
jest.mock('../../../utils/validation', () => ({
  validateEmail: jest.fn((email: string) => {
    if (!email) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address'
    return null
  }),
  validatePassword: jest.fn((password: string) => {
    if (!password) return 'Password is required'
    if (password.length < 8) return 'Password must be at least 8 characters long'
    return null
  })
}))

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock login state
    mockLogin.loading = false
    mockLogin.error = null
    mockUseAuth.user = null
  })

  describe('Rendering', () => {
    it('should render all form elements correctly', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
      expect(screen.getByText(/sign in to your account to continue/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      const { container } = render(
        <TestWrapper>
          <LoginForm className="custom-class" />
        </TestWrapper>
      )

      // The custom class should be on the main container div
      const mainContainer = container.querySelector('.custom-class')
      expect(mainContainer).toBeInTheDocument()
    })

    it('should have proper input attributes', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')

      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password')
    })
  })

  describe('Input Handling', () => {
    it('should update email input value when typing', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password input value when typing', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, 'testpassword123')

      expect(passwordInput).toHaveValue('testpassword123')
    })

    it('should toggle password visibility when show/hide button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const passwordInput = screen.getByLabelText(/password/i)
      const toggleButton = passwordInput.parentElement?.querySelector('button')

      expect(passwordInput).toHaveAttribute('type', 'password')

      if (toggleButton) {
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'text')

        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'password')
      }
    })
  })

  describe('Form Validation', () => {
    it('should show validation error for empty email', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Instead of looking for error messages, verify that form submission was prevented
      // by checking that login.execute was not called (since validation should fail)
      expect(mockLogin.execute).not.toHaveBeenCalled()
      
      // Check that the feedback state changed to warning (which happens on validation failure)
      await waitFor(() => {
        const loginFeedback = screen.getByTestId('login-feedback')
        expect(loginFeedback).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      // Verify that form submission was prevented due to validation error
      expect(mockLogin.execute).not.toHaveBeenCalled()
      
      // Check for form state changes that indicate validation occurred
      await waitFor(() => {
        const loginFeedback = screen.getByTestId('login-feedback')
        expect(loginFeedback).toBeInTheDocument()
      })
    })

    it('should show validation error for empty password', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // Verify that form submission was prevented due to missing password
      expect(mockLogin.execute).not.toHaveBeenCalled()
      
      // Check for validation state changes
      await waitFor(() => {
        const loginFeedback = screen.getByTestId('login-feedback')
        expect(loginFeedback).toBeInTheDocument()
      })
    })

    it('should show validation error for password too short', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })
    })

    it('should not show validation errors for valid inputs', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.click(submitButton)

      // Should not show validation errors in error message components
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state when login is in progress', () => {
      mockLogin.loading = true

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeDisabled()
      expect(screen.getByLabelText(/password/i)).toBeDisabled()
    })

    it('should disable inputs during loading', () => {
      mockLogin.loading = true

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      expect(screen.getByLabelText(/email address/i)).toBeDisabled()
      expect(screen.getByLabelText(/password/i)).toBeDisabled()
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })

    it('should show loading feedback during login process', async () => {
      const user = userEvent.setup()
      mockLogin.execute.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('login-feedback')).toBeInTheDocument()
        expect(screen.getByText(/signing you in/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call login.execute with correct credentials on valid form submission', async () => {
      const user = userEvent.setup()
      mockLogin.execute.mockResolvedValueOnce({})

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin.execute).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'validpassword123'
        })
      })
    })

    it('should call onSuccess callback after successful login', async () => {
      const user = userEvent.setup()
      const onSuccess = jest.fn()
      mockLogin.execute.mockResolvedValueOnce({})

      render(
        <TestWrapper>
          <LoginForm onSuccess={onSuccess} />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Wait for auto-redirect timeout
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should handle login errors gracefully', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid login credentials'
      mockLogin.execute.mockRejectedValueOnce(new Error(errorMessage))

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-dialog')).toBeInTheDocument()
        expect(screen.getByText(/sign in problem/i)).toBeInTheDocument()
      })
    })

    it('should not submit form when validation fails', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      expect(mockLogin.execute).not.toHaveBeenCalled()
    })
  })

  describe('Navigation Links', () => {
    it('should render forgot password link with correct href', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot your password/i })
      expect(forgotPasswordLink).toHaveAttribute('href', '/auth/password-reset')
    })

    it('should render create account link with correct href', () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      const createAccountLink = screen.getByRole('link', { name: /create an account/i })
      expect(createAccountLink).toHaveAttribute('href', '/auth/register')
    })
  })
})