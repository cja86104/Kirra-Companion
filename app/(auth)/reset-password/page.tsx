'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Lock, Check, ShieldCheck } from 'lucide-react';

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
import {
  getClient,
  getCurrentSession,
  signOut,
  updatePassword,
} from '@/lib/supabase/client';

/**
 * Password rules match register/page.tsx so resets cannot lower the bar
 * a user originally agreed to during signup.
 */
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const passwordRequirements: ReadonlyArray<{ regex: RegExp; label: string }> = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
];

/**
 * /reset-password — set a new password after clicking the email link.
 *
 * Lives inside the (auth) route group so it inherits the branded auth
 * layout (kirra logo header, gradient background). Reached via
 * /auth/callback?next=/reset-password after exchangeCodeForSession has
 * established a Supabase recovery session — this page does NOT touch
 * PKCE tokens directly.
 *
 * If the user reaches this page without an active session (e.g. they
 * bookmarked the URL or the recovery session expired), we send them back
 * to /forgot-password rather than render a form that would 401 on submit.
 *
 * After a successful password change we sign the user out and send them
 * to /login. Forcing a fresh sign-in proves possession of the new
 * password and matches industry-standard reset UX.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<
    'checking' | 'authorised' | 'unauthorised'
  >('checking');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password', '');

  // Verify a Supabase session exists on mount. The callback handler is
  // responsible for establishing it; if none is present, the recovery
  // link is missing, expired, or already consumed.
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const session = await getCurrentSession();
      if (cancelled) return;
      if (session) {
        setSessionState('authorised');
      } else {
        setSessionState('unauthorised');
      }
    };

    void verify();

    // Listen for SIGNED_OUT events during the lifetime of this page so we
    // do not leave a stale form mounted after a sign-out from another
    // tab.
    const client = getClient();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setSessionState('unauthorised');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsSubmitting(true);
    try {
      await updatePassword(data.password);

      // Force a fresh sign-in so the new credential is exercised end-to-end.
      // signOut() also clears the recovery session, preventing it from
      // being reused.
      try {
        await signOut();
      } catch {
        // Sign-out failure here is non-fatal — the password change has
        // already succeeded. Continue to /login.
      }

      toast.success('Password updated. Please sign in with your new password.');
      router.replace('/login?message=password-reset');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update password';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionState === 'checking') {
    return (
      <Card className="w-full max-w-md" variant="elevated">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set a New Password</CardTitle>
          <CardDescription>Verifying your reset link…</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (sessionState === 'unauthorised') {
    return (
      <Card className="w-full max-w-md" variant="elevated">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Link Invalid</CardTitle>
          <CardDescription>
            This password reset link is missing, has expired, or has already
            been used. Request a new one to continue.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Button asChild variant="gradient" className="w-full">
            <Link href="/forgot-password">Request New Link</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" variant="elevated">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-kirra-500/10">
          <ShieldCheck className="h-6 w-6 text-kirra-500" />
        </div>
        <CardTitle className="text-2xl">Set a New Password</CardTitle>
        <CardDescription>
          Choose a strong password you don&apos;t use anywhere else.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              autoComplete="new-password"
              autoFocus
              {...register('password')}
            />

            {password.length > 0 && (
              <ul className="mt-2 space-y-1" aria-label="Password requirements">
                {passwordRequirements.map((req) => {
                  const met = req.regex.test(password);
                  return (
                    <li
                      key={req.label}
                      className={`flex items-center gap-2 text-xs ${
                        met ? 'text-green-500' : 'text-muted-foreground'
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 ${
                          met ? 'opacity-100' : 'opacity-30'
                        }`}
                      />
                      {req.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            variant="gradient"
            loading={isSubmitting}
          >
            Update Password
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Cancel and return to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}
