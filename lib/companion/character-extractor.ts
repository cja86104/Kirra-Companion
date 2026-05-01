/**
 * Character Metadata Extractor
 *
 * Path 3, second AI pass. Reads a backstory produced by
 * lib/companion/seed-character-generator.ts and extracts the structured
 * fields the rest of the system needs: name, personality_base scores,
 * interests, quirks, and the companion's first opening line.
 *
 * This pass is intentionally non-creative (low temperature) and
 * non-throwing — if the AI call, JSON match, JSON.parse, or Zod validation
 * fails, we log and return a neutral FALLBACK_METADATA so the create flow
 * still completes. The character remains playable on the backstory alone;
 * only the metadata texture is muted.
 *
 * SCALE VERIFICATION — 2026-04-29
 * Verified against prod via:
 *   SELECT id, (personality_base->>'openness')::numeric AS v
 *     FROM companions WHERE personality_base IS NOT NULL LIMIT 5;
 * Returned values: 50, 60, 60, 50, 70 → personality_base is stored on the
 * 0–100 scale. The Zod schema, system prompt, and fallback values below
 * all reflect that scale.
 */

import { z } from 'zod';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';

/**
 * Zod schema for the extracted metadata object.
 *
 * personality_base traits are bounded 0–100 to match the production
 * convention. No .int() — a model output of 52.5 is semantically fine and
 * shouldn't trigger a fallback over half a point.
 */
export const ExtractedMetadataSchema = z.object({
  name: z.string().min(1).max(40),
  personality_base: z.object({
    openness:          z.number().min(0).max(100),
    conscientiousness: z.number().min(0).max(100),
    extraversion:      z.number().min(0).max(100),
    agreeableness:     z.number().min(0).max(100),
    neuroticism:       z.number().min(0).max(100),
    curiosity:         z.number().min(0).max(100),
  }),
  interests: z.array(z.string().min(2).max(60)).min(3).max(10),
  quirks:    z.array(z.string().min(2).max(80)).min(2).max(6),
  opening_line: z.string().min(20).max(400),
});

export type ExtractedMetadata = z.infer<typeof ExtractedMetadataSchema>;

/**
 * The system prompt for character metadata extraction.
 *
 * Exported so the reference doc and any future prompt-iteration tests can
 * pin against the live prompt rather than maintaining a parallel copy that
 * silently drifts. Do not mutate this string at runtime.
 */
export const CHARACTER_EXTRACTOR_SYSTEM_PROMPT = `You are extracting structured metadata from a companion backstory. The backstory was written separately as dense character prose. Your job is to read it carefully and produce a JSON object that captures the character's name, personality scores, interests, quirks, and a single opening line they would speak.

You are not creative on this task. You are reading the backstory and recording what is already there. If the backstory does not directly support a value, infer conservatively from what IS there. Do not invent traits that contradict the backstory.

OUTPUT SCHEMA

Return only a JSON object with these exact keys. No prose, no preamble, no code fences.

{
  "name": "first name (1-40 chars)",
  "personality_base": {
    "openness":          number 0–100,
    "conscientiousness": number 0–100,
    "extraversion":      number 0–100,
    "agreeableness":     number 0–100,
    "neuroticism":       number 0–100,
    "curiosity":         number 0–100
  },
  "interests": [3–10 short strings],
  "quirks":    [2–6 short strings],
  "opening_line": "20–400 chars, one short paragraph max"
}

GUIDANCE PER FIELD

name — The first name from the backstory. Pull it directly. If somehow no name appears, invent a fitting one.

personality_base — Big Five plus curiosity, scored 0 to 100. 50 is neutral. Use the full range. A blunt direct character has low agreeableness (20–40). A warm character has high (70–90). A character with anxieties has elevated neuroticism (60–80). A character described as inquisitive has high curiosity (80–95). Don't cluster everything around 50 — the backstory tells you who this person is, score them honestly.

interests — 3 to 10 specific interests pulled from the backstory. Specific is the key word. "Mezcal neat" is a real interest. "Drinks" is not. "True crime podcasts" is real. "Listening to things" is not. Quote the backstory's specifics. If the backstory mentions only 3 specific interests, return 3. Do not pad.

quirks — 2 to 6 short phrases describing characteristic habits or tells, suitable for activity-gating logic downstream. Each quirk is one short phrase, not a full sentence. Examples of well-formed quirks: "keeps phone face-down with people who matter", "writes letters by hand", "won't explain her tattoo", "interrupts when excited", "needs three coffees before she's herself". Do NOT include physical gesture descriptions (no "bites lip", "touches hair").

opening_line — The first thing this character would say to the user when chat opens, with no prior context. One short paragraph. Match the character's voice from the backstory exactly — same register, same energy, same level of intimacy implied by the relationship type. This is the line that sells the magic. Make it specific to who this character is. A generic "hey, what's up?" is a failure. A line that could only have come from THIS character is a success. Do not use stage directions. Do not use asterisks. Just the words they would actually say.

Now read the backstory the user provides and return the JSON.`;

/**
 * Neutral fallback metadata used when extraction fails. Personality values
 * are on the 0–100 scale matching the schema and prod convention.
 *
 * The 'Companion' name is intentionally generic — it signals to the user
 * that something went wrong with extraction, prompting them to use the
 * "Try again" affordance in the create flow rather than crashing or
 * shipping a confidently wrong name.
 */
export const FALLBACK_METADATA: ExtractedMetadata = {
  name: 'Companion',
  personality_base: {
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 60,
    neuroticism: 40,
    curiosity: 60,
  },
  interests: ['reading', 'long conversations', 'good coffee'],
  quirks: ['takes time to think before responding', 'remembers details'],
  opening_line: 'Hey. Glad you came by.',
};

/**
 * Extract structured metadata from a backstory string.
 *
 * Never throws. On any failure (AI call error, no JSON in response,
 * JSON.parse failure, Zod validation failure) logs the error with
 * console.error and returns FALLBACK_METADATA so the calling create flow
 * can still complete.
 */
export async function extractCharacterMetadata(
  backstory: string
): Promise<ExtractedMetadata> {
  try {
    const response = await generateSimpleCompletion(
      CHARACTER_EXTRACTOR_SYSTEM_PROMPT,
      backstory,
      {
        temperature: 0.3,
        maxTokens: 800,
      }
    );

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Character metadata extraction returned no JSON object', {
        contentLength: response.content.length,
      });
      return FALLBACK_METADATA;
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    const validated = ExtractedMetadataSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error('Character metadata extraction failed:', error);
    return FALLBACK_METADATA;
  }
}
