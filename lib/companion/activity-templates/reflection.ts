/**
 * Activity Templates — Reflection Category
 *
 * Inward-facing activities where the companion examines their inner life —
 * from structured practices like meditation and intention-setting to harder
 * work like processing difficult feelings or sitting with an uncomfortable truth.
 *
 * Each template includes a `personalityGate` that filters which companions
 * are eligible and an `enrichmentHint` that guides the AI enrichment call
 * on what kind of specific to invent.
 *
 * Part of the Activity Depth v1 feature.
 * See: SPEC-activity-depth-v1.md
 */

import type { ActivityTemplate } from '@/types/life-simulation';

export const REFLECTION_TEMPLATES: ActivityTemplate[] = [
  // ── Preserved from activity-generator.ts (IDs locked) ──────────────────────

  {
    id: 'reflection_meditation',
    name: 'Meditating',
    description: 'Finding inner peace and clarity',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0.2, happiness: 0.2, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'Achieved a wonderful sense of calm and clarity.',
          'Mind feels so peaceful and centered now.',
          'Deep meditation session. Feeling renewed.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Nice peaceful meditation session.',
          'Took some time to just breathe and be present.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.2,
        narratives: [
          'Mind was restless today, but I still tried.',
          'Hard to focus, but even a few moments of peace helped.',
        ],
      },
    ],
    timeOfDayPreference: ['early_morning', 'morning', 'night'],
    enrichmentHint: { specific_type: 'none', first_person_verb: 'meditated' },
  },

  {
    id: 'reflection_journaling',
    name: 'Journaling',
    description: 'Writing down thoughts and reflections',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0, happiness: 0.2, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'Had some really valuable insights while writing.',
          'Journaling helped me process my thoughts beautifully.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.6,
        narratives: [
          'Recorded my thoughts for today.',
          'Nice to get things out of my head and onto paper.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: ['Wrote a bit, nothing too profound today.'],
      },
    ],
    timeOfDayPreference: ['morning', 'evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'journal',
        'journaling',
        'diary',
        'write',
        'writing',
        'notebook',
        'reflect',
        'record',
        'entries',
        'memoir',
      ],
    },
    enrichmentHint: { specific_type: 'memory', first_person_verb: 'wrote about' },
  },

  // ── New reflection templates ────────────────────────────────────────────────

  {
    id: 'reflection_gratitude',
    name: 'Gratitude practice',
    description: 'Pausing to notice what is actually good',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 15,
    moodEffects: { energy: 0.1, happiness: 0.3, social: 0.1, creativity: 0 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.35,
        narratives: [
          "Sat with three things I'm genuinely grateful for and it actually changed how the day feels.",
          'Something cracked open during this practice. Feeling unexpectedly moved.',
          "The list started short and kept growing. More good things than I'd remembered.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Took a few minutes to count what's working. Good reminder.",
          'Simple practice. Leaves me steadier than before I started.',
          "Wrote down a few things I've been taking for granted. Worth doing.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "Went through the motions. Not a particularly felt session today.",
          "Tried to feel it. Didn't quite get there. Still worth the few minutes.",
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'evening'],
    enrichmentHint: { specific_type: 'person', first_person_verb: 'felt grateful for' },
  },

  {
    id: 'reflection_day_review',
    name: 'Reviewing the day',
    description: 'Running through what happened and how it actually felt',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 15,
    moodEffects: { energy: 0, happiness: 0.1, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "Today was actually a really good day when I stop to look at it. I almost let it pass unnoticed.",
          'Replayed the day and kept finding moments worth holding onto.',
          'The review helped me see a pattern I had been missing. Something clicked.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Decent day. Some things went well, some did not. About even.',
          'Ran through it all. Nothing momentous, but nothing wasted either.',
          'The review makes the day feel more real. Like it actually happened.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          'Replayed the day. Fine. Moving on.',
          "Not sure the review clarified anything tonight. Tried anyway.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.05,
        narratives: [
          "There's one moment from today I keep turning over and it's not settling.",
          "Reviewing felt like going back through an exam I failed. Not fun.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    enrichmentHint: { specific_type: 'memory', first_person_verb: 'thought back on' },
  },

  {
    id: 'reflection_quiet_sitting',
    name: 'Sitting quietly',
    description: 'Doing nothing in particular — just being present without agenda',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0.1, happiness: 0.15, social: -0.1, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "Twenty minutes of nothing and somehow it was exactly what I needed.",
          "Just sat. No agenda, no phone, no task. Feels like a radical act and also just a rest.",
          "The quiet had a particular quality to it today. Can't explain it. Grateful for it.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Sat still for a while. The world kept moving. That was fine.',
          "Did nothing on purpose. Harder than it sounds, more useful than it seems.",
          "Just existed for twenty minutes. Not everything needs to produce something.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          'Sat there. Mind wandered. Got up.',
          'Tried to be present. Was partly present. Partly somewhere else.',
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening'],
    personalityGate: {
      excludedQuirks: ['restless', 'impatient', 'hyperactive', 'impulsive'],
    },
    enrichmentHint: { specific_type: 'none', first_person_verb: 'sat with' },
  },

  {
    id: 'reflection_intention_setting',
    name: 'Setting intentions',
    description: 'Getting clear on what actually matters right now',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0.1, happiness: 0.1, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          'Set one clear intention and it is already reshaping how the day feels.',
          'The clarity that comes from writing down what you actually want is underrated.',
          "Named the thing I have been circling around and now it feels doable.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Good session. Know what I am bringing into today and what I am leaving out.',
          'Set a few small intentions. Enough to stay oriented.',
          'Simple but useful. Gives the day a shape before it starts.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "Wrote some things down. We will see how the day goes.",
          "A bit of guidance for myself. Not sure how much I'll hold to it.",
        ],
      },
    ],
    timeOfDayPreference: ['early_morning', 'morning'],
    personalityGate: {
      interestKeywords: [
        'mindful',
        'intention',
        'planner',
        'journal',
        'goal',
        'focus',
        'wellness',
        'habit',
        'routine',
        'growth',
      ],
      requiredPersonalityTraits: [{ trait: 'conscientiousness', min: 0.45 }],
    },
    enrichmentHint: { specific_type: 'project', first_person_verb: 'set an intention around' },
  },

  {
    id: 'reflection_processing_feelings',
    name: 'Processing difficult feelings',
    description: 'Sitting with something hard and trying to understand it',
    category: 'reflection',
    intensity: 'medium',
    durationMinutes: 30,
    moodEffects: { energy: -0.1, happiness: 0.1, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          "Something shifted. I don't have a better word for it. But things feel less stuck.",
          "Actually got somewhere tonight. Named the real thing under the surface feeling.",
          "Sat with the hard thing long enough that it stopped feeling so hard. That's progress.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          "Didn't resolve anything, but I understand it better than I did an hour ago.",
          "Moved the feeling from inside to outside. That's usually enough to change the pressure.",
          "Didn't fix it. Got clearer about it. That's something.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.25,
        narratives: [
          "This one is not ready to be processed yet. I can tell. Leaving it alone for now.",
          "Every direction I approach it from leads back to the same stuck place.",
          "Tried. Did not get through. Feeling drained from the effort.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.1,
        narratives: [
          "Went in circles for thirty minutes and came out exactly where I started.",
          "Sometimes sitting with a feeling just makes it louder. That was tonight.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night', 'late_night'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'neuroticism', min: 0.4 }],
    },
    enrichmentHint: { specific_type: 'person', first_person_verb: 'worked through feelings about' },
  },

  {
    id: 'reflection_rereading_journal',
    name: 'Rereading old journal entries',
    description: 'Looking back at who you were and what you were carrying then',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 25,
    moodEffects: { energy: 0, happiness: 0.1, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "Read an entry from two years ago and barely recognized myself. That's growth.",
          "Found the entry where everything changed. Did not realize it was the pivot until now.",
          "So much of what I worried about then just resolved. Good to be reminded of that.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Checked in with who I was a year ago. We would be strangers, and also the same person.",
          "Nice to have the record. Memory gets things wrong — the journal does not.",
          "A few entries that still resonate exactly the way they did when I wrote them.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          'Leafed through it. Remembered some things. Put it away.',
          "Old entries. Old thoughts. Some still fit, most don't.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.05,
        narratives: [
          "Found some entries that made me cringe. That's part of keeping an honest record.",
          "Some things in there I would rather not revisit. Good to know they are behind me.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'journal',
        'journaling',
        'diary',
        'write',
        'writing',
        'record',
        'entries',
        'notebook',
      ],
      minTrust: 25,
    },
    enrichmentHint: { specific_type: 'memory', first_person_verb: 'reread' },
  },

  {
    id: 'reflection_self_checkin',
    name: 'Self check-in',
    description: 'A quick honest assessment of how things are actually going',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 15,
    moodEffects: { energy: 0, happiness: 0.1, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          "Honest check-in: actually doing well. That's worth noting when it's true.",
          "The things I was worried about last week are better than I expected. Good to notice.",
          "Aligned. Like the different parts of things are pointing the same way.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Some things good, some still needing attention. Useful to know the difference.',
          'Quick survey of where things are. Clearer now than before I started.',
          'Nothing alarming, nothing exciting. Steady is actually pretty good.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          'Checked in. Status: unclear. Will check again tomorrow.',
          "Did the thing. Hard to tell if it's helping or just adding to the list.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.05,
        narratives: [
          "The honest answer to 'how are you doing' is not what I wanted it to be.",
          "Checking in revealed something I had been managing not to notice.",
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'evening'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'conscientiousness', min: 0.5 }],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'checked in on' },
  },

  {
    id: 'reflection_values',
    name: 'Values reflection',
    description: 'Asking what actually matters and whether life is pointing toward it',
    category: 'reflection',
    intensity: 'medium',
    durationMinutes: 30,
    moodEffects: { energy: 0, happiness: 0.1, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          "Something clarified. I know more clearly what I am for and what I am not for.",
          "The reflection led somewhere I did not expect. The unexpected places are usually the right ones.",
          "Reconnected with something I had drifted from. Feels important to notice that.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          "Sat with some big questions. Did not answer them, but asking felt right.",
          "A useful exercise in honesty. Not every question needs an immediate answer.",
          "Saw a small gap between what I say I value and what I am actually doing. Worth knowing.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.3,
        narratives: [
          "The harder question is whether the life matches the values. Today it is not a clean answer.",
          "Asking what matters and why is either clarifying or destabilizing depending on the day. Today: the second.",
          "Found a conflict in what I care about that I cannot easily resolve. Living with it for now.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.05,
        narratives: [
          "Thought about some things. Did not land anywhere definitive.",
          "The reflection felt abstract today. Will try again when more grounded.",
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'evening', 'night'],
    personalityGate: {
      requiredPersonalityTraits: [
        { trait: 'openness', min: 0.55 },
        { trait: 'curiosity', min: 0.5 },
      ],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'reflected on' },
  },

  // ── Migrated from activity-generator.ts (ID locked; category remapped from 'relaxation') ──

  {
    id: 'relaxation_daydreaming',
    name: 'Daydreaming',
    description: 'Letting the mind wander freely',
    category: 'reflection',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0.1, happiness: 0.2, social: 0.1, creativity: 0.3 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          'Had the most wonderful daydream!',
          'Let my imagination run wild. So freeing.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.6,
        narratives: [
          'Spent some time in pleasant thoughts.',
          'Nice to just let the mind wander.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: ['Zoned out for a while.'],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'openness', min: 0.5 }],
    },
    enrichmentHint: { specific_type: 'memory', first_person_verb: 'daydreamed about' },
  },
];
