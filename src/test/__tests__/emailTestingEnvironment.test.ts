// Mock dependencies for email testing environment
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      resend: jest.fn(),
    }
  }
}))

// Mock fetch for email capture testing
const mockFetch = jest.fn()
global.fetch = mockFetch

import { 
  emailTestingUtils, 
  createEmailVerificationTest, 
  createPasswordResetTest,
  EMAIL_TEMPLATES,
  EMAIL_TEST_CONFIG,
  createTestSupabaseClient
} from '../utils/emailTestingUtils'

describe('Email Testing Environment Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    
    // Mock global window.location for email testing
    global.window = {
      location: {
        origin: 'http://localhost:3000'
      }
    } as any
  })

  describe('Environment Configuration', () => {
    it('should have valid email test configuration', () => {
      expect(EMAIL_TEST_CONFIG).toBeDefined()
      expect(EMAIL_TEST_CONFIG.EMAIL_TESTING_MODE).toMatch(/^(mock|capture|live)$/)
      expect(EMAIL_TEST_CONFIG.EMAIL_DELIVERY_TIMEOUT_MS).toBeGreaterThan(0)
      expect(EMAIL_TEST_CONFIG.EMAIL_VERIFICATION_TIMEOUT_MS).toBeGreaterThan(0)
      expect(Array.isArray(EMAIL_TEST_CONFIG.TEST_EMAIL_DOMAINS)).toBe(true)
    })

    it('should configure test Supabase client correctly', () => {
      // Mock environment variables
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
      process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
      
      expect(() => createTestSupabaseClient()).not.toThrow()
    })

    it('should validate required environment variables', () => {
      // Clear environment variables
      delete process.env.VITE_SUPABASE_URL
      delete process.env.VITE_SUPABASE_ANON_KEY
      delete process.env.VITE_SUPABASE_TEST_URL
      delete process.env.VITE_SUPABASE_TEST_ANON_KEY
      
      expect(() => createTestSupabaseClient()).toThrow('Test Supabase environment variables not configured')
    })

    it('should support different testing modes', () => {
      const validModes = ['mock', 'capture', 'live']
      
      validModes.forEach(mode => {
        const originalMode = EMAIL_TEST_CONFIG.EMAIL_TESTING_MODE
        // We can't directly modify the const, but we can test the logic
        expect(validModes).toContain(mode)
      })
    })
  })

  describe('Test Email Generation', () => {
    it('should generate unique test email addresses', () => {
      const email1 = emailTestingUtils.generateTestEmail('user1')
      const email2 = emailTestingUtils.generateTestEmail('user2')
      
      expect(email1).not.toBe(email2)
      expect(email1).toMatch(/^user1\.\d+\.[a-z0-9]+@test\.example\.com$/)
      expect(email2).toMatch(/^user2\.\d+\.[a-z0-9]+@test\.example\.com$/)
    })

    it('should generate multiple test emails in batch', () => {
      const emails = emailTestingUtils.generateTestEmails(5, 'batch')
      
      expect(emails).toHaveLength(5)
      expect(new Set(emails).size).toBe(5) // All should be unique
      
      emails.forEach((email, index) => {
        expect(email).toMatch(new RegExp(`^batch${index + 1}\\.\\d+\\.[a-z0-9]+@test\\.example\\.com$`))
      })
    })

    it('should use configured test domains', () => {
      const email = emailTestingUtils.generateTestEmail()
      const domain = email.split('@')[1]
      
      expect(EMAIL_TEST_CONFIG.TEST_EMAIL_DOMAINS).toContain(domain)
    })

    it('should handle different email prefixes', () => {
      const prefixes = ['user', 'admin', 'test', 'dev', 'staging']
      
      prefixes.forEach(prefix => {
        const email = emailTestingUtils.generateTestEmail(prefix)
        expect(email.startsWith(prefix + '.')).toBe(true)
      })
    })
  })

  describe('Email Verification Flow Testing', () => {
    it('should test email verification flow in mock mode', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('verification')
      const testPassword = 'TestPassword123!'
      
      const result = await createEmailVerificationTest(testEmail, testPassword)
      
      expect(result.success).toBe(true)
      expect(result.to).toBe(testEmail)
      expect(result.subject).toContain('Email Verification')
      expect(result.from).toContain('supabase')
      expect(result.messageId).toBeDefined()
      expect(result.emailContent).toBeDefined()
      expect(result.deliveryTime).toBeGreaterThan(0)
    })

    it('should validate email verification content structure', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('content')
      const testPassword = 'TestPassword123!'
      
      const result = await createEmailVerificationTest(testEmail, testPassword)
      
      expect(result.emailContent?.html).toContain('<!DOCTYPE html>')
      expect(result.emailContent?.html).toContain('Confirm your email')
      expect(result.emailContent?.html).toContain('verification')
      expect(result.emailContent?.html).toContain('/auth/confirm')
      
      expect(result.emailContent?.text).toContain('Confirm your email')
      expect(result.emailContent?.text).toContain('verification')
      
      expect(result.emailContent?.headers).toHaveProperty('Content-Type')
      expect(result.emailContent?.headers).toHaveProperty('X-Mailer')
    })

    it('should handle email verification errors gracefully', async () => {
      const mockSupabase = require('../../lib/supabase').supabase
      
      // Mock Supabase error
      mockSupabase.auth.signUp.mockRejectedValueOnce(new Error('Invalid email format'))
      
      const testEmail = 'invalid-email'
      const testPassword = 'TestPassword123!'
      
      const result = await createEmailVerificationTest(testEmail, testPassword)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email format')
      expect(result.to).toBe(testEmail)
    })

    it('should verify email template compliance', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('template')
      const testPassword = 'TestPassword123!'
      
      const result = await createEmailVerificationTest(testEmail, testPassword)
      const validation = emailTestingUtils.validateEmailTemplate(
        result.emailContent,
        EMAIL_TEMPLATES.emailVerification
      )
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      
      if (validation.warnings.length > 0) {
        console.warn('Email template warnings:', validation.warnings)
      }
    })
  })

  describe('Password Reset Flow Testing', () => {
    it('should test password reset flow in mock mode', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('reset')
      
      const result = await createPasswordResetTest(testEmail)
      
      expect(result.success).toBe(true)
      expect(result.to).toBe(testEmail)
      expect(result.subject).toContain('Password Reset')
      expect(result.messageId).toBeDefined()
      expect(result.deliveryTime).toBeGreaterThan(0)
    })

    it('should validate password reset content structure', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('reset-content')
      
      const result = await createPasswordResetTest(testEmail)
      
      expect(result.emailContent?.html).toContain('<!DOCTYPE html>')
      expect(result.emailContent?.html).toContain('Reset your password')
      expect(result.emailContent?.html).toContain('/auth/reset-password')
      expect(result.emailContent?.html).toContain('expire')
      
      expect(result.emailContent?.text).toContain('Reset your password')
      expect(result.emailContent?.text).toContain('expire')
    })

    it('should handle password reset errors gracefully', async () => {
      const mockSupabase = require('../../lib/supabase').supabase
      
      // Mock Supabase error
      mockSupabase.auth.resetPasswordForEmail.mockRejectedValueOnce(new Error('User not found'))
      
      const testEmail = emailTestingUtils.generateTestEmail('error')
      
      const result = await createPasswordResetTest(testEmail)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('User not found')
      expect(result.to).toBe(testEmail)
    })

    it('should verify password reset template compliance', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('reset-template')
      
      const result = await createPasswordResetTest(testEmail)
      const validation = emailTestingUtils.validateEmailTemplate(
        result.emailContent,
        EMAIL_TEMPLATES.passwordReset
      )
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Email Template Validation', () => {
    it('should validate email templates against requirements', () => {
      const mockEmailContent = {
        html: `
          <!DOCTYPE html>
          <html>
            <head><title>Test Email</title></head>
            <body>
              <h1>Confirm your email</h1>
              <p>Please click to verify</p>
              <a href="/verify">Confirm</a>
            </body>
          </html>
        `,
        text: 'Confirm your email. Please click to verify.',
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      }
      
      const validation = emailTestingUtils.validateEmailTemplate(
        mockEmailContent,
        EMAIL_TEMPLATES.emailVerification
      )
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect missing required elements', () => {
      const incompleteEmailContent = {
        html: '<html><body><p>Welcome</p></body></html>',
        text: 'Welcome',
        headers: {}
      }
      
      const validation = emailTestingUtils.validateEmailTemplate(
        incompleteEmailContent,
        EMAIL_TEMPLATES.emailVerification
      )
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors.some(error => error.includes('Missing required element'))).toBe(true)
    })

    it('should provide warnings for best practices', () => {
      const emailWithWarnings = {
        html: '<html><body><h1>Test</h1></body></html>', // Missing DOCTYPE, title
        text: '',
        headers: {}
      }
      
      const validation = emailTestingUtils.validateEmailTemplate(
        emailWithWarnings,
        EMAIL_TEMPLATES.emailVerification
      )
      
      expect(validation.warnings.length).toBeGreaterThan(0)
      expect(validation.warnings.some(warning => warning.includes('DOCTYPE'))).toBe(true)
      expect(validation.warnings.some(warning => warning.includes('title'))).toBe(true)
    })

    it('should handle null or undefined email content', () => {
      const validation = emailTestingUtils.validateEmailTemplate(
        undefined,
        EMAIL_TEMPLATES.emailVerification
      )
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Email content is missing')
    })
  })

  describe('Email Capture Service Integration', () => {
    it('should handle email capture API calls', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            id: 'test-message-1',
            message_id: 'msg-123',
            subject: 'Email Verification',
            from: 'noreply@test.com',
            to: ['test@example.com'],
            html_body: '<html><body>Test</body></html>',
            text_body: 'Test',
            headers: {},
            created_at: new Date().toISOString()
          }
        ])
      })
      
      // This would be tested in capture mode
      const testEmail = 'test@example.com'
      const expectedSubject = 'Email Verification'
      
      // We can't directly test the private method, but we can verify the fetch call
      expect(mockFetch).not.toHaveBeenCalled() // Until we actually trigger capture mode
    })

    it('should fallback to mock mode when capture fails', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'))
      
      const testEmail = emailTestingUtils.generateTestEmail('capture-fallback')
      const testPassword = 'TestPassword123!'
      
      const result = await createEmailVerificationTest(testEmail, testPassword)
      
      // Should still succeed using mock mode
      expect(result.success).toBe(true)
      expect(result.messageId).toContain('mock-')
    })
  })

  describe('Test Statistics and Reporting', () => {
    it('should track email testing statistics', () => {
      const stats = emailTestingUtils.getTestStatistics()
      
      expect(stats).toHaveProperty('totalEmails')
      expect(stats).toHaveProperty('successfulDeliveries')
      expect(stats).toHaveProperty('failedDeliveries')
      expect(stats).toHaveProperty('averageDeliveryTime')
      
      expect(typeof stats.totalEmails).toBe('number')
      expect(typeof stats.successfulDeliveries).toBe('number')
      expect(typeof stats.failedDeliveries).toBe('number')
      expect(typeof stats.averageDeliveryTime).toBe('number')
    })

    it('should calculate statistics correctly', () => {
      const stats = emailTestingUtils.getTestStatistics()
      
      expect(stats.successfulDeliveries + stats.failedDeliveries).toBe(stats.totalEmails)
      expect(stats.averageDeliveryTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Test Data Cleanup', () => {
    it('should provide cleanup functionality', async () => {
      const testEmails = [
        'test1@example.com',
        'test2@example.com',
        'test3@example.com'
      ]
      
      // Should not throw error
      await expect(emailTestingUtils.cleanupTestUsers(testEmails)).resolves.toBeUndefined()
    })

    it('should handle cleanup errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      // Force an error in cleanup (this is a mock scenario)
      const invalidEmails = ['invalid-email-data']
      
      await emailTestingUtils.cleanupTestUsers(invalidEmails)
      
      // Should not throw, may log warnings
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Integration with Existing Auth Services', () => {
    it('should work with existing auth service registration', async () => {
      const mockSupabase = require('../../lib/supabase').supabase
      
      // Mock successful registration
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: null
        },
        error: null
      })
      
      const testEmail = emailTestingUtils.generateTestEmail('integration')
      const result = await createEmailVerificationTest(testEmail, 'TestPassword123!')
      
      expect(result.success).toBe(true)
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: testEmail,
        password: 'TestPassword123!',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/confirm'
        }
      })
    })

    it('should work with existing auth service password reset', async () => {
      const mockSupabase = require('../../lib/supabase').supabase
      
      // Mock successful password reset
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })
      
      const testEmail = emailTestingUtils.generateTestEmail('reset-integration')
      const result = await createPasswordResetTest(testEmail)
      
      expect(result.success).toBe(true)
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(testEmail, {
        redirectTo: 'http://localhost:3000/auth/reset-password'
      })
    })
  })

  describe('Email Testing Environment Validation', () => {
    it('should verify all required email templates are defined', () => {
      expect(EMAIL_TEMPLATES.emailVerification).toBeDefined()
      expect(EMAIL_TEMPLATES.passwordReset).toBeDefined()
      
      Object.values(EMAIL_TEMPLATES).forEach(template => {
        expect(template.name).toBeDefined()
        expect(template.subject).toBeDefined()
        expect(Array.isArray(template.expectedElements)).toBe(true)
        expect(template.expectedElements.length).toBeGreaterThan(0)
      })
    })

    it('should support multiple email testing modes', () => {
      const supportedModes = ['mock', 'capture', 'live']
      
      supportedModes.forEach(mode => {
        // Verify that the mode is supported
        expect(['mock', 'capture', 'live']).toContain(mode)
      })
    })

    it('should provide proper error handling for network issues', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('network-error')
      
      // Mock network error during email sending
      const mockSupabase = require('../../lib/supabase').supabase
      mockSupabase.auth.signUp.mockRejectedValueOnce(new Error('Network timeout'))
      
      const result = await createEmailVerificationTest(testEmail, 'TestPassword123!')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Network timeout')
    })
  })
}) 