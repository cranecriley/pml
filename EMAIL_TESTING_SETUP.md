# Email Testing Environment Setup Guide

This guide provides comprehensive instructions for setting up and using the email testing environment for authentication system testing.

## 🚀 Quick Start

1. **Copy environment configuration**:
   ```bash
   cp email-testing.env.example .env.local
   ```

2. **Configure your testing mode**:
   - `mock`: For automated tests (no real emails)
   - `capture`: For development with email capture service
   - `live`: For manual testing with real emails

3. **Run email tests**:
   ```bash
   npm test src/test/__tests__/emailTestingEnvironment.test.ts
   ```

## 📧 Testing Modes

### Mock Mode (Recommended for CI/CD)
```env
VITE_EMAIL_TESTING_MODE=mock
```
- **Best for**: Automated testing, CI/CD pipelines
- **Emails**: Simulated with realistic content
- **Setup**: No additional configuration needed
- **Speed**: Instant email "delivery"

### Capture Mode (Recommended for Development)
```env
VITE_EMAIL_TESTING_MODE=capture
VITE_EMAIL_CAPTURE_API=https://api.mailtrap.io
VITE_EMAIL_CAPTURE_TOKEN=your_token_here
```
- **Best for**: Development and manual testing
- **Emails**: Captured by email testing service
- **Setup**: Requires email capture service account
- **Speed**: Near-instant with email inspection

### Live Mode (Production Testing Only)
```env
VITE_EMAIL_TESTING_MODE=live
```
- **Best for**: Final production validation
- **Emails**: Sent to real email addresses
- **Setup**: Requires production email configuration
- **Speed**: Depends on email provider

## 🛠️ Setup Instructions

### 1. Supabase Configuration

#### Create Test Project (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project for testing
3. Configure environment variables:
   ```env
   VITE_SUPABASE_TEST_URL=https://your-test-project.supabase.co
   VITE_SUPABASE_TEST_ANON_KEY=your_test_anon_key
   ```

#### Configure Email Templates
1. Go to **Authentication** → **Templates**
2. Customize email templates:
   - **Confirm signup**: Email verification template
   - **Reset password**: Password reset template
3. Set redirect URLs:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: 
     - `http://localhost:3000/auth/confirm`
     - `http://localhost:3000/auth/reset-password`

### 2. Email Capture Services

#### Option A: Mailtrap (Recommended)
1. Sign up at [Mailtrap.io](https://mailtrap.io)
2. Create a new inbox
3. Get API credentials:
   ```env
   VITE_EMAIL_CAPTURE_API=https://api.mailtrap.io
   VITE_EMAIL_CAPTURE_TOKEN=your_api_token
   VITE_MAILTRAP_INBOX_ID=your_inbox_id
   ```

#### Option B: MailHog (Local Development)
1. Install MailHog: `brew install mailhog`
2. Run: `mailhog`
3. Configure:
   ```env
   VITE_MAILHOG_API_URL=http://localhost:8025/api/v1
   ```
4. Web UI: http://localhost:8025

#### Option C: Ethereal Email (Temporary Testing)
1. Visit [Ethereal Email](https://ethereal.email)
2. Create test account
3. Configure:
   ```env
   VITE_ETHEREAL_USERNAME=your_username
   VITE_ETHEREAL_PASSWORD=your_password
   ```

## 🧪 Usage Examples

### Basic Email Testing
```typescript
import { emailTestingUtils, createEmailVerificationTest } from './src/test/utils/emailTestingUtils'

// Generate test email
const testEmail = emailTestingUtils.generateTestEmail('signup')

// Test email verification flow
const result = await createEmailVerificationTest(testEmail, 'SecurePassword123!')

console.log('Email sent:', result.success)
console.log('Email content:', result.emailContent)
```

### Batch Email Testing
```typescript
// Generate multiple test emails
const testEmails = emailTestingUtils.generateTestEmails(10, 'batch')

// Test multiple email flows
for (const email of testEmails) {
  const result = await createEmailVerificationTest(email, 'TestPassword123!')
  console.log(`Email ${email}: ${result.success ? 'SUCCESS' : 'FAILED'}`)
}
```

### Email Template Validation
```typescript
import { EMAIL_TEMPLATES } from './src/test/utils/emailTestingUtils'

// Test email verification
const result = await createEmailVerificationTest('test@example.com', 'password123')

// Validate template compliance
const validation = emailTestingUtils.validateEmailTemplate(
  result.emailContent,
  EMAIL_TEMPLATES.emailVerification
)

console.log('Template valid:', validation.isValid)
console.log('Errors:', validation.errors)
console.log('Warnings:', validation.warnings)
```

## 📊 Testing Statistics

Get comprehensive testing statistics:

```typescript
const stats = emailTestingUtils.getTestStatistics()

console.log(`
Total Emails: ${stats.totalEmails}
Successful Deliveries: ${stats.successfulDeliveries}
Failed Deliveries: ${stats.failedDeliveries}
Average Delivery Time: ${stats.averageDeliveryTime}ms
`)
```

## 🔧 Configuration Options

### Environment Variables

#### Core Configuration
```env
# Testing mode
VITE_EMAIL_TESTING_MODE=mock

# Supabase configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Test-specific Supabase (optional)
VITE_SUPABASE_TEST_URL=https://your-test-project.supabase.co
VITE_SUPABASE_TEST_ANON_KEY=your_test_anon_key
```

#### Email Capture Configuration
```env
# Mailtrap
VITE_EMAIL_CAPTURE_API=https://api.mailtrap.io
VITE_EMAIL_CAPTURE_TOKEN=your_token

# MailHog
VITE_MAILHOG_API_URL=http://localhost:8025/api/v1

# Ethereal
VITE_ETHEREAL_USERNAME=your_username
VITE_ETHEREAL_PASSWORD=your_password
```

#### Testing Options
```env
# Template testing
VITE_TEMPLATE_TESTING=true

# Rate limiting bypass for tests
VITE_TEST_RATE_LIMIT_BYPASS=true

# Auto cleanup test data
VITE_AUTO_CLEANUP_TEST_DATA=true

# Timeouts
VITE_EMAIL_DELIVERY_TIMEOUT=30000
VITE_EMAIL_VERIFICATION_TIMEOUT=60000
```

### Email Template Requirements

Templates must include these elements:

#### Email Verification Template
- ✅ "Confirm your email" text
- ✅ "verification" or "confirm" keywords
- ✅ Clickable verification link
- ✅ Proper HTML structure with DOCTYPE
- ✅ Text version for accessibility

#### Password Reset Template
- ✅ "Reset your password" text
- ✅ "reset" and "password" keywords
- ✅ Reset link with expiration notice
- ✅ Security warning text
- ✅ Proper HTML structure with DOCTYPE

## 🐛 Troubleshooting

### Common Issues

#### "Test Supabase environment variables not configured"
**Solution**: Set environment variables in `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### Email capture not working
**Solutions**:
1. Check API credentials
2. Verify network connectivity
3. Check service status
4. Fallback to mock mode

#### Template validation failing
**Solutions**:
1. Check Supabase email templates
2. Verify required elements are present
3. Check HTML structure
4. Ensure text version exists

#### Tests timing out
**Solutions**:
1. Increase timeout values
2. Check network connectivity
3. Use mock mode for faster tests
4. Check service availability

### Debug Mode

Enable debug logging:
```env
VITE_DEV_MODE=true
```

This will provide detailed logging of:
- Email delivery attempts
- Template validation results
- API call responses
- Error details

## 🔒 Security Considerations

### Development vs Production

#### Development Environment
- Use test Supabase projects
- Use email capture services
- Enable debug logging
- Use test email domains

#### Production Environment
- Use production Supabase project
- Disable debug logging
- Use real email domains
- Enable proper rate limiting

### API Key Security

```env
# ❌ Never commit real API keys
VITE_EMAIL_CAPTURE_TOKEN=real_api_key_here

# ✅ Use environment-specific keys
VITE_EMAIL_CAPTURE_TOKEN=test_api_key_here
```

### Test Data Cleanup

Automatic cleanup is enabled by default:
```env
VITE_AUTO_CLEANUP_TEST_DATA=true
```

Manual cleanup:
```typescript
await emailTestingUtils.cleanupTestUsers([
  'test1@example.com',
  'test2@example.com'
])
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Email Testing
on: [push, pull_request]

jobs:
  email-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run email tests
        env:
          VITE_EMAIL_TESTING_MODE: mock
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
        run: npm test src/test/__tests__/emailTestingEnvironment.test.ts
```

### Environment-Specific Configuration

#### Development
```env
VITE_EMAIL_TESTING_MODE=capture
VITE_EMAIL_CAPTURE_API=https://api.mailtrap.io
```

#### Staging
```env
VITE_EMAIL_TESTING_MODE=capture
VITE_EMAIL_CAPTURE_API=https://api.mailtrap.io
```

#### Production
```env
VITE_EMAIL_TESTING_MODE=live
# Production email settings
```

## 📚 API Reference

### EmailTestingUtils Class

#### Methods

##### `generateTestEmail(prefix?: string): string`
Generates unique test email address.

##### `generateTestEmails(count: number, prefix?: string): string[]`
Generates multiple unique test email addresses.

##### `testEmailVerificationFlow(email: string, password: string): Promise<EmailTestResult>`
Tests complete email verification flow.

##### `testPasswordResetFlow(email: string): Promise<EmailTestResult>`
Tests complete password reset flow.

##### `validateEmailTemplate(content, template): ValidationResult`
Validates email content against template requirements.

##### `getTestStatistics(): TestStatistics`
Returns comprehensive testing statistics.

##### `cleanupTestUsers(emails: string[]): Promise<void>`
Cleans up test user data.

### Helper Functions

##### `createEmailVerificationTest(email: string, password: string): Promise<EmailTestResult>`
Convenient wrapper for email verification testing.

##### `createPasswordResetTest(email: string): Promise<EmailTestResult>`
Convenient wrapper for password reset testing.

## 🎯 Best Practices

### Test Organization
1. Use descriptive test email prefixes
2. Group related tests together
3. Clean up test data after tests
4. Use appropriate testing modes

### Performance
1. Use mock mode for unit tests
2. Use capture mode for integration tests
3. Minimize live mode usage
4. Cache email templates

### Reliability
1. Handle network timeouts gracefully
2. Provide fallback mechanisms
3. Validate email content thoroughly
4. Monitor test statistics

### Security
1. Never expose real API keys
2. Use test environments only
3. Implement proper cleanup
4. Monitor test data usage

## ✅ Verification Checklist

Before deploying to production:

- [ ] Email templates are properly configured in Supabase
- [ ] Redirect URLs are set correctly
- [ ] Email capture service is working
- [ ] All tests pass in mock mode
- [ ] Template validation passes
- [ ] Statistics tracking works
- [ ] Cleanup functionality works
- [ ] Environment variables are configured
- [ ] API keys are secured
- [ ] Documentation is up to date

## 🆘 Support

For additional help:

1. **Documentation**: Check this guide first
2. **Test Output**: Review test logs for specific errors
3. **Debug Mode**: Enable `VITE_DEV_MODE=true`
4. **Service Status**: Check Supabase and email service status
5. **Community**: Check Supabase Discord for community support

## 📝 Changelog

### v1.0.0
- Initial email testing environment setup
- Mock, capture, and live testing modes
- Comprehensive template validation
- Statistics and reporting
- Automated cleanup functionality
- Complete documentation 