"use strict";
// Supabase client configuration for backend
// Uses the Secret API key which bypasses RLS
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupabaseConfigured = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl) {
    console.warn('WARNING: SUPABASE_URL environment variable is not set. Supabase integration will not work.');
}
if (!supabaseServiceKey) {
    console.warn('WARNING: SUPABASE_SERVICE_KEY environment variable is not set. Supabase integration will not work.');
}
// Create client with service key (bypasses RLS for admin operations)
exports.supabase = supabaseUrl && supabaseServiceKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;
const isSupabaseConfigured = () => {
    return exports.supabase !== null;
};
exports.isSupabaseConfigured = isSupabaseConfigured;
