'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Loader2, 
  Check, 
  CreditCard, 
  Sparkles,
  Zap,
  Crown,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils/cn';
import { getClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    messages: number | 'unlimited';
    companions: number;
    voice: boolean;
    activities: boolean;
    priority: boolean;
  };
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with AI companionship',
    price: { monthly: 0, yearly: 0 },
    features: [
      '50 messages per day',
      '1 companion',
      'Basic personality traits',
      'Text chat only',
    ],
    limits: {
      messages: 50,
      companions: 1,
      voice: false,
      activities: false,
      priority: false,
    },
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'More conversations, more connection',
    price: { monthly: 9.99, yearly: 99 },
    features: [
      '500 messages per day',
      '3 companions',
      'Advanced personality',
      'Memory palace access',
      'Life simulation',
    ],
    limits: {
      messages: 500,
      companions: 3,
      voice: false,
      activities: true,
      priority: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'The full companion experience',
    price: { monthly: 19.99, yearly: 199 },
    features: [
      '5,000 messages per day',
      '5 companions',
      'Voice messages',
      'All activities',
      'Priority support',
      'Advanced AI model',
    ],
    limits: {
      messages: 5000,
      companions: 5,
      voice: true,
      activities: true,
      priority: true,
    },
    popular: true,
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    description: 'Unlimited everything',
    price: { monthly: 39.99, yearly: 399 },
    features: [
      'Unlimited messages',
      '10 companions',
      'Premium voice',
      'All activities',
      'Priority support',
      'Best AI model',
      'API access',
      'Early features',
    ],
    limits: {
      messages: 'unlimited',
      companions: 10,
      voice: true,
      activities: true,
      priority: true,
    },
  },
];

export default function BillingSettingsPage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [usage, setUsage] = useState({ messages: 0, limit: 50 });
  const supabase = getClient();

  useEffect(() => {
    const loadBillingData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('subscription_tier, messages_today')
          .eq('id', user.id)
          .single();

        const profile = profileData as Pick<Profile, 'subscription_tier' | 'messages_today'> | null;

        if (profile) {
          setCurrentTier(profile.subscription_tier);
          const tier = pricingTiers.find(t => t.id === profile.subscription_tier);
          const limit = tier?.limits.messages === 'unlimited' ? 999999 : (tier?.limits.messages || 50);
          setUsage({
            messages: profile.messages_today,
            limit,
          });
        }
      } catch (error) {
        console.error('Failed to load billing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBillingData();
  }, [supabase]);

  const handleCheckout = async (tierId: string) => {
    if (tierId === 'free' || tierId === currentTier) return;

    setIsCheckingOut(tierId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: tierId,
          billingPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsCheckingOut(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to open billing portal. Please try again.');
    }
  };

  const getTierIcon = (tierId: string) => {
    switch (tierId) {
      case 'basic': return Zap;
      case 'pro': return Sparkles;
      case 'ultimate': return Crown;
      default: return CreditCard;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentTierData = pricingTiers.find(t => t.id === currentTier);

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your subscription and usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentTierData && (
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  currentTier === 'free' ? 'bg-muted' : 'bg-primary/10'
                )}>
                  {(() => {
                    const Icon = getTierIcon(currentTier);
                    return <Icon className={cn('h-5 w-5', currentTier === 'free' ? 'text-muted-foreground' : 'text-primary')} />;
                  })()}
                </div>
              )}
              <div>
                <p className="font-semibold">{currentTierData?.name} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {currentTier === 'free' ? 'Free forever' : `$${currentTierData?.price.monthly}/month`}
                </p>
              </div>
            </div>
            {currentTier !== 'free' && (
              <Button variant="outline" onClick={handleManageBilling}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Billing
              </Button>
            )}
          </div>

          {/* Usage */}
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Messages Today</span>
              <span className="font-medium">
                {usage.messages} / {usage.limit === 999999 ? '∞' : usage.limit}
              </span>
            </div>
            <Progress 
              value={usage.limit === 999999 ? 0 : (usage.messages / usage.limit) * 100} 
              variant={usage.messages >= usage.limit * 0.9 ? 'danger' : 'default'}
            />
            {usage.messages >= usage.limit * 0.9 && usage.limit !== 999999 && (
              <p className="mt-2 text-xs text-destructive">
                You&apos;re running low on messages. Consider upgrading!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Monthly
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              billingPeriod === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Yearly
          </button>
          <Badge variant="success" className="text-xs">Save 17%</Badge>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pricingTiers.map((tier) => {
          const Icon = getTierIcon(tier.id);
          const isCurrentTier = tier.id === currentTier;
          const price = billingPeriod === 'monthly' ? tier.price.monthly : tier.price.yearly;

          return (
            <Card 
              key={tier.id}
              className={cn(
                'relative',
                tier.popular && 'border-primary shadow-glow',
                isCurrentTier && 'ring-2 ring-primary'
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="gradient">Most Popular</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className={cn(
                    'h-5 w-5',
                    tier.id === 'free' ? 'text-muted-foreground' : 'text-primary'
                  )} />
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    ${billingPeriod === 'monthly' ? price : Math.round(price / 12)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                  {billingPeriod === 'yearly' && price > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${price} billed yearly
                    </p>
                  )}
                </div>

                <ul className="space-y-2">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrentTier ? 'outline' : tier.popular ? 'gradient' : 'default'}
                  disabled={isCurrentTier || isCheckingOut !== null}
                  onClick={() => handleCheckout(tier.id)}
                >
                  {isCheckingOut === tier.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isCurrentTier ? 'Current Plan' : tier.id === 'free' ? 'Downgrade' : 'Upgrade'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Can I cancel anytime?</p>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <p className="font-medium">What happens to my companions if I downgrade?</p>
            <p className="text-sm text-muted-foreground">
              Your companions and memories are preserved. You just won&apos;t be able to create new companions beyond your plan limit.
            </p>
          </div>
          <div>
            <p className="font-medium">Do unused messages roll over?</p>
            <p className="text-sm text-muted-foreground">
              No, message limits reset daily at midnight UTC.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
