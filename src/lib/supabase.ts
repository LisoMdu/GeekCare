import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase initialization with URL:', supabaseUrl ? 'URL exists' : 'URL missing');

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are missing', { 
    urlExists: !!supabaseUrl, 
    keyExists: !!supabaseKey 
  });
}

// Create Supabase client with additional options
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'geekcare@1.0.0'
    }
  }
});