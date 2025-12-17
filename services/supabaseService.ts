/**
 * ============================================
 * Supabase Service - Business Operations Only
 * ============================================
 * Purpose: Handle dealership and lead business operations
 * Authentication has been moved to authService.ts
 * ============================================
 */

import { supabase, isDemoMode } from '../lib/supabaseClient';
import { Lead, Dealership } from '../types';

// ============================================
// DEPRECATED AUTHENTICATION FUNCTIONS
// ============================================
// NOTE: These functions are deprecated and kept only for backward compatibility
// Use services/authService.ts for all authentication operations

/**
 * @deprecated Use authService.registerDealership() instead
 * This is kept for backward compatibility only
 */
export const registerDealer = async (dealer: any): Promise<{ success: boolean; error?: string; dealer?: any }> => {
  console.warn('⚠️ registerDealer() is deprecated. Please use authService.registerDealership() instead.');
  return {
    success: false,
    error: 'This function is deprecated. Please use authService.registerDealership() instead. See REGISTRATION_EXAMPLE.md for details.'
  };
};

/**
 * @deprecated Use authService.signIn() instead
 * This is kept for backward compatibility only
 */
export const signInDealer = async (email: string, password: string): Promise<any> => {
  console.warn('⚠️ signInDealer() is deprecated. Please use authService.signIn() instead.');
  throw new Error('This function is deprecated. Please use authService.signIn() instead.');
};

/**
 * @deprecated Use authService.checkEmailExists() instead
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  console.warn('⚠️ checkEmailExists() is deprecated. Please use authService.checkEmailExists() instead.');
  throw new Error('This function is deprecated. Please use authService.checkEmailExists() instead.');
};

// ============================================
// LEAD MANAGEMENT FUNCTIONS
// ============================================

/**
 * Fetch all leads from database
 */
export const fetchLeads = async (): Promise<Lead[]> => {
  if (isDemoMode) {
    console.warn('⚠️ Demo mode - database not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Lead[]) || [];
  } catch (error) {
    console.error('Fetch leads error:', error);
    return [];
  }
};

/**
 * Create new lead in database
 */
export const createLead = async (lead: Lead): Promise<void> => {
  if (isDemoMode) {
    console.warn('⚠️ Demo mode - lead creation skipped');
    throw new Error('Database not configured');
  }

  try {
    const { error } = await supabase.from('leads').insert([lead]);
    if (error) throw error;
  } catch (error) {
    console.error('Create lead error:', error);
    throw new Error('Failed to create lead');
  }
};

/**
 * Update existing lead
 */
export const updateLead = async (id: string, updates: Partial<Lead>): Promise<void> => {
  if (isDemoMode) {
    console.warn('⚠️ Demo mode - lead update skipped');
    return;
  }

  try {
    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Update lead error:', error);
    throw new Error('Failed to update lead');
  }
};

// ============================================
// DEALERSHIP MANAGEMENT FUNCTIONS
// ============================================

/**
 * Fetch all dealerships from database
 */
export const fetchDealers = async (): Promise<Dealership[]> => {
  if (isDemoMode) {
    console.warn('⚠️ Demo mode - database not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('dealerships')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Dealership[]) || [];
  } catch (error) {
    console.error('Fetch dealers error:', error);
    return [];
  }
};

/**
 * Create new dealership (deprecated - use registerDealer instead)
 * @deprecated Use registerDealer() for new registrations
 */
export const createDealer = async (dealer: Dealership): Promise<void> => {
  console.warn('⚠️ createDealer is deprecated. Use registerDealer() instead.');
  const result = await registerDealer(dealer);
  if (!result.success) {
    throw new Error(result.error);
  }
};

/**
 * Update existing dealership
 */
export const updateDealer = async (id: string, updates: Partial<Dealership>): Promise<void> => {
  if (isDemoMode) {
    console.warn('⚠️ Demo mode - dealer update skipped');
    return;
  }

  try {
    const { error } = await supabase
      .from('dealerships')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Update dealer error:', error);
    throw new Error('Failed to update dealership');
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  if (isDemoMode) {
    console.error('⚠️ Demo mode - database not configured');
    return false;
  }

  try {
    const { error } = await supabase
      .from('dealerships')
      .select('count')
      .limit(1);

    return !error;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async (): Promise<{ dealers: number; leads: number; activeDealers: number }> => {
  if (isDemoMode) {
    return { dealers: 0, leads: 0, activeDealers: 0 };
  }

  try {
    const [dealersCount, leadsCount, activeCount] = await Promise.all([
      supabase.from('dealerships').select('count', { count: 'exact', head: true }),
      supabase.from('leads').select('count', { count: 'exact', head: true }),
      supabase.from('dealerships').select('count', { count: 'exact', head: true }).eq('status', 'Active')
    ]);

    return {
      dealers: dealersCount.count || 0,
      leads: leadsCount.count || 0,
      activeDealers: activeCount.count || 0
    };
  } catch (error) {
    console.error('Get stats error:', error);
    return { dealers: 0, leads: 0, activeDealers: 0 };
  }
};
