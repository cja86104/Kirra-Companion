import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  generateCharacterFromSeed,
  SEED_RELATIONSHIP_DEFAULTS,
} from '@/lib/companion/seed-character-generator';
import { extractCharacterMetadata } from '@/lib/companion/character-extractor';
import type { RelationshipType } from '@/types/companion';

/**
 * POST /api/companion/generate-from-seed
 *
 * Path 3 of the companion-creation flow. Takes a one-line seed plus a
 * relationship type, runs Call 1 (backstory generation) followed by Call 2
 * (structured metadata extraction), and returns the combined character data
 * for the create page to insert.
 *
 * This route does NOT write to the database — the create page handles row
 * inserts so all three creation paths share a single persistence layer.
 *
 * Rate limit: 10 calls per user per 24h. Half the generate-backstory limit
 * because each call here is two LLM calls.
 */

const RELATIONSHIP_TYPES = [
  'romantic',
  'friend',
  'family',
  'mentor',
  'custom',
] as const satisfies readonly RelationshipType[];

const SeedSchema = z.object({
  seed: z.string().trim().min(1).max(500),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
  /**
   * Optional. Used by the wizard's seed-mode Backstory step to lock the
   * already-entered companion name so the AI doesn't invent a different
   * one. The legacy standalone seed flow doesn't send this; the generator
   * falls back to inventing a name.
   */
  name: z.string().trim().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(user.id, 'generate-from-seed', 10, 86400);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', remaining: rateLimitResult.remaining, resetsAt: rateLimitResult.resetsAt },
        { status: 429 }
      );
    }

    const rawBody: unknown = await request.json();
    const parseResult = SeedSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { seed, relationshipType, name } = parseResult.data;

    // Call 1: seed → backstory. Throws on failure; we translate that into a
    // user-facing 502 so the create page can show a "try again" affordance.
    let backstory: string;
    try {
      backstory = await generateCharacterFromSeed({ seed, relationshipType, name });
    } catch (error) {
      console.error('Seed character generation failed:', error);
      return NextResponse.json(
        { error: 'Failed to generate character. Try again.' },
        { status: 502 }
      );
    }

    // Call 2: backstory → metadata. Never throws — returns FALLBACK_METADATA
    // on any internal failure, so the create flow can still complete with a
    // muted-but-valid character.
    const metadata = await extractCharacterMetadata(backstory);

    const defaults = SEED_RELATIONSHIP_DEFAULTS[relationshipType];

    console.log(`Seed character generated for user ${user.id}, relationship ${relationshipType}, backstory ${backstory.length} chars`);

    return NextResponse.json({
      backstory,
      name: metadata.name,
      personality_base: metadata.personality_base,
      interests: metadata.interests,
      quirks: metadata.quirks,
      opening_line: metadata.opening_line,
      affection_level: defaults.affection_level,
      trust_level: defaults.trust_level,
    });

  } catch (error) {
    console.error('Seed-character route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate character' },
      { status: 500 }
    );
  }
}
