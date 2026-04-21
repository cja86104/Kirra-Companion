import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  normalizeBackstory,
  hashBackstory,
} from '@/lib/companion/backstory-normalizer';
import type { CompanionUpdate } from '@/types/database';

/**
 * Normalizes a companion's backstory from 3rd-person narrative prose into
 * 2nd-person factual register and persists the result into
 * companions.backstory_normalized / backstory_normalized_hash.
 *
 * Called from:
 *   - The companion create flow (sync, right after DNA upsert, before the
 *     user is redirected to the chat page).
 *   - The backstory edit flow (Section 4) on re-save.
 *
 * Behavior:
 *   - Authenticated. RLS scopes .select() and .update() to the caller's own
 *     companions.
 *   - Idempotent. If the current backstory text's hash already matches
 *     backstory_normalized_hash AND backstory_normalized is non-null, this
 *     returns early without hitting the LLM.
 *   - Empty backstory is a no-op (returns 200 with status 'skipped').
 *   - Normalizer failures and DB write failures are logged and surface as
 *     500 so callers can decide whether to block the user or fall back.
 *     The create flow in app/companion/create/page.tsx is wired to
 *     soft-fail — the companion is still created on 500 here.
 *
 * Rate limit: 30 normalizations per user per 24h. Generous for the expected
 * call pattern (once at create, occasionally on edit) but low enough to
 * throttle obvious abuse.
 */

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawParams = await params;
    const parsedParams = ParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: 'Invalid companion id' },
        { status: 400 }
      );
    }
    const { id: companionId } = parsedParams.data;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(
      user.id,
      'normalize-backstory',
      30,
      86400
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          remaining: rateLimit.remaining,
          resetsAt: rateLimit.resetsAt,
        },
        { status: 429 }
      );
    }

    const { data: companion, error: fetchError } = await supabase
      .from('companions')
      .select('id, backstory, backstory_normalized, backstory_normalized_hash')
      .eq('id', companionId)
      .single();

    if (fetchError || !companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    const backstory = companion.backstory;

    if (!backstory || !backstory.trim()) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'Companion has no backstory to normalize',
      });
    }

    const currentHash = hashBackstory(backstory);
    if (
      companion.backstory_normalized &&
      companion.backstory_normalized_hash === currentHash
    ) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'Backstory already normalized for current text',
        hash: currentHash,
      });
    }

    const result = await normalizeBackstory(backstory);

    const updatePayload: CompanionUpdate = {
      backstory_normalized: result.normalized,
      backstory_normalized_hash: result.hash,
    };

    const { error: updateError } = await supabase
      .from('companions')
      .update(updatePayload)
      .eq('id', companionId);

    if (updateError) {
      console.error(
        'normalize-backstory update error:',
        JSON.stringify(updateError, null, 2)
      );
      return NextResponse.json(
        { error: 'Failed to save normalized backstory' },
        { status: 500 }
      );
    }

    console.log(
      `Backstory normalized for companion ${companionId} (${result.tokens} tokens)`
    );

    return NextResponse.json({
      status: 'normalized',
      tokens: result.tokens,
      hash: result.hash,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('normalize-backstory route error:', message);
    return NextResponse.json(
      { error: 'Failed to normalize backstory' },
      { status: 500 }
    );
  }
}
