import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface FooterProps {
  className?: string
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const { user, loading, postLoginRouting } = useAuth()
  const location = useLocation()

  // Don't show footer on auth pages to keep them clean
  const authPages = ['/login', '/register', '/reset-password', '/auth/confirm', '/auth/reset-password']
  const isAuthPage = authPages.some(page => location.pathname.startsWith(page))
  
  // Don't show footer on test page
  const isTestPage = location.pathname === '/test'
  
  // Don't show footer while loading to prevent layout shift
  if (isAuthPage || isTestPage || loading) {
    return null
  }

  return (
    <footer className={`bg-white border-t border-gray-200 mt-auto ${className}`}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">PolyglotML</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Your personalized language learning platform
            </p>
          </div>

          {/* Learning */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Learning
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                  Lessons
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                  Progress
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                  Achievements
                </a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Account
            </h3>
            <ul className="mt-4 space-y-2">
              {user ? (
                <>
                  <li>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                      Profile Settings
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                      Preferences
                    </a>
                  </li>
                  <li>
                    <Link to="/reset-password" className="text-sm text-gray-500 hover:text-gray-900">
                      Change Password
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900">
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="text-sm text-gray-500 hover:text-gray-900">
                      Sign Up
                    </Link>
                  </li>
                  <li>
                    <Link to="/reset-password" className="text-sm text-gray-500 hover:text-gray-900">
                      Reset Password
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              Support
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                  Contact Us
                </a>
              </li>
              {process.env.NODE_ENV === 'development' && (
                <li>
                  <Link to="/test" className="text-sm text-orange-500 hover:text-orange-700">
                    Test Suite
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2024 PolyglotML. All rights reserved.
            </div>
            
            {user && (
              <div className="mt-4 md:mt-0 text-sm text-gray-500">
                Signed in as {user.email}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 