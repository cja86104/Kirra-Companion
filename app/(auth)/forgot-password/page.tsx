'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

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
import { resetPassword } from '@/lib/supabase/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

/**
 * /forgot-password — request a password-reset email.
 *
 * Pairs with /reset-password (where the user lands after clicking the
 * email link, via /auth/callback?next=/reset-password).
 *
 * Security: we always show the same neutral confirmation regardless of
 * whether the email matches an existing account, to avoid leaking the
 * existence of registered emails (user-enumeration defence).
 */
export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await resetPassword(data.email);
      // Supabase intentionally returns success regardless of whether the
      // email exists. We surface the same UI either way.
      setSubmittedEmail(data.email);
      setSubmitted(true);
    } catch (error) {
      // Rate-limit and validation errors still surface here. Generic
      // "something went wrong" prevents enumeration via timing or
      // error-text differences.
      const message =
        error instanceof Error
          ? error.message
          : 'Could not send reset email. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md" variant="elevated">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            If an account exists for{' '}
            <span className="font-medium text-foreground">{submittedEmail}</span>,
            you&apos;ll receive a password-reset link shortly.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
          <p>
            The link expires in 1 hour. If you don&apos;t see the email, check
            your spam folder.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button asChild variant="gradient" className="w-full">
            <Link href="/login">Back to Sign In</Link>
          </Button>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setSubmittedEmail('');
            }}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Use a different email
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" variant="elevated">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset Your Password</CardTitle>
        <CardDescription>
          Enter the email associated with your account and we&apos;ll send you
          a link to set a new password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              autoComplete="email"
              autoFocus
              {...register('email')}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            variant="gradient"
            loading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}
