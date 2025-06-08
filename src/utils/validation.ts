// Email validation function
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email is required'
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
  
  return null
}

// Password validation function
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required'
  }
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  
  return null
}

// Confirm password validation
export const validatePasswordConfirm = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Please confirm your password'
  }
  
  if (password !== confirmPassword) {
    return 'Passwords do not match'
  }
  
  return null
}

// Generic form validation helper
export const hasValidationErrors = (errors: Record<string, string | null>): boolean => {
  return Object.keys(errors).some(key => errors[key] !== null)
} 