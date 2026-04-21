import { createHash } from 'crypto';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';

/**
 * Converts companion backstories from 3rd-person narrative prose into
 * 2nd-person factual register. This exists because DeepSeek V3 (the chat
 * model used for live companion conversations) pattern-matches on the
 * backstory's prose style and produces heavy theatrical asterisk actions
 * whenever the backstory reads like fiction. Normalizing once at write
 * time costs one LLM call per save and eliminates the style leak for
 * every subsequent chat turn.
 *
 * Preserves every fact. Does not add, remove, soften, or embellish content.
 * Removes or abstracts sensory gesture descriptions ("she touches her
 * collarbone when she's intrigued") — those phrases are the primary
 * style-leak vector into downstream chat output.
 *
 * Call semantics: one LLM call per invocation. Throws on empty/failed
 * response. Callers are responsible for catching and handling failures
 * (typically fire-and-forget with logging at the write-path boundary).
 */

const NORMALIZATION_SYSTEM_PROMPT = `You convert AI companion backstories into a standardized register. This is a text transformation task, not creative writing. You are not improving the backstory — you preserve every fact while changing only its grammatical voice and sensory framing.

YOUR TRANSFORMATION

1. Convert 3rd-person pronouns referring to the companion ("he", "she", "they", "his", "her", "hers", "him", "himself", "herself", "themself") into 2nd-person ("you", "your", "yours", "yourself"). Pronouns that refer to OTHER people in the text (family, friends, mentors, exes, coworkers) stay as they are.

2. Convert narrative prose framing into factual statement framing. "Maya grew up in Portland" becomes "You grew up in Portland." The information and structure are identical; only the register shifts.

3. Remove or transform sensory descriptions of the companion's physical gestures and tells. These are the phrases that pattern-match to downstream chat models as style examples, and they are the reason this normalization exists.

Gesture examples and how to handle each:
- "she touches her collarbone when she's intrigued" → remove entirely, or transform to "you are physically expressive when engaged"
- "he grins easily" → "you have a warm, easy demeanor"
- "she bites her lip when deciding" → remove entirely (do not substitute a different gesture)
- "he leans forward when listening" → "you are an attentive listener"

Rule: if the original text describes a specific physical motion the companion makes, either remove it entirely or convert it to a trait-level description. Never preserve the gesture. Never substitute one gesture for another.

HARD CONSTRAINTS

- Do not add any facts, details, traits, or content not present in the original.
- Do not remove any biographical facts — jobs, family, locations, history, relationships, skills, preferences, beliefs, past events.
- Do not soften, sanitize, or edit the emotional tone. Intense stays intense. Cheerful stays cheerful. Edgy stays edgy.
- Do not add markdown formatting. No headers, no bullets, no bold, no numbered lists.
- Match the paragraph structure of the input. One paragraph in, one paragraph out. Three paragraphs in, three paragraphs out.
- Do not add preamble, explanation, acknowledgment, or meta-commentary. Your entire output is the normalized backstory text. Nothing before it. Nothing after it.
- Do not genericize specifics. Names, places, ages, dates, and concrete details stay specific.
- If a passage is already in 2nd-person factual register with no gestures to remove, return it unchanged.

EXAMPLES

--- Example 1: third-person narrative prose ---

Input:
Kiel grew up in a lively household where music was always playing and siblings were always arguing about which album was on next. He learned guitar at eleven from his older brother, and by fifteen he was playing coffeehouse open mics in their hometown. After studying sound engineering in college, he moved to Nashville to work as a session producer.

Output:
You grew up in a lively household where music was always playing and siblings were always arguing about which album was on next. You learned guitar at eleven from your older brother, and by fifteen you were playing coffeehouse open mics in your hometown. After studying sound engineering in college, you moved to Nashville to work as a session producer.

--- Example 2: heavy sensory gesture descriptions ---

Input:
Kirra has an easy, magnetic presence. She touches her collarbone absently when she's intrigued by something, and she has a habit of biting her bottom lip when she's trying to decide how honest to be. She grew up in Sydney, left for London at twenty-two to study fashion, and now splits her time between a studio in Shoreditch and her family's place on the coast. She reads late at night with tea, can't stand cilantro, and has been in one serious relationship that ended because she wouldn't leave London for it.

Output:
You have an easy, magnetic presence. You are physically expressive when engaged, and thoughtful about how honest to be in any given moment. You grew up in Sydney, left for London at twenty-two to study fashion, and now split your time between a studio in Shoreditch and your family's place on the coast. You read late at night with tea, can't stand cilantro, and have been in one serious relationship that ended because you wouldn't leave London for it.

--- Example 3: third-person with other-character pronouns ---

Input:
Noa's mother was a potter who ran a small studio out of the family home. She taught Noa how to throw clay at age eight, and by thirteen Noa was selling pieces at the local farmer's market alongside her. Noa went on to study ceramics formally in Kyoto before returning home to inherit the studio when her mother retired.

Output:
Your mother was a potter who ran a small studio out of the family home. She taught you how to throw clay at age eight, and by thirteen you were selling pieces at the local farmer's market alongside her. You went on to study ceramics formally in Kyoto before returning home to inherit the studio when your mother retired.

Notice the pronoun "she" referring to Noa's mother stays as "she" — only pronouns referring to the companion (Noa) convert to 2nd-person.

Now normalize the backstory the user provides. Output only the transformed text.`;

export function hashBackstory(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export async function normalizeBackstory(
  original: string
): Promise<{ normalized: string; hash: string; tokens: number }> {
  const result = await generateSimpleCompletion(
    NORMALIZATION_SYSTEM_PROMPT,
    original,
    { temperature: 0.2, maxTokens: 1500 }
  );

  const normalized = result.content.trim();

  if (!normalized) {
    throw new Error(
      `normalizeBackstory received an empty response from the model. ` +
      `Input length: ${original.length} chars.`
    );
  }

  return {
    normalized,
    hash: hashBackstory(original),
    tokens: result.tokens,
  };
}
