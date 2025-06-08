/**
 * Basic setup test to verify Jest and React Testing Library are working
 */

describe('Jest Setup', () => {
  it('should be able to run tests', () => {
    expect(true).toBe(true)
  })

  it('should have access to jest-dom matchers', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello World'
    document.body.appendChild(div)
    
    expect(div).toBeInTheDocument()
    expect(div).toHaveTextContent('Hello World')
    
    document.body.removeChild(div)
  })
})