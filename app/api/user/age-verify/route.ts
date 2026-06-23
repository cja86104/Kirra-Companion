import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calculateAge, getAgeTier } from '@/lib/safety/age-verification';
import type { ProfileUpdate } from '@/types/database';

/**
 * Strict ISO-date string (YYYY-MM-DD). HTML `<input type="date">` produces
 * exactly this format, so this is what the gate page submits.
 *
 * We also reject:
 *   - unparseable values
 *   - obviously-invalid years (< 1900 or > current year)
 *   - future dates
 */
const ageVerifySchema = z.object({
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((value) => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      const year = parsed.getUTCFullYear();
      const now = new Date();
      if (year < 1900) return false;
      if (parsed.getTime() > now.getTime()) return false;
      return true;
    }, 'Please enter a valid date of birth'),
});

/**
 * POST /api/user/age-verify
 *
 * Records the user's self-reported date of birth and mirrors the resulting
 * `age_tier` into both `public.profiles` and `auth.users.user_metadata`.
 * The metadata mirror is what the middleware gate reads on every request,
 * so writing it here is what lets the user leave /onboarding/age.
 *
 * Failure paths (all return without releasing the gate):
 *   401 — caller is not authenticated
 *   400 — request body did not validate
 *   403 — user is already permanently minor-flagged (cannot retry)
 *   403 — submitted DOB resolves to age < 13 (COPPA: account locked)
 *   500 — Supabase update failed
 *
 * COPPA handling: a self-reported age < 13 permanently flags the profile
 * (`is_minor_flagged = TRUE`, `minor_flag_reason = 'self_reported_under_13'`)
 * and signs the user out. Any subsequent call from the same account
 * short-circuits at the flag check, so the user cannot bypass by signing
 * back in and submitting a different DOB.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Auth.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate body.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  const parsed = ageVerifySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid date of birth',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const dateOfBirth = parsed.data.date_of_birth;

  // 3. Hard stop for already-flagged accounts BEFORE any write. Even a
  // valid DOB submission must not release a flagged profile.
  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('is_minor_flagged')
    .eq('id', user.id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 }
    );
  }

  if (existing.is_minor_flagged) {
    // Defence in depth: clear the session so the client cannot continue.
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'This account is no longer eligible to use Kirra.' },
      { status: 403 }
    );
  }

  // 4. Compute tier from DOB.
  const age = calculateAge(dateOfBirth);
  const tier = getAgeTier(dateOfBirth);

  // 5. COPPA: age < 13 → permanent flag + sign-out.
  if (age < 13) {
    const blockedUpdate: ProfileUpdate = {
      date_of_birth: dateOfBirth,
      age_tier: 'blocked',
      is_minor_flagged: true,
      minor_flagged_at: new Date().toISOString(),
      minor_flag_reason: 'self_reported_under_13',
      updated_at: new Date().toISOString(),
    };

    const { error: blockedError } = await supabase
      .from('profiles')
      .update(blockedUpdate satisfies ProfileUpdate)
      .eq('id', user.id);

    if (blockedError) {
      // We still need to refuse access even if we couldn't persist the
      // flag — never fail-open on a safety check.
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Account verification failed.' },
        { status: 500 }
      );
    }

    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error:
          'You must be at least 13 years old to use Kirra. Your account has been suspended.',
      },
      { status: 403 }
    );
  }

  // 6. Eligible age — persist DOB + tier.
  const update: ProfileUpdate = {
    date_of_birth: dateOfBirth,
    age_tier: tier.tier,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('profiles')
    .update(update satisfies ProfileUpdate)
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Could not save your date of birth. Please try again.' },
      { status: 500 }
    );
  }

  // 7. Mirror DOB + tier into auth.users.user_metadata. The middleware
  // gate reads `user_metadata.date_of_birth` on every request, so this
  // write is what releases the user from /onboarding/age. Without it,
  // they would be looped back to the gate on the next request even
  // though the profile is updated.
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      date_of_birth: dateOfBirth,
      age_tier: tier.tier,
    },
  });

  if (metaError) {
    // The profile was updated successfully, so we don't roll it back.
    // The next sign-in will refresh user_metadata from auth.users where
    // these values were written, but the current session JWT will still
    // be stale until a token refresh. Surface a 500 so the client knows
    // to retry rather than landing on a still-gated page.
    return NextResponse.json(
      {
        error:
          'Date of birth saved, but session could not be refreshed. Please sign in again.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    age_tier: tier.tier,
    age,
  });
}
