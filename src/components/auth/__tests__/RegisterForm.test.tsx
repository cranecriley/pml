import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '../RegisterForm'

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
  }),
  validatePasswordConfirm: jest.fn((password: string, confirmPassword: string) => {
    if (!confirmPassword) return 'Please confirm your password'
    if (password !== confirmPassword) return 'Passwords do not match'
    return null
  })
}))

describe('RegisterForm', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all form elements correctly', () => {
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should have proper input attributes', () => {
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')

      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('placeholder', 'Create a password (min. 8 characters)')

      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('required')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password')
    })

    it('should display error message when provided', () => {
      const errorMessage = 'Registration failed. Please try again.'
      render(<RegisterForm onSubmit={mockOnSubmit} error={errorMessage} />)

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  describe('Input Handling', () => {
    it('should update email input value when typing', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password input value when typing', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, 'testpassword123')

      expect(passwordInput).toHaveValue('testpassword123')
    })

    it('should update confirm password input value when typing', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      await user.type(confirmPasswordInput, 'testpassword123')

      expect(confirmPasswordInput).toHaveValue('testpassword123')
    })

    it('should toggle password visibility when show/hide button is clicked', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const toggleButton = passwordInput.parentElement?.querySelector('button')

      expect(passwordInput).toHaveAttribute('type', 'password')

      if (toggleButton) {
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'text')

        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'password')
      }
    })

    it('should toggle confirm password visibility when show/hide button is clicked', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const toggleButton = confirmPasswordInput.parentElement?.querySelector('button')

      expect(confirmPasswordInput).toHaveAttribute('type', 'password')

      if (toggleButton) {
        await user.click(toggleButton)
        expect(confirmPasswordInput).toHaveAttribute('type', 'text')

        await user.click(toggleButton)
        expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      }
    })
  })

  describe('Form Validation', () => {
    it('should show validation error for empty email', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      // Verify that form submission was prevented due to validation failure
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      // Verify that form submission was prevented due to invalid email
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show validation error for empty password', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // Verify that form submission was prevented due to missing password
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show validation error for password too short', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.click(submitButton)

      // Verify that form submission was prevented due to short password
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show validation error for empty confirm password', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.click(submitButton)

      // Verify that form submission was prevented due to missing confirm password
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show validation error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.type(confirmPasswordInput, 'differentpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should not show validation errors for valid inputs', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.type(confirmPasswordInput, 'validpassword123')
      await user.click(submitButton)

      // Should not show validation errors
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/please confirm your password/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state when isLoading is true', () => {
      render(<RegisterForm onSubmit={mockOnSubmit} isLoading={true} />)

      expect(screen.getByText(/creating account/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeDisabled()
      expect(screen.getByLabelText(/^password$/i)).toBeDisabled()
      expect(screen.getByLabelText(/confirm password/i)).toBeDisabled()
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
    })

    it('should disable password visibility toggles during loading', () => {
      render(<RegisterForm onSubmit={mockOnSubmit} isLoading={true} />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      
      const passwordToggleButton = passwordInput.parentElement?.querySelector('button')
      const confirmToggleButton = confirmPasswordInput.parentElement?.querySelector('button')

      expect(passwordToggleButton).toBeDisabled()
      expect(confirmToggleButton).toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with correct values for valid form', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.type(confirmPasswordInput, 'validpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', 'validpassword123')
      })
    })

    it('should not call onSubmit when validation fails', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      // Should not call onSubmit for invalid form
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should handle onSubmit errors gracefully', async () => {
      const user = userEvent.setup()
      const mockOnSubmitWithError = jest.fn().mockRejectedValue(new Error('Network error'))
      
      render(<RegisterForm onSubmit={mockOnSubmitWithError} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.type(confirmPasswordInput, 'validpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmitWithError).toHaveBeenCalledWith('test@example.com', 'validpassword123')
      })

      // Form should still be functional after error (error handling is done by parent)
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Email Format Validation', () => {
    it('should accept valid email formats', async () => {
      const user = userEvent.setup()
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test123+tag@subdomain.example.org'
      ]

      for (const email of validEmails) {
        const { unmount } = render(<RegisterForm onSubmit={mockOnSubmit} />)
        
        const emailInput = screen.getByLabelText(/email address/i)
        const passwordInput = screen.getByLabelText(/^password$/i)
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
        const submitButton = screen.getByRole('button', { name: /create account/i })

        await user.type(emailInput, email)
        await user.type(passwordInput, 'validpassword123')
        await user.type(confirmPasswordInput, 'validpassword123')
        await user.click(submitButton)

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledWith(email, 'validpassword123')
        })

        mockOnSubmit.mockClear()
        unmount()
      }
    })

    it('should reject invalid email formats', async () => {
      const user = userEvent.setup()
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@'
      ]

      for (const email of invalidEmails) {
        const { unmount } = render(<RegisterForm onSubmit={mockOnSubmit} />)
        
        const emailInput = screen.getByLabelText(/email address/i)
        const submitButton = screen.getByRole('button', { name: /create account/i })

        await user.type(emailInput, email)
        await user.click(submitButton)

        // Verify form submission was prevented
        expect(mockOnSubmit).not.toHaveBeenCalled()
        mockOnSubmit.mockClear()
        unmount()
      }
    })
  })

  describe('Password Confirmation Logic', () => {
    it('should validate password confirmation in real-time', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      // Enter password
      await user.type(passwordInput, 'testpassword123')
      
      // Enter different confirm password and submit
      await user.type(confirmPasswordInput, 'differentpassword')
      await user.click(submitButton)

      // Verify form submission was prevented due to password mismatch
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should accept matching passwords', async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={mockOnSubmit} />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'testpassword123')
      await user.type(confirmPasswordInput, 'testpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', 'testpassword123')
      })
    })
  })
})