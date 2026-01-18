import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, paymentFailedEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Use service role for webhooks since there's no user session
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map Stripe price IDs to tier names
const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRICE_BASIC_MONTHLY!]: 'basic',
  [process.env.STRIPE_PRICE_BASIC_YEARLY!]: 'basic',
  [process.env.STRIPE_PRICE_PRO_MONTHLY!]: 'pro',
  [process.env.STRIPE_PRICE_PRO_YEARLY!]: 'pro',
  [process.env.STRIPE_PRICE_ULTIMATE_MONTHLY!]: 'ultimate',
  [process.env.STRIPE_PRICE_ULTIMATE_YEARLY!]: 'ultimate',
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier;

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Update user's subscription tier
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_subscription_id: session.subscription as string,
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update profile after checkout:', error);
    throw error;
  }

  // Log the event
  await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action: 'subscription_created',
      details: {
        tier,
        session_id: session.id,
        subscription_id: session.subscription,
      },
    });

  console.log(`User ${userId} subscribed to ${tier}`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (profileError || !profile) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  // Get the price ID to determine tier
  const priceId = subscription.items.data[0]?.price.id;
  const tier = PRICE_TO_TIER[priceId] || 'free';

  // Update subscription status
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      stripe_subscription_id: subscription.id,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Failed to update subscription:', error);
    throw error;
  }

  console.log(`Updated subscription for user ${profile.id} to ${tier}`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (profileError || !profile) {
    console.error('Could not find user for customer:', customerId);
    return;
  }

  // Downgrade to free tier
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }

  // Log the event
  await supabase
    .from('audit_logs')
    .insert({
      user_id: profile.id,
      action: 'subscription_canceled',
      details: {
        subscription_id: subscription.id,
      },
    });

  console.log(`Subscription canceled for user ${profile.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Log successful payment
  await supabase
    .from('audit_logs')
    .insert({
      user_id: profile.id,
      action: 'payment_succeeded',
      details: {
        invoice_id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      },
    });

  console.log(`Payment succeeded for user ${profile.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Update subscription status
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id);

  // Log failed payment
  await supabase
    .from('audit_logs')
    .insert({
      user_id: profile.id,
      action: 'payment_failed',
      details: {
        invoice_id: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
      },
    });

  console.log(`Payment failed for user ${profile.id}`);

  // Send email notification about failed payment
  const emailContent = paymentFailedEmail({
    userName: profile.full_name || 'there',
    amount: invoice.amount_due,
    currency: invoice.currency,
    invoiceId: invoice.id,
  });

  const emailResult = await sendEmail({
    to: profile.email,
    ...emailContent,
  });

  if (!emailResult.success) {
    console.error(`Failed to send payment failed email to ${profile.email}:`, emailResult.error);
  }
}
