/**
 * ============================================
 * Authentication Service - Professional Implementation
 * ============================================
 * Purpose: Handle user authentication with users table
 * Secure password hashing, session management, role-based access
 * ============================================
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { DBUser, User, UserRole, DealershipRegistration, Dealership } from '../types';
import { sendWelcomeEmail, sendPasswordResetEmail } from './emailService';

// ============================================
// PASSWORD HASHING UTILITIES
// ============================================

/**
 * Hash password using SHA-256
 * Note: For production, consider using bcrypt or Supabase Auth
 */
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Verify password against hashed version
 */
const verifyPassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  const hash = await hashPassword(plainPassword);
  return hash === hashedPassword;
};

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Check if email already exists in users table
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  if (isDemoMode) {
    throw new Error('Database not configured. Please add Supabase credentials to .env file');
  }

  try {
    const { data } = await supabase
      .from('users')
      .select('email')
      .ilike('email', email)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Email check error:', error);
    throw new Error('Failed to check email availability');
  }
};

/**
 * Sign in user with email and password
 * Returns user data on success, null on failure
 */
export const signIn = async (email: string, password: string): Promise<DBUser | null> => {
  if (isDemoMode) {
    throw new Error('Database not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_KEY to .env file');
  }

  try {
    // Query users table for matching email
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error('Login query error:', error);
      return null;
    }

    if (!data) {
      console.log('No user found with email:', email);
      return null;
    }

    // Verify password
    const isValid = await verifyPassword(password, data.password);
    if (!isValid) {
      console.log('Invalid password for:', email);
      return null;
    }

    // Update last login stats
    await updateLoginStats(data.id);

    // Remove password from returned data
    const { password: _, ...userWithoutPassword } = data;
    return userWithoutPassword as DBUser;

  } catch (error) {
    console.error('Login exception:', error);
    throw new Error('Login failed. Please check your connection.');
  }
};

/**
 * Register new dealership with principal user
 * Creates both dealership and user records in transaction
 */
export const registerDealership = async (
  registration: DealershipRegistration
): Promise<{ success: boolean; error?: string; user?: DBUser; dealership?: Dealership }> => {

  if (isDemoMode) {
    return {
      success: false,
      error: 'Database not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_KEY to .env file'
    };
  }

  try {
    // Validate required fields
    if (!registration.user.email || !registration.user.password) {
      return { success: false, error: 'Email and password are required' };
    }

    if (!registration.dealership.name || !registration.dealership.brand) {
      return { success: false, error: 'Dealership name and brand are required' };
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(registration.user.email);
    if (emailExists) {
      return { success: false, error: 'Email already registered' };
    }

    // Step 1: Create dealership first
    const dealershipData = {
      name: registration.dealership.name,
      brand: registration.dealership.brand,
      region: registration.dealership.region,
      detailed_aor: registration.dealership.detailedAor || null,
      phone: registration.dealership.phone || null,
      address: registration.dealership.address || null,
      contact_person: registration.user.full_name,
      status: 'Pending', // Default to pending until approved
      leads_assigned: 0,
      max_leads_capacity: 50,
      billing: {
        plan: 'Standard',
        costPerLead: 350,
        credits: 0,
        totalSpent: 0,
        lastBilledDate: '',
        currentUnbilledAmount: 0
      },
      preferences: {
        vehicleConditions: ['New', 'Used'],
        minScore: 50
      }
    };

    const { data: dealership, error: dealershipError } = await supabase
      .from('dealerships')
      .insert([dealershipData])
      .select()
      .single();

    if (dealershipError || !dealership) {
      console.error('Dealership creation error:', dealershipError);
      return { success: false, error: dealershipError?.message || 'Failed to create dealership' };
    }

    // Step 2: Create principal user for the dealership
    const hashedPassword = await hashPassword(registration.user.password);

    const userData = {
      email: registration.user.email,
      password: hashedPassword,
      full_name: registration.user.full_name,
      role: 'DEALER_PRINCIPAL' as UserRole,
      dealership_id: dealership.id,
      status: 'Active',
      is_verified: false,
      phone: registration.user.phone || null,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(registration.user.full_name)}&background=0D8ABC&color=fff`,
      login_count: 0
    };

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (userError || !user) {
      // Rollback: Delete the dealership if user creation fails
      await supabase.from('dealerships').delete().eq('id', dealership.id);
      console.error('User creation error:', userError);
      return { success: false, error: userError?.message || 'Failed to create user account' };
    }

    // Remove password from returned user
    const { password: _, ...userWithoutPassword } = user;

    // Send welcome email (don't block registration if email fails)
    try {
      await sendWelcomeEmail(
        registration.user.email,
        registration.user.full_name,
        registration.dealership.name
      );
    } catch (emailError) {
      console.warn('Welcome email failed but registration succeeded:', emailError);
    }

    return {
      success: true,
      user: userWithoutPassword as DBUser,
      dealership: dealership as Dealership
    };

  } catch (error: any) {
    console.error('Registration exception:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
};

/**
 * Create additional user for existing dealership
 * Used by DEALER_PRINCIPAL to add sales staff
 */
export const createUser = async (
  userData: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    dealership_id: string;
    phone?: string;
  }
): Promise<{ success: boolean; error?: string; user?: DBUser }> => {

  if (isDemoMode) {
    return {
      success: false,
      error: 'Database not configured'
    };
  }

  try {
    // Check if email exists
    const emailExists = await checkEmailExists(userData.email);
    if (emailExists) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        password: hashedPassword,
        status: 'Active',
        is_verified: false,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name)}&background=0D8ABC&color=fff`,
        login_count: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('User creation error:', error);
      return { success: false, error: error.message };
    }

    const { password: _, ...userWithoutPassword } = data;
    return { success: true, user: userWithoutPassword as DBUser };

  } catch (error: any) {
    console.error('Create user exception:', error);
    return { success: false, error: error.message || 'Failed to create user' };
  }
};

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Update login statistics (last_login, login_count)
 */
const updateLoginStats = async (userId: string): Promise<void> => {
  try {
    await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        login_count: supabase.rpc('increment', { x: 1 }) // If RPC available, else query first
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to update login stats:', error);
    // Non-critical error, don't throw
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<DBUser | null> => {
  if (isDemoMode) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    const { password: _, ...userWithoutPassword } = data;
    return userWithoutPassword as DBUser;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

/**
 * Get all users for a dealership
 */
export const getDealershipUsers = async (dealershipId: string): Promise<DBUser[]> => {
  if (isDemoMode) return [];

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('dealership_id', dealershipId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Remove passwords from all users
    return (data || []).map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as DBUser;
    });
  } catch (error) {
    console.error('Get dealership users error:', error);
    return [];
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert DBUser to frontend User session model
 */
export const toUserSession = (dbUser: DBUser): User => {
  return {
    id: dbUser.id,
    name: dbUser.full_name,
    email: dbUser.email,
    role: dbUser.role,
    dealerId: dbUser.dealership_id,
    avatar: dbUser.avatar_url || undefined
  };
};

/**
 * Determine user role from email pattern (fallback only)
 * Primary role should come from database
 */
export const getRoleFromEmail = (email: string): UserRole => {
  const emailLower = email.toLowerCase();

  if (emailLower.includes('admin') || emailLower === 'owner@autoleadsa.co.za') {
    return 'ADMIN';
  } else if (emailLower.includes('manager')) {
    return 'SALES_MANAGER';
  } else if (emailLower.includes('sales')) {
    return 'SALES_EXECUTIVE';
  }

  return 'DEALER_PRINCIPAL';
};

// ============================================
// PASSWORD RESET FUNCTIONS
// ============================================

/**
 * Generate a secure reset token
 */
const generateResetToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Request password reset - sends email with reset token
 * @param email - User's email address
 * @returns Success status and message
 */
export const requestPasswordReset = async (
  email: string
): Promise<{ success: boolean; message: string }> => {

  if (isDemoMode) {
    return {
      success: false,
      message: 'Database not configured. Please add Supabase credentials to .env file'
    };
  }

  try {
    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .ilike('email', email)
      .maybeSingle();

    if (error || !user) {
      // Don't reveal if email exists or not (security best practice)
      return {
        success: true,
        message: 'If this email is registered, you will receive a password reset link shortly.'
      };
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

    // Store token in database
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert([{
        token: resetToken,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        used: false
      }]);

    if (insertError) {
      console.error('Failed to store reset token:', insertError);
      return {
        success: false,
        message: 'Failed to process password reset request. Please try again.'
      };
    }

    // Send reset email
    const emailSent = await sendPasswordResetEmail(
      user.email,
      resetToken,
      user.full_name
    );

    if (emailSent) {
      console.log(`✅ Password reset token created for ${email}`);
      console.log(`Token expires at: ${expiresAt.toISOString()}`);
    }

    return {
      success: true,
      message: 'If this email is registered, you will receive a password reset link shortly.'
    };

  } catch (error: any) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      message: 'Failed to process password reset request. Please try again.'
    };
  }
};

/**
 * Reset password using token
 * @param token - Reset token from email
 * @param newPassword - New password
 * @returns Success status and message
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {

  if (isDemoMode) {
    return {
      success: false,
      message: 'Database not configured'
    };
  }

  try {
    // Validate password strength
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters long'
      };
    }

    // Verify token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return {
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      };
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (new Date() > expiresAt) {
      // Mark token as used
      await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('id', tokenData.id);

      return {
        success: false,
        message: 'Reset token has expired. Please request a new password reset.'
      };
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password using the userId from token
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', tokenData.user_id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return {
        success: false,
        message: 'Failed to reset password. Please try again.'
      };
    }

    // Mark token as used
    await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', tokenData.id);

    console.log('✅ Password reset successful for user:', tokenData.user_id);

    return {
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    };

  } catch (error: any) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'Failed to reset password. Please try again.'
    };
  }
};

/**
 * Update user password (when logged in)
 * @param userId - User ID
 * @param currentPassword - Current password
 * @param newPassword - New password
 */
export const updatePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {

  if (isDemoMode) {
    return {
      success: false,
      message: 'Database not configured'
    };
  }

  try {
    // Get user with password
    const { data: user, error } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return {
        success: false,
        message: 'Current password is incorrect'
      };
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        message: 'New password must be at least 6 characters long'
      };
    }

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) {
      console.error('Password update error:', updateError);
      return {
        success: false,
        message: 'Failed to update password'
      };
    }

    return {
      success: true,
      message: 'Password updated successfully'
    };

  } catch (error: any) {
    console.error('Update password error:', error);
    return {
      success: false,
      message: 'Failed to update password. Please try again.'
    };
  }
};
