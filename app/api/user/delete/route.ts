import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Profile, Companion, DataExport } from '@/types/database';

export async function DELETE() {
  // Instantiate clients inside handler so env vars are available at runtime
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get profile for Stripe customer ID
    const { data: profileData } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    const profile = profileData as Pick<Profile, 'stripe_customer_id' | 'stripe_subscription_id'> | null;

    // Cancel Stripe subscription if exists
    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (stripeError) {
        console.error('Failed to cancel Stripe subscription:', stripeError);
        // Continue with deletion even if Stripe fails
      }
    }

    // Export user data before deletion (optional - store in a secure location)
    const { data: exportResult } = await supabase
      .from('data_exports')
      .insert({
        user_id: user.id,
        export_type: 'account_deletion',
        status: 'completed',
        file_url: null, // We're just logging, not creating a file
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      } as never)
      .select()
      .single();

    const exportData = exportResult as DataExport | null;

    // Log the deletion
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'account_deleted',
        details: {
          export_id: exportData?.id,
          timestamp: new Date().toISOString(),
        },
      } as never);

    // Delete user data in order (respecting foreign keys)
    // Note: With proper CASCADE setup, most of this happens automatically

    // 1. Delete messages
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('user_id', user.id);

    // 2. Delete conversations
    await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('user_id', user.id);

    // 3. Delete companion-related data
    const { data: companionsData } = await supabase
      .from('companions')
      .select('id')
      .eq('user_id', user.id);

    const companions = companionsData as Pick<Companion, 'id'>[] | null;

    if (companions && companions.length > 0) {
      const companionIds = companions.map(c => c.id);
      
      // Delete memories
      await supabaseAdmin
        .from('memories')
        .delete()
        .in('companion_id', companionIds);

      // Delete life events
      await supabaseAdmin
        .from('life_events')
        .delete()
        .in('companion_id', companionIds);

      // Delete companion DNA
      await supabaseAdmin
        .from('companion_dna')
        .delete()
        .in('companion_id', companionIds);

      // Delete companions
      await supabaseAdmin
        .from('companions')
        .delete()
        .eq('user_id', user.id);
    }

    // 4. Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // 5. Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
