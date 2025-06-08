import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProtectedRoute, AuthenticatedRoute, UnauthenticatedRoute, withAuth, useAuthGuard } from '../ProtectedRoute'

// Mock the UI components
jest.mock('../../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size, color, className }: any) => (
    <div data-testid="loading-spinner" className={className}>
      Loading Spinner - {size} - {color}
    </div>
  )
}))

// Mock React Router Navigate component
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
    mockNavigate(to, replace)
    return <div data-testid="navigate-component">Navigate to: {to}</div>
  }
}))

// Mock the useAuth hook
const mockUser = { id: '1', email: 'test@example.com' }
const mockUseAuth = {
  user: null as any,
  session: null,
  loading: false,
  postLoginRouting: null,
  inactivityWarning: {
    isVisible: false,
    timeRemaining: 0,
  },
  login: { execute: jest.fn(), loading: false, error: null },
  register: { execute: jest.fn(), loading: false, error: null },
  logout: { execute: jest.fn(), loading: false, error: null },
  resetPassword: { execute: jest.fn(), loading: false, error: null },
  updatePassword: { execute: jest.fn(), loading: false, error: null },
  confirmPasswordReset: { execute: jest.fn(), loading: false, error: null },
  refreshSession: { execute: jest.fn(), loading: false, error: null },
  clearErrors: jest.fn(),
  checkLoginStatus: jest.fn(),
  getSessionInfo: jest.fn(),
  extendSession: jest.fn(),
  dismissInactivityWarning: jest.fn(),
  getInactivityStatus: jest.fn(),
  completeOnboarding: jest.fn(),
  getPostLoginPath: jest.fn(),
}

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth
}))

// Helper component for testing
const TestComponent = () => <div data-testid="test-component">Protected Content</div>

// Helper to render with router
const renderWithRouter = (component: React.ReactElement, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.user = null
    mockUseAuth.loading = false
  })

  describe('Loading State', () => {
    it('should show loading spinner when auth is loading', () => {
      mockUseAuth.loading = true
      
      renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
    })

    it('should apply correct loading spinner styles', () => {
      mockUseAuth.loading = true
      
      renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      const spinner = screen.getByTestId('loading-spinner')
      expect(spinner).toHaveTextContent('Loading Spinner - lg - blue')
      expect(spinner).toHaveClass('mx-auto', 'mb-4')
    })

    it('should center loading spinner with proper layout', () => {
      mockUseAuth.loading = true
      
      const { container } = renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      const loadingContainer = container.querySelector('.min-h-screen')
      expect(loadingContainer).toHaveClass('flex', 'items-center', 'justify-center', 'bg-gray-50')
    })
  })

  describe('Authentication Required (Default Behavior)', () => {
    it('should render children when user is authenticated', () => {
      mockUseAuth.user = mockUser
      
      renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
      expect(screen.queryByTestId('navigate-component')).not.toBeInTheDocument()
    })

    it('should redirect to login when user is not authenticated', () => {
      mockUseAuth.user = null
      
      renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>,
        ['/protected-page']
      )

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/login?from=%2Fprotected-page', true)
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
    })

    it('should redirect to custom redirect path when specified', () => {
      mockUseAuth.user = null
      
      renderWithRouter(
        <ProtectedRoute redirectTo="/custom-login">
          <TestComponent />
        </ProtectedRoute>
      )

      expect(mockNavigate).toHaveBeenCalledWith('/custom-login', true)
    })

    it('should preserve query parameters in redirect URL', () => {
      mockUseAuth.user = null
      
      renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>,
        ['/protected-page?tab=settings&id=123']
      )

      expect(mockNavigate).toHaveBeenCalledWith('/login?from=%2Fprotected-page%3Ftab%3Dsettings%26id%3D123', true)
    })
  })

  describe('Explicit Authentication Required', () => {
    it('should render children when requireAuth=true and user is authenticated', () => {
      mockUseAuth.user = mockUser
      
      renderWithRouter(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })

    it('should redirect when requireAuth=true and user is not authenticated', () => {
      mockUseAuth.user = null
      
      renderWithRouter(
        <ProtectedRoute requireAuth={true}>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
    })
  })

  describe('No Authentication Required', () => {
    it('should render children when requireAuth=false regardless of auth state', () => {
      mockUseAuth.user = null
      
      renderWithRouter(
        <ProtectedRoute requireAuth={false}>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
      expect(screen.queryByTestId('navigate-component')).not.toBeInTheDocument()
    })

    it('should render children when requireAuth=false and user is authenticated', () => {
      mockUseAuth.user = mockUser
      
      renderWithRouter(
        <ProtectedRoute requireAuth={false}>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })
  })

  describe('Unauthenticated Required', () => {
    it('should render children when requireUnauth=true and user is not authenticated', () => {
      mockUseAuth.user = null
      
      renderWithRouter(
        <ProtectedRoute requireAuth={false} requireUnauth={true}>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
      expect(screen.queryByTestId('navigate-component')).not.toBeInTheDocument()
    })

    it('should redirect to dashboard when requireUnauth=true and user is authenticated', () => {
      mockUseAuth.user = mockUser
      
      renderWithRouter(
        <ProtectedRoute requireAuth={false} requireUnauth={true}>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', true)
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
    })

    it('should redirect to custom path when requireUnauth=true and redirectTo is specified', () => {
      mockUseAuth.user = mockUser
      
      renderWithRouter(
        <ProtectedRoute requireAuth={false} requireUnauth={true} redirectTo="/home">
          <TestComponent />
        </ProtectedRoute>
      )

      expect(mockNavigate).toHaveBeenCalledWith('/home', true)
    })

    it('should redirect to from parameter when available', () => {
      mockUseAuth.user = mockUser
      
      renderWithRouter(
        <ProtectedRoute requireAuth={false} requireUnauth={true}>
          <TestComponent />
        </ProtectedRoute>,
        ['/login?from=%2Fdashboard%2Fsettings']
      )

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/settings', true)
    })

    it('should handle malformed from parameter gracefully', () => {
      mockUseAuth.user = mockUser
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      renderWithRouter(
        <ProtectedRoute requireAuth={false} requireUnauth={true}>
          <TestComponent />
        </ProtectedRoute>,
        ['/login?from=invalid%url']
      )

      // Should fall back to default redirect when from parameter is malformed
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', true)
      expect(consoleWarnSpy).toHaveBeenCalledWith('Malformed redirect URL:', 'invalid%url')
      
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Complex Route Scenarios', () => {
    it('should handle both requireAuth and requireUnauth being false', () => {
      mockUseAuth.user = null
      
      renderWithRouter(
        <ProtectedRoute requireAuth={false} requireUnauth={false}>
          <TestComponent />
        </ProtectedRoute>
      )

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })

    it('should prioritize requireAuth over requireUnauth when both are true', () => {
      mockUseAuth.user = null
      
      renderWithRouter(
        <ProtectedRoute requireAuth={true} requireUnauth={true}>
          <TestComponent />
        </ProtectedRoute>
      )

      // Should redirect to login (requireAuth behavior)
      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/login'), true)
    })
  })
})

describe('AuthenticatedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.user = null
    mockUseAuth.loading = false
  })

  it('should render children when user is authenticated', () => {
    mockUseAuth.user = mockUser
    
    renderWithRouter(
      <AuthenticatedRoute>
        <TestComponent />
      </AuthenticatedRoute>
    )

    expect(screen.getByTestId('test-component')).toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    mockUseAuth.user = null
    
    renderWithRouter(
      <AuthenticatedRoute>
        <TestComponent />
      </AuthenticatedRoute>,
      ['/dashboard']
    )

    expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
    expect(mockNavigate).toHaveBeenCalledWith('/login?from=%2Fdashboard', true)
  })
})

describe('UnauthenticatedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.user = null
    mockUseAuth.loading = false
  })

  it('should render children when user is not authenticated', () => {
    mockUseAuth.user = null
    
    renderWithRouter(
      <UnauthenticatedRoute>
        <TestComponent />
      </UnauthenticatedRoute>
    )

    expect(screen.getByTestId('test-component')).toBeInTheDocument()
  })

  it('should redirect to dashboard when user is authenticated', () => {
    mockUseAuth.user = mockUser
    
    renderWithRouter(
      <UnauthenticatedRoute>
        <TestComponent />
      </UnauthenticatedRoute>
    )

    expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', true)
  })
})

describe('withAuth HOC', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.user = null
    mockUseAuth.loading = false
  })

  it('should wrap component with default authentication requirement', () => {
    const TestPage = () => <div data-testid="test-page">Test Page</div>
    const ProtectedTestPage = withAuth(TestPage)
    
    mockUseAuth.user = mockUser
    
    renderWithRouter(<ProtectedTestPage />)

    expect(screen.getByTestId('test-page')).toBeInTheDocument()
  })

  it('should apply custom options to wrapped component', () => {
    const TestPage = () => <div data-testid="test-page">Test Page</div>
    const ProtectedTestPage = withAuth(TestPage, { requireAuth: false, requireUnauth: true })
    
    mockUseAuth.user = null
    
    renderWithRouter(<ProtectedTestPage />)

    expect(screen.getByTestId('test-page')).toBeInTheDocument()
  })

  it('should redirect with custom redirectTo option', () => {
    const TestPage = () => <div data-testid="test-page">Test Page</div>
    const ProtectedTestPage = withAuth(TestPage, { redirectTo: '/custom-login' })
    
    mockUseAuth.user = null
    
    renderWithRouter(<ProtectedTestPage />)

    expect(mockNavigate).toHaveBeenCalledWith('/custom-login', true)
  })

  it('should set proper displayName for wrapped component', () => {
    const TestPage = () => <div>Test</div>
    TestPage.displayName = 'TestPage'
    const ProtectedTestPage = withAuth(TestPage)

    expect(ProtectedTestPage.displayName).toBe('withAuth(TestPage)')
  })

  it('should use component name when displayName is not available', () => {
    const TestPage = () => <div>Test</div>
    const ProtectedTestPage = withAuth(TestPage)

    expect(ProtectedTestPage.displayName).toBe('withAuth(TestPage)')
  })

  it('should pass through props to wrapped component', () => {
    const TestPage = ({ title }: { title: string }) => <div data-testid="test-page">{title}</div>
    const ProtectedTestPage = withAuth(TestPage)
    
    mockUseAuth.user = mockUser
    
    renderWithRouter(<ProtectedTestPage title="Protected Title" />)

    expect(screen.getByText('Protected Title')).toBeInTheDocument()
  })
})

describe('useAuthGuard Hook', () => {
  // Create a test component that uses the hook
  const TestHookComponent = ({ requireAuth = true }: { requireAuth?: boolean }) => {
    const { isAuthenticated, isLoading, user, canAccess } = useAuthGuard()
    const canAccessResult = canAccess(requireAuth)
    
    return (
      <div>
        <div data-testid="is-authenticated">{isAuthenticated.toString()}</div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="user">{user?.email || 'null'}</div>
        <div data-testid="can-access">{canAccessResult === null ? 'null' : canAccessResult.toString()}</div>
      </div>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.user = null
    mockUseAuth.loading = false
  })

  it('should return correct authentication status when user is authenticated', () => {
    mockUseAuth.user = mockUser
    
    render(<TestHookComponent />)

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('can-access')).toHaveTextContent('true')
  })

  it('should return correct authentication status when user is not authenticated', () => {
    mockUseAuth.user = null
    
    render(<TestHookComponent />)

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(screen.getByTestId('can-access')).toHaveTextContent('false')
  })

  it('should return correct loading status', () => {
    mockUseAuth.loading = true
    
    render(<TestHookComponent />)

    expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
    expect(screen.getByTestId('can-access')).toHaveTextContent('null')
  })

  it('should handle canAccess with requireAuth=false', () => {
    mockUseAuth.user = null
    
    render(<TestHookComponent requireAuth={false} />)

    expect(screen.getByTestId('can-access')).toHaveTextContent('true')
  })

  it('should handle canAccess with requireAuth=false and authenticated user', () => {
    mockUseAuth.user = mockUser
    
    render(<TestHookComponent requireAuth={false} />)

    expect(screen.getByTestId('can-access')).toHaveTextContent('false')
  })
})