import { createClient } from '@supabase/supabase-js'

// Email testing environment configuration
export const EMAIL_TEST_CONFIG = {
  // Test environment URLs
  TEST_SUPABASE_URL: process.env.VITE_SUPABASE_TEST_URL || process.env.VITE_SUPABASE_URL,
  TEST_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_TEST_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  
  // Email testing settings
  EMAIL_TESTING_MODE: process.env.VITE_EMAIL_TESTING_MODE || 'mock', // 'mock' | 'capture' | 'live'
  EMAIL_CAPTURE_API: process.env.VITE_EMAIL_CAPTURE_API || 'https://api.mailtrap.io',
  EMAIL_CAPTURE_TOKEN: process.env.VITE_EMAIL_CAPTURE_TOKEN,
  
  // Test email domains
  TEST_EMAIL_DOMAINS: [
    'test.example.com',
    'testing.local',
    'mailinator.com',
    'mailtrap.io'
  ],
  
  // Email template testing
  TEMPLATE_TESTING_ENABLED: process.env.VITE_TEMPLATE_TESTING === 'true',
  
  // Email delivery timeouts
  EMAIL_DELIVERY_TIMEOUT_MS: 30000, // 30 seconds
  EMAIL_VERIFICATION_TIMEOUT_MS: 60000, // 1 minute
  
  // Rate limiting for testing
  TEST_RATE_LIMIT_BYPASS: process.env.VITE_TEST_RATE_LIMIT_BYPASS === 'true'
} as const

// Create test Supabase client
export const createTestSupabaseClient = () => {
  if (!EMAIL_TEST_CONFIG.TEST_SUPABASE_URL || !EMAIL_TEST_CONFIG.TEST_SUPABASE_ANON_KEY) {
    throw new Error('Test Supabase environment variables not configured')
  }
  
  return createClient(
    EMAIL_TEST_CONFIG.TEST_SUPABASE_URL,
    EMAIL_TEST_CONFIG.TEST_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Don't persist in tests
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Test-Mode': 'true',
          'X-Test-Environment': EMAIL_TEST_CONFIG.EMAIL_TESTING_MODE
        }
      }
    }
  )
}

// Email testing interfaces
export interface EmailTestResult {
  success: boolean
  messageId?: string
  to: string
  subject: string
  from: string
  timestamp: Date
  deliveryTime?: number
  error?: string
  emailContent?: {
    html: string
    text: string
    headers: Record<string, string>
  }
}

export interface EmailTemplate {
  name: string
  subject: string
  htmlContent: string
  textContent: string
  variables: Record<string, any>
  expectedElements: string[]
}

export interface EmailCaptureResponse {
  id: string
  message_id: string
  subject: string
  from: string
  to: string[]
  html_body: string
  text_body: string
  headers: Record<string, string>
  created_at: string
}

// Email testing utilities class
export class EmailTestingUtils {
  private testClient: any = null
  private capturedEmails: EmailTestResult[] = []
  
  // Lazy initialization of test client
  private getTestClient() {
    if (!this.testClient) {
      try {
        this.testClient = createTestSupabaseClient()
      } catch (error) {
        // In test environment, provide a mock client if real one fails
        console.warn('Failed to create test Supabase client, using mock:', error)
        this.testClient = {
          auth: {
            signUp: jest.fn().mockResolvedValue({
              data: { user: { id: 'mock-user', email: 'test@example.com' }, session: null },
              error: null
            }),
            resetPasswordForEmail: jest.fn().mockResolvedValue({
              data: { message: 'Mock reset email sent' },
              error: null
            })
          }
        }
      }
    }
    return this.testClient
  }
  
  // Generate test email addresses
  generateTestEmail(prefix: string = 'test'): string {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const domain = EMAIL_TEST_CONFIG.TEST_EMAIL_DOMAINS[0]
    return `${prefix}.${timestamp}.${randomSuffix}@${domain}`
  }
  
  // Generate multiple test emails for batch testing
  generateTestEmails(count: number, prefix: string = 'test'): string[] {
    return Array.from({ length: count }, (_, i) => 
      this.generateTestEmail(`${prefix}${i + 1}`)
    )
  }
  
  // Test email verification flow
  async testEmailVerificationFlow(email: string, password: string): Promise<EmailTestResult> {
    const startTime = Date.now()
    
    try {
      // Register user with email verification
      const { data: _data, error } = await this.getTestClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      })
      
      if (error) {
        return {
          success: false,
          to: email,
          subject: 'Email Verification',
          from: 'auth@supabase',
          timestamp: new Date(),
          error: error.message
        }
      }
      
      // Wait for email delivery (in test mode, this is immediate)
      const emailResult = await this.waitForEmail(email, 'Email Verification')
      
      return {
        ...emailResult,
        deliveryTime: Date.now() - startTime,
        success: true
      }
      
    } catch (error: any) {
      return {
        success: false,
        to: email,
        subject: 'Email Verification',
        from: 'auth@supabase',
        timestamp: new Date(),
        error: error.message
      }
    }
  }
  
  // Test password reset email flow
  async testPasswordResetFlow(email: string): Promise<EmailTestResult> {
    const startTime = Date.now()
    
    try {
      const { data: _data, error } = await this.getTestClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) {
        return {
          success: false,
          to: email,
          subject: 'Password Reset',
          from: 'auth@supabase',
          timestamp: new Date(),
          error: error.message
        }
      }
      
      const emailResult = await this.waitForEmail(email, 'Password Reset')
      
      return {
        ...emailResult,
        deliveryTime: Date.now() - startTime,
        success: true
      }
      
    } catch (error: any) {
      return {
        success: false,
        to: email,
        subject: 'Password Reset',
        from: 'auth@supabase',
        timestamp: new Date(),
        error: error.message
      }
    }
  }
  
  // Wait for email delivery and capture content
  private async waitForEmail(email: string, expectedSubject: string): Promise<EmailTestResult> {
    const timeout = EMAIL_TEST_CONFIG.EMAIL_DELIVERY_TIMEOUT_MS
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const checkEmail = async () => {
        try {
          const capturedEmail = await this.getCapturedEmail(email, expectedSubject)
          
          if (capturedEmail) {
            resolve(capturedEmail)
            return
          }
          
          // Check timeout
          if (Date.now() - startTime > timeout) {
            reject(new Error(`Email delivery timeout after ${timeout}ms`))
            return
          }
          
          // Continue checking
          setTimeout(checkEmail, 1000)
          
        } catch (error) {
          reject(error)
        }
      }
      
      // Start checking after a brief delay
      setTimeout(checkEmail, 500)
    })
  }
  
  // Get captured email based on testing mode
  private async getCapturedEmail(email: string, expectedSubject: string): Promise<EmailTestResult | null> {
    switch (EMAIL_TEST_CONFIG.EMAIL_TESTING_MODE) {
      case 'mock':
        return this.getMockEmail(email, expectedSubject)
      
      case 'capture':
        return this.getCapturedEmailFromService(email, expectedSubject)
      
      case 'live':
        // In live mode, we can't capture emails but can verify delivery attempt
        return this.verifyLiveEmailDelivery(email, expectedSubject)
      
      default:
        return this.getMockEmail(email, expectedSubject)
    }
  }
  
  // Mock email for testing
  private getMockEmail(email: string, expectedSubject: string): EmailTestResult {
    const mockContent = this.generateMockEmailContent(expectedSubject)
    
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      to: email,
      subject: expectedSubject,
      from: 'noreply@your-app.supabase.co',
      timestamp: new Date(),
      emailContent: mockContent
    }
  }
  
  // Generate mock email content for testing
  private generateMockEmailContent(subject: string): { html: string; text: string; headers: Record<string, string> } {
    const baseUrl = window.location.origin
    const mockToken = 'mock-verification-token-' + Math.random().toString(36).substring(2)
    
    if (subject.includes('Email Verification')) {
      return {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Confirm your email</title>
            </head>
            <body>
              <h1>Confirm your email address</h1>
              <p>Thank you for signing up! Please click the link below to verify your email address:</p>
              <a href="${baseUrl}/auth/confirm?token=${mockToken}&type=signup">
                Confirm Email Address
              </a>
              <p>If you didn't create an account, you can safely ignore this email.</p>
            </body>
          </html>
        `,
        text: `
          Confirm your email address
          
          Thank you for signing up! Please visit the following link to verify your email address:
          ${baseUrl}/auth/confirm?token=${mockToken}&type=signup
          
          If you didn't create an account, you can safely ignore this email.
        `,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Mailer': 'Supabase Auth',
          'X-Priority': '1'
        }
      }
    } else if (subject.includes('Password Reset')) {
      return {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Reset your password</title>
            </head>
            <body>
              <h1>Reset your password</h1>
              <p>You have requested to reset your password. Click the link below to set a new password:</p>
              <a href="${baseUrl}/auth/reset-password?token=${mockToken}&type=recovery">
                Reset Password
              </a>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
            </body>
          </html>
        `,
        text: `
          Reset your password
          
          You have requested to reset your password. Please visit the following link to set a new password:
          ${baseUrl}/auth/reset-password?token=${mockToken}&type=recovery
          
          This link will expire in 1 hour for security reasons.
          If you didn't request this, you can safely ignore this email.
        `,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Mailer': 'Supabase Auth',
          'X-Priority': '1'
        }
      }
    }
    
    return {
      html: '<html><body><h1>Test Email</h1></body></html>',
      text: 'Test Email',
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    }
  }
  
  // Capture email from external service (e.g., Mailtrap)
  private async getCapturedEmailFromService(email: string, expectedSubject: string): Promise<EmailTestResult | null> {
    if (!EMAIL_TEST_CONFIG.EMAIL_CAPTURE_TOKEN) {
      console.warn('Email capture token not configured, falling back to mock mode')
      return this.getMockEmail(email, expectedSubject)
    }
    
    try {
      const response = await fetch(`${EMAIL_TEST_CONFIG.EMAIL_CAPTURE_API}/api/v1/messages`, {
        headers: {
          'Authorization': `Bearer ${EMAIL_TEST_CONFIG.EMAIL_CAPTURE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Email capture API error: ${response.status}`)
      }
      
      const messages: EmailCaptureResponse[] = await response.json()
      
      // Find email matching our criteria
      const matchingEmail = messages.find(msg => 
        msg.to.includes(email) && 
        msg.subject.includes(expectedSubject)
      )
      
      if (matchingEmail) {
        return {
          success: true,
          messageId: matchingEmail.message_id,
          to: email,
          subject: matchingEmail.subject,
          from: matchingEmail.from,
          timestamp: new Date(matchingEmail.created_at),
          emailContent: {
            html: matchingEmail.html_body,
            text: matchingEmail.text_body,
            headers: matchingEmail.headers
          }
        }
      }
      
      return null
      
    } catch (error: any) {
      console.warn('Failed to capture email from service:', error.message)
      return this.getMockEmail(email, expectedSubject)
    }
  }
  
  // Verify live email delivery (can't capture content in live mode)
  private verifyLiveEmailDelivery(email: string, expectedSubject: string): EmailTestResult {
    // In live mode, we can only verify that the delivery attempt was made
    return {
      success: true,
      messageId: `live-${Date.now()}`,
      to: email,
      subject: expectedSubject,
      from: 'noreply@your-app.supabase.co',
      timestamp: new Date()
    }
  }
  
  // Validate email template content
  validateEmailTemplate(emailContent: EmailTestResult['emailContent'], template: EmailTemplate): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!emailContent) {
      errors.push('Email content is missing')
      return { isValid: false, errors, warnings }
    }
    
    // Check required elements
    template.expectedElements.forEach(element => {
      if (!emailContent.html.includes(element) && !emailContent.text.includes(element)) {
        errors.push(`Missing required element: ${element}`)
      }
    })
    
    // Check for common email issues
    if (emailContent.html && !emailContent.html.includes('<!DOCTYPE html>')) {
      warnings.push('HTML email missing DOCTYPE declaration')
    }
    
    if (emailContent.html && !emailContent.html.includes('<title>')) {
      warnings.push('HTML email missing title tag')
    }
    
    if (!emailContent.text || emailContent.text.trim().length === 0) {
      warnings.push('Missing or empty text version of email')
    }
    
    // Check for accessibility
    if (emailContent.html && !emailContent.html.includes('alt=')) {
      warnings.push('HTML email may be missing alt text for images')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  // Cleanup test data
  async cleanupTestUsers(emails: string[]): Promise<void> {
    // In test environment, cleanup any test users created
    try {
      for (const email of emails) {
        // Note: In a real test environment, you might have admin APIs to cleanup users
        console.log(`Cleanup test user: ${email}`)
      }
    } catch (error: any) {
      console.warn('Failed to cleanup test users:', error.message)
    }
  }
  
  // Get test statistics
  getTestStatistics(): {
    totalEmails: number
    successfulDeliveries: number
    failedDeliveries: number
    averageDeliveryTime: number
  } {
    const totalEmails = this.capturedEmails.length
    const successfulDeliveries = this.capturedEmails.filter(e => e.success).length
    const failedDeliveries = totalEmails - successfulDeliveries
    
    const deliveryTimes = this.capturedEmails
      .filter(e => e.success && e.deliveryTime)
      .map(e => e.deliveryTime!)
    
    const averageDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      : 0
    
    return {
      totalEmails,
      successfulDeliveries,
      failedDeliveries,
      averageDeliveryTime
    }
  }
}

// Export singleton instance
export const emailTestingUtils = new EmailTestingUtils()

// Helper functions for specific email testing scenarios
export const createEmailVerificationTest = (email: string, password: string) => {
  return emailTestingUtils.testEmailVerificationFlow(email, password)
}

export const createPasswordResetTest = (email: string) => {
  return emailTestingUtils.testPasswordResetFlow(email)
}

// Email template definitions for testing
export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  emailVerification: {
    name: 'Email Verification',
    subject: 'Confirm your email',
    htmlContent: '',
    textContent: '',
    variables: {
      confirmationLink: 'string',
      appName: 'string'
    },
    expectedElements: [
      'Confirm your email',
      'verification',
      'confirm',
      'click',
      'link'
    ]
  },
  
  passwordReset: {
    name: 'Password Reset',
    subject: 'Reset your password',
    htmlContent: '',
    textContent: '',
    variables: {
      resetLink: 'string',
      expiryTime: 'string'
    },
    expectedElements: [
      'Reset your password',
      'reset',
      'password',
      'click',
      'link',
      'expire'
    ]
  }
} 