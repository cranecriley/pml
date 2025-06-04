import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  user_id: string
  is_onboarding_complete: boolean
  first_login_at: string
  last_login_at: string
  created_at: string
  updated_at: string
}

export interface PostLoginRouting {
  shouldGoToWelcome: boolean
  shouldGoToDashboard: boolean
  redirectPath: string
  isNewUser: boolean
  isReturningUser: boolean
}

class UserProfileService {
  /**
   * Check if user is new (first login) or returning
   */
  async checkUserStatus(user: User): Promise<PostLoginRouting> {
    try {
      // Get or create user profile
      const profile = await this.getOrCreateProfile(user)
      
      // Determine routing based on profile
      const isNewUser = !profile.is_onboarding_complete
      const isReturningUser = profile.is_onboarding_complete
      
      // Update last login timestamp
      await this.updateLastLogin(profile.id)
      
      return {
        shouldGoToWelcome: isNewUser,
        shouldGoToDashboard: isReturningUser,
        redirectPath: isNewUser ? '/welcome' : '/dashboard',
        isNewUser,
        isReturningUser
      }
    } catch (error) {
      console.error('Error checking user status:', error)
      // Default to dashboard on error
      return {
        shouldGoToWelcome: false,
        shouldGoToDashboard: true,
        redirectPath: '/dashboard',
        isNewUser: false,
        isReturningUser: true
      }
    }
  }

  /**
   * Get existing profile or create new one
   */
  private async getOrCreateProfile(user: User): Promise<UserProfile> {
    // First try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingProfile && !fetchError) {
      return existingProfile
    }

    // If no profile exists, create one (new user)
    const newProfile = {
      user_id: user.id,
      is_onboarding_complete: false,
      first_login_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    }

    const { data: createdProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert(newProfile)
      .select()
      .single()

    if (createError) {
      throw new Error(`Failed to create user profile: ${createError.message}`)
    }

    if (!createdProfile) {
      throw new Error('Failed to create user profile: No data returned')
    }

    return createdProfile
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(profileId: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)

    if (error) {
      console.warn('Failed to update last login:', error.message)
      // Don't throw error - this is non-critical
    }
  }

  /**
   * Mark user onboarding as complete
   */
  async completeOnboarding(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        is_onboarding_complete: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to complete onboarding: ${error.message}`)
    }
  }

  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw new Error(`Failed to get user profile: ${error.message}`)
    }

    return data
  }

  /**
   * Reset onboarding status (for testing)
   */
  async resetOnboarding(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        is_onboarding_complete: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to reset onboarding: ${error.message}`)
    }
  }

  /**
   * Get routing path for authenticated user (fallback method)
   */
  async getPostLoginPath(user: User, fallbackPath = '/dashboard'): Promise<string> {
    try {
      const routing = await this.checkUserStatus(user)
      return routing.redirectPath
    } catch (error) {
      console.error('Error getting post-login path:', error)
      return fallbackPath
    }
  }

  /**
   * Check if user should see onboarding
   */
  async shouldShowOnboarding(userId: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(userId)
      return profile ? !profile.is_onboarding_complete : true
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      return false
    }
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService()

// Types are already exported above with the interface declarations 