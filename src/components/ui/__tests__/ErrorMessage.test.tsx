import { render, screen } from '@testing-library/react'
import { ErrorMessage } from '../ErrorMessage'

describe('ErrorMessage', () => {
  describe('Basic Rendering', () => {
    it('should render error message text correctly', () => {
      render(<ErrorMessage message="Test error message" />)

      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should render with default variant when no variant specified', () => {
      const { container } = render(<ErrorMessage message="Default variant" />)

      // Default variant should have the full error box structure
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument()
      expect(container.querySelector('.border-red-200')).toBeInTheDocument()
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('should be accessible with proper text content', () => {
      render(<ErrorMessage message="Accessible error message" />)

      const errorText = screen.getByText('Accessible error message')
      expect(errorText).toBeInTheDocument()
    })
  })

  describe('Default Variant', () => {
    it('should render with correct container styling', () => {
      const { container } = render(<ErrorMessage message="Error" variant="default" />)

      const errorContainer = container.querySelector('div')
      expect(errorContainer).toHaveClass(
        'bg-red-50',
        'border',
        'border-red-200',
        'rounded-md',
        'p-3',
        'sm:p-4'
      )
    })

    it('should include error icon', () => {
      const { container } = render(<ErrorMessage message="Error with icon" />)

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('h-5', 'w-5', 'text-red-400')
    })

    it('should have proper flex layout structure', () => {
      const { container } = render(<ErrorMessage message="Flex layout test" />)

      const flexContainer = container.querySelector('.flex')
      expect(flexContainer).toBeInTheDocument()
      
      const flexShrink = container.querySelector('.flex-shrink-0')
      expect(flexShrink).toBeInTheDocument()
      
      const iconContainer = flexShrink
      expect(iconContainer).toContainElement(container.querySelector('svg'))
    })

    it('should position message text correctly', () => {
      const { container } = render(<ErrorMessage message="Positioned text" />)

      const textContainer = container.querySelector('.ml-3')
      expect(textContainer).toBeInTheDocument()
      
      const messageText = container.querySelector('.ml-3 p')
      expect(messageText).toHaveClass('text-sm', 'text-red-600')
      expect(messageText).toHaveTextContent('Positioned text')
    })

    it('should apply responsive padding', () => {
      const { container } = render(<ErrorMessage message="Responsive padding" />)

      const errorContainer = container.querySelector('div')
      expect(errorContainer).toHaveClass('p-3', 'sm:p-4')
    })
  })

  describe('Inline Variant', () => {
    it('should render inline variant correctly', () => {
      render(<ErrorMessage message="Inline error" variant="inline" />)

      const errorElement = screen.getByText('Inline error')
      expect(errorElement.tagName).toBe('P')
    })

    it('should apply correct inline styling classes', () => {
      render(<ErrorMessage message="Inline styling" variant="inline" />)

      const errorElement = screen.getByText('Inline styling')
      expect(errorElement).toHaveClass('mt-1', 'text-sm', 'text-red-600')
    })

    it('should not include error icon in inline variant', () => {
      const { container } = render(<ErrorMessage message="No icon" variant="inline" />)

      expect(container.querySelector('svg')).not.toBeInTheDocument()
    })

    it('should not have container div in inline variant', () => {
      const { container } = render(<ErrorMessage message="No container" variant="inline" />)

      expect(container.querySelector('.bg-red-50')).not.toBeInTheDocument()
      expect(container.querySelector('.border')).not.toBeInTheDocument()
    })

    it('should render as simple paragraph element', () => {
      const { container } = render(<ErrorMessage message="Simple paragraph" variant="inline" />)

      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs).toHaveLength(1)
      expect(paragraphs[0]).toHaveTextContent('Simple paragraph')
    })
  })

  describe('Custom className Prop', () => {
    it('should apply custom className to default variant', () => {
      const { container } = render(
        <ErrorMessage message="Custom class" className="custom-error-class" />
      )

      const errorContainer = container.querySelector('div')
      expect(errorContainer).toHaveClass('custom-error-class')
    })

    it('should apply custom className to inline variant', () => {
      render(
        <ErrorMessage message="Custom inline class" variant="inline" className="inline-custom-class" />
      )

      const errorElement = screen.getByText('Custom inline class')
      expect(errorElement).toHaveClass('inline-custom-class')
    })

    it('should preserve existing classes when adding custom className', () => {
      const { container } = render(
        <ErrorMessage message="Preserved classes" className="additional-class" />
      )

      const errorContainer = container.querySelector('div')
      expect(errorContainer).toHaveClass(
        'bg-red-50',
        'border',
        'border-red-200',
        'rounded-md',
        'p-3',
        'sm:p-4',
        'additional-class'
      )
    })

    it('should handle multiple custom classes', () => {
      render(
        <ErrorMessage 
          message="Multiple classes" 
          variant="inline" 
          className="class-one class-two class-three" 
        />
      )

      const errorElement = screen.getByText('Multiple classes')
      expect(errorElement).toHaveClass('class-one', 'class-two', 'class-three')
    })

    it('should handle empty className prop', () => {
      const { container } = render(
        <ErrorMessage message="Empty className" className="" />
      )

      const errorContainer = container.querySelector('div')
      expect(errorContainer).toHaveClass('bg-red-50') // Should still have default classes
    })
  })

  describe('Message Content', () => {
    it('should handle empty message string', () => {
      const { container } = render(<ErrorMessage message="" />)

      // Should render empty but valid element structure
      const messageText = container.querySelector('.ml-3 p')
      expect(messageText).toBeInTheDocument()
      expect(messageText).toHaveTextContent('')
    })

    it('should handle very long error messages', () => {
      const longMessage = 'This is a very long error message that should wrap properly and maintain good readability even when the text content is extensive and spans multiple lines in the error display component.'
      
      render(<ErrorMessage message={longMessage} />)

      expect(screen.getByText(longMessage)).toBeInTheDocument()
    })

    it('should handle special characters and HTML entities', () => {
      const specialMessage = 'Error: <script>alert("test")</script> & invalid characters 100% < > "'
      
      render(<ErrorMessage message={specialMessage} />)

      // Should render as text, not HTML
      expect(screen.getByText(specialMessage)).toBeInTheDocument()
    })

    it('should handle unicode and emoji characters', () => {
      const emojiMessage = '❌ Error occurred! 🚨 Please try again 🔄'
      
      render(<ErrorMessage message={emojiMessage} />)

      expect(screen.getByText(emojiMessage)).toBeInTheDocument()
    })

    it('should handle newline characters in message', () => {
      const messageWithNewlines = 'Line 1\nLine 2\nLine 3'
      
      const { container } = render(<ErrorMessage message={messageWithNewlines} />)

      const messageText = container.querySelector('.ml-3 p')
      // HTML paragraphs convert newlines to spaces in rendering
      expect(messageText).toHaveTextContent('Line 1 Line 2 Line 3')
    })
  })

  describe('SVG Icon Properties', () => {
    it('should render SVG with correct attributes', () => {
      const { container } = render(<ErrorMessage message="SVG test" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 20 20')
      expect(svg).toHaveAttribute('fill', 'currentColor')
    })

    it('should include proper SVG path for error icon', () => {
      const { container } = render(<ErrorMessage message="SVG path test" />)

      const path = container.querySelector('svg path')
      expect(path).toBeInTheDocument()
      expect(path).toHaveAttribute('fill-rule', 'evenodd')
      expect(path).toHaveAttribute('clip-rule', 'evenodd')
    })

    it('should have accessible SVG icon', () => {
      const { container } = render(<ErrorMessage message="Accessible SVG" />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      // SVG should be decorative since the error message provides the text content
    })
  })

  describe('Component Structure Validation', () => {
    it('should maintain consistent DOM structure for default variant', () => {
      const { container } = render(<ErrorMessage message="Structure test" />)

      // Root div
      const rootDiv = container.firstChild
      expect(rootDiv).toHaveClass('bg-red-50')

      // Flex container
      const flexDiv = rootDiv?.firstChild
      expect(flexDiv).toHaveClass('flex')

      // Icon container
      const iconContainer = flexDiv?.firstChild
      expect(iconContainer).toHaveClass('flex-shrink-0')

      // Text container
      const textContainer = flexDiv?.lastChild
      expect(textContainer).toHaveClass('ml-3')
    })

    it('should have simple structure for inline variant', () => {
      const { container } = render(<ErrorMessage message="Simple structure" variant="inline" />)

      // Should be just a paragraph element
      expect((container.firstChild as HTMLElement)?.tagName).toBe('P')
      expect(container.children).toHaveLength(1)
    })
  })

  describe('Accessibility', () => {
    it('should be readable by screen readers', () => {
      render(<ErrorMessage message="Screen reader test" />)

      const errorText = screen.getByText('Screen reader test')
      expect(errorText).toBeInTheDocument()
      expect(errorText).toBeVisible()
    })

    it('should have proper color contrast classes', () => {
      render(<ErrorMessage message="Contrast test" />)

      const errorText = screen.getByText('Contrast test')
      expect(errorText).toHaveClass('text-red-600')
    })

    it('should maintain semantic meaning with proper element types', () => {
      const { container } = render(<ErrorMessage message="Semantic test" />)

      // Default variant uses paragraph for text content
      const messageText = container.querySelector('p')
      expect(messageText).toHaveTextContent('Semantic test')
    })

    it('should be focusable when needed', () => {
      render(<ErrorMessage message="Focus test" />)

      // Error messages are typically not interactive, so no focus needed
      const errorText = screen.getByText('Focus test')
      expect(errorText).not.toHaveAttribute('tabindex')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined message gracefully', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const { container } = render(<ErrorMessage message={undefined as any} />)

      // Should not crash and should render empty content
      const messageText = container.querySelector('.ml-3 p')
      expect(messageText).toBeInTheDocument()
    })

    it('should handle null message gracefully', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const { container } = render(<ErrorMessage message={null as any} />)

      // Should not crash
      const messageText = container.querySelector('.ml-3 p')
      expect(messageText).toBeInTheDocument()
    })

    it('should handle numeric message input', () => {
      render(<ErrorMessage message={404 as any} />)

      expect(screen.getByText('404')).toBeInTheDocument()
    })

    it('should maintain styling when message changes', () => {
      const { rerender, container } = render(<ErrorMessage message="Original message" />)

      expect(container.querySelector('.bg-red-50')).toBeInTheDocument()

      rerender(<ErrorMessage message="Updated message" />)

      expect(container.querySelector('.bg-red-50')).toBeInTheDocument()
      expect(screen.getByText('Updated message')).toBeInTheDocument()
      expect(screen.queryByText('Original message')).not.toBeInTheDocument()
    })
  })
})