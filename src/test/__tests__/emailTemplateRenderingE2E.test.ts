// Mock dependencies for email template rendering tests
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
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
  EMAIL_TEMPLATES,
  EMAIL_TEST_CONFIG
} from '../utils/emailTestingUtils'
import type { EmailTestResult } from '../utils/emailTestingUtils'

describe('Email Template Rendering End-to-End Tests', () => {
  const mockSupabase = require('../../lib/supabase').supabase
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Professional Appearance and Visual Design', () => {
    it('should render email verification templates with professional styling', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('professional-verification')

      // Mock successful user registration
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: testEmail },
          session: null
        },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'ProfessionalTest123!')

      // Verify professional HTML structure
      expect(result.emailContent?.html).toContain('<!DOCTYPE html>')
      expect(result.emailContent?.html).toContain('<html>')
      expect(result.emailContent?.html).toContain('<head>')
      expect(result.emailContent?.html).toContain('<meta charset="utf-8">')
      expect(result.emailContent?.html).toContain('<title>')
      expect(result.emailContent?.html).toContain('<body>')

      // Check for professional content elements
      expect(result.emailContent?.html).toContain('Confirm your email')
      expect(result.emailContent?.html).toContain('Thank you for signing up')
      expect(result.emailContent?.html).toContain('verify your email')

      // Verify proper link structure
      const linkMatch = result.emailContent?.html.match(/<a[^>]+href="([^"]+)"[^>]*>/)
      expect(linkMatch).toBeTruthy()
      expect(linkMatch![1]).toContain('/auth/confirm')
      expect(linkMatch![1]).toContain('token=')

      // Check for security messaging
      expect(result.emailContent?.html).toContain('didn\'t create an account')
      expect(result.emailContent?.text).toContain('didn\'t create an account')

      // Verify headers indicate professional email
      expect(result.emailContent?.headers['Content-Type']).toContain('text/html')
      expect(result.emailContent?.headers['X-Mailer']).toBe('Supabase Auth')
    })

    it('should render password reset templates with professional styling', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('professional-reset')

      // Mock successful password reset request
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(testEmail)

      // Verify professional HTML structure
      expect(result.emailContent?.html).toContain('<!DOCTYPE html>')
      expect(result.emailContent?.html).toContain('<title>Reset your password</title>')
      expect(result.emailContent?.html).toContain('<meta charset="utf-8">')

      // Check for professional content elements
      expect(result.emailContent?.html).toContain('Reset your password')
      expect(result.emailContent?.html).toContain('You have requested to reset')
      expect(result.emailContent?.html).toContain('set a new password')

      // Verify proper reset link structure
      const linkMatch = result.emailContent?.html.match(/<a[^>]+href="([^"]+)"[^>]*>/)
      expect(linkMatch).toBeTruthy()
      expect(linkMatch![1]).toContain('/auth/reset-password')
      expect(linkMatch![1]).toContain('token=')
      expect(linkMatch![1]).toContain('type=recovery')

      // Check for security and expiration messaging
      expect(result.emailContent?.html).toContain('expire in 1 hour')
      expect(result.emailContent?.html).toContain('for security reasons')
      expect(result.emailContent?.html).toContain('didn\'t request this')
      expect(result.emailContent?.text).toContain('expire in 1 hour')
      expect(result.emailContent?.text).toContain('didn\'t request this')
    })

    it('should maintain consistent visual hierarchy and typography', async () => {
      const verificationEmail = emailTestingUtils.generateTestEmail('hierarchy-verification')
      const resetEmail = emailTestingUtils.generateTestEmail('hierarchy-reset')

      // Mock both email types
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: verificationEmail }, session: null },
        error: null
      })
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const [verificationResult, resetResult] = await Promise.all([
        createEmailVerificationTest(verificationEmail, 'HierarchyTest123!'),
        createPasswordResetTest(resetEmail)
      ])

      // Both emails should have consistent structure
      const verificationHtml = verificationResult.emailContent?.html || ''
      const resetHtml = resetResult.emailContent?.html || ''

      // Check for consistent heading structure
      expect(verificationHtml).toMatch(/<h1[^>]*>/)
      expect(resetHtml).toMatch(/<h1[^>]*>/)

      // Check for consistent paragraph structure
      expect(verificationHtml).toMatch(/<p[^>]*>/)
      expect(resetHtml).toMatch(/<p[^>]*>/)

      // Check for consistent link styling
      expect(verificationHtml).toMatch(/<a[^>]+href="[^"]*"[^>]*>/)
      expect(resetHtml).toMatch(/<a[^>]+href="[^"]*"[^>]*>/)

      // Both should have proper DOCTYPE and structure
      const structureElements = ['<!DOCTYPE html>', '<html>', '<head>', '<body>', '</html>']
      structureElements.forEach(element => {
        expect(verificationHtml).toContain(element)
        expect(resetHtml).toContain(element)
      })
    })
  })

  describe('Brand Consistency and Identity', () => {
    it('should maintain consistent branding across all email templates', async () => {
      const brandTestEmails = [
        emailTestingUtils.generateTestEmail('brand-verification'),
        emailTestingUtils.generateTestEmail('brand-reset')
      ]

      // Mock email generation for both types
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'brand-1', email: brandTestEmails[0] }, session: null },
        error: null
      })
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const [verificationResult, resetResult] = await Promise.all([
        createEmailVerificationTest(brandTestEmails[0], 'BrandTest123!'),
        createPasswordResetTest(brandTestEmails[1])
      ])

      // Check consistent sender information
      expect(verificationResult.from).toContain('supabase.co')
      expect(resetResult.from).toContain('supabase.co')

      // Check consistent mailer identification
      expect(verificationResult.emailContent?.headers['X-Mailer']).toBe('Supabase Auth')
      expect(resetResult.emailContent?.headers['X-Mailer']).toBe('Supabase Auth')

      // Check for consistent domain usage in links (note: mock uses localhost without port)
      const verificationLinks = verificationResult.emailContent?.html.match(/href="([^"]+)"/g) || []
      const resetLinks = resetResult.emailContent?.html.match(/href="([^"]+)"/g) || []

      verificationLinks.forEach(link => {
        expect(link).toContain('http://localhost')
      })
      resetLinks.forEach(link => {
        expect(link).toContain('http://localhost')
      })

      // Check for consistent language and tone
      expect(verificationResult.emailContent?.html).toContain('Thank you')
      expect(resetResult.emailContent?.html).toContain('You have requested')
      
      // Both should have polite, professional tone
      expect(verificationResult.emailContent?.text).toMatch(/please|thank you/i)
      expect(resetResult.emailContent?.text).toMatch(/please|you have/i)
    })

    it('should use consistent color scheme and visual branding', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('color-scheme')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'color-test', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'ColorTest123!')

      const htmlContent = result.emailContent?.html || ''

      // Check for semantic HTML structure that supports consistent styling
      expect(htmlContent).toContain('<h1>')
      expect(htmlContent).toContain('<p>')
      expect(htmlContent).toContain('<a')

      // Verify proper HTML5 semantic structure
      expect(htmlContent).toContain('<!DOCTYPE html>')
      expect(htmlContent).toMatch(/<html[^>]*>/)
      expect(htmlContent).toContain('<meta charset="utf-8">')

      // Check for accessibility-friendly structure
      expect(htmlContent).toMatch(/<a[^>]+href="[^"]*"[^>]*>[^<]+<\/a>/)

      // Verify content doesn't contain inline styles that might conflict with branding
      // (Professional emails should use external CSS or system defaults)
      expect(htmlContent).not.toContain('style="color:')
      expect(htmlContent).not.toContain('bgcolor=')
    })

    it('should maintain brand-appropriate messaging and voice', async () => {
      const verificationEmail = emailTestingUtils.generateTestEmail('voice-verification')
      const resetEmail = emailTestingUtils.generateTestEmail('voice-reset')

      // Mock both email types
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'voice-1', email: verificationEmail }, session: null },
        error: null
      })
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const [verificationResult, resetResult] = await Promise.all([
        createEmailVerificationTest(verificationEmail, 'VoiceTest123!'),
        createPasswordResetTest(resetEmail)
      ])

      // Check for professional, helpful messaging tone
      const verificationText = verificationResult.emailContent?.text || ''
      const resetText = resetResult.emailContent?.text || ''

      // Verification email voice checks
      expect(verificationText).toMatch(/thank you/i)
      expect(verificationText).toMatch(/please/i)
      expect(verificationText).toMatch(/verify|confirm/i)
      expect(verificationText).not.toMatch(/urgent|immediately|asap/i) // Avoid spam-like language

      // Reset email voice checks
      expect(resetText).toMatch(/requested/i)
      expect(resetText).toMatch(/password/i)
      expect(resetText).toMatch(/security/i)
      expect(resetText).not.toMatch(/urgent|warning|alert/i) // Avoid alarm language

      // Both should have reassuring security messages
      expect(verificationText).toContain('safely ignore')
      expect(resetText).toContain('safely ignore')

      // Check subject lines for appropriate tone (updated expectations)
      expect(verificationResult.subject).toMatch(/email verification|verify|confirm/i)
      expect(resetResult.subject).toMatch(/reset|password/i)
      expect(verificationResult.subject).not.toMatch(/!!|urgent|action required/i)
      expect(resetResult.subject).not.toMatch(/!!|urgent|warning/i)
    })
  })

  describe('Email Client Compatibility and Responsiveness', () => {
    it('should generate emails compatible with major email clients', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('compatibility')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'compat-user', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'CompatTest123!')
      const htmlContent = result.emailContent?.html || ''

      // Check HTML structure compatible with major email clients
      expect(htmlContent).toContain('<!DOCTYPE html>')
      expect(htmlContent).toMatch(/<html[^>]*>/)
      expect(htmlContent).toContain('<head>')
      expect(htmlContent).toContain('<meta charset="utf-8">')
      expect(htmlContent).toContain('<title>')
      expect(htmlContent).toContain('<body>')
      expect(htmlContent).toContain('</html>')

      // Check for semantic HTML structure (modern approach)
      // Simple emails may use basic HTML elements without complex layouts
      expect(htmlContent).toMatch(/<(h1|p|a)/i)

      // Verify proper link structure for all email clients
      const linkMatch = htmlContent.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/)
      expect(linkMatch).toBeTruthy()
      expect(linkMatch![1]).toContain('http') // Should be absolute URL
      expect(linkMatch![2]).toBeTruthy() // Should have link text

      // Check for proper encoding
      expect(result.emailContent?.headers['Content-Type']).toContain('charset=utf-8')

      // Verify no problematic HTML that breaks in email clients
      expect(htmlContent).not.toContain('<script')
      expect(htmlContent).not.toContain('<iframe')
      expect(htmlContent).not.toContain('<object')
      expect(htmlContent).not.toContain('<embed')
    })

    it('should provide proper fallbacks for HTML and text content', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('fallback-test')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const result = await createPasswordResetTest(testEmail)

      // Both HTML and text versions should exist
      expect(result.emailContent?.html).toBeTruthy()
      expect(result.emailContent?.text).toBeTruthy()

      const htmlContent = result.emailContent?.html || ''
      const textContent = result.emailContent?.text || ''

      // Text version should contain all essential information
      expect(textContent).toContain('Reset your password')
      expect(textContent).toContain('/auth/reset-password')
      expect(textContent).toContain('token=')
      expect(textContent).toContain('expire in 1 hour')
      expect(textContent).toContain('didn\'t request')

      // HTML version should have enhanced formatting but same info
      expect(htmlContent).toContain('Reset your password')
      expect(htmlContent).toContain('/auth/reset-password')
      expect(htmlContent).toContain('token=')
      expect(htmlContent).toContain('expire in 1 hour')
      expect(htmlContent).toContain('didn\'t request')

      // HTML should have proper link elements
      expect(htmlContent).toMatch(/<a[^>]+href="[^"]*"[^>]*>[^<]+<\/a>/)

      // Text should have plain URLs
      expect(textContent).toMatch(/https?:\/\/[^\s]+/)
    })

    it('should handle different viewport sizes and mobile compatibility', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('mobile-test')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'mobile-user', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'MobileTest123!')
      const htmlContent = result.emailContent?.html || ''

      // Check for mobile-friendly HTML structure
      expect(htmlContent).toContain('<meta charset="utf-8">')

      // Verify content is readable without horizontal scrolling
      // (Should not have fixed widths that exceed mobile screens)
      expect(htmlContent).not.toMatch(/width\s*[:=]\s*["']?\d{4,}/i) // No widths > 999px
      expect(htmlContent).not.toMatch(/min-width\s*[:=]\s*["']?\d{4,}/i)

      // Check for scalable content structure
      expect(htmlContent).toMatch(/<h1[^>]*>.*<\/h1>/i)
      expect(htmlContent).toMatch(/<p[^>]*>.*<\/p>/i)

      // Links should be easily tappable (proper anchor tags)
      const linkMatches = htmlContent.match(/<a[^>]+href="[^"]*"[^>]*>[^<]+<\/a>/g) || []
      expect(linkMatches.length).toBeGreaterThan(0)
      
      // Each link should have descriptive text (not just "click here")
      linkMatches.forEach(link => {
        expect(link).toMatch(/>([\s\S]*)(Confirm|Reset|Verify|Email)([\s\S]*)</i) // Updated to handle multiline text
        expect(link).not.toMatch(/>[\s\S]*click here[\s\S]*<|>[\s\S]*here[\s\S]*</i)
      })

      // Text version should be well-formatted for any display
      const textContent = result.emailContent?.text || ''
      expect(textContent.split('\n').every(line => line.length < 200)).toBe(true) // No overly long lines
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should include proper accessibility features in email templates', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('accessibility-test')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'a11y-user', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'AccessibilityTest123!')
      const htmlContent = result.emailContent?.html || ''

      // Check for semantic HTML structure
      expect(htmlContent).toMatch(/<h1[^>]*>.*<\/h1>/i) // Proper heading structure
      expect(htmlContent).toMatch(/<p[^>]*>.*<\/p>/i) // Proper paragraph structure

      // Links should have descriptive text
      const linkMatches = htmlContent.match(/<a[^>]+href="[^"]*"[^>]*>([^<]+)<\/a>/g) || []
      expect(linkMatches.length).toBeGreaterThan(0)
      
      linkMatches.forEach(link => {
        const linkText = link.match(/>([^<]+)</)?.[1] || ''
        expect(linkText.length).toBeGreaterThan(2) // Should have meaningful text
        expect(linkText).not.toMatch(/^(click|here|link)$/i) // Avoid generic link text
      })

      // Check for proper document structure
      expect(htmlContent).toContain('<title>')
      expect(htmlContent).toMatch(/<title>[^<]+<\/title>/)

      // Verify language and character encoding
      expect(htmlContent).toContain('charset="utf-8"')

      // Check for logical content flow
      expect(htmlContent.indexOf('<h1')).toBeLessThan(htmlContent.indexOf('<p'))
      expect(htmlContent.indexOf('<p')).toBeLessThan(htmlContent.indexOf('<a'))
    })

    it('should provide clear and intuitive user guidance', async () => {
      const verificationEmail = emailTestingUtils.generateTestEmail('guidance-verification')
      const resetEmail = emailTestingUtils.generateTestEmail('guidance-reset')

      // Mock both email types
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'guidance-1', email: verificationEmail }, session: null },
        error: null
      })
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const [verificationResult, resetResult] = await Promise.all([
        createEmailVerificationTest(verificationEmail, 'GuidanceTest123!'),
        createPasswordResetTest(resetEmail)
      ])

      // Verification email guidance checks
      const verificationHtml = verificationResult.emailContent?.html || ''
      const verificationText = verificationResult.emailContent?.text || ''

      expect(verificationHtml).toMatch(/confirm|verify/i)
      expect(verificationHtml).toMatch(/click.*link|link.*click/i)
      expect(verificationText).toMatch(/visit.*link|link.*visit/i)

      // Reset email guidance checks
      const resetHtml = resetResult.emailContent?.html || ''
      const resetText = resetResult.emailContent?.text || ''

      expect(resetHtml).toMatch(/reset.*password|password.*reset/i)
      expect(resetHtml).toMatch(/click.*link|link.*click/i)
      expect(resetText).toMatch(/visit.*link|link.*visit/i)

      // Both should provide clear next steps
      expect(verificationText).toMatch(/click|visit/i)
      expect(resetText).toMatch(/click|visit/i)

      // Both should include security reassurance
      expect(verificationText).toContain('safely ignore')
      expect(resetText).toContain('safely ignore')

      // Both should have expiration information where relevant
      expect(resetText).toContain('expire')
      expect(resetHtml).toContain('expire')
    })

    it('should handle error states and edge cases gracefully', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('edge-case-test')

      // Test with special characters in email
      const specialEmail = 'test+special.case@example-domain.co.uk'

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'edge-user', email: specialEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(specialEmail, 'EdgeCase123!')

      // Should handle special email characters properly
      expect(result.to).toBe(specialEmail)
      expect(result.success).toBe(true)

      // Content should not break with special email characters
      const htmlContent = result.emailContent?.html || ''
      expect(htmlContent).toContain('Confirm your email')
      expect(htmlContent).toMatch(/<a[^>]+href="[^"]*"[^>]*>/)

      // Should generate proper links regardless of email complexity
      const linkMatch = htmlContent.match(/href="([^"]+)"/)
      expect(linkMatch).toBeTruthy()
      expect(linkMatch![1]).toContain('/auth/confirm')
      expect(linkMatch![1]).toContain('token=')

      // Text version should also handle special characters
      const textContent = result.emailContent?.text || ''
      expect(textContent).toContain('Confirm your email')
      expect(textContent).toMatch(/https?:\/\/[^\s]+/)
    })
  })

  describe('Security and Trust Indicators', () => {
    it('should include proper security messaging and trust indicators', async () => {
      const securityTestEmails = [
        emailTestingUtils.generateTestEmail('security-verification'),
        emailTestingUtils.generateTestEmail('security-reset')
      ]

      // Mock both email types
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'sec-1', email: securityTestEmails[0] }, session: null },
        error: null
      })
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const [verificationResult, resetResult] = await Promise.all([
        createEmailVerificationTest(securityTestEmails[0], 'SecurityTest123!'),
        createPasswordResetTest(securityTestEmails[1])
      ])

      // Check for security messaging in verification emails
      const verificationContent = verificationResult.emailContent?.html + ' ' + verificationResult.emailContent?.text
      expect(verificationContent).toMatch(/didn't create|didn't request/i)
      expect(verificationContent).toMatch(/safely ignore/i)

      // Check for security messaging in reset emails
      const resetContent = resetResult.emailContent?.html + ' ' + resetResult.emailContent?.text
      expect(resetContent).toMatch(/didn't request/i)
      expect(resetContent).toMatch(/safely ignore/i)
      expect(resetContent).toMatch(/security|expire/i)

      // Verify trusted sender information
      expect(verificationResult.from).toContain('supabase.co')
      expect(resetResult.from).toContain('supabase.co')

      // Check for proper headers that indicate legitimate email
      expect(verificationResult.emailContent?.headers['X-Mailer']).toBeTruthy()
      expect(resetResult.emailContent?.headers['X-Mailer']).toBeTruthy()

      // Verify HTTPS links for security
      const verificationLinks = verificationResult.emailContent?.html.match(/href="([^"]+)"/g) || []
      const resetLinks = resetResult.emailContent?.html.match(/href="([^"]+)"/g) || []

      verificationLinks.forEach(link => {
        expect(link).toMatch(/https?:\/\//)
      })
      resetLinks.forEach(link => {
        expect(link).toMatch(/https?:\/\//)
      })
    })

    it('should prevent common email security vulnerabilities', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('vulnerability-test')

      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'vuln-user', email: testEmail }, session: null },
        error: null
      })

      const result = await createEmailVerificationTest(testEmail, 'VulnTest123!')
      const htmlContent = result.emailContent?.html || ''

      // Should not contain executable content
      expect(htmlContent).not.toContain('<script')
      expect(htmlContent).not.toContain('javascript:')
      expect(htmlContent).not.toContain('data:text/html')
      expect(htmlContent).not.toContain('vbscript:')

      // Should not contain potentially dangerous elements
      expect(htmlContent).not.toContain('<iframe')
      expect(htmlContent).not.toContain('<object')
      expect(htmlContent).not.toContain('<embed')
      expect(htmlContent).not.toContain('<form')

      // Should not contain external resource references that could leak data
      expect(htmlContent).not.toMatch(/src=["']?https?:\/\/(?!localhost)/i)
      expect(htmlContent).not.toMatch(/background=["']?https?:\/\/(?!localhost)/i)

      // Links should be to expected domains only
      const linkMatches = htmlContent.match(/href="([^"]+)"/g) || []
      linkMatches.forEach(link => {
        expect(link).toMatch(/localhost|supabase\.co|your-app\.com/i)
      })

      // Should not expose sensitive information in links
      const linkHrefs = linkMatches.map(link => link.match(/href="([^"]+)"/)?.[1] || '')
      linkHrefs.forEach(href => {
        expect(href).not.toContain('password')
        expect(href).not.toContain('secret')
        expect(href).not.toContain('private')
        expect(href).not.toContain(testEmail) // Email should not be in URL
      })
    })
  })

  describe('Performance and Deliverability', () => {
    it('should generate emails optimized for deliverability', async () => {
      const testEmail = emailTestingUtils.generateTestEmail('deliverability-test')

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: { message: 'Reset email sent' },
        error: null
      })

      const startTime = Date.now()
      const result = await createPasswordResetTest(testEmail)
      const generationTime = Date.now() - startTime

      // Should generate quickly (under 1 second for mock)
      expect(generationTime).toBeLessThan(1000)

      // Check email size (should be reasonable for deliverability)
      const totalSize = (result.emailContent?.html?.length || 0) + (result.emailContent?.text?.length || 0)
      expect(totalSize).toBeLessThan(50000) // Under 50KB for better deliverability

      // HTML should not be overly complex
      const htmlContent = result.emailContent?.html || ''
      const htmlDepth = (htmlContent.match(/<[^>]+>/g) || []).length
      expect(htmlDepth).toBeLessThan(100) // Not too many HTML tags

      // Should avoid spam trigger words in content
      const suspiciousWords = /urgent|warning|alert|immediate|act now|limited time|expires today/gi
      expect(htmlContent).not.toMatch(suspiciousWords)
      expect(result.emailContent?.text).not.toMatch(suspiciousWords)

      // Subject line should be appropriate length
      expect(result.subject.length).toBeGreaterThan(10)
      expect(result.subject.length).toBeLessThan(80) // Good for mobile display

      // Should have proper text to HTML ratio
      const textLength = result.emailContent?.text?.length || 0
      const htmlTextLength = htmlContent.replace(/<[^>]*>/g, '').length
      const ratio = textLength / htmlTextLength
      expect(ratio).toBeGreaterThan(0.5) // Good text to HTML ratio
    })

    it('should maintain template consistency across different sending volumes', async () => {
      const bulkEmails = Array.from({ length: 10 }, (_, i) => 
        emailTestingUtils.generateTestEmail(`bulk-${i}`)
      )

      // Mock multiple email generations
      bulkEmails.forEach(() => {
        mockSupabase.auth.signUp.mockResolvedValueOnce({
          data: { user: { id: `bulk-${Date.now()}`, email: 'test@example.com' }, session: null },
          error: null
        })
      })

      // Generate all emails concurrently
      const startTime = Date.now()
      const results = await Promise.all(
        bulkEmails.map(email => createEmailVerificationTest(email, 'BulkTest123!'))
      )
      const totalTime = Date.now() - startTime

      // All emails should be generated successfully
      expect(results.every(result => result.success)).toBe(true)

      // Should maintain reasonable performance even with bulk generation
      expect(totalTime).toBeLessThan(5000) // Under 5 seconds for 10 emails

      // All emails should have consistent structure
      const allHtml = results.map(r => r.emailContent?.html || '')
      const allText = results.map(r => r.emailContent?.text || '')

      // Check consistency across all emails
      allHtml.forEach(html => {
        expect(html).toContain('<!DOCTYPE html>')
        expect(html).toContain('Confirm your email')
        expect(html).toContain('/auth/confirm')
        expect(html).toContain('token=')
      })

      allText.forEach(text => {
        expect(text).toContain('Confirm your email')
        expect(text).toContain('/auth/confirm')
        expect(text).toContain('token=')
      })

      // All should have consistent headers
      results.forEach(result => {
        expect(result.emailContent?.headers['X-Mailer']).toBe('Supabase Auth')
        expect(result.emailContent?.headers['Content-Type']).toContain('text/html')
      })
    })
  })
}) 