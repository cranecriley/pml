import type { User, Session } from '@supabase/supabase-js'

export interface AuthUser extends User {}

export interface AuthSession extends Session {}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  confirmPassword: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordUpdateRequest {
  password: string
  confirmPassword: string
}

export interface AuthError {
  message: string
  status?: number
}

export interface ValidationErrors {
  email?: string
  password?: string
  confirmPassword?: string
}

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}