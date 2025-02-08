import { createClient } from '@supabase/supabase-js';

// Hardcoded for development - will move to env later
const supabaseUrl = 'https://zjwrzhckmurxtemmsteh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqd3J6aGNrbXVyeHRlbW1zdGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MzU0NDUsImV4cCI6MjA1NDExMTQ0NX0.Bwm_vHAdCNXPpsr1b9amimG8NPBvl8U5FeptpIXxmlc';
const supabaseServiceKey = supabaseAnonKey; // Using the same key for now

// Regular client for public access
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

// Admin client with service role for bypassing RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
});
