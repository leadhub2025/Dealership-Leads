
import { createClient } from '@supabase/supabase-js';

// Configuration for AutoLead SA Database
const getEnvVar = (key: string, viteKey: string) => {
  let val = '';
  
  // 1. Try import.meta.env (Vite standard)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[viteKey]) {
      return (import.meta as any).env[viteKey];
    }
  } catch (e) {
    // ignore
  }

  // 2. Try process.env (Node/Compat)
  try {
    if (key === 'SUPABASE_URL' && typeof process !== 'undefined' && process.env.SUPABASE_URL) {
      val = process.env.SUPABASE_URL;
    } else if (key === 'SUPABASE_KEY' && typeof process !== 'undefined' && process.env.SUPABASE_KEY) {
      val = process.env.SUPABASE_KEY;
    }
  } catch (e) {
    // ignore ReferenceError
  }
  
  return val;
};

const envUrl = getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL');
const envKey = getEnvVar('SUPABASE_KEY', 'VITE_SUPABASE_KEY');

// Check if we are in demo mode (missing keys or explicitly using demo placeholders)
export const isDemoMode = !envUrl || !envKey || envUrl.includes('demo.project') || envUrl === 'https://placeholder.supabase.co';

if (isDemoMode) {
  console.info('AutoLead SA: Running in Demo/Offline Mode (Local Storage active). Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY to go live.');
}

// Use placeholders if in demo mode to prevent createClient from throwing immediately
const SUPABASE_URL = envUrl || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = envKey || 'placeholder-key';

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
