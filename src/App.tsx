import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthWrapper } from './components/auth/AuthWrapper'
import { AppRoutes } from './routes'
import { AuthenticationTestSuite } from './test/AuthenticationTestSuite'
import { Navigation } from './components/ui/Navigation'
import { Footer } from './components/ui/Footer'
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthWrapper>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation />
            <main className="flex-1">
              <Routes>
                {/* Test suite - accessible without authentication for testing */}
                <Route path="/test" element={<AuthenticationTestSuite />} />
                
                {/* All other routes handled by AppRoutes */}
                <Route path="/*" element={<AppRoutes />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthWrapper>
      </Router>
    </AuthProvider>
  )
}

export default App
