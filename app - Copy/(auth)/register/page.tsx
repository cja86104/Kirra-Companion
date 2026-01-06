'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  Chrome, 
  Github, 
  Check, 
  Calendar,
  Shield,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { signUpWithEmail, signInWithOAuth } from '@/lib/supabase/client';
import { calculateAge, getAgeTier, TERMS_OF_SERVICE_KEY_POINTS } from '@/lib/safety/age-verification';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Please enter a valid date'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms to continue',
  }),
  confirmAge: z.boolean().refine((val) => val === true, {
    message: 'You must confirm your age is accurate',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  const age = calculateAge(data.dateOfBirth);
  return age >= 13;
}, {
  message: 'You must be at least 13 years old to use Kirra',
  path: ['dateOfBirth'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      agreeToTerms: false,
      confirmAge: false,
    },
  });

  const password = watch('password', '');
  const dateOfBirth = watch('dateOfBirth', '');
  
  // Calculate age tier for display
  const ageTier = dateOfBirth ? getAgeTier(dateOfBirth) : null;

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const ageInfo = getAgeTier(data.dateOfBirth);
      
      if (ageInfo.tier === 'blocked') {
        toast.error('You must be at least 13 years old to use Kirra');
        setIsLoading(false);
        return;
      }

      await signUpWithEmail(data.email, data.password, {
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth,
        age_tier: ageInfo.tier,
      });
      
      if (ageInfo.tier === 'minor') {
        toast.success('Account created! Some features are age-restricted. Check your email to verify.');
      } else {
        toast.success('Account created! Please check your email to verify.');
      }
      router.push('/login?message=verify-email');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github' | 'discord') => {
    // For OAuth, we'll need to collect DOB on first login
    // This shows a notice about it
    toast.info('After signing in, you\'ll need to verify your age to access all features.');
    setIsOAuthLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign up';
      toast.error(message);
      setIsOAuthLoading(null);
    }
  };

  // Calculate max date (must be at least 13)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <Card className="w-full max-w-md" variant="elevated">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Your Account</CardTitle>
        <CardDescription>
          Start your journey with an AI companion
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* OAuth Buttons */}
        <div className="grid gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('google')}
            disabled={isOAuthLoading !== null}
          >
            {isOAuthLoading === 'google' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="h-4 w-4" />
            )}
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuth('github')}
            disabled={isOAuthLoading !== null}
          >
            {isOAuthLoading === 'github' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Github className="h-4 w-4" />
            )}
            Continue with GitHub
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.fullName?.message}
              {...register('fullName')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          {/* Date of Birth - REQUIRED */}
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              max={maxDateStr}
              leftIcon={<Calendar className="h-4 w-4" />}
              error={errors.dateOfBirth?.message}
              {...register('dateOfBirth')}
            />
            {ageTier && ageTier.tier === 'minor' && (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <Shield className="mt-0.5 h-4 w-4 text-yellow-600" />
                <div className="text-xs text-yellow-700 dark:text-yellow-400">
                  <p className="font-medium">Age-Appropriate Mode</p>
                  <p className="mt-1 text-yellow-600 dark:text-yellow-500">
                    Some features like romantic companions are only available to users 18+.
                    You&apos;ll have access to friends, mentors, and other appropriate companions.
                  </p>
                </div>
              </div>
            )}
            {ageTier && ageTier.tier === 'blocked' && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                <div className="text-xs text-red-700 dark:text-red-400">
                  <p className="font-medium">Age Requirement Not Met</p>
                  <p className="mt-1">You must be at least 13 years old to use Kirra.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            {/* Password Requirements */}
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((req, index) => {
                const isMet = req.regex.test(password);
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      isMet ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    <Check className={`h-3 w-3 ${isMet ? 'opacity-100' : 'opacity-30'}`} />
                    {req.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          {/* Terms and Age Confirmation */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Please confirm the following:
            </p>
            
            {/* Age Accuracy Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-input"
                {...register('confirmAge')}
              />
              <span className="text-sm">
                I confirm that my date of birth is accurate. I understand that providing
                false information may result in account restrictions.
              </span>
            </label>
            {errors.confirmAge && (
              <p className="text-xs text-destructive">{errors.confirmAge.message}</p>
            )}

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-input"
                {...register('agreeToTerms')}
              />
              <span className="text-sm">
                I agree to the{' '}
                <button 
                  type="button"
                  onClick={() => setShowTerms(!showTerms)}
                  className="text-primary underline"
                >
                  Terms of Service
                </button>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.agreeToTerms && (
              <p className="text-xs text-destructive">{errors.agreeToTerms.message}</p>
            )}

            {/* Expandable Terms Summary */}
            {showTerms && (
              <div className="mt-3 space-y-2 rounded border bg-background p-3">
                <p className="text-xs font-medium">Key Points:</p>
                <ul className="space-y-1">
                  {TERMS_OF_SERVICE_KEY_POINTS.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3 w-3 text-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/terms" 
                  className="block text-xs text-primary underline mt-2"
                  target="_blank"
                >
                  Read full Terms of Service →
                </Link>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            variant="gradient"
            loading={isLoading}
            disabled={ageTier?.tier === 'blocked'}
          >
            Create Account
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
