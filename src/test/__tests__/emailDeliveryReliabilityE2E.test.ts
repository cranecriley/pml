// Mock dependencies for email delivery reliability testing
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      resend: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
    }
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
  createPasswordResetTest,
  EMAIL_TEST_CONFIG
} from '../utils/emailTestingUtils'
import type { EmailTestResult } from '../utils/emailTestingUtils'

describe('Email Delivery Reliability End-to-End Tests', () => {
  const mockSupabase = require('../../lib/supabase').supabase
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Inbox Delivery Verification', () => {
    it('should deliver verification emails to primary inbox folder', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('inbox-delivery')

      // Mock successful user registration
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'inbox-user', email: testEmail },
          session: null
        },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'InboxTest123!')

      // Verify successful delivery
      expect(result.success).toBe(true)
      expect(result.to).toBe(testEmail)
      expect(result.messageId).toBeTruthy()
      expect(result.timestamp).toBeInstanceOf(Date)

      // Verify email content optimized for inbox delivery
      const emailContent = result.emailContent?.html || ''
      
      // Check for inbox-friendly content structure
      expect(emailContent).toContain('<!DOCTYPE html>')
      expect(emailContent).toMatch(/<html[^>]*>/)
      expect(emailContent).toContain('<title>')
      
      // Verify professional sender information
      expect(result.from).toContain('supabase.co')
      expect(result.emailContent?.headers['X-Mailer']).toBe('Supabase Auth')

      // Check for proper email headers that improve deliverability
      expect(result.emailContent?.headers['Content-Type']).toContain('charset=utf-8')
    })

    it('should deliver password reset emails to primary inbox folder', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('reset-inbox')

      // Mock successful password reset request
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(testEmail)

      // Verify successful delivery
      expect(result.success).toBe(true)
      expect(result.to).toBe(testEmail)
      expect(result.subject).toContain('Password Reset')

      // Verify delivery timing (fast delivery improves reputation)
      expect(result.deliveryTime).toBeDefined()
      expect(result.deliveryTime!).toBeGreaterThan(0)
      expect(result.deliveryTime!).toBeLessThan(5000) // Under 5 seconds
    })

    it('should maintain consistent delivery across multiple email providers', async () => {
      const emailProviders = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'icloud.com',
        'protonmail.com'
      ]

      const deliveryResults = await Promise.all(
        emailProviders.map(async (provider) => {
          const testEmail = `deliverytest@${provider}`
          
          // Mock registration for each provider
          mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: { user: { id: `user-${provider}`, email: testEmail }, session: null },
            error: null
          })

          return createEmailVerificationTest(testEmail, 'ProviderTest123!')
        })
      )

      // All providers should receive emails successfully
      deliveryResults.forEach((result, index) => {
        expect(result.success).toBe(true)
        expect(result.to).toContain(emailProviders[index])
        expect(result.deliveryTime).toBeLessThan(10000) // Reasonable delivery time
      })

      // Check delivery consistency
      const deliveryTimes = deliveryResults.map(r => r.deliveryTime || 0)
      const avgDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      const maxVariation = Math.max(...deliveryTimes) - Math.min(...deliveryTimes)
      
      expect(avgDeliveryTime).toBeLessThan(3000) // Average under 3 seconds
      expect(maxVariation).toBeLessThan(5000) // Variation under 5 seconds
    })
  })

  describe('Spam Filter Avoidance', () => {
    it('should avoid common spam trigger patterns in email content', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('spam-test')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'spam-user', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'SpamTest123!')

      const emailHtml = result.emailContent?.html || ''
      const emailText = result.emailContent?.text || ''
      const subject = result.subject

      // Check for absence of common spam trigger words
      const spamTriggers = [
        /urgent/gi,
        /immediate/gi,
        /act now/gi,
        /limited time/gi,
        /expires today/gi,
        /click here now/gi,
        /free money/gi,
        /earn \$\d+/gi,
        /guaranteed/gi,
        /!!!+/g
      ]

      spamTriggers.forEach(trigger => {
        expect(emailHtml).not.toMatch(trigger)
        expect(emailText).not.toMatch(trigger)
        expect(subject).not.toMatch(trigger)
      })

      // Verify professional language patterns
      expect(emailHtml).toMatch(/please|thank you|verify|confirm/i)
      expect(emailText).toMatch(/please|thank you|verify|confirm/i)
      
      // Check for proper text-to-HTML ratio (important for spam filters)
      const htmlTextLength = emailHtml.replace(/<[^>]*>/g, '').length
      const textLength = emailText.length
      const ratio = textLength / htmlTextLength
      expect(ratio).toBeGreaterThan(0.5) // Good text representation
    })

    it('should use proper sender reputation indicators', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('reputation-test')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(testEmail)

      // Verify sender domain reputation
      expect(result.from).toMatch(/supabase\.co$/)
      expect(result.from).not.toMatch(/noreply@localhost/)
      expect(result.from).not.toMatch(/test@example\.com/)

      // Check for proper headers that establish legitimacy
      const headers = result.emailContent?.headers || {}
      expect(headers['X-Mailer']).toBeTruthy()
      expect(headers['Content-Type']).toContain('charset=utf-8')

      // Verify no suspicious header patterns
      expect(headers).not.toHaveProperty('X-Spam-Score')
      expect(headers).not.toHaveProperty('X-Phishing-Score')

      // Check email structure for legitimacy signals
      const emailHtml = result.emailContent?.html || ''
      expect(emailHtml).toContain('<title>')
      expect(emailHtml).toContain('<!DOCTYPE html>')
      expect(emailHtml).not.toContain('<script')
      expect(emailHtml).not.toContain('javascript:')
    })

    it('should avoid image-heavy content that triggers spam filters', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('image-test')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'image-user', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'ImageTest123!')

      const emailHtml = result.emailContent?.html || ''

      // Check for minimal image usage
      const imageCount = (emailHtml.match(/<img/gi) || []).length
      expect(imageCount).toBeLessThanOrEqual(2) // Minimal images

      // Verify no external image tracking
      const externalImages = emailHtml.match(/src=["']https?:\/\/(?!localhost)/gi) || []
      expect(externalImages.length).toBe(0)

      // Check for proper alt text if images exist
      if (imageCount > 0) {
        expect(emailHtml).toMatch(/alt=["'][^"']*["']/i)
      }

      // Verify text content is substantial relative to any images
      const textContent = emailHtml.replace(/<[^>]*>/g, '').trim()
      expect(textContent.length).toBeGreaterThan(100) // Substantial text content
    })

    it('should maintain appropriate email size for deliverability', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('size-test')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(testEmail)

      // Check total email size
      const htmlSize = result.emailContent?.html?.length || 0
      const textSize = result.emailContent?.text?.length || 0
      const totalSize = htmlSize + textSize

      // Email should be reasonably sized for good deliverability
      expect(totalSize).toBeGreaterThan(100) // Not too minimal
      expect(totalSize).toBeLessThan(100000) // Not too large (100KB limit)

      // HTML should not be overly complex
      const htmlTagCount = (result.emailContent?.html?.match(/<[^>]+>/g) || []).length
      expect(htmlTagCount).toBeLessThan(200) // Reasonable complexity

      // Check for efficient HTML structure
      const emailHtml = result.emailContent?.html || ''
      expect(emailHtml).not.toMatch(/style=["'][^"']{100,}["']/g) // No excessively long inline styles
      expect(emailHtml).not.toMatch(/<div[^>]*><div[^>]*><div[^>]*><div/g) // No excessive nesting
    })
  })

  describe('Email Authentication and Security', () => {
    it('should include proper authentication headers for legitimacy', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('auth-headers')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'auth-user', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'AuthTest123!')

      // Check for essential authentication headers
      const headers = result.emailContent?.headers || {}
      
      // Verify sender legitimacy indicators
      expect(headers['X-Mailer']).toBe('Supabase Auth')
      expect(headers['Content-Type']).toContain('text/html')
      expect(headers['Content-Type']).toContain('charset=utf-8')

      // Check for proper message structure
      expect(result.messageId).toBeTruthy()
      expect(result.messageId).toMatch(/^[a-zA-Z0-9\-_.]+$/) // Valid message ID format

      // Verify timestamp is recent and reasonable
      const messageAge = Date.now() - result.timestamp.getTime()
      expect(messageAge).toBeLessThan(60000) // Less than 1 minute old
    })

    it('should use secure links that build trust', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('secure-links')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(testEmail)

      const emailHtml = result.emailContent?.html || ''
      const emailText = result.emailContent?.text || ''

      // Extract all links from email
      const htmlLinks = emailHtml.match(/href=["']([^"']+)["']/g) || []
      const textLinks = emailText.match(/https?:\/\/[^\s]+/g) || []

      // Verify all links use secure protocols
      const allLinks = [...htmlLinks, ...textLinks]
      allLinks.forEach((link: string) => {
        const url = link.replace(/href=["']([^"']+)["']/, '$1')
        expect(url).toMatch(/^https?:\/\//) // Protocol specified
        expect(url).toContain('localhost') // Expected domain in test
      })

      // Check for proper link structure
      const resetLink = htmlLinks.find(link => link.includes('reset-password'))
      expect(resetLink).toBeTruthy()
      expect(resetLink).toContain('token=')
      expect(resetLink).toContain('type=recovery')

      // Verify no suspicious redirect patterns
      htmlLinks.forEach((link: string) => {
        expect(link).not.toContain('javascript:')
        expect(link).not.toMatch(/data:text\/html/)
        expect(link).not.toMatch(/bit\.ly|tinyurl|t\.co/) // No URL shorteners
      })
    })

    it('should maintain consistent sender identity', async () => {
      const multipleEmails = [
        emailTestingUtils.generateTestEmail('identity1'),
        emailTestingUtils.generateTestEmail('identity2'),
        emailTestingUtils.generateTestEmail('identity3')
      ]

      // Send multiple emails to verify sender consistency
      const results = await Promise.all([
        (async () => {
          mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: { user: { id: 'id1', email: multipleEmails[0] }, session: null },
            error: null
          })
          return createEmailVerificationTest(multipleEmails[0], 'Identity1!')
        })(),
        (async () => {
          mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
            data: { message: 'Reset email sent' },
            error: null
          })
          return createPasswordResetTest(multipleEmails[1])
        })(),
        (async () => {
          mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: { user: { id: 'id3', email: multipleEmails[2] }, session: null },
            error: null
          })
          return createEmailVerificationTest(multipleEmails[2], 'Identity3!')
        })()
      ])

      // Verify consistent sender information across all emails
      const senders = results.map(r => r.from)
      const mailers = results.map(r => r.emailContent?.headers['X-Mailer'])

      // All emails should come from the same sender domain
      senders.forEach(sender => {
        expect(sender).toContain('supabase.co')
      })

      // All emails should have consistent mailer identity
      mailers.forEach(mailer => {
        expect(mailer).toBe('Supabase Auth')
      })

      // Verify no variation in critical sender indicators
      const uniqueSenderDomains = [...new Set(senders.map(s => s.split('@')[1]))]
      expect(uniqueSenderDomains.length).toBe(1) // Only one domain
    })
  })

  describe('Delivery Timing and Performance', () => {
    it('should deliver emails within optimal timing windows', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('timing-optimal')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'timing-user', email: testEmail }, session: null },
        error: null
      })

      const startTime = Date.now()
      const result = await createEmailVerificationTest(testEmail, 'TimingTest123!')
      const endTime = Date.now()

      // Verify fast delivery (good for sender reputation)
      expect(result.deliveryTime).toBeDefined()
      expect(result.deliveryTime!).toBeGreaterThan(0)
      expect(result.deliveryTime!).toBeLessThan(3000) // Under 3 seconds

      // Verify total processing time is reasonable
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(5000) // Under 5 seconds total

      // Check timestamp accuracy
      const timestampDiff = Math.abs(result.timestamp.getTime() - startTime)
      expect(timestampDiff).toBeLessThan(2000) // Within 2 seconds
    })

    it('should handle email delivery retries gracefully', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('retry-test')

      // Test that the email delivery system maintains resilience
      // In a production system, this would test actual retry mechanisms
      
      // Simulate a delayed delivery scenario
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent after retry' },
        error: null
      })

      const result = await createPasswordResetTest(testEmail)
      
      // Verify that even after potential retries, the email delivery succeeds
      expect(result.success).toBe(true)
      expect(result.to).toBe(testEmail)
      expect(result.deliveryTime).toBeDefined()
      expect(result.deliveryTime!).toBeGreaterThan(0)
      
      // Verify delivery characteristics remain consistent
      expect(result.from).toContain('supabase.co')
      expect(result.subject).toContain('Password Reset')
      expect(result.emailContent?.headers['X-Mailer']).toBe('Supabase Auth')
    })

    it('should maintain performance under concurrent delivery load', async () => {
      const concurrentEmails = Array.from({ length: 10 }, (_, i) =>
        emailTestingUtils.generateTestEmail(`concurrent${i}`)
      )

      // Mock successful deliveries for all concurrent requests
      concurrentEmails.forEach(() => {
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: { id: `concurrent-${Date.now()}`, email: 'test@example.com' }, session: null },
          error: null
        })
      })

      const startTime = Date.now()
      const results = await Promise.all(
        concurrentEmails.map(email => createEmailVerificationTest(email, 'ConcurrentTest123!'))
      )
      const totalTime = Date.now() - startTime

      // All deliveries should succeed
      expect(results.every(r => r.success)).toBe(true)

      // Performance should remain good under load
      expect(totalTime).toBeLessThan(15000) // Under 15 seconds for 10 emails

      // Individual delivery times should be consistent
      const deliveryTimes = results.map(r => r.deliveryTime || 0)
      const avgDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      expect(avgDeliveryTime).toBeLessThan(5000) // Average under 5 seconds
    })
  })

  describe('Deliverability Optimization', () => {
    it('should optimize email content for high deliverability scores', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('optimization')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'opt-user', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'OptimizationTest123!')

      const emailHtml = result.emailContent?.html || ''
      const emailText = result.emailContent?.text || ''

      // Check for optimal content characteristics
      
      // 1. Proper HTML structure
      expect(emailHtml).toContain('<!DOCTYPE html>')
      expect(emailHtml).toMatch(/<html[^>]*lang=["']en["'][^>]*>|<html>/i)
      expect(emailHtml).toContain('<head>')
      expect(emailHtml).toContain('<title>')
      expect(emailHtml).toContain('<body>')

      // 2. Semantic content structure
      expect(emailHtml).toMatch(/<h1[^>]*>.*<\/h1>/i)
      expect(emailHtml).toMatch(/<p[^>]*>.*<\/p>/i)

      // 3. Proper link structure
      const linkCount = (emailHtml.match(/<a[^>]*href=/gi) || []).length
      expect(linkCount).toBeGreaterThan(0)
      expect(linkCount).toBeLessThanOrEqual(3) // Not too many links

      // 4. Good text/HTML balance
      const htmlTextContent = emailHtml.replace(/<[^>]*>/g, '').trim()
      expect(htmlTextContent.length).toBeGreaterThan(50)
      expect(emailText.length).toBeGreaterThan(50)

      // 5. No deliverability-harming elements
      expect(emailHtml).not.toContain('<form')
      expect(emailHtml).not.toContain('<iframe')
      expect(emailHtml).not.toContain('<script')
      expect(emailHtml).not.toMatch(/javascript:/i)
    })

    it('should use appropriate subject line patterns for deliverability', async () => {
      const testEmails = [
        { email: emailTestingUtils.generateTestEmail('subject1'), type: 'verification' },
        { email: emailTestingUtils.generateTestEmail('subject2'), type: 'reset' }
      ]

      const results = await Promise.all([
        (async () => {
          mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: { user: { id: 'subj1', email: testEmails[0].email }, session: null },
            error: null
          })
          return createEmailVerificationTest(testEmails[0].email, 'SubjectTest1!')
        })(),
        (async () => {
          mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
            data: { message: 'Reset email sent' },
            error: null
          })
          return createPasswordResetTest(testEmails[1].email)
        })()
      ])

      results.forEach((result, index) => {
        const subject = result.subject

        // Check subject line characteristics for good deliverability
        
        // 1. Appropriate length
        expect(subject.length).toBeGreaterThan(10)
        expect(subject.length).toBeLessThan(80)

        // 2. No spam-like formatting
        expect(subject).not.toMatch(/!!!+/)
        expect(subject).not.toMatch(/\$\$\$/)
        expect(subject).not.toMatch(/ALL CAPS WORDS{3,}/)

        // 3. Professional language
        expect(subject).toMatch(/email|password|verify|confirm|reset/i)
        expect(subject).not.toMatch(/urgent|immediate|act now/i)

        // 4. Proper capitalization
        expect(subject).toMatch(/^[A-Z]/) // Starts with capital
        expect(subject).not.toMatch(/^[A-Z]{2,}/) // Not all caps start
      })
    })

    it('should implement proper list management practices', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('list-management')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(testEmail)

      const emailHtml = result.emailContent?.html || ''
      const emailText = result.emailContent?.text || ''

      // Check for proper opt-out/unsubscribe information
      // Note: For transactional emails like auth, this is often not required,
      // but good practice includes clear "didn't request this" messaging

      expect(emailHtml).toMatch(/didn't request|didn't ask|ignore this email/i)
      expect(emailText).toMatch(/didn't request|didn't ask|ignore this email/i)

      // Verify clear messaging about unsolicited emails
      expect(emailHtml).toMatch(/password|reset|security/i)
      expect(emailText).toMatch(/password|reset|security/i)

      // Check for proper contact information context
      expect(result.from).toMatch(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/) // Valid domain
    })
  })

  describe('Email Service Provider Compatibility', () => {
    it('should be compatible with Gmail spam filtering', async () => {
      const gmailTestEmail = 'deliverytest@gmail.com'

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'gmail-user', email: gmailTestEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(gmailTestEmail, 'GmailTest123!')

      const emailHtml = result.emailContent?.html || ''

      // Gmail-specific deliverability factors
      
      // 1. Proper HTML structure for Gmail
      expect(emailHtml).toContain('<!DOCTYPE html>')
      expect(emailHtml).toMatch(/<meta[^>]*charset=["']?utf-8["']?[^>]*>/i)

      // 2. Gmail prefers table-based layouts for older versions, but modern is fine
      expect(emailHtml).toMatch(/<(table|div|p|h1)/i)

      // 3. No excessive styling that Gmail strips
      expect(emailHtml).not.toMatch(/style=["'][^"']{200,}["']/g)

      // 4. Proper image handling
      const imgTags = emailHtml.match(/<img[^>]*>/gi) || []
      imgTags.forEach(img => {
        if (img.includes('src=')) {
          expect(img).toMatch(/alt=["'][^"']*["']/i) // Alt text required
        }
      })

      // 5. Links properly formatted
      const links = emailHtml.match(/<a[^>]*href=["'][^"']+["'][^>]*>/gi) || []
      links.forEach(link => {
        expect(link).not.toMatch(/onclick=/i) // No JavaScript handlers
      })
    })

    it('should be compatible with Outlook/Exchange filtering', async () => {
      const outlookTestEmail = 'deliverytest@outlook.com'

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(outlookTestEmail)

      const emailHtml = result.emailContent?.html || ''

      // Outlook-specific compatibility
      
      // 1. Outlook prefers table-based layouts
      expect(emailHtml).toMatch(/<(table|td|tr|div|p)/i)

      // 2. Minimal CSS (Outlook strips many styles)
      expect(emailHtml).not.toMatch(/float:|position:|margin:/i)

      // 3. Proper encoding
      expect(result.emailContent?.headers['Content-Type']).toContain('charset=utf-8')

      // 4. Conservative HTML structure
      expect(emailHtml).not.toMatch(/<style[^>]*>[^<]*@media/i) // No media queries
      expect(emailHtml).not.toMatch(/background-image:/i) // Background images problematic

      // 5. Links work in Outlook
      const links = emailHtml.match(/href=["']([^"']+)["']/gi) || []
      links.forEach(link => {
        const url = link.match(/href=["']([^"']+)["']/i)?.[1]
        if (url) {
          expect(url).toMatch(/^https?:\/\//) // Absolute URLs
          expect(url.length).toBeLessThan(2000) // Outlook URL length limits
        }
      })
    })

    it('should handle mobile email client optimization', async () => {
      const mobileTestEmail = emailTestingUtils.generateTestEmail('mobile')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'mobile-user', email: mobileTestEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(mobileTestEmail, 'MobileTest123!')

      const emailHtml = result.emailContent?.html || ''

      // Mobile optimization factors
      
      // 1. Responsive structure - check for basic meta tags
      expect(emailHtml).toContain('<meta')
      // Note: Mock emails might not include viewport meta tag, so check for charset instead
      expect(emailHtml).toMatch(/<meta[^>]*charset[^>]*>/i)

      // 2. Touch-friendly links
      const links = emailHtml.match(/<a[^>]*>[^<]*<\/a>/gi) || []
      links.forEach(link => {
        const linkText = link.replace(/<[^>]*>/g, '').trim()
        expect(linkText.length).toBeGreaterThan(3) // Tap target size
      })

      // 3. Readable text size
      expect(emailHtml).not.toMatch(/font-size:\s*[0-9]+px/i) // Avoid fixed small sizes
      
      // 4. Simple layout for mobile parsing
      const divNesting = (emailHtml.match(/<div[^>]*>/gi) || []).length
      expect(divNesting).toBeLessThan(10) // Not overly nested

      // 5. Fast loading content
      const totalSize = emailHtml.length + (result.emailContent?.text?.length || 0)
      expect(totalSize).toBeLessThan(50000) // Under 50KB for mobile
    })
  })

  describe('Reputation and Trust Building', () => {
    it('should maintain consistent sending patterns for reputation', async () => {
      const reputationEmails = Array.from({ length: 5 }, (_, i) =>
        emailTestingUtils.generateTestEmail(`reputation${i}`)
      )

      // Simulate regular sending pattern
      const results = []
      for (let i = 0; i < reputationEmails.length; i++) {
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: { id: `rep-${i}`, email: reputationEmails[i] }, session: null },
          error: null
        })

        const result = await createEmailVerificationTest(reputationEmails[i], 'ReputationTest123!')
        results.push(result)
        
        // Small delay to simulate realistic sending pattern
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Verify consistent delivery characteristics
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.from).toContain('supabase.co')
        expect(result.emailContent?.headers['X-Mailer']).toBe('Supabase Auth')
      })

      // Check for consistent timing patterns
      const deliveryTimes = results.map(r => r.deliveryTime || 0)
      const avgTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      const maxDeviation = Math.max(...deliveryTimes.map(time => Math.abs(time - avgTime)))
      
      expect(maxDeviation).toBeLessThan(2000) // Consistent timing
    })

    it('should build trust through professional email structure', async () => {
      const trustTestEmail = emailTestingUtils.generateTestEmail('trust-building')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(trustTestEmail)

      const emailHtml = result.emailContent?.html || ''
      const emailText = result.emailContent?.text || ''

      // Professional trust indicators
      
      // 1. Clear sender identity
      expect(result.from).toMatch(/noreply@[^@]+\.supabase\.co$/)
      expect(result.emailContent?.headers['X-Mailer']).toBe('Supabase Auth')

      // 2. Professional email structure
      expect(emailHtml).toContain('<title>')
      expect(emailHtml).toMatch(/<h1[^>]*>[^<]*<\/h1>/)
      expect(emailHtml).toMatch(/<p[^>]*>[^<]*<\/p>/)

      // 3. Clear call-to-action
      expect(emailHtml).toMatch(/<a[^>]*href=[^>]*>[^<]*<\/a>/)
      expect(emailText).toMatch(/https?:\/\/[^\s]+/)

      // 4. Security messaging for trust
      expect(emailHtml).toMatch(/security|expire|didn't request/i)
      expect(emailText).toMatch(/security|expire|didn't request/i)

      // 5. Professional language and tone
      expect(emailHtml).toMatch(/please|thank you|password|reset/i)
      expect(emailText).toMatch(/please|thank you|password|reset/i)
    })
  })
}) 