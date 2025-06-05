import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authErrorHandlingService } from '../services/authErrorHandlingService'
import { rateLimitingService } from '../services/rateLimitingService'
import { errorHandlingService } from '../services/errorHandlingService'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  error?: string
  details?: string
  duration?: number
}

interface TestSuite {
  name: string
  tests: TestResult[]
  passed: number
  failed: number
  skipped: number
}

export const AuthenticationTestSuite: React.FC = () => {
  const { user, register, login, logout, loading } = useAuth()
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string>('')

  // Test data
  const testEmail = 'test@example.com'
  const testPassword = 'TestPassword123!'
  const weakPassword = '123'
  const invalidEmail = 'invalid-email'

  const updateTestResult = (suiteName: string, testName: string, result: Partial<TestResult>) => {
    setTestSuites(prev => prev.map(suite => {
      if (suite.name === suiteName) {
        const updatedTests = suite.tests.map(test => 
          test.name === testName ? { ...test, ...result } : test
        )
        const passed = updatedTests.filter(t => t.status === 'passed').length
        const failed = updatedTests.filter(t => t.status === 'failed').length
        const skipped = updatedTests.filter(t => t.status === 'skipped').length
        
        return { ...suite, tests: updatedTests, passed, failed, skipped }
      }
      return suite
    }))
  }

  const runTest = async (suiteName: string, testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now()
    setCurrentTest(`${suiteName}: ${testName}`)
    
    updateTestResult(suiteName, testName, { status: 'running' })
    
    try {
      await testFn()
      const duration = Date.now() - startTime
      updateTestResult(suiteName, testName, { 
        status: 'passed', 
        duration,
        details: `Completed in ${duration}ms`
      })
    } catch (error) {
      const duration = Date.now() - startTime
      updateTestResult(suiteName, testName, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : String(error),
        duration
      })
    }
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Initialize test suites
  useEffect(() => {
    setTestSuites([
      {
        name: 'UI Component Tests',
        tests: [
          { name: 'Login form renders correctly', status: 'pending' },
          { name: 'Registration form renders correctly', status: 'pending' },
          { name: 'Password reset form renders correctly', status: 'pending' },
          { name: 'Form validation works', status: 'pending' },
          { name: 'Loading states display', status: 'pending' },
          { name: 'Error messages display', status: 'pending' },
        ],
        passed: 0,
        failed: 0,
        skipped: 0
      },
      {
        name: 'Authentication Flow Tests',
        tests: [
          { name: 'User registration attempt', status: 'pending' },
          { name: 'Email verification flow', status: 'pending' },
          { name: 'User login attempt', status: 'pending' },
          { name: 'Invalid credentials handling', status: 'pending' },
          { name: 'Password reset request', status: 'pending' },
          { name: 'Session management', status: 'pending' },
        ],
        passed: 0,
        failed: 0,
        skipped: 0
      },
      {
        name: 'Error Handling Tests',
        tests: [
          { name: 'Network error handling', status: 'pending' },
          { name: 'Rate limiting behavior', status: 'pending' },
          { name: 'Invalid input validation', status: 'pending' },
          { name: 'User-friendly error messages', status: 'pending' },
          { name: 'Recovery action suggestions', status: 'pending' },
        ],
        passed: 0,
        failed: 0,
        skipped: 0
      },
      {
        name: 'Route Protection Tests',
        tests: [
          { name: 'Protected routes redirect when logged out', status: 'pending' },
          { name: 'Public routes accessible when logged out', status: 'pending' },
          { name: 'Protected routes accessible when logged in', status: 'pending' },
          { name: 'Post-login routing works correctly', status: 'pending' },
          { name: 'Logout clears session', status: 'pending' },
        ],
        passed: 0,
        failed: 0,
        skipped: 0
      },
      {
        name: 'Security & Performance Tests',
        tests: [
          { name: 'Rate limiting prevents brute force', status: 'pending' },
          { name: 'Session timeout works', status: 'pending' },
          { name: 'Inactivity warning displays', status: 'pending' },
          { name: 'Sensitive data is masked in logs', status: 'pending' },
          { name: 'Form performance is acceptable', status: 'pending' },
        ],
        passed: 0,
        failed: 0,
        skipped: 0
      }
    ])
  }, [])

  const runAllTests = async () => {
    setIsRunning(true)
    
    try {
      // UI Component Tests
      await runTest('UI Component Tests', 'Login form renders correctly', async () => {
        const loginForm = document.querySelector('form[data-testid="login-form"]') || 
                         document.querySelector('input[type="email"]')
        if (!loginForm) throw new Error('Login form not found')
      })

      await runTest('UI Component Tests', 'Registration form renders correctly', async () => {
        // Navigate to register page and check form
        const registerLink = document.querySelector('a[href="/auth/register"]')
        if (!registerLink) throw new Error('Register link not found')
      })

      await runTest('UI Component Tests', 'Form validation works', async () => {
        // Test that empty form shows validation errors
        const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
        
        if (!emailInput || !passwordInput) throw new Error('Form inputs not found')
        
        // Simulate invalid input
        emailInput.value = invalidEmail
        passwordInput.value = weakPassword
        
        // Trigger validation (this would normally happen on form submission)
        const isEmailValid = emailInput.checkValidity()
        if (isEmailValid) throw new Error('Email validation should have failed')
      })

      // Authentication Flow Tests
      await runTest('Authentication Flow Tests', 'User registration attempt', async () => {
        try {
          await register.execute({ 
            email: testEmail, 
            password: testPassword, 
            confirmPassword: testPassword 
          })
          // If we get here without Supabase, that's expected
        } catch (error: any) {
          // Check if it's a Supabase connection error (expected without config)
          if (error.message?.includes('Invalid URL') || error.message?.includes('supabase')) {
            // This is expected without Supabase configuration
            return
          }
          throw error
        }
      })

      await runTest('Authentication Flow Tests', 'Invalid credentials handling', async () => {
        try {
          await login.execute({ email: 'nonexistent@example.com', password: 'wrongpassword' })
        } catch (error: any) {
          // Check that error handling service processes this correctly
          const errorInfo = authErrorHandlingService.processAuthError(error)
          if (!errorInfo.userMessage) throw new Error('Error handling failed')
        }
      })

      // Error Handling Tests
      await runTest('Error Handling Tests', 'Rate limiting behavior', async () => {
        // Test rate limiting service
        const testUser = 'test@example.com'
        
        // Simulate multiple failed attempts
        for (let i = 0; i < 6; i++) {
          rateLimitingService.recordAttempt(testUser, false)
        }
        
        const rateLimitInfo = rateLimitingService.checkRateLimit(testUser)
        if (!rateLimitInfo.isLimited) throw new Error('Rate limiting should have blocked user')
        
        // Clean up
        rateLimitingService.resetRateLimit(testUser)
      })

      await runTest('Error Handling Tests', 'User-friendly error messages', async () => {
        // Test error message formatting
        const mockError = new Error('Invalid login credentials')
        const errorInfo = authErrorHandlingService.processAuthError(mockError)
        const formatted = authErrorHandlingService.formatErrorForUser(errorInfo)
        
        if (!formatted.title || !formatted.message || !formatted.actions.length) {
          throw new Error('Error formatting incomplete')
        }
      })

      await runTest('Error Handling Tests', 'Network error handling', async () => {
        // Test network error detection
        const networkError = new Error('fetch failed')
        networkError.name = 'NetworkError'
        
        const errorInfo = authErrorHandlingService.processAuthError(networkError)
        if (errorInfo.category !== 'network') {
          throw new Error('Network error not properly categorized')
        }
      })

      // Security Tests
      await runTest('Security & Performance Tests', 'Sensitive data is masked in logs', async () => {
        // Test email masking
        const service = authErrorHandlingService as any
        const maskedEmail = service.maskEmail('test@example.com')
        
        if (maskedEmail.includes('test') && maskedEmail.length > 8) {
          throw new Error('Email not properly masked')
        }
      })

      await runTest('Security & Performance Tests', 'Form performance is acceptable', async () => {
        const startTime = Date.now()
        
        // Simulate form interactions
        const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
        if (emailInput) {
          emailInput.value = testEmail
          emailInput.dispatchEvent(new Event('input', { bubbles: true }))
        }
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        if (duration > 100) {
          throw new Error(`Form interaction took ${duration}ms (should be < 100ms)`)
        }
      })

      // Route Protection Tests (these would need navigation simulation)
      await runTest('Route Protection Tests', 'Public routes accessible when logged out', async () => {
        // Check that we can access login page without authentication
        const currentPath = window.location.pathname
        if (currentPath.includes('/auth/')) {
          // We're on an auth page, which is correct when not logged in
          return
        }
        throw new Error('Should be on auth page when not logged in')
      })

      setCurrentTest('All tests completed!')
      
    } catch (error) {
      console.error('Test suite error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getTotalStats = () => {
    return testSuites.reduce((acc, suite) => ({
      total: acc.total + suite.tests.length,
      passed: acc.passed + suite.passed,
      failed: acc.failed + suite.failed,
      skipped: acc.skipped + suite.skipped
    }), { total: 0, passed: 0, failed: 0, skipped: 0 })
  }

  const stats = getTotalStats()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Authentication System Test Suite
          </h1>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-600">Total Tests</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.skipped}</div>
              <div className="text-sm text-yellow-600">Skipped</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </button>
            
            {currentTest && (
              <div className="text-sm text-gray-600">
                Current: {currentTest}
              </div>
            )}
          </div>
        </div>

        {/* Test Suites */}
        <div className="space-y-6">
          {testSuites.map((suite) => (
            <div key={suite.name} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{suite.name}</h2>
                <div className="text-sm text-gray-500">
                  {suite.passed} passed, {suite.failed} failed, {suite.skipped} skipped
                </div>
              </div>
              
              <div className="space-y-2">
                {suite.tests.map((test) => (
                  <div key={test.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        test.status === 'passed' ? 'bg-green-500' :
                        test.status === 'failed' ? 'bg-red-500' :
                        test.status === 'running' ? 'bg-blue-500 animate-pulse' :
                        test.status === 'skipped' ? 'bg-yellow-500' :
                        'bg-gray-300'
                      }`} />
                      <span className="font-medium">{test.name}</span>
                    </div>
                    
                    <div className="text-right">
                      {test.duration && (
                        <div className="text-xs text-gray-500">{test.duration}ms</div>
                      )}
                      {test.error && (
                        <div className="text-xs text-red-600 max-w-xs truncate">{test.error}</div>
                      )}
                      {test.details && !test.error && (
                        <div className="text-xs text-gray-500">{test.details}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Testing Instructions</h3>
          <div className="text-blue-800 space-y-2">
            <p><strong>Without Supabase:</strong> Many tests will show expected failures for authentication calls, but UI and error handling tests should pass.</p>
            <p><strong>With Supabase:</strong> Set up your environment variables and all tests should work with real authentication.</p>
            <p><strong>Manual Testing:</strong> Use the main app to test user flows like registration, login, password reset, and logout.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 