import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import type { Profile, ProfileUpdate } from '@/types/database';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });
}

// Price IDs mapping - set these in your environment variables
const PRICE_IDS: Record<string, Record<string, string>> = {
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_BASIC_YEARLY!,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  },
  ultimate: {
    monthly: process.env.STRIPE_PRICE_ULTIMATE_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_ULTIMATE_YEARLY!,
  },
};

const CheckoutSchema = z.object({
  priceId: z.enum(['basic', 'pro', 'ultimate']),
  billingPeriod: z.enum(['monthly', 'yearly']),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json();
    const parseResult = CheckoutSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { priceId, billingPeriod } = parseResult.data;

    const stripePriceId = PRICE_IDS[priceId][billingPeriod];
    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'Price not configured' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create Stripe customer
    const { data: profileData } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    const profile = profileData as Pick<Profile, 'stripe_customer_id' | 'email' | 'full_name'> | null;
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await getStripe().customers.create({
        email: user.email,
        name: profile?.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId } satisfies ProfileUpdate)
        .eq('id', user.id);
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          tier: priceId,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
