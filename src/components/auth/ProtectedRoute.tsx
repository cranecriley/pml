import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireUnauth?: boolean
  redirectTo?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireUnauth = false,
  redirectTo
}) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" color="blue" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Route requires authentication but user is not authenticated
  if (requireAuth && !user) {
    // Store the attempted URL for redirect after login
    const from = location.pathname + location.search
    return <Navigate to={redirectTo || `/login?from=${encodeURIComponent(from)}`} replace />
  }

  // Route requires no authentication (login/register pages) but user is authenticated
  if (requireUnauth && user) {
    // Check if there's a redirect URL from login attempt
    const urlParams = new URLSearchParams(location.search)
    const from = urlParams.get('from')
    
    if (from) {
      return <Navigate to={decodeURIComponent(from)} replace />
    }
    
    // Default redirect for authenticated users accessing auth pages
    return <Navigate to={redirectTo || "/dashboard"} replace />
  }

  // User meets the route requirements, render the protected content
  return <>{children}</>
}

// Convenience wrapper for routes that require authentication
export const AuthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requireAuth={true}>
    {children}
  </ProtectedRoute>
)

// Convenience wrapper for routes that require no authentication (login, register, etc.)
export const UnauthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requireUnauth={true}>
    {children}
  </ProtectedRoute>
)

// Higher-order component for protecting pages
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAuth?: boolean
    requireUnauth?: boolean
    redirectTo?: string
  } = {}
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  )
  
  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Hook for checking authentication status in components
export const useAuthGuard = () => {
  const { user, loading } = useAuth()
  
  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user,
    // Utility function to check if user can access a route
    canAccess: (requireAuth: boolean = true) => {
      if (loading) return null // Still loading
      return requireAuth ? !!user : !user
    }
  }
}
