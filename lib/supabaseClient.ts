
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are set, otherwise use placeholders to prevent crash
// In production, these should be set in your Vercel/Netlify dashboard
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL) {
  console.warn('Supabase URL not found. App will run in offline/demo mode.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
