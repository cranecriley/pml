import { render, screen } from '@testing-library/react'
import { AuthLayout } from '../AuthLayout'

// Helper component for testing children rendering
const TestChild = () => <div data-testid="test-child">Test Child Content</div>

describe('AuthLayout', () => {
  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      expect(screen.getByTestId('test-child')).toBeInTheDocument()
      expect(screen.getByText('Test Child Content')).toBeInTheDocument()
    })

    it('should render without title and subtitle when not provided', () => {
      render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
      expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument()
    })

    it('should render with only title when subtitle is not provided', () => {
      render(
        <AuthLayout title="Sign In">
          <TestChild />
        </AuthLayout>
      )

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
      expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument()
    })

    it('should render with both title and subtitle when provided', () => {
      render(
        <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
          <TestChild />
        </AuthLayout>
      )

      expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    })
  })

  describe('Accessibility Features', () => {
    it('should use proper heading hierarchy with h2 for title', () => {
      render(
        <AuthLayout title="Sign In">
          <TestChild />
        </AuthLayout>
      )

      const heading = screen.getByRole('heading', { name: 'Sign In' })
      expect(heading.tagName).toBe('H2')
    })

    it('should have proper heading level for main title', () => {
      render(
        <AuthLayout title="Create Account">
          <TestChild />
        </AuthLayout>
      )

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Create Account')
    })

    it('should render subtitle as paragraph for proper semantics', () => {
      const { container } = render(
        <AuthLayout title="Sign In" subtitle="Enter your credentials">
          <TestChild />
        </AuthLayout>
      )

      const subtitle = container.querySelector('p')
      expect(subtitle).toBeInTheDocument()
      expect(subtitle).toHaveTextContent('Enter your credentials')
    })

    it('should have accessible text content structure', () => {
      render(
        <AuthLayout title="Reset Password" subtitle="We'll send you a reset link">
          <TestChild />
        </AuthLayout>
      )

      // Title should be more prominent than subtitle
      const title = screen.getByRole('heading')
      const subtitle = screen.getByText("We'll send you a reset link")
      
      expect(title).toBeInTheDocument()
      expect(subtitle).toBeInTheDocument()
    })
  })

  describe('Responsive Design Classes', () => {
    it('should apply correct responsive layout classes to main container', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass(
        'min-h-screen',
        'flex',
        'flex-col',
        'justify-center',
        'py-12',
        'sm:px-6',
        'lg:px-8',
        'bg-gray-50'
      )
    })

    it('should apply responsive width classes to header container', () => {
      const { container } = render(
        <AuthLayout title="Test Title">
          <TestChild />
        </AuthLayout>
      )

      const headerContainer = container.querySelector('.sm\\:mx-auto.sm\\:w-full.sm\\:max-w-md')
      expect(headerContainer).toBeInTheDocument()
    })

    it('should apply responsive classes to content container', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const contentContainer = container.querySelector('.mt-8.sm\\:mx-auto.sm\\:w-full.sm\\:max-w-md')
      expect(contentContainer).toBeInTheDocument()
    })

    it('should apply responsive styling to inner content card', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const innerCard = container.querySelector('.bg-white.py-8.px-4.shadow.sm\\:rounded-lg.sm\\:px-10')
      expect(innerCard).toBeInTheDocument()
    })

    it('should apply responsive typography classes to title', () => {
      render(
        <AuthLayout title="Responsive Title">
          <TestChild />
        </AuthLayout>
      )

      const title = screen.getByRole('heading')
      expect(title).toHaveClass(
        'mt-6',
        'text-3xl',
        'font-extrabold',
        'text-gray-900',
        'sm:text-4xl'
      )
    })

    it('should apply responsive typography classes to subtitle', () => {
      const { container } = render(
        <AuthLayout title="Title" subtitle="Responsive Subtitle">
          <TestChild />
        </AuthLayout>
      )

      const subtitle = container.querySelector('p')
      expect(subtitle).toHaveClass(
        'mt-2',
        'text-sm',
        'text-gray-600',
        'sm:text-base'
      )
    })
  })

  describe('Layout Structure', () => {
    it('should center content vertically with flex layout', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'justify-center')
    })

    it('should use full viewport height', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('min-h-screen')
    })

    it('should have proper spacing between elements', () => {
      const { container } = render(
        <AuthLayout title="Title" subtitle="Subtitle">
          <TestChild />
        </AuthLayout>
      )

      // Check title spacing
      const title = screen.getByRole('heading')
      expect(title).toHaveClass('mt-6')

      // Check subtitle spacing
      const subtitle = container.querySelector('p')
      expect(subtitle).toHaveClass('mt-2')

      // Check content container spacing
      const contentContainer = container.querySelector('.mt-8')
      expect(contentContainer).toBeInTheDocument()
    })

    it('should apply correct padding and margins', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('py-12', 'sm:px-6', 'lg:px-8')

      const innerCard = container.querySelector('.py-8.px-4.sm\\:px-10')
      expect(innerCard).toBeInTheDocument()
    })
  })

  describe('Visual Design Classes', () => {
    it('should apply correct background color', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('bg-gray-50')
    })

    it('should apply white background to content card', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const innerCard = container.querySelector('.bg-white')
      expect(innerCard).toBeInTheDocument()
    })

    it('should apply shadow to content card', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const innerCard = container.querySelector('.shadow')
      expect(innerCard).toBeInTheDocument()
    })

    it('should apply responsive border radius', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const innerCard = container.querySelector('.sm\\:rounded-lg')
      expect(innerCard).toBeInTheDocument()
    })

    it('should apply correct text colors', () => {
      render(
        <AuthLayout title="Dark Title" subtitle="Gray Subtitle">
          <TestChild />
        </AuthLayout>
      )

      const title = screen.getByRole('heading')
      expect(title).toHaveClass('text-gray-900')

      const subtitle = screen.getByText('Gray Subtitle')
      expect(subtitle).toHaveClass('text-gray-600')
    })
  })

  describe('Content Positioning', () => {
    it('should center header content', () => {
      const { container } = render(
        <AuthLayout title="Centered Title">
          <TestChild />
        </AuthLayout>
      )

      const textCenter = container.querySelector('.text-center')
      expect(textCenter).toBeInTheDocument()
      expect(textCenter).toContainElement(screen.getByRole('heading'))
    })

    it('should position title and subtitle within centered container', () => {
      const { container } = render(
        <AuthLayout title="Title" subtitle="Subtitle">
          <TestChild />
        </AuthLayout>
      )

      const centerContainer = container.querySelector('.text-center')
      const title = screen.getByRole('heading')
      const subtitle = screen.getByText('Subtitle')

      expect(centerContainer).toContainElement(title)
      expect(centerContainer).toContainElement(subtitle)
    })

    it('should properly contain children within content card', () => {
      const { container } = render(
        <AuthLayout>
          <TestChild />
        </AuthLayout>
      )

      const contentCard = container.querySelector('.bg-white.py-8.px-4')
      const testChild = screen.getByTestId('test-child')

      expect(contentCard).toContainElement(testChild)
    })
  })

  describe('Multiple Children Support', () => {
    it('should render multiple children correctly', () => {
      render(
        <AuthLayout title="Multiple Children">
          <div data-testid="child-1">First Child</div>
          <div data-testid="child-2">Second Child</div>
          <div data-testid="child-3">Third Child</div>
        </AuthLayout>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
      expect(screen.getByText('First Child')).toBeInTheDocument()
      expect(screen.getByText('Second Child')).toBeInTheDocument()
      expect(screen.getByText('Third Child')).toBeInTheDocument()
    })

    it('should handle complex nested children', () => {
      render(
        <AuthLayout title="Complex Layout">
          <form data-testid="auth-form">
            <input data-testid="email-input" type="email" />
            <button data-testid="submit-button">Submit</button>
          </form>
        </AuthLayout>
      )

      expect(screen.getByTestId('auth-form')).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string title gracefully', () => {
      render(
        <AuthLayout title="">
          <TestChild />
        </AuthLayout>
      )

      // Empty title is falsy, so no heading should be rendered
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('should handle empty string subtitle gracefully', () => {
      const { container } = render(
        <AuthLayout title="Title" subtitle="">
          <TestChild />
        </AuthLayout>
      )

      // Empty subtitle is falsy, so no paragraph should be rendered for subtitle
      const title = screen.getByRole('heading')
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Title')
      
      // Should not render subtitle paragraph when subtitle is empty
      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs).toHaveLength(0)
    })

    it('should handle very long titles', () => {
      const longTitle = 'This is a very long title that should still render correctly and maintain responsive design principles'
      
      render(
        <AuthLayout title={longTitle}>
          <TestChild />
        </AuthLayout>
      )

      expect(screen.getByRole('heading')).toHaveTextContent(longTitle)
    })

    it('should handle very long subtitles', () => {
      const longSubtitle = 'This is a very long subtitle that should wrap properly and maintain good readability across different screen sizes'
      
      render(
        <AuthLayout title="Title" subtitle={longSubtitle}>
          <TestChild />
        </AuthLayout>
      )

      expect(screen.getByText(longSubtitle)).toBeInTheDocument()
    })

    it('should handle special characters in title and subtitle', () => {
      const specialTitle = 'Welcome! 👋 Sign-in & Continue'
      const specialSubtitle = 'Enter your email@domain.com & password (min. 8 chars)'
      
      render(
        <AuthLayout title={specialTitle} subtitle={specialSubtitle}>
          <TestChild />
        </AuthLayout>
      )

      expect(screen.getByRole('heading')).toHaveTextContent(specialTitle)
      expect(screen.getByText(specialSubtitle)).toBeInTheDocument()
    })
  })
})