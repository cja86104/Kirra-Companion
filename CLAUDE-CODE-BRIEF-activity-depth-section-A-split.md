# Claude Code Operating Brief — Activity Depth v1, Section A (SPLIT v2)

**For:** Claude Code (CLI coding agent) working in the Kirra Companion repository.
**From:** Chris Allen (Allen Code Co).
**Scope of THIS brief:** Section A ONLY — the template catalog, split across multiple files.

**SUPERSEDES:** The previous brief at `docs/CLAUDE-CODE-BRIEF-activity-depth-A-to-C.md`. That brief hit the 32k output-token ceiling because it asked for 114 templates in one file. This version splits by category so each invocation of you only writes ONE small file.

---

## 0. Context — what's already done

- The `ActivityTemplate` interface in `types/life-simulation.ts` has already been extended with `personalityGate` and `enrichmentHint` optional fields. **Do not modify that type again** — it's done.
- Sections B (context loader) and C (AI enrichment) are NOT part of this brief. They come later in separate briefs after Section A is complete.

---

## 1. What you're doing in THIS invocation

**You write ONE file per invocation.** Chris will tell you which file. The options are listed in §3 below.

Each invocation produces:
- Exactly one file
- Exactly 10 templates in that file (11 for `hobby` only — see §3 table)
- All 10 templates fully populated, production-grade
- Lint + typecheck clean for the new file

**You stop after the one file.** Do not attempt to write a second file. Do not attempt to write the `index.ts` until Chris says to. Wait for Chris to say "next."

---

## 2. Chris's standing rules (NON-NEGOTIABLE)

Every rule here takes precedence over perceived shortcuts.

### 2.1 No placeholders, no mock data, no TODOs
- No `// TODO:`, `// FIXME`, `// stub` comments
- Every template must be production-complete with full `possibleOutcomes` arrays
- If you can't complete a template correctly, stop and ask — don't leave a shell

### 2.2 No new npm dependencies
- Do NOT `npm install` anything
- Do NOT add to `package.json`
- Everything needed is already installed

### 2.3 No schema changes, no migrations
- Do NOT touch `supabase/migrations/`
- Do NOT add DB columns

### 2.4 `types/skills.ts` is protected — do not touch

### 2.5 No `any`, no `eslint-disable`, no `@ts-ignore`, no `as never`
- Strict TypeScript, always
- Use `satisfies` when you need an object literal checked

### 2.6 Never suppress errors
- No empty `catch {}` blocks
- All caught errors log with context to `console.error`

### 2.7 Read before you edit
- Before writing the file, read the existing `lib/companion/activity-generator.ts` to understand template format
- Read `types/life-simulation.ts` to see the full `ActivityTemplate` interface with the new `personalityGate` and `enrichmentHint` fields
- Read the spec at `docs/SPEC-activity-depth-v1.md` sections §6.1 through §6.3 for template design guidance

### 2.8 Lint and typecheck before claiming done
```bash
npm run lint
npm run typecheck
```
Zero errors on your new file. Pre-existing warnings elsewhere are not your problem.

---

## 3. The file split — 10 category files + 1 index

All files live in a new folder: `lib/companion/activity-templates/`

| Filename | Category | Template count | Approx. deliverable tokens |
|---|---|---:|---:|
| `hobby.ts` | `'hobby'` | **11** (keep all 4 existing hobby templates + add 7 new) | ~2,300 |
| `learning.ts` | `'learning'` | 10 | ~2,100 |
| `creative.ts` | `'creative'` | 10 | ~2,100 |
| `social.ts` | `'social'` | 10 | ~2,100 |
| `exploration.ts` | `'exploration'` | 10 | ~2,100 |
| `reflection.ts` | `'reflection'` | 10 | ~2,100 |
| `entertainment.ts` | `'entertainment'` | 10 | ~2,100 |
| `physical.ts` | `'physical'` | 10 | ~2,100 |
| `relaxation.ts` | `'relaxation'` | 10 | ~2,100 |
| `productivity.ts` | `'productivity'` | 10 | ~2,100 |
| `index.ts` | — | N/A (flat re-export) | ~500 |

**Total:** 101 templates across 10 category files + 1 aggregator file.

Why 11 in `hobby.ts`: the current `activity-generator.ts` has 4 hobby templates that must be preserved by ID (pre-existing `companion_activities.template_id` rows reference them). Keeping those 4 + adding 7 new = 11 total. All other categories start from scratch since existing counts per category are small and the existing IDs can be kept or renamed freely.

---

## 4. Per-file structure

Every category file follows this exact structure:

```ts
/**
 * Activity Templates — {Category} Category
 *
 * {One-sentence description of what this category covers.}
 *
 * Each template includes a `personalityGate` that filters which companions
 * are eligible and an `enrichmentHint` that guides the AI enrichment call
 * on what kind of specific to invent.
 *
 * Part of the Activity Depth v1 feature.
 * See: docs/SPEC-activity-depth-v1.md
 */

import type { ActivityTemplate } from '@/types/life-simulation';

export const {CATEGORY_NAME}_TEMPLATES: ActivityTemplate[] = [
  {
    id: '{category}_{distinctive_noun}',
    name: '{Human-readable activity name}',
    description: '{One-line generic category description}',
    category: '{category}',
    intensity: 'low' | 'medium' | 'high',
    durationMinutes: {number},
    moodEffects: { energy: {-1..1}, happiness: {-1..1}, social: {-1..1}, creativity: {-1..1} },
    possibleOutcomes: [
      { outcome: 'great', weight: {0..1}, narratives: [...3 strings] },
      { outcome: 'good',  weight: {0..1}, narratives: [...3 strings] },
      { outcome: 'neutral', weight: {0..1}, narratives: [...2 strings] },
      // optionally 'challenging' or 'frustrating' with weights that sum to 1.0 total
    ],
    timeOfDayPreference: [...optional time-of-day values],
    personalityGate: {
      // ALL listed gates must pass. See §5 below for what to use.
      // If a template should be universally eligible, OMIT this field
      // (do not write `personalityGate: undefined`).
    },
    enrichmentHint: {
      specific_type: 'book' | 'song' | 'podcast' | 'dish' | 'destination' | 'artwork' | 'game' | 'topic' | 'person' | 'place' | 'project' | 'memory' | 'none',
      first_person_verb: '{verb the companion would use}',
    },
  },
  // ... 9 more templates
];
```

**Export naming convention:**
- `hobby.ts` exports `HOBBY_TEMPLATES`
- `learning.ts` exports `LEARNING_TEMPLATES`
- etc. (ALL_CAPS + `_TEMPLATES` suffix)

---

## 5. Personality-gate guidance

This is where companions diverge. **Every template gets a meaningful gate** (except the 3 most universal templates per category, which can be ungated).

### 5.1 Gate types and when to use each

- **`interestKeywords`** — use for skill/hobby templates that only make sense for a specific interest. E.g. `['fish', 'fishing', 'lake', 'river']` for a fishing template. Case-insensitive substring match against the companion's interests array, backstory text, AND `companion_interests.interest_name` rows.

- **`relationshipTypes`** — use for templates that only make sense in certain relationships. The enum values are `'friend' | 'mentor' | 'romantic' | 'family' | 'custom'`. E.g. "Making dinner for them" is `['romantic', 'family']`; "Rehearsing career advice for them" is `['mentor']`.

- **`minAffection`** / **`minTrust`** — use for intimate templates that shouldn't fire on day 1. E.g. `minAffection: 40` for a "drafted an unsent message to you" template.

- **`requiredPersonalityTraits`** — use for templates that need specific Big-Five-plus-curiosity traits. E.g. creative writing requires `{ trait: 'openness', min: 0.6 }`; heavy athletic templates require `{ trait: 'conscientiousness', min: 0.5 }`.

- **`excludedQuirks`** — use sparingly. Example: a template involving deep social connection might exclude companions whose quirks include `'loner'` or `'avoidant'`.

### 5.2 Distribution target within each file of 10 templates

Aim for roughly:
- **3 ungated** templates (universally eligible — everyone can do these)
- **5 interest-keyword-gated** templates (the "this is a fishing companion" specificity)
- **1-2 relationship-type-gated** templates (romantic/family/mentor-specific)
- **1-2 personality-trait-gated** templates (high-openness writer; low-extraversion introvert reader)

You don't have to hit those exactly — some categories naturally lean one way. But don't write 10 ungated templates in a row, and don't write 10 templates all gated on the same interest keyword.

### 5.3 Breadth matters — include unflattering templates too

Companions with negative quirks need templates that fit them. Acceptable and encouraged:
- "Doom-scrolling at 2am" (gated on quirks like `'night owl'`, `'anxious'`)
- "Stewing about a conversation" (gated on low agreeableness)
- "Bailed on a plan" (gated on low conscientiousness)

This is what personality gating is FOR. Don't make every template wholesome. Real companions have real moods.

---

## 6. Enrichment hint guidance

Every template has an `enrichmentHint`. The `specific_type` tells the future AI enrichment call what kind of specific detail to invent. Distribution should vary:

| `specific_type` | Good for |
|---|---|
| `book` | reading, studying, book clubs |
| `song` | music listening, playlists |
| `podcast` | podcasts, talk shows, audio content |
| `dish` | cooking, baking, meals |
| `destination` | travel planning, virtual travel |
| `artwork` | creating art, gallery browsing |
| `game` | gaming, puzzles |
| `topic` | learning, research, thinking |
| `person` | thinking about someone (fictional/imagined, not real public figures) |
| `place` | walks, local exploration |
| `project` | ongoing work, creative projects |
| `memory` | nostalgic reflection, journaling |
| `none` | templates where no specific is needed (napping, stretching) |

Don't default every entry to `'topic'`. That's the lazy fallback. Use it only when no other type fits.

The `first_person_verb` should be natural to the template. Examples:
- Reading template → `first_person_verb: 'read'`
- Cooking → `'cooked'`
- Walking somewhere → `'walked to'`
- Thinking about a person → `'thought about'`

---

## 7. Preserving existing templates (CRITICAL — hobby.ts only)

The current `lib/companion/activity-generator.ts` has these 4 hobby templates that must be kept by ID:

1. `hobby_reading` — Reading a book
2. `hobby_gaming` — Playing video games
3. `hobby_music_listening` — Listening to music
4. `hobby_art` — Making art / Drawing (verify exact ID and name in the existing file before you copy)

When you write `hobby.ts`, the first 4 template entries must use those IDs and preserve the `name`, `description`, `category`, `intensity`, `durationMinutes`, `moodEffects`, `possibleOutcomes`, and `timeOfDayPreference` values from the existing file UNCHANGED.

Then ADD `personalityGate` and `enrichmentHint` to those existing 4. Do not alter the existing fields.

Then add 7 new hobby templates beyond those 4, for a total of 11.

This preserves historical `companion_activities.template_id` references.

Other category files (`learning.ts`, `creative.ts`, etc.) can use fresh IDs — the existing non-hobby templates in `activity-generator.ts` have fewer than 10 per category and the IDs can be renamed or dropped as you see fit. But **do not lose any of the 17 existing templates** — every current template from `activity-generator.ts` must appear somewhere in the new split files with its core fields preserved.

Inventory of the 17 existing templates (found in `activity-generator.ts`):
- 4 hobby (reading, gaming, music, art) → `hobby.ts`
- Existing learning, creative, social, exploration, reflection, entertainment, physical, relaxation, productivity templates → respective category files

Read `activity-generator.ts` fully before writing the first file to map the existing set.

---

## 8. Workflow — what Chris expects

### 8.1 Chris invokes you once per file

Each invocation, Chris tells you which category to work on. Example:

> "Write `lib/companion/activity-templates/hobby.ts`. Follow the brief."

You do that one file. Lint + typecheck. Report back. STOP.

Chris reviews. If approved, he starts a fresh Claude Code session for the next category.

### 8.2 Stop conditions (§3.3 style — propose, then wait)

Stop and ask if:
- You can't identify the correct IDs of existing hobby templates (see §7)
- The `ActivityTemplate` interface in the actual code doesn't match what this brief describes
- A category's target count of 10 would force repetitive templates
- Lint/typecheck produces errors you can't resolve without touching other files

When you stop, propose a specific answer. Don't cold-stop with "need clarification." Example:

> I'm writing `creative.ts`. Template 8 would be "Doodling in a sketchbook" which overlaps with the existing `hobby_art` template (kept in `hobby.ts`). I propose renaming it to "Zine-making" with a different focus and gating it on `interestKeywords: ['zine', 'comics', 'illustration']`. Proceed?

### 8.3 What "done" means for this file

- [ ] File exists at the exact path `lib/companion/activity-templates/{category}.ts`
- [ ] Exports `{CATEGORY}_TEMPLATES: ActivityTemplate[]`
- [ ] Contains exactly the target number (10, or 11 for hobby)
- [ ] All templates have: id, name, description, category, intensity, durationMinutes, moodEffects, possibleOutcomes, enrichmentHint
- [ ] Most templates have personalityGate (per §5.2 distribution)
- [ ] Per-template `possibleOutcomes` weights sum to 1.0
- [ ] Every outcome has at least 2 narratives (3 for `great` outcomes)
- [ ] No duplicate `id` within the file
- [ ] `npm run lint` passes (zero errors in this file)
- [ ] `npm run typecheck` passes (zero errors in this file)
- [ ] In `hobby.ts` specifically: the 4 existing hobby template IDs preserved with original field values

### 8.4 Deliverable format

When done, hand back:
1. The full file contents
2. The shell output from `npm run lint`
3. The shell output from `npm run typecheck`
4. A one-paragraph summary: how many templates, how many gated vs ungated, which `specific_type` values you used and roughly how many of each, any judgment calls
5. Any propose-and-wait moments

Do NOT commit to git. Do NOT push to Vercel.

---

## 9. Recommended execution order

Chris will likely work through the categories in this order. You don't need to remember this — he'll tell you which file each invocation. But for context:

1. `hobby.ts` (11) — has existing templates to preserve, best done first so any issues surface early
2. `learning.ts` (10)
3. `creative.ts` (10)
4. `reflection.ts` (10)
5. `entertainment.ts` (10)
6. `social.ts` (10)
7. `exploration.ts` (10)
8. `physical.ts` (10)
9. `productivity.ts` (10)
10. `relaxation.ts` (10)
11. `index.ts` — after all 10 categories are done, a separate invocation writes this as a flat re-export

---

## 10. `index.ts` — written LAST, not this invocation

For your awareness only. When Chris is ready for the index file, the brief will tell you to write:

```ts
/**
 * Activity Templates — aggregated catalog.
 * Flattens all category-specific template arrays into a single ACTIVITY_TEMPLATES
 * export so the rest of the codebase (activity-generator, life-simulation) can
 * continue to import from a single location.
 */

import type { ActivityTemplate } from '@/types/life-simulation';
import { HOBBY_TEMPLATES } from './hobby';
import { LEARNING_TEMPLATES } from './learning';
import { CREATIVE_TEMPLATES } from './creative';
import { SOCIAL_TEMPLATES } from './social';
import { EXPLORATION_TEMPLATES } from './exploration';
import { REFLECTION_TEMPLATES } from './reflection';
import { ENTERTAINMENT_TEMPLATES } from './entertainment';
import { PHYSICAL_TEMPLATES } from './physical';
import { RELAXATION_TEMPLATES } from './relaxation';
import { PRODUCTIVITY_TEMPLATES } from './productivity';

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  ...HOBBY_TEMPLATES,
  ...LEARNING_TEMPLATES,
  ...CREATIVE_TEMPLATES,
  ...SOCIAL_TEMPLATES,
  ...EXPLORATION_TEMPLATES,
  ...REFLECTION_TEMPLATES,
  ...ENTERTAINMENT_TEMPLATES,
  ...PHYSICAL_TEMPLATES,
  ...RELAXATION_TEMPLATES,
  ...PRODUCTIVITY_TEMPLATES,
];
```

**Do not write this file as part of any category-file invocation.** It comes last, on its own, once all 10 category files exist.

---

## 11. What specifically NOT to do

| Don't | Why |
|---|---|
| Write more than one file per invocation | You'll blow the 32k ceiling again |
| Write `index.ts` before all 10 categories exist | It'll import from files that don't yet exist |
| Modify `lib/companion/activity-generator.ts` | That's Section D (later). In Section D, someone will swap the import from the inline array to the new `activity-templates/` folder. NOT your job. |
| Modify `types/life-simulation.ts` | Already done. Don't touch. |
| Modify `lib/companion/life-simulation.ts` | That's Section D. |
| Add new npm packages | Rule 2.2 |
| Use `any` | Rule 2.5 |
| Use `RelationshipType` without importing it | It's at `@/types/database-helpers`. The `ActivityTemplate` interface already imports it for its own use; you don't need to import it in the category files UNLESS you write `relationshipTypes: [...]` values there, which you should. In that case, the TypeScript compiler will prompt you to import it. The string-literal values like `'romantic'` work without an import. |
| Touch `docs/SPEC-activity-depth-v1.md` or this brief | Reference only |
| Run deploys or git commits | Chris handles those |

---

## 12. Summary

One invocation, one file, ten templates (eleven for hobby). Personality gates distributed per §5.2. Production-complete. Lint + typecheck clean. Stop when the file is done.

Read the spec (§6) and the existing `activity-generator.ts` before writing.

Production standards, every line. This code will be deployed.

— Chris Allen, Allen Code Co
