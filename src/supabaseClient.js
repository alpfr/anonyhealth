import { createClient } from '@supabase/supabase-js';

const requireEnv = (name) => {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
export const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
