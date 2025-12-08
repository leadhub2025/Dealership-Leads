import { createClient } from '@supabase/supabase-js';

// Configuration for AutoLead SA Database
// We check for variables in process.env (mapped by Vite config) or standard Vite import.meta.env
const envUrl = process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
const envKey = process.env.SUPABASE_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;

// Use provided credentials or fall back to placeholder values for Offline/Demo mode.
// The placeholders allow the app to initialize without crashing, enabling the "Offline Mode" 
// fallback logic in services/supabaseService.ts to take over when requests fail.
const SUPABASE_URL = envUrl || 'https://demo.project.supabase.co';
const SUPABASE_ANON_KEY = envKey || 'demo-anon-key';

if (!envUrl || !envKey) {
  console.info(console.info('AutoLead SA: Running in Demo/Offline Mode (Local Storage active). Set SUPABASE_URL and SUPABASE_KEY to go live.');
}

export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);