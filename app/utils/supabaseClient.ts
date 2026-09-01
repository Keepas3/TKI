import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback to prevent Next.js 500 crashes during build if env vars are missing
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE CONNECTION MISSING: Ensure your NEXT_PUBLIC environment variables are set in your deployment dashboard.');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : createClient('https://fallback-url-to-prevent-crash.supabase.co', 'fallback-key-to-prevent-crash');