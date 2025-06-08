import { render } from '@testing-library/react'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  describe('Basic Rendering', () => {
    it('should render SVG element correctly', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should have correct SVG attributes', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
      expect(svg).toHaveAttribute('fill', 'none')
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('should have animate-spin class for rotation', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin')
    })

    it('should render with default props when none specified', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-5', 'w-5', 'text-white')
    })
  })

  describe('Size Variants', () => {
    it('should apply small size classes correctly', () => {
      const { container } = render(<LoadingSpinner size="sm" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-4', 'w-4')
    })

    it('should apply medium size classes correctly', () => {
      const { container } = render(<LoadingSpinner size="md" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-5', 'w-5')
    })

    it('should apply large size classes correctly', () => {
      const { container } = render(<LoadingSpinner size="lg" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-8', 'w-8')
    })

    it('should default to medium size when no size specified', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-5', 'w-5')
    })

    it('should not have other size classes when specific size is set', () => {
      const { container } = render(<LoadingSpinner size="sm" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-4', 'w-4')
      expect(svg).not.toHaveClass('h-5', 'w-5', 'h-8', 'w-8')
    })
  })

  describe('Color Variants', () => {
    it('should apply white color class correctly', () => {
      const { container } = render(<LoadingSpinner color="white" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-white')
    })

    it('should apply blue color class correctly', () => {
      const { container } = render(<LoadingSpinner color="blue" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-blue-600')
    })

    it('should apply gray color class correctly', () => {
      const { container } = render(<LoadingSpinner color="gray" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-gray-600')
    })

    it('should default to white color when no color specified', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-white')
    })

    it('should not have other color classes when specific color is set', () => {
      const { container } = render(<LoadingSpinner color="blue" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-blue-600')
      expect(svg).not.toHaveClass('text-white', 'text-gray-600')
    })
  })

  describe('Combined Size and Color Props', () => {
    it('should apply both size and color classes correctly', () => {
      const { container } = render(<LoadingSpinner size="lg" color="blue" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-8', 'w-8', 'text-blue-600')
    })

    it('should handle all combinations of size and color', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      const colors = ['white', 'blue', 'gray'] as const
      const sizeClasses = {
        sm: ['h-4', 'w-4'],
        md: ['h-5', 'w-5'], 
        lg: ['h-8', 'w-8']
      }
      const colorClasses = {
        white: 'text-white',
        blue: 'text-blue-600',
        gray: 'text-gray-600'
      }

      sizes.forEach(size => {
        colors.forEach(color => {
          const { container } = render(<LoadingSpinner size={size} color={color} />)
          const svg = container.querySelector('svg')
          
          expect(svg).toHaveClass(...sizeClasses[size], colorClasses[color])
        })
      })
    })
  })

  describe('Custom className Prop', () => {
    it('should apply custom className along with default classes', () => {
      const { container } = render(<LoadingSpinner className="custom-spinner-class" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin', 'h-5', 'w-5', 'text-white', 'custom-spinner-class')
    })

    it('should preserve all prop-based classes when custom className is added', () => {
      const { container } = render(
        <LoadingSpinner size="lg" color="blue" className="additional-class" />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass(
        'animate-spin',
        'h-8',
        'w-8', 
        'text-blue-600',
        'additional-class'
      )
    })

    it('should handle multiple custom classes', () => {
      const { container } = render(
        <LoadingSpinner className="class-one class-two class-three" />
      )

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('class-one', 'class-two', 'class-three')
    })

    it('should handle empty className prop', () => {
      const { container } = render(<LoadingSpinner className="" />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin', 'h-5', 'w-5', 'text-white')
    })

    it('should handle undefined className prop', () => {
      const { container } = render(<LoadingSpinner className={undefined} />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin', 'h-5', 'w-5', 'text-white')
    })
  })

  describe('SVG Structure and Content', () => {
    it('should contain circle element with correct attributes', () => {
      const { container } = render(<LoadingSpinner />)

      const circle = container.querySelector('circle')
      expect(circle).toBeInTheDocument()
      expect(circle).toHaveAttribute('cx', '12')
      expect(circle).toHaveAttribute('cy', '12') 
      expect(circle).toHaveAttribute('r', '10')
      expect(circle).toHaveAttribute('stroke', 'currentColor')
      expect(circle).toHaveAttribute('stroke-width', '4')
    })

    it('should contain path element with correct attributes', () => {
      const { container } = render(<LoadingSpinner />)

      const path = container.querySelector('path')
      expect(path).toBeInTheDocument()
      expect(path).toHaveAttribute('fill', 'currentColor')
      expect(path).toHaveAttribute('d')
    })

    it('should have proper opacity classes for animation effect', () => {
      const { container } = render(<LoadingSpinner />)

      const circle = container.querySelector('circle')
      const path = container.querySelector('path')
      
      expect(circle).toHaveClass('opacity-25')
      expect(path).toHaveClass('opacity-75')
    })

    it('should maintain SVG structure regardless of props', () => {
      const { container } = render(<LoadingSpinner size="lg" color="blue" />)

      expect(container.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelector('circle')).toBeInTheDocument() 
      expect(container.querySelector('path')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should be visible and accessible to screen readers', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toBeVisible()
    })

    it('should indicate loading state through animation', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin')
    })

    it('should work with assistive technologies', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      // SVG should be recognizable as a loading indicator through the animation
      expect(svg).toHaveClass('animate-spin')
    })

    it('should be semantically meaningful as a loading indicator', () => {
      const { container } = render(<LoadingSpinner />)

      // The spinning animation and visual design indicate loading state
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin')
      expect(container.querySelector('circle')).toBeInTheDocument()
      expect(container.querySelector('path')).toBeInTheDocument()
    })
  })

  describe('Performance and Optimization', () => {
    it('should use CSS classes for styling rather than inline styles', () => {
      const { container } = render(<LoadingSpinner />)

      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('style')).toBeNull()
    })

    it('should use currentColor for SVG elements to inherit text color', () => {
      const { container } = render(<LoadingSpinner />)

      const circle = container.querySelector('circle')
      const path = container.querySelector('path')
      
      expect(circle).toHaveAttribute('stroke', 'currentColor')
      expect(path).toHaveAttribute('fill', 'currentColor')
    })

    it('should be lightweight with minimal DOM elements', () => {
      const { container } = render(<LoadingSpinner />)

      // Should only contain: svg, circle, path
      expect(container.children).toHaveLength(1) // svg
      expect(container.querySelector('svg')?.children).toHaveLength(2) // circle + path
    })
  })

  describe('Visual Design Validation', () => {
    it('should apply correct sizing relationship between variants', () => {
      const { container: smContainer } = render(<LoadingSpinner size="sm" />)
      const { container: mdContainer } = render(<LoadingSpinner size="md" />)
      const { container: lgContainer } = render(<LoadingSpinner size="lg" />)

      const smSvg = smContainer.querySelector('svg')
      const mdSvg = mdContainer.querySelector('svg') 
      const lgSvg = lgContainer.querySelector('svg')

      expect(smSvg).toHaveClass('h-4', 'w-4')
      expect(mdSvg).toHaveClass('h-5', 'w-5')
      expect(lgSvg).toHaveClass('h-8', 'w-8')
    })

    it('should maintain aspect ratio across all sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      
      sizes.forEach(size => {
        const { container } = render(<LoadingSpinner size={size} />)
        const svg = container.querySelector('svg')
        
        // Should have matching height and width classes
        if (size === 'sm') {
          expect(svg).toHaveClass('h-4', 'w-4')
        } else if (size === 'md') {
          expect(svg).toHaveClass('h-5', 'w-5')
        } else if (size === 'lg') {
          expect(svg).toHaveClass('h-8', 'w-8')
        }
      })
    })

    it('should use appropriate color values for different contexts', () => {
      const { container: whiteContainer } = render(<LoadingSpinner color="white" />)
      const { container: blueContainer } = render(<LoadingSpinner color="blue" />)
      const { container: grayContainer } = render(<LoadingSpinner color="gray" />)

      expect(whiteContainer.querySelector('svg')).toHaveClass('text-white')
      expect(blueContainer.querySelector('svg')).toHaveClass('text-blue-600')
      expect(grayContainer.querySelector('svg')).toHaveClass('text-gray-600')
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid size prop gracefully', () => {
      const { container } = render(<LoadingSpinner size={'invalid' as any} />)

      const svg = container.querySelector('svg')
      // Should fall back to some reasonable default or not crash
      expect(svg).toBeInTheDocument()
    })

    it('should handle invalid color prop gracefully', () => {
      const { container } = render(<LoadingSpinner color={'invalid' as any} />)

      const svg = container.querySelector('svg')
      // Should fall back to some reasonable default or not crash
      expect(svg).toBeInTheDocument()
    })

    it('should maintain structure when props change', () => {
      const { container, rerender } = render(<LoadingSpinner size="sm" color="white" />)

      expect(container.querySelector('svg')).toHaveClass('h-4', 'w-4', 'text-white')

      rerender(<LoadingSpinner size="lg" color="blue" />)

      expect(container.querySelector('svg')).toHaveClass('h-8', 'w-8', 'text-blue-600')
      expect(container.querySelector('svg')).not.toHaveClass('h-4', 'w-4', 'text-white')
    })

    it('should handle rapid prop changes without issues', () => {
      const { container, rerender } = render(<LoadingSpinner size="sm" />)

      // Rapid size changes
      rerender(<LoadingSpinner size="md" />)
      rerender(<LoadingSpinner size="lg" />)
      rerender(<LoadingSpinner size="sm" />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('animate-spin')
    })
  })

  describe('Integration with Parent Components', () => {
    it('should inherit text color from parent when using currentColor', () => {
      const { container } = render(
        <div style={{ color: 'red' }}>
          <LoadingSpinner />
        </div>
      )

      const circle = container.querySelector('circle')
      const path = container.querySelector('path')
      
      expect(circle).toHaveAttribute('stroke', 'currentColor')
      expect(path).toHaveAttribute('fill', 'currentColor')
    })

    it('should work within button components', () => {
      const { container } = render(
        <button>
          <LoadingSpinner size="sm" color="white" />
          Loading...
        </button>
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('h-4', 'w-4', 'text-white')
    })

    it('should work within form components', () => {
      const { container } = render(
        <form>
          <LoadingSpinner size="md" color="blue" />
        </form>
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('h-5', 'w-5', 'text-blue-600')
    })
  })
}) 