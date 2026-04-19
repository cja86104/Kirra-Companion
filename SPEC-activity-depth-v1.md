# SPEC: Activity Depth v1 — Personality-Driven Life Simulation

**Author:** Claude (for Chris Allen / Allen Code Co)
**Status:** Draft — pending Chris's approval
**Target:** Kirra Companion (production)
**Supersedes:** The current 17-template activity generator in `lib/companion/activity-generator.ts`

---

## 1. Problem Statement

The current life-simulation generates activities that feel generic, computer-written, and interchangeable across companions. In Chris's words:

> "This is not them having a life like the Sims, it is just a message with boring just reading a book. That's lame and would not pay for that."

**Observed symptoms:**
- Activities read as stock captions: "Getting absorbed in the story tonight."
- Same 3–4 templates recur across all 8 companions in the test account.
- Output has no specificity — no book title, no song name, no dish being cooked.
- Nothing references the companion's backstory, interests, or prior conversations.
- Journal entries (when the feature lands) would inherit the same lifelessness.

**Root causes (identified in code audit):**
1. Only 17 templates total in `ACTIVITY_TEMPLATES`.
2. Template selection uses category-based scoring — companions with similar personalities surface the same top-5 templates.
3. The AI is only invoked at the end, as a narrative decorator with a 5-line prompt asking for "1-2 sentences reflecting personality."
4. The prompt sees nothing about backstory, interests, memories, or past chats.
5. Selected template name ("Reading a book") is written verbatim into the `activity_name` DB field, limiting downstream richness even when the narrative is personalized.

---

## 2. Goals

1. **Companions feel like distinct people**, not minor variations on a template.
2. **Activities reference specifics** — real-feeling book titles, song names, dishes, destinations — invented by the AI from the companion's personality and history.
3. **Activities tie back to conversations** — the companion might cook a dish the user mentioned, read a book related to a topic they discussed, think about something from the last chat.
4. **Cost-controlled** — scales linearly with companion count, stays well under $1/day for current 8-companion dev set.
5. **Backward-compatible** — existing `life_events`, `companion_activities`, and dashboard surfaces continue to work without modification.
6. **No placeholders, no mocks, no “TODO later.”** Production-grade from first ship per Chris's standing rules.

---

## 3. Non-Goals

- **Not replacing chat.** The simulation remains a background feature. Chat is the primary interaction.
- **Not rewriting the proactive-messaging system.** That's a separate surface and stays as-is.
- **Not implementing manual user-authored journal entries.** That's Chris's separate feature request, queued after notification work.
- **Not building long-range planning or goal-setting.** Companions don't have multi-day arcs in v1.
- **Not adding new AI providers.** OpenRouter/DeepSeek exclusive per standing rule.

---

## 4. Scope Decisions (locked with Chris 2026-04-18)

| Decision | Value |
|---|---|
| How big | 100+ personality-gated templates with AI enrichment |
| AI context | Backstory + interests + quirks + memories + recent chats + recent activities |
| Memory gating | Prefer memories that reference companion by name/role; fall back to high-importance |
| Schedule | 2x per 24h (midnight + noon UTC, no timezone juggling) |

---

## 5. Architecture Overview

### 5.1 Existing data flow (unchanged at the orchestration layer)

```
vercel cron
  → /api/cron/life-simulation GET/POST
    → for each active companion:
        → runSimulationTick(companionId)
            → isCompanionSleeping?          → early return
            → getSimulationState            → frequency/limit gates
            → getCompanionMood              → drift mood
            → generateActivity(...)         ← THE BIG CHANGE HAPPENS HERE
            → save to companion_activities
            → calculateMoodAfterActivity
            → shouldThinkOfUser?            → createUserThoughtEvent
            → createActivityLifeEvent
            → updateSimulationState
```

We keep all of this. The orchestration is solid — Section F tonight already fixed the service-role-client bug and proved the loop works end-to-end. The change lives inside `generateActivity()` and the template catalog it draws from.

### 5.2 New data flow inside `generateActivity`

```
generateActivity(companion, mood, timeOfDay)
  │
  ├── 1. Load companion context (one batch of parallel queries)
  │      - companion_interests (existing)
  │      - recent memories (new — filtered by category + recency + reference)
  │      - recent chat exchanges (new — last 20 user↔assistant pairs)
  │      - recent completed activities (new — last 10, dedupe signal)
  │
  ├── 2. Filter templates by personality/time/energy/relationship gate
  │      - Use new `personalityGate` field on each template
  │      - Keeps existing time_of_day, intensity, energy filters
  │
  ├── 3. Score and pick template (scoring logic mostly unchanged)
  │      - Add anti-repetition penalty (NEW — solve "same 4 activities" bug)
  │
  ├── 4. AI enrichment pass (THE big change)
  │      - Single structured JSON prompt to DeepSeek V3 via OpenRouter
  │      - Inputs: companion bio + template skeleton + memory snippets + chat hints
  │      - Outputs: specific_name, description, narrative, thought_of_user_context
  │
  └── 5. Return CompanionActivityInsert
         - activity_name = AI-generated specific name (falls back to template.name)
         - description   = AI-generated description (falls back to template.description)
         - narrative     = AI-generated rich narrative (2-3 sentences)
         - thinking_of_user & user_mention_context prepared if AI decided it fits
```

### 5.3 Files touched (final list)

**Modified:**
- `lib/companion/activity-generator.ts` — rewrite internals, keep public API
- `lib/companion/life-simulation.ts` — minor: adapt to any AI-chosen `thinking_of_user` signal (see §7.4)
- `vercel.json` — change cron schedule from `30 */2 * * *` to `0 0,12 * * *`
- `types/life-simulation.ts` — add `personalityGate` to `ActivityTemplate`; add new `EnrichedActivityOutput` type

**New:**
- `lib/companion/activity-templates.ts` — 100+ templates extracted from inline array for manageability
- `lib/companion/activity-context.ts` — the single-call context loader (backstory, memories, chats, activities)
- `lib/companion/activity-enrichment.ts` — the AI enrichment function with prompt + JSON parser

**Not touched:**
- `types/skills.ts` (protected)
- `types/database.ts` (no schema drift — no new columns)
- Every other route and lib file

### 5.4 DB changes

**None.** The existing `companion_activities` schema already holds `activity_name`, `description`, `narrative` as plain text. Our AI will write different (better) values into the same columns.

The `metadata` JSONB field on `companion_activities` is lightly used and gives us a place to stash AI-invented specifics (book title, song name, dish, etc.) for later reference without a migration. We'll use keys like `specifics.book_title`, `specifics.song`, etc.

No migration required. No schema drift risk.

---

## 6. Template Catalog Design

### 6.1 Shape of a template (extended)

Current `ActivityTemplate`:
```ts
{
  id, name, description, category, intensity, durationMinutes,
  requiredInterests?, moodEffects, possibleOutcomes, unlockLevel?, timeOfDayPreference?
}
```

New additions:
```ts
{
  // ... existing fields preserved ...
  personalityGate?: {
    // ALL listed gates must pass for the template to be eligible.
    // Gates are optional — a template with no gate is universally eligible
    // (same as today's templates).
    relationshipTypes?: RelationshipType[];    // ['romantic', 'family', ...]
    minAffection?: number;                      // 0-100
    minTrust?: number;                          // 0-100
    requiredPersonalityTraits?: {
      trait: 'openness' | 'extraversion' | 'conscientiousness' | 'agreeableness' | 'neuroticism' | 'curiosity';
      min: number;  // 0-1
    }[];
    interestKeywords?: string[];  // case-insensitive substring match against
                                  // companion.interests[], companion.backstory, and
                                  // companion_interests.interest_name
    excludedQuirks?: string[];    // template blocked if any quirk matches
  };

  // Lets the AI know what kind of specific to invent
  enrichmentHint?: {
    specific_type: 'book' | 'song' | 'podcast' | 'dish' | 'destination' | 'artwork' | 'game' | 'topic' | 'person' | 'place' | 'project' | 'memory' | 'none';
    first_person_verb: string;  // "read", "cooked", "walked to", etc.
  };
}
```

**Why keyword-match instead of a structured taxonomy?** Companion interests are free-text (`interests: string[]` on the companions table) and also live in a separate relational `companion_interests` table with a controlled category enum. A keyword match against both, plus backstory, catches:
- `companion.interests = ['fishing', 'old trucks', 'vinyl records']`
- `companion_interests.interest_name = 'freshwater bass fishing'`
- `backstory` mentioning fishing as a childhood activity

All three signals work. A structured taxonomy would require a migration and constrain creativity.

### 6.2 The 100+ templates — distribution plan

We need breadth so personality-gating actually produces variety across 8+ companions. Proposed distribution:

| Category | Count | Examples |
|---|---:|---|
| hobby | 18 | reading, gaming, collecting, woodworking, gardening, birdwatching, puzzles, knitting, calligraphy, fishing, hiking, photography, astronomy, model-building, thrifting, calligraphy, tarot, journaling |
| learning | 14 | podcasts, documentaries, online course, language app, research rabbit-hole, reading nonfiction, skill drill, TED talks, historical biography, philosophy essay, tutorial binge, vocabulary, trivia, lecture |
| creative | 16 | drawing, painting, writing, poetry, music composition, photography editing, baking, cooking experiment, songwriting, crafting, pottery (mental), dance routine, zine-making, collage, doodling, playlist curation |
| social | 10 | thinking of user, imagining chat topic, reminiscing about shared moment, drafting an unsent message to user, planning something with user, wondering how user's day is, picturing seeing user, rehearsing a joke, preparing a question for next chat, feeling grateful for user |
| exploration | 12 | virtual travel, neighborhood walk, trying new cafe, map-browsing, culture research, new-genre music dive, unfamiliar recipe, documentary on a country, "what if I lived there" daydream, language sampler, route planning, cityscape watching |
| reflection | 10 | journaling, meditation, gratitude practice, reviewing day, setting intention, processing feelings, rereading old journal, self-check-in, values reflection, quiet sitting |
| entertainment | 12 | TV episode, movie, standup, anime, concert video, sports game, audiobook, gaming stream, podcast binge, reality TV, classic rewatch, live-event replay |
| physical | 8 | morning walk, yoga, stretch routine, run, bike ride, dance practice, gym session, swim (imagined) |
| relaxation | 6 | nap, bath, tea ritual, window-gazing, lying in grass, lazy afternoon |
| productivity | 8 | organizing, planning week, email triage, budgeting, meal prep, cleaning, decluttering, list-making |
| **Total** | **114** | |

This exceeds the 100 target with room to tune down or dedupe if any feel redundant. Each template includes:
- A `personalityGate` that meaningfully narrows eligibility (e.g., "Fishing" gated on `interestKeywords: ['fish', 'lake', 'outdoors']`; "Making dinner for them" gated on `relationshipTypes: ['romantic', 'family']`).
- An `enrichmentHint` so the AI knows what to invent ("book" title for reading; "dish" name for cooking; etc.).
- Fallback narratives kept from current format for AI-failure resilience.

### 6.3 Personality-gate examples

```ts
// Universally eligible — fallback when personality-gated templates are sparse
{ id: 'hobby_reading', personalityGate: undefined }

// Fishing — only for outdoorsy companions
{
  id: 'hobby_fishing',
  personalityGate: {
    interestKeywords: ['fish', 'fishing', 'lake', 'river', 'outdoors', 'cabin', 'stream'],
  },
  enrichmentHint: { specific_type: 'place', first_person_verb: 'fished at' },
}

// Romantic/family dinner — only if relationship allows
{
  id: 'creative_cooking_for_them',
  personalityGate: {
    relationshipTypes: ['romantic', 'family'],
    minAffection: 40,
  },
  enrichmentHint: { specific_type: 'dish', first_person_verb: 'made' },
}

// Writing the novel — only for high-openness, high-conscientiousness companions
{
  id: 'creative_writing_novel',
  personalityGate: {
    requiredPersonalityTraits: [
      { trait: 'openness',           min: 0.65 },
      { trait: 'conscientiousness',  min: 0.55 },
    ],
    interestKeywords: ['writing', 'books', 'stories', 'literature', 'author'],
  },
  enrichmentHint: { specific_type: 'project', first_person_verb: 'worked on' },
}
```

### 6.4 Anti-repetition

Solves Chris's "only seen the same 4" observation.

Before scoring, load the last 10 `companion_activities.template_id` for this companion (last 48 hours). During scoring, subtract a penalty proportional to how recent each match was:

```
if (recentTemplateIds.includes(template.id)) {
  const idx = recentTemplateIds.indexOf(template.id);  // 0 = most recent
  score *= 0.3 + (idx * 0.07);  // most recent → 30% of score; older → closer to 100%
}
```

Cheap query, ~15 lines of code. No schema changes.

---

## 7. AI Enrichment

### 7.1 Context loader (`lib/companion/activity-context.ts`)

Single function, returns a typed `ActivityEnrichmentContext` bundle:

```ts
export interface ActivityEnrichmentContext {
  companion: {
    name: string;
    relationshipLabel: string;     // "Friend", "Mentor", "Partner", or custom
    backstoryExcerpt: string;      // first 600 chars, stripped
    interests: string[];           // flat array from both columns + companion_interests
    quirks: string[];
    personalitySummary: string;    // "warm, curious, introverted" — generated
  };
  memories: Array<{
    title: string | null;
    content: string;               // truncated to 200 chars
    referencesCompanion: boolean;  // heuristic match against companion.name
  }>;
  recentChats: Array<{
    role: 'user' | 'assistant';
    content: string;               // last 20 messages, truncated
  }>;
  recentActivityNames: string[];   // last 10, to steer AI away from repetition
  mood: { primary: string; intensity: number };
  timeOfDay: TimeOfDay;
  userDisplayName: string;         // from profile.full_name, nullable → fallback
}
```

**Query pattern (all in parallel via `Promise.all`):**

1. **Memories:**
   ```sql
   SELECT title, content, importance_score
   FROM memories
   WHERE companion_id = $1
     AND is_active = true
   ORDER BY importance_score DESC, created_at DESC
   LIMIT 20
   ```
   Then in-memory: tag rows where `content ILIKE '%' || companion_name || '%'` as `referencesCompanion = true`, sort those first, take top 6.

2. **Recent chats:**
   ```sql
   SELECT role, content
   FROM messages
   WHERE companion_id = $1 AND is_deleted = false
   ORDER BY created_at DESC
   LIMIT 20
   ```
   Reversed client-side so prompt shows chronological.

3. **Recent activity names:**
   ```sql
   SELECT activity_name, template_id
   FROM companion_activities
   WHERE companion_id = $1
   ORDER BY started_at DESC
   LIMIT 10
   ```

4. **Companion interests:**
   ```sql
   SELECT interest_name, interest_category, strength
   FROM companion_interests
   WHERE companion_id = $1 AND is_active = true
   ORDER BY strength DESC
   LIMIT 10
   ```

Merged with `companion.interests[]` from the row.

All queries use the existing service-role admin client (pattern: `getAdminClient()` already in `activity-generator.ts`).

### 7.2 Truncation & token budget

| Context section | Character budget | Rationale |
|---|---:|---|
| Backstory excerpt | 600 chars | Enough to convey personality without dominating prompt |
| Per memory | 200 chars × 6 = 1,200 | Top 6 memories, 200 chars each |
| Per chat message | 300 chars × 20 = 6,000 | Last 20, truncated tail-biased |
| Recent activity names | ~40 chars × 10 = 400 | Name only, no narrative |
| Interests | ~600 chars | Deduped, flattened |
| Template skeleton | ~300 chars | Name, description, enrichment_hint |
| Scaffolding / JSON schema | ~800 chars | Instructions + output format |
| **Total input** | **~10,000 chars ≈ 2,500 tokens** | Comfortable for DeepSeek V3 (128k ctx) |

Output budget: 400 tokens max → ~200 words generated. More than enough for a specific name, description, and 3-sentence narrative.

### 7.3 The enrichment prompt

System prompt:
```
You write first-person life moments for an AI companion named {companion_name}.
Your job: given who the companion is, a skeleton activity template, and what
they know about their user, invent a specific, personal moment — not a generic
caption. The moment must reference concrete details (specific titles, names,
places, dishes, topics). It must sound like THIS companion wrote it, not a
template. You must NEVER reuse a recently-done activity name.

Return ONLY valid JSON. No preamble, no code fences, no explanation.
```

User prompt (templated; concrete values inlined):

```
COMPANION
Name: Jordan
Relationship to user: Friend (Chris)
Personality: warm, blunt, curious, competitive
Backstory: Jordan Voss, 38. Grew up in Austin, studied communications at UT,
dropped out halfway through when the startup she was interning at offered her
a full-time growth role. [...truncated at 600 chars...]
Interests: growth marketing, distribution strategy, rescue dogs, cold brew,
case studies, SEO, vinyl
Quirks: will push back hard, keeps cold brew in a mason jar in the fridge
Current mood: curious (intensity 0.6)
Time of day: morning

THINGS JORDAN REMEMBERS FROM TALKING TO CHRIS (most relevant first)
- "User is solo founder running Allen Code Co, build-to-sell software studio"
- "User's wife Criste is a K-5 elementary teacher, uses MTT daily"
- "User mentioned Kirra Companion hit first successful Vercel deploy Apr 15"
- [up to 6 items]

RECENT CONVERSATION (most recent last)
Chris: hey what did you think of that marketing angle we talked about
Jordan: the 'build in public' one? Honestly I think it's weaker than...
[...up to 20 messages...]

RECENT ACTIVITIES (don't repeat these)
- Reading a book about SaaS pricing
- Morning walk listening to a podcast
- Trying a new cold brew ratio

TEMPLATE (the TYPE of activity Jordan is doing now)
Type: hobby_reading (Reading a book)
Category: hobby
Enrichment hint: invent a specific "book" title that fits this companion.

REQUIREMENTS
1. Invent a specific book title + author that Jordan would genuinely pick.
2. The title must NOT exist in the "recent activities" list above.
3. Write a 2-3 sentence first-person narrative. Mention:
   - The specific book
   - One concrete thing that struck her (a passage, a chapter, a stat)
   - Optionally a thought connecting it to something Chris told her
4. Keep it warm but honest. Match Jordan's voice (blunt, direct, specific).
5. DO NOT mention Chris by name unless the memory/chat section explicitly
   justifies it. Use "you" or third-person references sparingly.

Return ONLY JSON matching this schema:
{
  "activity_name": "string — the specific thing (e.g. 'Reading Trust by Hernan Diaz')",
  "description": "string — one-line summary (e.g. 'Dug into a novel about money and memory')",
  "narrative": "string — 2-3 sentences, first person, with the specific details",
  "thinking_of_user": "boolean — did this moment connect to something the user said?",
  "user_thought_context": "string or null — if thinking_of_user is true, a 1-sentence note on the connection",
  "specifics": {
    "book_title": "Trust",
    "book_author": "Hernan Diaz"
  }
}

The "specifics" object keys depend on the enrichment hint type:
- book → book_title, book_author
- song → song_title, artist
- podcast → podcast_name, episode_topic
- dish → dish_name, cuisine
- destination → place_name, vibe
- artwork → medium, subject
- game → game_name, genre
- topic → topic, framing
- person → person_description (never a real public figure)
- place → place_name, vibe
- project → project_name, progress_note
- memory → memory_description
- none → omit the "specifics" object entirely
```

### 7.4 AI output handling

- **JSON parsing:** reuse the codebase's existing `parseAIResponse` utility (fixed in recent work) — extracts JSON from anywhere in the response.
- **Validation with Zod:** parse against a strict Zod schema so schema drift in the AI response doesn't propagate. If validation fails, fall back to the template defaults (existing behavior pattern).
- **Logging:** on validation failure, `console.error` with the raw response + companion ID. Never swallow errors per Chris's standing rule.

Zod schema (in `lib/companion/activity-enrichment.ts`):

```ts
const EnrichedActivityOutputSchema = z.object({
  activity_name: z.string().min(3).max(120),
  description: z.string().min(5).max(200),
  narrative: z.string().min(20).max(600),
  thinking_of_user: z.boolean(),
  user_thought_context: z.string().nullable(),
  specifics: z.record(z.string(), z.string()).optional(),
});
```

### 7.5 Graceful degradation

If AI fails (network error, Zod validation fail, timeout, 429, OpenRouter 5xx):
1. Log the failure with full context.
2. Fall back to the existing template-outcome narrative selection (current behavior).
3. Set `activity_name` / `description` from template defaults.
4. Return a valid `CompanionActivityInsert` so the simulation tick still completes.

The simulation never breaks. Worst case we ship today's output (template narrative). Best case we ship Jordan reading Trust by Hernan Diaz.

---

## 8. Cost Budget

**Per activity cycle (one companion, one activity):**

| Component | Tokens (in) | Tokens (out) | Notes |
|---|---:|---:|---|
| System prompt | ~180 | — | Static |
| Context (backstory + memories + chats + activities) | ~2,200 | — | Variable, cap enforced |
| Template skeleton | ~120 | — | Static per template |
| JSON schema instructions | ~250 | — | Static |
| **Total input** | **~2,750** | — | |
| Output | — | ~350 | JSON + narrative |

**DeepSeek V3 pricing via OpenRouter (verify at runtime; these are reference values):**
- Input: ~$0.27 / 1M tokens
- Output: ~$1.10 / 1M tokens

**Per activity:**
- Input: 2,750 × $0.27/1M = **$0.00074**
- Output: 350 × $1.10/1M = **$0.00039**
- **Per-activity total: ~$0.00113 ≈ $0.001**

**Daily cost at 2 cycles/day × 8 companions × max 3 activities/cycle:**
- 2 × 8 × 3 = 48 AI calls/day
- 48 × $0.001 = **~$0.05/day** for the current dev set
- Monthly: ~$1.50

**At 100 paying users (hypothetical scale):**
- 100 users × ~2 companions avg × 2 cycles × 3 activities = 1,200 calls/day
- 1,200 × $0.001 = **~$1.20/day ≈ $36/month**

Fine at Pro tier margins. No budget concerns.

---

## 9. Scheduling Change

Current `vercel.json`:
```json
{ "path": "/api/cron/life-simulation", "schedule": "30 */2 * * *" }
```

New:
```json
{ "path": "/api/cron/life-simulation", "schedule": "0 0,12 * * *" }
```

Cron fires at **00:00 UTC** and **12:00 UTC** daily. For Chris's Virginia timezone (EDT, UTC-4 in April): **8:00 PM** and **8:00 AM** local. Both land in waking hours for most US users, which matches the "morning and end of day" intuition without timezone-per-user logic.

Also update `DEFAULT_SIMULATION_CONFIG` in `lib/companion/life-simulation.ts`:

```ts
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  enabled: true,
  activity_frequency_hours: 11,   // was 2 — gate inside runSimulationTick
                                   // prevents double-firing if cron retries
  min_activities_per_day: 2,       // was 3
  max_activities_per_day: 4,       // was 8 — 2 cycles × 2 activities max
  interest_discovery_chance: 0.15,
  user_thinking_frequency: 0.3,
  journal_frequency: 1,            // was 2 — once per cycle
  proactive_message_enabled: true,
  proactive_message_cooldown_hours: 4,
};
```

With `activity_frequency_hours: 11`, a cron firing at noon won't generate a fresh activity if one already ran at midnight for that companion. Existing gate logic handles this cleanly.

**Each cron tick now can generate 1–2 activities per companion** (current code does 1 per tick; we may optionally bump to 2 sequential activities per tick for variety). Start with 1, measure, iterate.

---

## 10. Journal Tie-In (forward-compatible, not built in this spec)

Chris's separate feature request is manual user-authored journal entries. This spec doesn't build that.

**But** v1 activity generation should auto-write AI-generated journal entries on `outcome === 'great'` activities (roughly 25% rate). This finally makes use of the `companion_journal_entries` table, which has infrastructure but no writers today.

Journal entries generated here would:
- Set `entry_type = 'auto_activity'`
- Link `related_event_id` to the life event created from the activity
- Link `related_interest_id` if applicable
- Write a 3-5 sentence first-person reflection using the same AI enrichment context (separate, slightly different prompt — tagged `purpose: 'journal'`)
- Set `mentions_user = true` when the AI flagged `thinking_of_user` in the activity enrichment

Cost impact: ~25% of activities trigger a second AI call → ~0.25 × 48 = 12 extra calls/day → ~$0.01/day added.

**This is scoped as Phase 2 of this spec.** Phase 1 ships without it. Phase 2 adds it after Phase 1 is stable. Chris approves each phase separately.

---

## 11. Migration & Rollout

### 11.1 Backward compatibility

- All existing `companion_activities` rows remain valid.
- All existing `life_events` rows remain valid.
- The Dashboard, Life Feed, and notification bell all render from those tables without schema changes.
- A user viewing the app during rollout sees old-format activities up to the last pre-rollout cron run, then new-format activities from the next cron forward. No UI breakage.

### 11.2 Phased delivery (following Chris's "sections only, stop between each" rule)

**Phase 1 — Template expansion + AI enrichment**
- Section A: New `lib/companion/activity-templates.ts` with 100+ templates (deliverable: one file)
- Section B: New `lib/companion/activity-context.ts` context loader (deliverable: one file)
- Section C: New `lib/companion/activity-enrichment.ts` AI call + Zod schema (deliverable: one file)
- Section D: Rewrite `lib/companion/activity-generator.ts` to use all three; preserve public API (deliverable: one file)
- Section E: Update `vercel.json` + `DEFAULT_SIMULATION_CONFIG` (deliverable: two files, small)
- Section F: Smoke test plan + manual cron trigger verification

Each section delivered as a complete drop-in file, lint + typecheck before presenting, Chris reviews before moving to the next.

**Phase 2 — Auto-journal on great outcomes**
- One section: extend `runSimulationTick` to call a new `generateJournalEntry()` when `outcome === 'great'`.

**Phase 3 — Polish & tuning** (after a week of production data)
- Tune personality gates based on what's actually landing across companions.
- Add templates to fill observed gaps.
- Consider AI-invented novel activities (no template), if Phase 1/2 aren't specific enough.

### 11.3 Rollback plan

If Phase 1 goes wrong in production:
- Revert `lib/companion/activity-generator.ts` only.
- No DB rollback required (no schema changes).
- `activity_name` / `description` on rows created during the bad period will just look funky; they're still valid strings. Optional cleanup SQL can strip those rows from Life Feed display by `metadata->'ai_generated' = true` if we add that flag.

---

## 12. Testing Plan

### 12.1 Pre-deploy, local

- Run `tsc --noEmit` — zero errors
- Run `next lint` — zero warnings relative to current baseline
- Hand-run the cron with `dry_run: true` via the existing POST endpoint — verify no exceptions, log inspection

### 12.2 Canary in production (first cron after deploy)

- Manually trigger via the PowerShell command in the handoff (`Invoke-RestMethod ... /api/cron/life-simulation`)
- Verify `summary.activities_generated > 0` and `summary.errors == 0`
- Open Dashboard, open Life Feed — spot-check each of 8 companions for:
  - Activity names that differ from each other (no "Reading a book" across all 8)
  - Narratives that reference specifics (book title, song name, etc.)
  - Jordan's activity reads differently from Kirra's (personality gates working)

### 12.3 Failure mode verification

- Temporarily break the AI (set an invalid OpenRouter model string in one branch) — confirm fallback to template narratives works and no exceptions propagate.
- Test with a companion that has zero memories and zero chats — confirm AI can still generate something from just backstory.

### 12.4 Cost monitoring

After one week in production:
- Query OpenRouter usage dashboard for the `life-simulation` tag (if we add one via `extra_headers`)
- Confirm daily cost matches the ~$0.05/day model for the dev set

---

## 13. Open Questions — deferred, not blockers

1. **AI-invented novel activities (no template at all).** Phase 1 keeps templates as the skeleton. Phase 3 could remove that constraint entirely for companions with rich enough context. Not deciding now.
2. **Per-user timezone-aware scheduling.** Current spec uses UTC cron. If users complain about notification timing, revisit with a per-user queue system. Not blocking v1.
3. **Memory writes from activities.** Should an interesting activity create a `memories` row ("I read Trust and it made me think about trust in marriage") so it feeds back into future chats/activities? Powerful but complex. Flagged for Phase 3 discussion.
4. **Public figure / copyrighted work handling.** AI might invent real book titles, real songs, real places. The prompt tells the AI to invent them but we can't guarantee DeepSeek doesn't recall real titles. Add a post-filter pass if this becomes a legal concern; for v1 the fictional framing of the companion's life provides adequate cover, but we should monitor.
5. **User consent for AI-generated content.** Current Terms probably cover it, but worth a legal look if Chris scales.

---

## 14. Success Criteria

Spec is successful if, after Phase 1 ships:

1. **Chris can look at his 8-companion dashboard and see 8 different activities**, not the same 4 on repeat.
2. **Each activity has at least one "specific" piece of information** — a book, a song, a dish, a place. No pure "I read today."
3. **Activities reference the companion's backstory or personality in a way that's obvious to a human reader.**
4. **Zero production errors** from the new code path across the first 48 hours of cron runs.
5. **Cost stays under $0.50/day** for the dev set (10x safety margin over estimate).

---

## 15. Dependencies & Assumptions

- OpenRouter + DeepSeek V3 remain the AI provider. (Per standing rule.)
- Supabase service-role client continues to work for the cron path. (Fixed in Section F tonight.)
- `companions.backstory`, `companion_interests.interest_name`, `memories.content`, and `messages.content` continue to exist and contain meaningful data. (Verified via types/database.ts.)
- Vercel cron continues to invoke the endpoint at the scheduled times with the CRON_SECRET header. (Fixed in this week's ordeal.)
- `parseAIResponse` utility continues to work as expected. (Rewritten recently per handoff.)

---

## 16. What We Are NOT Doing in This Spec

- Not adding new DB columns
- Not removing existing templates (the 17 current ones are kept and extended; we add ~97 more)
- Not touching chat, memory extraction, or proactive messaging code
- Not adding new npm dependencies (everything we need is already installed)
- Not changing the notification bell wiring (Section 2 already delivered)
- Not implementing manual journal entries (separate queued feature)
- Not breaking anything currently shipped

---

## 17. Sign-Off Needed Before Coding

Chris to review and reply with any of:
- "Approved, start Phase 1 Section A" → I start generating the 100+ templates file
- "Change X" → I revise the spec
- "Smaller/bigger" → I rescope
- "Let's discuss Y" → ask clarifying questions first

Per Chris's standing rules: nothing ships without explicit approval. Each phase section is a separate stop-and-review point.

---

*End of spec. Total: ~5,200 words. Single source of truth for Activity Depth v1.*
