import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
})

// Auth configuration constants
export const AUTH_CONFIG = {
  SESSION_TIMEOUT_HOURS: 24,
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW_MINUTES: 15,
  PASSWORD_RESET_LINK_EXPIRY_HOURS: 1,
} as const

// Auth helper functions
export const auth = supabase.auth

// Database helper
export const db = supabase
