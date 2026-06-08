'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Calendar,
  Shield,
  Sparkles,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { signOut } from '@/lib/supabase/client';
import {
  calculateAge,
  getAgeTier,
  type AgeTier,
} from '@/lib/safety/age-verification';

/**
 * Forced-completion onboarding step for accounts that signed in via OAuth
 * (Google / GitHub / Discord) and therefore have no recorded date of
 * birth. The middleware in `lib/supabase/middleware.ts` redirects any
 * authenticated request without `user_metadata.date_of_birth` here and
 * blocks every other path until this form is submitted successfully.
 *
 * The user cannot leave this page except by:
 *   1. Submitting a valid DOB (>= 13) — proceeds to /dashboard
 *   2. Signing out — returns to /login
 *
 * Submitting a DOB that resolves to age < 13 permanently flags the
 * profile (`is_minor_flagged = TRUE`) and signs the user out. See
 * `/api/user/age-verify` for the server-side enforcement.
 */

const ageVerifySchema = z.object({
  dateOfBirth: z
    .string()
    .min(1, 'Please enter your date of birth')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date'),
});

type AgeVerifyForm = z.infer<typeof ageVerifySchema>;

/** Maximum selectable date — today, in YYYY-MM-DD. */
function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Render a short, accurate description for each age tier so the user
 * understands what they are confirming before submitting.
 */
function tierLabel(tier: AgeTier): {
  title: string;
  body: string;
  tone: 'ok' | 'minor' | 'blocked';
} {
  if (tier === 'blocked') {
    return {
      title: 'Account will be suspended',
      body:
        'Kirra is only available to people 13 and older. Submitting this date will lock your account.',
      tone: 'blocked',
    };
  }
  if (tier === 'minor') {
    return {
      title: 'Age-restricted experience',
      body:
        'Romantic companion types and mature content will be unavailable. All other Kirra features remain accessible.',
      tone: 'minor',
    };
  }
  return {
    title: 'Full access',
    body: 'You will have access to every Kirra feature.',
    tone: 'ok',
  };
}

export default function OnboardingAgePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AgeVerifyForm>({
    resolver: zodResolver(ageVerifySchema),
  });

  const dateOfBirth = watch('dateOfBirth', '');

  /**
   * Live preview of the tier the user will be placed in, computed from
   * the current form value. We only show the preview once the field is
   * non-empty and parses to a real calendar date.
   */
  const preview = useMemo(() => {
    if (!dateOfBirth) return null;
    const parsed = new Date(dateOfBirth);
    if (Number.isNaN(parsed.getTime())) return null;

    const age = calculateAge(dateOfBirth);
    const tier = getAgeTier(dateOfBirth);
    return { age, tier: tier.tier, label: tierLabel(tier.tier) };
  }, [dateOfBirth]);

  const onSubmit = async (data: AgeVerifyForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user/age-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_of_birth: data.dateOfBirth }),
      });

      const payload: unknown = await response.json().catch(() => ({}));
      const message =
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof (payload as { error: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : null;

      if (response.status === 403) {
        // COPPA block path. Server has already signed the user out and
        // flagged the profile; surface the message and bounce to /login.
        toast.error(message ?? 'Your account is no longer eligible.');
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        toast.error(message ?? 'Could not save your date of birth.');
        return;
      }

      // Success: middleware will let us proceed now that
      // user_metadata.date_of_birth is set. router.refresh() forces the
      // server-side session to be re-read so the gate doesn't fire on
      // the very next request.
      toast.success('Thanks for verifying — welcome to Kirra.');
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Network error. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sign out';
      toast.error(message);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background — same palette as the (auth) layout for visual continuity. */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-kirra-500/20 blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-glow-purple/20 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-glow-pink/10 blur-[150px]" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md" variant="elevated">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-kirra-500/10">
              <Shield className="h-6 w-6 text-kirra-500" />
            </div>
            <CardTitle className="text-2xl">One quick check</CardTitle>
            <CardDescription>
              We need your date of birth to keep Kirra safe and age-appropriate.
              This is a one-time step.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  max={todayIso()}
                  leftIcon={<Calendar className="h-4 w-4" />}
                  error={errors.dateOfBirth?.message}
                  autoFocus
                  {...register('dateOfBirth')}
                />
              </div>

              {preview && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    preview.label.tone === 'blocked'
                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                      : preview.label.tone === 'minor'
                        ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300'
                        : 'border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <p className="flex items-center gap-2 font-medium">
                    {preview.label.tone === 'blocked' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {preview.label.title}
                    <span className="ml-auto text-xs opacity-70">
                      age {preview.age}
                    </span>
                  </p>
                  <p className="mt-1 text-xs opacity-90">{preview.label.body}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                variant="gradient"
                loading={isSubmitting}
                disabled={isSubmitting || isSigningOut}
              >
                Confirm and continue
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 text-center">
            <p className="text-xs text-muted-foreground">
              We use this to enforce age-appropriate content and comply with
              COPPA. You can review our privacy policy at any time from
              settings.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={isSubmitting || isSigningOut}
              className="text-muted-foreground"
            >
              <LogOut className="h-3 w-3" />
              Sign out instead
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
