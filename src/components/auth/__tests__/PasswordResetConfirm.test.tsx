import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordResetConfirm } from '../PasswordResetConfirm'

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
      {isLoading ? 'Updating...' : children}
    </button>
  )
}))

// Mock the passwordResetConfirmService
jest.mock('../../../services/passwordResetConfirmService', () => ({
  passwordResetConfirmService: {
    checkResetSession: jest.fn(),
    getErrorGuidance: jest.fn(),
    getPasswordRequirements: jest.fn(),  
    getSecurityTips: jest.fn(),
  }
}))

// Mock useAuth hook
const mockConfirmPasswordReset = {
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
  resetPassword: { execute: jest.fn(), loading: false, error: null },
  updatePassword: { execute: jest.fn(), loading: false, error: null },
  confirmPasswordReset: mockConfirmPasswordReset,
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

// Import the mocked service after mocking
import { passwordResetConfirmService } from '../../../services/passwordResetConfirmService'
const mockPasswordResetConfirmService = passwordResetConfirmService as jest.Mocked<typeof passwordResetConfirmService>

describe('PasswordResetConfirm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset component state
    mockConfirmPasswordReset.loading = false
    mockConfirmPasswordReset.error = null
    
    // Default service mocks
    mockPasswordResetConfirmService.checkResetSession.mockResolvedValue({ isValid: true })
    mockPasswordResetConfirmService.getPasswordRequirements.mockReturnValue({
      title: 'Password Requirements',
      requirements: [
        'At least 8 characters long',
        'Contains at least one letter',
        'Can include numbers and special characters',
        'Must be different from your current password'
      ],
      tips: []
    })
    mockPasswordResetConfirmService.getSecurityTips.mockReturnValue({
      title: 'Security Tips',
      tips: [
        'Sign in with your new password to verify it works',
        'Update your password manager with the new password',
        'Review your account activity for any suspicious access'
      ],
      warning: 'If you did not request this password reset, please contact support immediately.'
    })
  })

  describe('Session Validation', () => {
    it('should show loading state while checking session validity', () => {
      mockPasswordResetConfirmService.checkResetSession.mockReturnValue(new Promise(() => {})) // Never resolves
      
      render(<PasswordResetConfirm />)
      
      expect(screen.getByRole('heading', { name: /verifying reset link/i })).toBeInTheDocument()
      expect(screen.getByText(/please wait while we verify/i)).toBeInTheDocument()
    })

    it('should display error state when session is invalid', async () => {
      const errorMessage = 'Invalid or expired password reset session'
      mockPasswordResetConfirmService.checkResetSession.mockResolvedValue({ 
        isValid: false, 
        error: errorMessage 
      })
      mockPasswordResetConfirmService.getErrorGuidance.mockReturnValue({
        userMessage: 'This password reset link has expired or is no longer valid.',
        actions: [
          'Request a new password reset from the login page',
          'Check that you clicked the most recent reset link'
        ],
        severity: 'warning'
      })

      render(<PasswordResetConfirm onError={mockOnError} />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset link issue/i })).toBeInTheDocument()
      })

      expect(screen.getByText(/this password reset link has expired/i)).toBeInTheDocument()
      expect(screen.getByText(/request a new password reset from the login page/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /request new password reset/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument()
      expect(mockOnError).toHaveBeenCalledWith(errorMessage)
    })

    it('should call onError callback when session validation fails', async () => {
      const errorMessage = 'Session expired'
      mockPasswordResetConfirmService.checkResetSession.mockResolvedValue({ 
        isValid: false, 
        error: errorMessage 
      })
      mockPasswordResetConfirmService.getErrorGuidance.mockReturnValue({
        userMessage: 'Session has expired',
        actions: ['Request new reset'],
        severity: 'warning'
      })

      render(<PasswordResetConfirm onError={mockOnError} />)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('should handle session check exceptions', async () => {
      mockPasswordResetConfirmService.checkResetSession.mockRejectedValue(new Error('Network error'))

      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset link issue/i })).toBeInTheDocument()
      })
    })
  })

  describe('Password Reset Form Rendering', () => {
    it('should render the password reset form when session is valid', async () => {
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      expect(screen.getByText(/please choose a strong new password/i)).toBeInTheDocument()
      expect(document.getElementById('new-password')).toBeInTheDocument()
      expect(document.getElementById('confirm-password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
    })

    it('should have proper input attributes', async () => {
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')

      expect(newPasswordInput).toHaveAttribute('type', 'password')
      expect(newPasswordInput).toHaveAttribute('required')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password') 
      expect(confirmPasswordInput).toHaveAttribute('required')
    })

    it('should display password requirements', async () => {
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByText(/password requirements/i)).toBeInTheDocument()
      })

      expect(screen.getByText(/at least 8 characters long/i)).toBeInTheDocument()
      expect(screen.getByText(/contains at least one letter/i)).toBeInTheDocument()
      expect(screen.getByText(/must be different from your current password/i)).toBeInTheDocument()
    })

    it('should display "Need a new reset link?" button', async () => {
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /need a new reset link/i })).toBeInTheDocument()
      })
    })
  })

  describe('Password Input Handling', () => {
    beforeEach(async () => {
      render(<PasswordResetConfirm />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })
    })

    it('should update password input values when typing', async () => {
      const user = userEvent.setup()
      
      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')

      await user.type(newPasswordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      expect(newPasswordInput).toHaveValue('NewPassword123!')
      expect(confirmPasswordInput).toHaveValue('NewPassword123!')
    })

    it('should disable submit button when passwords are empty', () => {
      const submitButton = screen.getByRole('button', { name: /update password/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when both passwords have content', async () => {
      const user = userEvent.setup()
      
      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')
      const submitButton = screen.getByRole('button', { name: /update password/i })

      await user.type(newPasswordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')

      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button for whitespace-only passwords', async () => {
      const user = userEvent.setup()
      
      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')
      const submitButton = screen.getByRole('button', { name: /update password/i })

      await user.type(newPasswordInput, '   ')
      await user.type(confirmPasswordInput, '   ')

      expect(submitButton).toBeDisabled()
    })
  })

  describe('Password Visibility Toggle', () => {
    beforeEach(async () => {
      render(<PasswordResetConfirm />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })
    })

    it('should toggle new password visibility when eye button is clicked', async () => {
      const user = userEvent.setup()
      
      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const toggleButtons = screen.getAllByRole('button', { name: '' })
      const newPasswordToggle = toggleButtons[0] // First toggle is for new password

      expect(newPasswordInput).toHaveAttribute('type', 'password')

      await user.click(newPasswordToggle)
      expect(newPasswordInput).toHaveAttribute('type', 'text')

      await user.click(newPasswordToggle)
      expect(newPasswordInput).toHaveAttribute('type', 'password')
    })

    it('should toggle confirm password visibility when eye button is clicked', async () => {
      const user = userEvent.setup()
      
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')
      const toggleButtons = screen.getAllByRole('button', { name: '' })
      const confirmPasswordToggle = toggleButtons[1] // Second toggle is for confirm password

      expect(confirmPasswordInput).toHaveAttribute('type', 'password')

      await user.click(confirmPasswordToggle)
      expect(confirmPasswordInput).toHaveAttribute('type', 'text')

      await user.click(confirmPasswordToggle)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')  
    })
  })

  describe('Loading States', () => {
    it('should show loading state when password reset is in progress', async () => {
      mockConfirmPasswordReset.loading = true
      
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /updating/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('should disable form inputs during loading', async () => {
      mockConfirmPasswordReset.loading = true
      
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      expect(screen.getByPlaceholderText('Enter new password')).toBeDisabled()
      expect(screen.getByPlaceholderText('Confirm your new password')).toBeDisabled()
    })

    it('should disable password visibility toggles during loading', async () => {
      mockConfirmPasswordReset.loading = true
      
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      const toggleButtons = screen.getAllByRole('button', { name: '' })
      toggleButtons.slice(0, 2).forEach(button => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when confirmPasswordReset.error exists', async () => {
      mockConfirmPasswordReset.error = 'Password must be at least 8 characters long'
      
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument()
    })

    it('should not display error message when confirmPasswordReset.error is null', async () => {
      mockConfirmPasswordReset.error = null
      
      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    beforeEach(async () => {
      render(<PasswordResetConfirm />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })
    })

    it('should call confirmPasswordReset.execute with correct passwords on form submission', async () => {
      const user = userEvent.setup()
      mockConfirmPasswordReset.execute.mockResolvedValue({
        success: true,
        message: 'Password updated successfully!'
      })

      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')
      const submitButton = screen.getByRole('button', { name: /update password/i })

      await user.type(newPasswordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')
      await user.click(submitButton)

      expect(mockConfirmPasswordReset.execute).toHaveBeenCalledWith('NewPassword123!', 'NewPassword123!')
    })

    it('should handle confirmPasswordReset.execute errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockConfirmPasswordReset.execute.mockRejectedValue(new Error('Password too weak'))

      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')
      const submitButton = screen.getByRole('button', { name: /update password/i })

      await user.type(newPasswordInput, 'weak')
      await user.type(confirmPasswordInput, 'weak')
      await user.click(submitButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Password reset confirmation failed:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })

    it('should prevent form submission when passwords are empty', () => {
      const submitButton = screen.getByRole('button', { name: /update password/i })
      
      expect(submitButton).toBeDisabled()
      expect(mockConfirmPasswordReset.execute).not.toHaveBeenCalled()
    })
  })

  describe('Success State', () => {
    it('should display success message and security tips after successful password update', async () => {
      const user = userEvent.setup()
      mockConfirmPasswordReset.execute.mockResolvedValue({
        success: true,
        message: 'Password updated successfully! You can now sign in with your new password.'
      })

      render(<PasswordResetConfirm />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')
      const submitButton = screen.getByRole('button', { name: /update password/i })

      await user.type(newPasswordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /password updated successfully/i })).toBeInTheDocument()
      })

      expect(screen.getByText(/password updated successfully! you can now sign in/i)).toBeInTheDocument()
      expect(screen.getByText(/security tips/i)).toBeInTheDocument()
      expect(screen.getByText(/sign in with your new password to verify it works/i)).toBeInTheDocument()
      expect(screen.getByText(/if you did not request this password reset/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in with new password/i })).toBeInTheDocument()
    })
  })

  describe('Service Integration', () => {
    it('should call passwordResetConfirmService.checkResetSession on mount', () => {
      render(<PasswordResetConfirm />)
      
      expect(mockPasswordResetConfirmService.checkResetSession).toHaveBeenCalled()
    })

    it('should call passwordResetConfirmService.getPasswordRequirements for form display', async () => {
      render(<PasswordResetConfirm />)
      
      await waitFor(() => {
        expect(mockPasswordResetConfirmService.getPasswordRequirements).toHaveBeenCalled()
      })
    })

    it('should call passwordResetConfirmService.getSecurityTips for success state', async () => {
      const user = userEvent.setup()
      mockConfirmPasswordReset.execute.mockResolvedValue({
        success: true,
        message: 'Password updated successfully!'
      })

      render(<PasswordResetConfirm />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })

      // Submit form to reach success state
      const newPasswordInput = screen.getByPlaceholderText('Enter new password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password')
      const submitButton = screen.getByRole('button', { name: /update password/i })

      await user.type(newPasswordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPasswordResetConfirmService.getSecurityTips).toHaveBeenCalled()
      })
    })

    it('should call passwordResetConfirmService.getErrorGuidance for error state', async () => {
      const errorMessage = 'Session expired'
      mockPasswordResetConfirmService.checkResetSession.mockResolvedValue({ 
        isValid: false, 
        error: errorMessage 
      })

      render(<PasswordResetConfirm />)

      await waitFor(() => {
        expect(mockPasswordResetConfirmService.getErrorGuidance).toHaveBeenCalledWith(errorMessage)
      })
    })
  })
})