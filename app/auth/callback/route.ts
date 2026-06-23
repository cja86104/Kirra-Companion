import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Supabase auth callback handler.
 *
 * Reached at /auth/callback after:
 *   - OAuth provider redirect (Google, GitHub, Discord)
 *   - Magic link / OTP email click
 *   - Password reset email click (Supabase recovery flow)
 *
 * The provider returns ?code=<auth_code>; this handler exchanges it for a
 * Supabase session cookie via supabase.auth.exchangeCodeForSession() and
 * redirects to the post-login destination (?next=<path>, defaults to
 * /dashboard).
 *
 * On error the user is sent to /auth-code-error (which renders under the
 * (auth) route group's branded layout).
 *
 * NOTE: the file lives at app/auth/callback/route.ts, NOT inside the (auth)
 * route group. Route groups are silent in the URL, so a handler at
 * app/(auth)/callback/route.ts would serve /callback — mismatching the
 * /auth/callback URL produced by lib/supabase/client.ts and configured in
 * the Supabase Dashboard's Allowed Redirect URLs list.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Fall through: missing or invalid code. The error page lives under the
  // (auth) route group, so its URL is /auth-code-error (not
  // /auth/auth-code-error — the (auth) segment is a route group and does
  // not appear in the URL).
  return NextResponse.redirect(`${origin}/auth-code-error`);
}
