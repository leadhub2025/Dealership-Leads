import { createClient } from '@supabase/supabase-js';

// Configuration for AutoLead SA Database
// In production, these must be set in your hosting environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || '';

// If keys are missing in production, we log a warning but don't crash immediately 
// to allow the app to render with offline/mock data if handled by services.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing. App will default to offline/mock mode where possible.');
}

// Create the client, handling empty strings gracefully by falling back to a dummy URL if needed 
// to prevent initial crash, though requests will fail.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);