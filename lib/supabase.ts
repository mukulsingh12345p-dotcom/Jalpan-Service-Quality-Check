import { createClient } from '@supabase/supabase-js';

// Safely access environment variables to prevent runtime crashes
const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || '';
    }
  } catch (e) {
    console.warn('Error reading environment variable', key, e);
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing Supabase Environment Variables. Database features will not work properly.");
}

// Fallback to prevent crash, allowing the app to render UI even if DB connection fails
const url = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder-project.supabase.co';
const key = supabaseKey || 'placeholder-key';

export const supabase = createClient(url, key);