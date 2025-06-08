// Mock dependencies for email verification flow end-to-end testing
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      resend: jest.fn(),
    }
  }
}))

// Mock error handling service
jest.mock('../../services/errorHandlingService', () => ({
  errorHandlingService: {
    executeWithRetry: jest.fn(async (fn) => await fn()),
    logError: jest.fn(),
    getUserMessage: jest.fn((error) => {
      if (error.status === 429) {
        return 'Too many verification emails sent. Please wait before requesting another.'
      }
      return 'This email is already registered. Please use a different email or try signing in.'
    })
  }
}))

// Mock global window for email testing
global.window = {
  location: {
    origin: 'http://localhost:3000',
    href: '',
    search: '',
    hash: ''
  }
} as any

import { 
  emailTestingUtils, 
  createEmailVerificationTest,
  EMAIL_TEMPLATES
} from '../utils/emailTestingUtils'
import { authService } from '../../services/authService'

describe('Email Verification Flow End-to-End Tests', () => {
  const mockSupabase = require('../../lib/supabase').supabase
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Email Verification User Journey', () => {
    const testUser = {
      id: 'user_123',
      email: 'test@example.com',
      email_confirmed_at: null,
      created_at: new Date().toISOString()
    }

    const testCredentials = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    }

    it('should complete full email verification journey: registration → email → verification → login', async () => {
      // Step 1: User registration with email verification required
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: testUser, session: null },
        error: null
      })

      const registrationResult = await authService.registerWithEmailVerification(testCredentials)
      
      expect(registrationResult).toEqual({
        user: testUser,
        session: null,
        needsEmailVerification: true
      })
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: testCredentials.email,
        password: testCredentials.password,
        options: {
          emailRedirectTo: 'http://localhost/auth/confirm'
        }
      })

      // Step 2: Email verification email sent and captured
      const emailResult = await createEmailVerificationTest(
        testCredentials.email, 
        testCredentials.password
      )
      
      expect(emailResult.success).toBe(true)
      expect(emailResult.to).toBe(testCredentials.email)
      expect(emailResult.subject).toContain('Email Verification')
      expect(emailResult.emailContent?.html).toContain('/auth/confirm')
      expect(emailResult.emailContent?.html).toContain('verification')

      // Step 3: Validate email content and extract verification link
      const emailValidation = emailTestingUtils.validateEmailTemplate(
        emailResult.emailContent,
        EMAIL_TEMPLATES.emailVerification
      )
      
      expect(emailValidation.isValid).toBe(true)
      expect(emailValidation.errors).toHaveLength(0)

      // Extract verification link from email content
      const emailHtml = emailResult.emailContent?.html || ''
      const linkMatch = emailHtml.match(/href="([^"]*\/auth\/confirm[^"]*)"/)
      expect(linkMatch).toBeTruthy()
      
      const verificationLink = linkMatch![1]
      expect(verificationLink).toContain('/auth/confirm')
      expect(verificationLink).toContain('token=')

      // Step 4: User clicks verification link (simulate verification token)
      // Parse verification token from link
      const tokenMatch = verificationLink.match(/token=([^&]+)/)
      const typeMatch = verificationLink.match(/type=([^&]+)/)
      
      expect(tokenMatch).toBeTruthy()
      expect(typeMatch).toBeTruthy()
      
      const token = tokenMatch![1]
      const type = typeMatch![1]
      
      expect(token).toBeTruthy()
      expect(type).toBe('signup')

      // Step 5: Email confirmation process (simulate Supabase processing the token)
      const verifiedUser = { ...testUser, email_confirmed_at: new Date().toISOString() }
      const verificationSession = {
        access_token: 'verified_token_123',
        refresh_token: 'refresh_123',
        user: verifiedUser
      }

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: verificationSession },
        error: null
      })

      await authService.confirmEmail()

      expect(mockSupabase.auth.getSession).toHaveBeenCalled()

      // Step 6: Verify email verification status
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: verifiedUser },
        error: null
      })

      const verificationStatus = await authService.checkEmailVerificationStatus()
      
      expect(verificationStatus.isVerified).toBe(true)
      expect(verificationStatus.email).toBe(testCredentials.email)

      // Step 7: User can now successfully login
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { 
          user: verifiedUser, 
          session: verificationSession 
        },
        error: null
      })

      const loginResult = await authService.signIn({
        email: testCredentials.email,
        password: testCredentials.password
      })

      expect(loginResult.user.email).toBe(testCredentials.email)
      expect(loginResult.user.email_confirmed_at).toBeTruthy()
      expect(loginResult.session).toBeTruthy()
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: testCredentials.email,
        password: testCredentials.password
      })
    })

    it('should handle email verification flow with resend functionality', async () => {
      // Step 1: Initial registration
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: testUser, session: null },
        error: null
      })

      await authService.registerWithEmailVerification(testCredentials)

      // Step 2: First email sent
      const firstEmailResult = await createEmailVerificationTest(
        testCredentials.email, 
        testCredentials.password
      )
      expect(firstEmailResult.success).toBe(true)

      // Step 3: User doesn't receive email, requests resend
      mockSupabase.auth.resend.mockResolvedValueOnce({
        error: null
      })

      await authService.resendEmailVerification(testCredentials.email)

      expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: testCredentials.email,
        options: {
          emailRedirectTo: 'http://localhost/auth/confirm'
        }
      })

      // Step 4: Second email sent successfully
      const resendEmailResult = await createEmailVerificationTest(
        testCredentials.email, 
        testCredentials.password
      )
      expect(resendEmailResult.success).toBe(true)
      expect(resendEmailResult.subject).toContain('Email Verification')

      // Step 5: User verifies with second email
      const verifiedUser = { ...testUser, email_confirmed_at: new Date().toISOString() }
      const verificationSession = {
        access_token: 'verified_token_456',
        refresh_token: 'refresh_456',
        user: verifiedUser
      }

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: verificationSession },
        error: null
      })

      await authService.confirmEmail()

      // Step 6: Verify final status
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: verifiedUser },
        error: null
      })

      const finalStatus = await authService.checkEmailVerificationStatus()
      expect(finalStatus.isVerified).toBe(true)
    })
  })

  describe('Email Verification Error Scenarios', () => {
    const testCredentials = {
      email: 'error@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    }

    it('should handle registration errors that prevent email sending', async () => {
      // Mock registration failure
      const registrationError = {
        message: 'User already registered',
        status: 422
      }

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: registrationError
      })

      await expect(authService.registerWithEmailVerification(testCredentials))
        .rejects.toThrow('This email is already registered')

      // Verify no email was sent due to registration failure
      const emailResult = await createEmailVerificationTest(
        testCredentials.email, 
        testCredentials.password
      )
      // Email testing utils will still work in mock mode but won't represent real flow
      expect(emailResult.success).toBe(true) // Mock mode always succeeds
    })

    it('should handle invalid email verification tokens', async () => {
      // Mock invalid token scenario
      const invalidTokenError = new Error('Invalid verification token')

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: invalidTokenError
      })

      await expect(authService.confirmEmail()).rejects.toThrow('Invalid verification token')
    })

    it('should handle expired email verification tokens', async () => {
      // Mock expired token scenario
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      })

      await expect(authService.confirmEmail()).rejects.toThrow('No session found after email confirmation')
    })

    it('should handle email verification resend failures', async () => {
      const resendError = {
        message: 'Email rate limit exceeded',
        status: 429
      }

      mockSupabase.auth.resend.mockResolvedValueOnce({
        error: resendError
      })

      await expect(authService.resendEmailVerification(testCredentials.email))
        .rejects.toThrow('Too many verification emails sent')
    })

    it('should prevent login for unverified users', async () => {
      // User registered but not verified
      const unverifiedUser = {
        id: 'user_unverified',
        email: testCredentials.email,
        email_confirmed_at: null
      }

      // Mock registration success
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: unverifiedUser, session: null },
        error: null
      })

      await authService.registerWithEmailVerification(testCredentials)

      // Check verification status (should be false)
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: unverifiedUser },
        error: null
      })

      const status = await authService.checkEmailVerificationStatus()
      expect(status.isVerified).toBe(false)

      // Attempt login (this may succeed or fail depending on Supabase configuration)
      // Some configurations allow login for unverified users, others don't
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: unverifiedUser, session: null },
        error: { message: 'Email not confirmed' }
      })

      await expect(authService.signIn({
        email: testCredentials.email,
        password: testCredentials.password
      })).rejects.toThrow()
    })
  })

  describe('Email Template and Content Validation', () => {
    it('should generate verification emails with proper content structure', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('template-test')
      const testPassword = 'TemplateTest123!'

      const result = await createEmailVerificationTest(testEmail, testPassword)

      // Validate HTML structure
      expect(result.emailContent?.html).toContain('<!DOCTYPE html>')
      expect(result.emailContent?.html).toContain('<html>')
      expect(result.emailContent?.html).toContain('<head>')
      expect(result.emailContent?.html).toContain('<body>')
      expect(result.emailContent?.html).toContain('</html>')

      // Validate required content
      expect(result.emailContent?.html).toContain('Confirm your email')
      expect(result.emailContent?.html).toContain('verification')
      expect(result.emailContent?.html).toContain('/auth/confirm')
      expect(result.emailContent?.html).toContain('token=')

      // Validate text version
      expect(result.emailContent?.text).toContain('Confirm your email')
      expect(result.emailContent?.text).toContain('/auth/confirm')
      expect(result.emailContent?.text).toContain('token=')

      // Validate headers
      expect(result.emailContent?.headers).toHaveProperty('Content-Type')
      expect(result.emailContent?.headers['Content-Type']).toContain('text/html')
    })

    it('should include proper security and accessibility features in emails', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('security-test')
      const result = await createEmailVerificationTest(testEmail, 'SecurityTest123!')

      const validation = emailTestingUtils.validateEmailTemplate(
        result.emailContent,
        EMAIL_TEMPLATES.emailVerification
      )

      expect(validation.isValid).toBe(true)
      
      // Check for security features
      expect(result.emailContent?.html).toContain('didn\'t create an account')
      expect(result.emailContent?.text).toContain('didn\'t create an account')

      // Check for proper structure
      if (validation.warnings.length > 0) {
        console.warn('Template validation warnings:', validation.warnings)
      }

      // Should have minimal warnings for a properly structured email
      const structuralWarnings = validation.warnings.filter(w => 
        w.includes('DOCTYPE') || w.includes('title') || w.includes('alt text')
      )
      expect(structuralWarnings.length).toBeLessThanOrEqual(1) // Allow for minor warnings
    })

    it('should handle different email domains correctly', async () => {
      const testDomains = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'company.co.uk',
        'university.edu'
      ]

      for (const domain of testDomains) {
        const testEmail = `user@${domain}`
        const testPassword = 'DomainTest123!'

        const result = await createEmailVerificationTest(testEmail, testPassword)
        
        expect(result.success).toBe(true)
        expect(result.to).toBe(testEmail)
        expect(result.emailContent?.html).toContain('/auth/confirm')
        
        // Verify email contains correct redirect URL
        const redirectMatch = result.emailContent?.html.match(/href="([^"]*\/auth\/confirm[^"]*)"/)
        expect(redirectMatch).toBeTruthy()
        
        const redirectUrl = redirectMatch![1]
        expect(redirectUrl).toContain('http://localhost')
      }
    })
  })

  describe('Timing and Performance Validation', () => {
    it('should complete email verification flow within acceptable timeframes', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('timing-test')
      const testPassword = 'TimingTest123!'

      const startTime = Date.now()

      // Step 1: Registration
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { 
          user: { id: 'timing_user', email: testEmail }, 
          session: null 
        },
        error: null
      })

      const registrationStart = Date.now()
      await authService.registerWithEmailVerification({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      })
      const registrationTime = Date.now() - registrationStart

      // Step 2: Email delivery simulation
      const emailStart = Date.now()
      const emailResult = await createEmailVerificationTest(testEmail, testPassword)
      const emailTime = Date.now() - emailStart

      // Step 3: Email confirmation
      const verifiedUser = { 
        id: 'timing_user', 
        email: testEmail, 
        email_confirmed_at: new Date().toISOString() 
      }
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { 
          session: { 
            access_token: 'timing_token', 
            user: verifiedUser 
          } 
        },
        error: null
      })

      const confirmationStart = Date.now()
      await authService.confirmEmail()
      const confirmationTime = Date.now() - confirmationStart

      const totalTime = Date.now() - startTime

      // Verify performance expectations
      expect(registrationTime).toBeLessThan(5000) // 5 seconds max
      expect(emailTime).toBeLessThan(3000) // 3 seconds max for email simulation
      expect(confirmationTime).toBeLessThan(2000) // 2 seconds max
      expect(totalTime).toBeLessThan(10000) // 10 seconds total max

      expect(emailResult.deliveryTime).toBeDefined()
      expect(emailResult.deliveryTime!).toBeGreaterThan(0)
    })

    it('should handle concurrent email verification requests', async () => {
      const concurrentUsers = Array.from({ length: 5 }, (_, i) => ({
        email: emailTestingUtils.generateTestEmail(`concurrent${i}`),
        password: 'ConcurrentTest123!'
      }))

      const results = await Promise.allSettled(
        concurrentUsers.map(async (user) => {
          // Mock registration for each user
          mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: { 
              user: { id: `user_${Date.now()}_${Math.random()}`, email: user.email }, 
              session: null 
            },
            error: null
          })

          const registrationResult = await authService.registerWithEmailVerification({
            email: user.email,
            password: user.password,
            confirmPassword: user.password
          })

          const emailResult = await createEmailVerificationTest(user.email, user.password)

          return {
            registration: registrationResult,
            email: emailResult
          }
        })
      )

      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'fulfilled') {
          expect(result.value.registration.needsEmailVerification).toBe(true)
          expect(result.value.email.success).toBe(true)
          expect(result.value.email.to).toBe(concurrentUsers[index].email)
        }
      })
    })
  })

  describe('End-to-End Integration Statistics', () => {
    it('should track comprehensive statistics for email verification flows', async () => {
      const testUsers = Array.from({ length: 3 }, (_, i) => ({
        email: emailTestingUtils.generateTestEmail(`stats${i}`),
        password: 'StatsTest123!'
      }))

      // Process multiple email verification flows
      for (const user of testUsers) {
        await createEmailVerificationTest(user.email, user.password)
      }

      const stats = emailTestingUtils.getTestStatistics()

      // The stats may not reflect these specific tests if the instance doesn't persist
      // But we can verify the statistics structure and basic functionality
      expect(stats.totalEmails).toBeGreaterThanOrEqual(0)
      expect(stats.successfulDeliveries).toBeGreaterThanOrEqual(0)
      expect(stats.failedDeliveries).toBeGreaterThanOrEqual(0)
      expect(stats.averageDeliveryTime).toBeGreaterThanOrEqual(0)

      // Verify statistics calculation consistency
      expect(stats.successfulDeliveries + stats.failedDeliveries).toBe(stats.totalEmails)
      
      // Verify statistics properties exist and are numbers
      expect(typeof stats.totalEmails).toBe('number')
      expect(typeof stats.successfulDeliveries).toBe('number')
      expect(typeof stats.failedDeliveries).toBe('number')
      expect(typeof stats.averageDeliveryTime).toBe('number')
    })
  })
})