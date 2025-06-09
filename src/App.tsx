import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthWrapper } from './components/auth/AuthWrapper'
import { AppRoutes } from './routes'
import { AuthenticationTestSuite } from './test/AuthenticationTestSuite'
import { Navigation } from './components/ui/Navigation'
import { Footer } from './components/ui/Footer'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalLoadingState from './components/ui/GlobalLoadingState'
import AuthStatusIndicator from './components/ui/AuthStatusIndicator'
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <ErrorBoundary context="App">
      <AuthProvider>
        <Router>
          <AuthWrapper>
            <GlobalLoadingState showFullScreen={true}>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <ErrorBoundary context="Navigation">
                  <Navigation />
                </ErrorBoundary>
                <main className="flex-1">
                  <ErrorBoundary context="Main Routes">
                    <Routes>
                      {/* Test suite - accessible without authentication for testing */}
                      <Route path="/test" element={<AuthenticationTestSuite />} />
                      
                      {/* All other routes handled by AppRoutes */}
                      <Route path="/*" element={<AppRoutes />} />
                    </Routes>
                  </ErrorBoundary>
                </main>
                <ErrorBoundary context="Footer">
                  <Footer />
                </ErrorBoundary>
              </div>
              
              {/* Development auth status indicator */}
              <AuthStatusIndicator position="bottom-left" />
            </GlobalLoadingState>
          </AuthWrapper>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
