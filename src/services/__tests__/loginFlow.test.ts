// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    }
  }
}))

// Mock the errorHandlingService
jest.mock('../errorHandlingService', () => ({
  errorHandlingService: {
    executeWithRetry: jest.fn(),
    logError: jest.fn(),
    getUserMessage: jest.fn(),
  }
}))

import { authService } from '../authService'

// Get the mocked modules
const mockSupabase = jest.requireMock('../../lib/supabase').supabase
const mockErrorHandlingService = jest.requireMock('../errorHandlingService').errorHandlingService

describe('User Login Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default successful executeWithRetry behavior
    mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
      try {
        return await fn()
      } catch (error) {
        throw error
      }
    })
    mockErrorHandlingService.getUserMessage.mockReturnValue('Login failed. Please try again.')
  })

  const validCredentials = {
    email: 'user@example.com',
    password: 'SecurePass123!'
  }

  describe('Successful Login Scenarios', () => {
    it('should successfully sign in user with valid credentials', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'user@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
      const mockSession = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        expires_at: Date.now() + 3600000, // 1 hour from now
        user: mockUser
      }
      const mockData = { user: mockUser, session: mockSession }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await authService.signIn(validCredentials)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: validCredentials.email,
        password: validCredentials.password
      })
      expect(result).toBe(mockData)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should handle login with different email formats', async () => {
      const testEmails = [
        'user@gmail.com',
        'test.user@company.co.uk',
        'user+tag@example.org',
        'user_name@subdomain.example.edu'
      ]

      for (const email of testEmails) {
        const credentials = { ...validCredentials, email }
        const mockUser = { id: `user_${Date.now()}`, email }
        const mockSession = { access_token: 'token_123', user: mockUser }
        const mockData = { user: mockUser, session: mockSession }

        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: mockData,
          error: null
        })

        const result = await authService.signIn(credentials)
        
        expect(result.user.email).toBe(email)
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith(
          expect.objectContaining({ email })
        )
      }
    })

    it('should successfully get user session after login', async () => {
      const mockUser = { id: 'user_123', email: 'user@example.com' }
      const mockSession = { access_token: 'token_123', user: mockUser }

      // First login
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      await authService.signIn(validCredentials)

      // Then get current session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null
      })

      const currentSession = await authService.getCurrentSession()
      expect(currentSession).toBe(mockSession)
    })

    it('should successfully get current user after login', async () => {
      const mockUser = { id: 'user_123', email: 'user@example.com' }
      const mockSession = { access_token: 'token_123', user: mockUser }

      // First login
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      await authService.signIn(validCredentials)

      // Then get current user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      })

      const currentUser = await authService.getCurrentUser()
      expect(currentUser).toBe(mockUser)
    })

    it('should handle login followed by logout', async () => {
      const mockUser = { id: 'user_123', email: 'user@example.com' }
      const mockSession = { access_token: 'token_123', user: mockUser }

      // First login
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const loginResult = await authService.signIn(validCredentials)
      expect(loginResult.user).toBe(mockUser)

      // Then logout
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null
      })

      await authService.signOut()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('Invalid Credentials Error Scenarios', () => {
    it('should handle invalid email/password combination', async () => {
      const invalidCredentialsError = {
        message: 'Invalid login credentials',
        status: 400
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: invalidCredentialsError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Invalid email or password. Please check your credentials and try again.')

      await expect(authService.signIn(validCredentials))
        .rejects.toThrow('Invalid email or password. Please check your credentials and try again.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        invalidCredentialsError,
        'signIn'
      )
    })

    it('should handle unconfirmed email account', async () => {
      const unconfirmedEmailError = {
        message: 'Email not confirmed',
        status: 400
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: unconfirmedEmailError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Please verify your email address before signing in. Check your inbox for a verification link.')

      await expect(authService.signIn(validCredentials))
        .rejects.toThrow('Please verify your email address before signing in. Check your inbox for a verification link.')
    })

    it('should handle nonexistent email account', async () => {
      const userNotFoundError = {
        message: 'User not found',
        status: 404
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: userNotFoundError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('No account found with this email address. Please check your email or sign up for a new account.')

      await expect(authService.signIn(validCredentials))
        .rejects.toThrow('No account found with this email address. Please check your email or sign up for a new account.')
    })

    it('should handle account locked/suspended', async () => {
      const accountLockedError = {
        message: 'Account temporarily disabled',
        status: 423
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: accountLockedError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your account has been temporarily disabled. Please contact support for assistance.')

      await expect(authService.signIn(validCredentials))
        .rejects.toThrow('Your account has been temporarily disabled. Please contact support for assistance.')
    })

    it('should handle too many failed login attempts', async () => {
      const rateLimitError = {
        message: 'Too many requests',
        status: 429
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: rateLimitError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Too many failed login attempts. Please wait a few minutes before trying again.')

      await expect(authService.signIn(validCredentials))
        .rejects.toThrow('Too many failed login attempts. Please wait a few minutes before trying again.')
    })

    it('should handle malformed email addresses', async () => {
      const invalidCredentials = [
        { email: 'invalid-email', password: 'password123' },
        { email: '', password: 'password123' },
        { email: 'user@', password: 'password123' },
        { email: '@example.com', password: 'password123' }
      ]

      for (const credentials of invalidCredentials) {
        const malformedEmailError = {
          message: 'Invalid email format',
          status: 400
        }

        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: null,
          error: malformedEmailError
        })

        mockErrorHandlingService.getUserMessage.mockReturnValue('Please enter a valid email address.')

        await expect(authService.signIn(credentials))
          .rejects.toThrow('Please enter a valid email address.')
      }
    })

    it('should handle empty or missing password', async () => {
      const emptyPasswordCredentials = [
        { email: 'user@example.com', password: '' },
        { email: 'user@example.com', password: '   ' }
      ]

      for (const credentials of emptyPasswordCredentials) {
        const missingPasswordError = {
          message: 'Password is required',
          status: 400
        }

        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: null,
          error: missingPasswordError
        })

        mockErrorHandlingService.getUserMessage.mockReturnValue('Password is required.')

        await expect(authService.signIn(credentials))
          .rejects.toThrow('Password is required.')
      }
    })
  })

  describe('Network and Server Error Scenarios', () => {
    it('should handle network connection failures', async () => {
      const networkError = new Error('Network request failed')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(networkError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Connection failed. Please check your internet connection and try again.')

      await expect(authService.signIn(validCredentials))
        .rejects.toMatchObject({
          message: 'Connection failed. Please check your internet connection and try again.',
          originalError: networkError
        })
    })

    it('should handle server errors (500)', async () => {
      const serverError = {
        message: 'Internal server error',
        status: 500
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: serverError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Server error occurred. Please try again later.')

      await expect(authService.signIn(validCredentials))
        .rejects.toThrow('Server error occurred. Please try again later.')
    })

    it('should handle service unavailable errors (503)', async () => {
      const serviceUnavailableError = {
        message: 'Service unavailable',
        status: 503
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: serviceUnavailableError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Authentication service is temporarily unavailable. Please try again in a few minutes.')

      await expect(authService.signIn(validCredentials))
        .rejects.toThrow('Authentication service is temporarily unavailable. Please try again in a few minutes.')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(timeoutError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Login request timed out. Please try again.')

      await expect(authService.signIn(validCredentials))
        .rejects.toMatchObject({
          message: 'Login request timed out. Please try again.',
          originalError: timeoutError
        })
    })

    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('ENOTFOUND: DNS lookup failed')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(dnsError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Cannot connect to authentication server. Please check your connection.')

      await expect(authService.signIn(validCredentials))
        .rejects.toMatchObject({
          message: 'Cannot connect to authentication server. Please check your connection.',
          originalError: dnsError
        })
    })

    it('should handle SSL/TLS certificate errors', async () => {
      const sslError = new Error('SSL certificate verification failed')
      
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(sslError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Secure connection could not be established. Please try again.')

      await expect(authService.signIn(validCredentials))
        .rejects.toMatchObject({
          message: 'Secure connection could not be established. Please try again.',
          originalError: sslError
        })
    })
  })

  describe('Session Management During Login', () => {
    it('should handle login when existing session is expired', async () => {
      // First try to get current session (expired)
      const expiredSessionError = {
        message: 'JWT expired',
        status: 401
      }

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: expiredSessionError
      })

      const currentSession = await authService.getCurrentSession()
      expect(currentSession).toBeNull()

      // Then login with fresh credentials
      const mockUser = { id: 'user_123', email: 'user@example.com' }
      const mockSession = { access_token: 'new_token_123', user: mockUser }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const result = await authService.signIn(validCredentials)
      expect(result.session).toBe(mockSession)
    })

    it('should handle concurrent login attempts', async () => {
      const credentials1 = { ...validCredentials }
      const credentials2 = { ...validCredentials }

      const mockUser = { id: 'user_123', email: validCredentials.email }
      const mockSession1 = { access_token: 'token_1', user: mockUser }
      const mockSession2 = { access_token: 'token_2', user: mockUser }

      // Both login attempts succeed (simulating rapid concurrent requests)
      mockSupabase.auth.signInWithPassword
        .mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession1 },
          error: null
        })
        .mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession2 },
          error: null
        })

      const [result1, result2] = await Promise.allSettled([
        authService.signIn(credentials1),
        authService.signIn(credentials2)
      ])

      expect(result1.status).toBe('fulfilled')
      expect(result2.status).toBe('fulfilled')
      
      if (result1.status === 'fulfilled' && result2.status === 'fulfilled') {
        expect(result1.value.user.email).toBe(validCredentials.email)
        expect(result2.value.user.email).toBe(validCredentials.email)
      }
    })

    it('should handle login with session refresh requirements', async () => {
      const mockUser = { id: 'user_123', email: 'user@example.com' }
      const mockSession = { 
        access_token: 'token_123', 
        refresh_token: 'refresh_123',
        user: mockUser,
        expires_at: Date.now() + 3600000 // 1 hour
      }

      // Initial login
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const loginResult = await authService.signIn(validCredentials)
      expect(loginResult.session.refresh_token).toBe('refresh_123')

      // Simulate session refresh
      const refreshedSession = {
        ...mockSession,
        access_token: 'new_token_456',
        expires_at: Date.now() + 3600000
      }

      mockSupabase.auth.refreshSession.mockResolvedValueOnce({
        data: { session: refreshedSession, user: mockUser },
        error: null
      })

      const refreshResult = await authService.refreshSession()
      expect(refreshResult?.session?.access_token).toBe('new_token_456')
    })
  })

  describe('Login Flow Edge Cases', () => {
    it('should handle login with very long passwords', async () => {
      const longPassword = 'a'.repeat(1000) // Very long password
      const credentialsWithLongPassword = {
        email: 'user@example.com',
        password: longPassword
      }

      const mockUser = { id: 'user_123', email: 'user@example.com' }
      const mockSession = { access_token: 'token_123', user: mockUser }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const result = await authService.signIn(credentialsWithLongPassword)
      expect(result.user.email).toBe('user@example.com')
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({ password: longPassword })
      )
    })

    it('should handle login with special characters in password', async () => {
      const specialPasswords = [
        'Pass@123!',
        'P@$$w0rd#2023',
        'αβγδε123!@#',
        'пароль_123',
        '密码_123!'
      ]

      for (const password of specialPasswords) {
        const credentials = { email: 'user@example.com', password }
        const mockUser = { id: `user_${Date.now()}`, email: 'user@example.com' }
        const mockSession = { access_token: 'token_123', user: mockUser }

        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession },
          error: null
        })

        const result = await authService.signIn(credentials)
        expect(result.user.email).toBe('user@example.com')
      }
    })

    it('should handle null or undefined responses from Supabase', async () => {
      // Test null response
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: null
      })

      await expect(authService.signIn(validCredentials))
        .resolves.toBeNull()

      // Test undefined response
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: undefined,
        error: null
      })

      await expect(authService.signIn(validCredentials))
        .resolves.toBeUndefined()
    })

    it('should handle case sensitivity in email addresses', async () => {
      const emailVariations = [
        'User@Example.com',
        'USER@EXAMPLE.COM',
        'user@EXAMPLE.com',
        'User@example.COM'
      ]

      for (const email of emailVariations) {
        const credentials = { email, password: 'password123' }
        const mockUser = { id: `user_${Date.now()}`, email: email.toLowerCase() }
        const mockSession = { access_token: 'token_123', user: mockUser }

        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession },
          error: null
        })

        const result = await authService.signIn(credentials)
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith(
          expect.objectContaining({ email })
        )
      }
    })
  })

  describe('Integration with Error Handling Service', () => {
    it('should properly retry login on transient failures', async () => {
      const networkError = new Error('Network error')
      
      // Mock executeWithRetry to throw error on first attempt
      mockErrorHandlingService.executeWithRetry.mockRejectedValueOnce(networkError)
      mockErrorHandlingService.getUserMessage.mockReturnValue('Network error occurred. Please try again.')

      await expect(authService.signIn(validCredentials))
        .rejects.toMatchObject({
          message: 'Network error occurred. Please try again.',
          originalError: networkError
        })

      // Verify retry configuration
      jest.clearAllMocks()
      mockErrorHandlingService.executeWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
        return await fn()
      })
      
      const mockUser = { id: 'user_success', email: validCredentials.email }
      const mockSession = { access_token: 'token_success', user: mockUser }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const result = await authService.signIn(validCredentials)
      expect(result.user.id).toBe('user_success')
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )
    })

    it('should log all login errors appropriately', async () => {
      const loginError = new Error('Authentication failed')
      
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: loginError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Login failed. Please try again.')

      try {
        await authService.signIn(validCredentials)
      } catch {
        // Expected to throw
      }

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        loginError,
        'signIn'
      )
    })

    it('should enhance error messages for better user experience', async () => {
      const technicalError = {
        message: 'PGRST301: JWT expired',
        status: 401
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: technicalError
      })

      mockErrorHandlingService.getUserMessage.mockReturnValue('Your session has expired. Please sign in again.')

      await expect(authService.signIn(validCredentials))
        .rejects.toThrow('Your session has expired. Please sign in again.')

      expect(mockErrorHandlingService.logError).toHaveBeenCalledWith(
        technicalError,
        'signIn'
      )
      expect(mockErrorHandlingService.getUserMessage).toHaveBeenCalledWith(technicalError)
    })

    it('should handle different retry configurations for different operations', async () => {
      // Login uses maxAttempts: 2
      const mockUser = { id: 'user_123', email: 'user@example.com' }
      const mockSession = { access_token: 'token_123', user: mockUser }

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      await authService.signIn(validCredentials)
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )

      // getCurrentSession also uses maxAttempts: 2
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null
      })

      await authService.getCurrentSession()
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenLastCalledWith(
        expect.any(Function),
        { maxAttempts: 2 }
      )

      // signOut uses maxAttempts: 1
      mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null })
      await authService.signOut()
      expect(mockErrorHandlingService.executeWithRetry).toHaveBeenLastCalledWith(
        expect.any(Function),
        { maxAttempts: 1 }
      )
    })
  })
}) 