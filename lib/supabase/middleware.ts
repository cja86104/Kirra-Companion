import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Allowlist for the OAuth age-verification gate.
 *
 * Any authenticated user whose JWT `user_metadata.date_of_birth` is empty
 * is redirected to /onboarding/age before they can reach any other route.
 * The two entries below are the only paths that gate-incomplete users
 * are permitted to hit — anything else is bounced to the gate page.
 *
 *   /onboarding/age       — the gate page itself (would otherwise loop)
 *   /api/user/age-verify  — the POST endpoint the gate page submits to
 *
 * NOTE: sign-out is a client-side `supabase.auth.signOut()` call (no
 * server route is required), so it does not need to be allowlisted.
 *
 * NOTE: static assets, /_next/*, favicons, and /api/stripe/webhook are
 * already excluded by the matcher in middleware.ts and therefore never
 * reach this gate.
 */
const AGE_GATE_ALLOWED_PATHS: ReadonlyArray<string> = [
  '/onboarding/age',
  '/api/user/age-verify',
];

/**
 * Auth metadata shape we read from the Supabase JWT. We narrow what we
 * read to the single field the gate cares about; any other metadata
 * fields are intentionally ignored here.
 */
interface AuthUserMetadata {
  date_of_birth?: string | null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedRoutes = [
    '/dashboard',
    '/chat',
    '/companion',
    '/activities',
    '/settings',
    '/life-feed',
  ];

  const authRoutes = ['/login', '/register', '/auth'];

  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

  // (1) Unauthenticated visitor on a protected route -> /login (with deep-link
  // capture so they land where they intended after authenticating).
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // (2) Authenticated visitor on an auth route -> /dashboard (or the
  // deep-link they originally requested).
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    const redirect = request.nextUrl.searchParams.get('redirect');
    url.pathname = redirect || '/dashboard';
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  // (3) Server-side age-verification gate.
  //
  // Safety rule (per CLAUDE.md): "Safety systems are non-negotiable - crisis
  // detection, age verification, behavioral detection must never be
  // bypassed." OAuth signup paths (Google / GitHub / Discord) skip the DOB
  // field that the email register page collects, so OAuth-created accounts
  // would otherwise land on /dashboard with no recorded date_of_birth and
  // the default `age_tier = 'adult'` - silently bypassing COPPA/minor rules.
  //
  // We enforce DOB at the middleware layer so the gate cannot be skipped
  // by deep-linking to /chat, /companion, etc. The check reads only the
  // already-loaded JWT user_metadata - no extra database query per request.
  if (user) {
    const metadata = user.user_metadata as AuthUserMetadata | null | undefined;
    const hasDateOfBirth = typeof metadata?.date_of_birth === 'string'
      && metadata.date_of_birth.length > 0;

    if (!hasDateOfBirth) {
      const isAllowed = AGE_GATE_ALLOWED_PATHS.some(
        (allowed) => path === allowed || path.startsWith(`${allowed}/`)
      );

      if (!isAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding/age';
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
