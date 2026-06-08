import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Create a Supabase client for use in the browser (Client Components)
 * This client is configured to work with cookies for auth
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Singleton instance for browser client
 * Use this when you need a persistent client instance
 */
let browserClient: ReturnType<typeof createClient> | null = null;

export function getClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}

/**
 * Helper to get current user from browser
 */
export async function getCurrentUser() {
  const supabase = getClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Helper to get current session from browser
 */
export async function getCurrentSession() {
  const supabase = getClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  const supabase = getClient();
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Sign out helper
 */
export async function signOut() {
  const supabase = getClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  // Clear singleton
  browserClient = null;
}

/**
 * Sign in with email/password
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign up with email/password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: {
    full_name?: string;
    date_of_birth?: string;
    age_tier?: string;
  }
) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(
  provider: 'google' | 'github' | 'discord'
) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Send a password-reset email.
 *
 * The email link points the user at /auth/callback?next=/reset-password.
 * The callback route (app/auth/callback/route.ts) is the single owner of
 * exchangeCodeForSession; on success it forwards the user to
 * /reset-password with a valid recovery session, where the new-password
 * form can call updatePassword().
 *
 * We intentionally do NOT redirect to /reset-password directly here:
 *   - centralising code exchange in one route handler avoids duplicating
 *     server-side cookie wiring
 *   - keeps the reset page a pure client form with no PKCE / token logic
 */
export async function resetPassword(email: string) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(metadata: Record<string, unknown>) {
  const supabase = getClient();
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (error) {
    throw error;
  }

  return data;
}