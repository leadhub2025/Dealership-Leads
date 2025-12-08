import { createClient } from '@supabase/supabase-js';

// Configuration for AutoLead SA Database
// In production, these must be set in your hosting environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;

// If keys are missing, we log an info message instead of a warning to indicate that
// this is an expected state for the Demo/Offline version of the app.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.info('AutoLead SA: Running in Demo/Offline Mode (Local Storage active).');
}

// Create the client, handling empty strings gracefully by falling back to a dummy URL.
// Real network requests will fail, triggering the service-layer fallbacks to Mock Data.
export const supabase = createClient(
  SUPABASE_URL || 'https://demo.autoleadsa.co.za', 
  SUPABASE_ANON_KEY || 'demo-key', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);