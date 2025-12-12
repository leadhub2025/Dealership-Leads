
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
  // We wrap this in a try/catch block to handle environments where 'process' is not defined
  try {
    // We explicitly check specific keys to allow bundler replacement
    if (key === 'SUPABASE_URL' && typeof process !== 'undefined' && process.env.SUPABASE_URL) {
      val = process.env.SUPABASE_URL;
    } else if (key === 'SUPABASE_KEY' && typeof process !== 'undefined' && process.env.SUPABASE_KEY) {
      val = process.env.SUPABASE_KEY;
    }
  } catch (e) {
    // ignore ReferenceError for process
  }
  
  return val;
};

const envUrl = getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL');
const envKey = getEnvVar('SUPABASE_KEY', 'VITE_SUPABASE_KEY');

// Use provided credentials or fall back to placeholder values for Offline/Demo mode.
const SUPABASE_URL = envUrl || 'https://demo.project.supabase.co';
const SUPABASE_ANON_KEY = envKey || 'demo-anon-key';

if (!envUrl || !envKey) {
  console.info('AutoLead SA: Running in Demo/Offline Mode (Local Storage active). Set SUPABASE_URL and SUPABASE_KEY to go live.');
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
