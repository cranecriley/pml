import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordResetForm } from '../PasswordResetForm'

// Mock the UI components
jest.mock('../../ui/ErrorMessage', () => ({
  ErrorMessage: ({ message }: { message: string }) => (
    <div data-testid="error-message">{message}</div>
  )
}))

jest.mock('../../ui/LoadingButton', () => ({
  LoadingButton: ({ children, isLoading, disabled, type, className, ...props }: any) => (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={className}
      {...props}
    >
      {isLoading ? 'Sending...' : children}
    </button>
  )
}))

// Mock the passwordResetService
jest.mock('../../../services/passwordResetService', () => ({
  passwordResetService: {
    getPasswordResetInstructions: jest.fn((email: string) => ({
      nextSteps: [
        `Check your email inbox for a message from your language learning app`,
        `Look for an email with the subject "Reset your password"`,
        `Click the "Reset Password" button or link in the email`,
        `You'll be redirected to create a new password`,
        `Choose a strong password that's at least 8 characters long`
      ],
      troubleshooting: [
        `Check your spam or junk folder`,
        `Make sure you entered the correct email address: ${email}`,
        `Wait a few minutes - emails can sometimes be delayed`,
        `Try requesting another reset if you don't receive the email within 10 minutes`
      ],
      securityNote: `For security reasons, password reset links expire after 1 hour. If your link has expired, you'll need to request a new one.`
    }))
  }
}))

// Mock the useAuth hook
const mockResetPassword = {
  execute: jest.fn(),
  loading: false,
  error: null as string | null,
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
  login: { execute: jest.fn(), loading: false, error: null },
  register: { execute: jest.fn(), loading: false, error: null },
  logout: { execute: jest.fn(), loading: false, error: null },
  resetPassword: mockResetPassword,
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

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth
}))

describe('PasswordResetForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock resetPassword state
    mockResetPassword.loading = false
    mockResetPassword.error = null
  })

  describe('Rendering', () => {
    it('should render the initial password reset form correctly', () => {
      render(<PasswordResetForm />)

      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
      expect(screen.getByText(/enter your email address and we'll send you a link/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument()
    })

    it('should have proper input attributes', () => {
      render(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address')
    })

    it('should render cancel button when onCancel prop is provided', () => {
      render(<PasswordResetForm onCancel={mockOnCancel} />)

      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument()
    })

    it('should not render cancel button when onCancel prop is not provided', () => {
      render(<PasswordResetForm />)

      expect(screen.queryByRole('button', { name: /back to login/i })).not.toBeInTheDocument()
    })
  })

  describe('Email Input Handling', () => {
    it('should update email input value when typing', async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should disable submit button when email is empty', () => {
      render(<PasswordResetForm />)

      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when email has content', async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button for whitespace-only email', async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, '   ')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Loading States', () => {
    it('should show loading state when reset is in progress', () => {
      mockResetPassword.loading = true
      render(<PasswordResetForm />)

      expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeDisabled()
    })

    it('should disable form inputs during loading', () => {
      mockResetPassword.loading = true
      render(<PasswordResetForm />)

      expect(screen.getByLabelText(/email address/i)).toBeDisabled()
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when resetPassword.error exists', () => {
      mockResetPassword.error = 'Invalid email address'
      render(<PasswordResetForm />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })

    it('should not display error message when resetPassword.error is null', () => {
      mockResetPassword.error = null
      render(<PasswordResetForm />)

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call resetPassword.execute with correct email on form submission', async () => {
      const user = userEvent.setup()
      mockResetPassword.execute.mockResolvedValueOnce({
        success: true,
        message: 'Reset instructions sent'
      })

      render(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      expect(mockResetPassword.execute).toHaveBeenCalledWith({
        email: 'test@example.com'
      })
    })

    it('should prevent form submission when email is empty', async () => {
      render(<PasswordResetForm />)

      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })
      
      // Button should be disabled, but let's test the form behavior
      expect(submitButton).toBeDisabled()
      
      // Even if we try to click, it shouldn't call the execute function
      expect(mockResetPassword.execute).not.toHaveBeenCalled()
    })

    it('should call onSuccess callback after successful reset request', async () => {
      const user = userEvent.setup()
      mockResetPassword.execute.mockResolvedValueOnce({
        success: true,
        message: 'Reset instructions sent'
      })

      render(<PasswordResetForm onSuccess={mockOnSuccess} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should not call onSuccess callback when reset request fails', async () => {
      const user = userEvent.setup()
      mockResetPassword.execute.mockResolvedValueOnce({
        success: false,
        message: 'Reset failed'
      })

      render(<PasswordResetForm onSuccess={mockOnSuccess} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockResetPassword.execute).toHaveBeenCalled()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should handle resetPassword.execute errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockResetPassword.execute.mockRejectedValueOnce(new Error('Network error'))

      render(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Password reset request failed:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Success State', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      mockResetPassword.execute.mockResolvedValueOnce({
        success: true,
        message: 'Password reset instructions have been sent to test@example.com'
      })

      render(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      })
    })

    it('should display success message and instructions after successful submission', () => {
      expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      expect(screen.getByText(/password reset instructions have been sent/i)).toBeInTheDocument()
      expect(screen.getByText(/next steps:/i)).toBeInTheDocument()
      expect(screen.getByText(/troubleshooting:/i)).toBeInTheDocument()
    })

    it('should display next steps instructions', () => {
      expect(screen.getByText(/check your email inbox for a message/i)).toBeInTheDocument()
      expect(screen.getByText(/look for an email with the subject/i)).toBeInTheDocument()
      expect(screen.getByText(/click the "reset password" button/i)).toBeInTheDocument()
    })

    it('should display troubleshooting tips', () => {
      expect(screen.getByText(/check your spam or junk folder/i)).toBeInTheDocument()
      expect(screen.getByText(/make sure you entered the correct email address/i)).toBeInTheDocument()
      expect(screen.getByText(/wait a few minutes - emails can sometimes be delayed/i)).toBeInTheDocument()
    })

    it('should display security note', () => {
      expect(screen.getByText(/for security reasons, password reset links expire after 1 hour/i)).toBeInTheDocument()
    })

    it('should display "Send Another Reset Email" button', () => {
      expect(screen.getByRole('button', { name: /send another reset email/i })).toBeInTheDocument()
    })

    it('should display "Back to Login" button when onCancel is provided', async () => {
      const user = userEvent.setup()
      mockResetPassword.execute.mockResolvedValueOnce({
        success: true,
        message: 'Reset instructions sent'
      })

      render(<PasswordResetForm onCancel={mockOnCancel} />)

      // Submit form to reach success state
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      })

      // Should display "Back to Login" button in success state
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument()
    })
  })

  describe('Try Again Functionality', () => {
    it('should reset form when "Send Another Reset Email" is clicked', async () => {
      const user = userEvent.setup()
      mockResetPassword.execute.mockResolvedValueOnce({
        success: true,
        message: 'Reset instructions sent'
      })

      render(<PasswordResetForm />)

      // Submit form first
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      })

      // Click "Send Another Reset Email"
      const tryAgainButton = screen.getByRole('button', { name: /send another reset email/i })
      await user.click(tryAgainButton)

      // Should return to form state
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
        expect(screen.getByLabelText(/email address/i)).toHaveValue('')
      })
    })
  })

  describe('Cancel Functionality', () => {
    it('should call onCancel when "Back to Login" button is clicked in initial state', async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm onCancel={mockOnCancel} />)

      const cancelButton = screen.getByRole('button', { name: /back to login/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should call onCancel when "Back to Login" button is clicked in success state', async () => {
      const user = userEvent.setup()
      mockResetPassword.execute.mockResolvedValueOnce({
        success: true,
        message: 'Reset instructions sent'
      })

      render(<PasswordResetForm onCancel={mockOnCancel} />)

      // Submit form to reach success state
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      })

      // Click "Back to Login" in success state
      const cancelButton = screen.getByRole('button', { name: /back to login/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Email Validation', () => {
    it('should accept valid email formats', async () => {
      const user = userEvent.setup()
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test123+tag@subdomain.example.org'
      ]

      for (const email of validEmails) {
        mockResetPassword.execute.mockResolvedValueOnce({
          success: true,
          message: 'Reset instructions sent'
        })

        const { unmount } = render(<PasswordResetForm />)
        
        const emailInput = screen.getByLabelText(/email address/i)
        const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

        await user.type(emailInput, email)
        await user.click(submitButton)

        await waitFor(() => {
          expect(mockResetPassword.execute).toHaveBeenCalledWith({ email })
        })

        mockResetPassword.execute.mockClear()
        unmount()
      }
    })

    it('should handle email validation through the resetPassword service', async () => {
      const user = userEvent.setup()
      render(<PasswordResetForm />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      // The form submission may be prevented by HTML5 email validation
      // In that case, the execute function should not be called
      // This tests that the form properly handles invalid email input
      expect(mockResetPassword.execute).toHaveBeenCalledTimes(0)
    })
  })
})