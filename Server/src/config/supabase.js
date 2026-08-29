import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Admin client - uses the service role key.
 * Bypasses Row Level Security, so ALL authorization in this API is enforced
 * by the requirePermission() middleware. Never expose this key to the browser.
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Anon client - used only to sign users in and to validate access tokens.
 */
export const supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
