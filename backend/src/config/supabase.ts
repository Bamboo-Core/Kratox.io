
// Supabase client configuration for backend
// Uses the Secret API key which bypasses RLS

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
    console.warn('WARNING: SUPABASE_URL environment variable is not set. Supabase integration will not work.');
}

if (!supabaseServiceKey) {
    console.warn('WARNING: SUPABASE_SERVICE_KEY environment variable is not set. Supabase integration will not work.');
}

// Create client with service key (bypasses RLS for admin operations)
export const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

export const isSupabaseConfigured = (): boolean => {
    return supabase !== null;
};
