import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthWrapper } from './components/auth/AuthWrapper'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PasswordResetPage } from './pages/PasswordResetPage'
import { WelcomePage } from './pages/WelcomePage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthenticationTestSuite } from './test/AuthenticationTestSuite'

// Temporary Dashboard component
const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Dashboard
        </h1>
        <p className="text-gray-600 mb-6">
          Welcome to your language learning platform! Authentication is working perfectly.
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">
              ✅ Authentication system is fully functional
            </p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 text-sm">
              🚀 Ready for language learning features
            </p>
          </div>
          <div className="mt-6">
            <a 
              href="/test" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              🧪 Run Test Suite
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthWrapper>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/password-reset" element={<PasswordResetPage />} />
            
            {/* Test suite - accessible without authentication for testing */}
            <Route path="/test" element={<AuthenticationTestSuite />} />
            
            {/* Protected routes */}
            <Route path="/welcome" element={
              <ProtectedRoute>
                <WelcomePage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
        </AuthWrapper>
      </Router>
    </AuthProvider>
  )
}

export default App
