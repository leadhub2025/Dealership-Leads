
import { createClient } from '@supabase/supabase-js';

// Configuration for AutoLead SA Database
// We prioritize process.env for security, but fall back to the provided keys for immediate connectivity
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivekbyjxaqpjjazxlpwjj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZWtieWl4YWdwamphemRwd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjk4MDAsImV4cCI6MjA4MDMwNTgwMH0.cF1MGnud_gHLkvKfGnR_M3V5SZCnFQnavJ1UBGEYQsI';

if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
  console.warn('Supabase URL not found. App might run in offline/demo mode.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
