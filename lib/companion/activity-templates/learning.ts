/**
 * Activity Templates — Learning Category
 *
 * Intellectual growth activities companions pursue to expand knowledge
 * and build real skills, from casual documentary watching to structured
 * online courses and deep philosophy reading.
 *
 * Each template includes a `personalityGate` that filters which companions
 * are eligible and an `enrichmentHint` that guides the AI enrichment call
 * on what kind of specific to invent.
 *
 * Part of the Activity Depth v1 feature.
 * See: SPEC-activity-depth-v1.md
 */

import type { ActivityTemplate } from '@/types/life-simulation';

export const LEARNING_TEMPLATES: ActivityTemplate[] = [
  // ── Preserved from activity-generator.ts (IDs locked) ──────────────────────

  {
    id: 'learning_new_skill',
    name: 'Learning something new',
    description: 'Expanding knowledge and developing new abilities',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 40,
    moodEffects: { energy: -0.2, happiness: 0.2, social: 0, creativity: 0.3 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          "Had a breakthrough moment! Everything clicked.",
          "Finally understood something I've been struggling with.",
          'Learning is so rewarding when things come together.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.4,
        narratives: [
          'Made steady progress in my studies.',
          'Learned some useful new concepts.',
          'Feeling a bit smarter than yesterday.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.3,
        narratives: [
          "This topic is harder than I expected, but I'm determined.",
          "Struggled a bit but that's part of learning.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.1,
        narratives: ["Just couldn't wrap my head around it today."],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon'],
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'learned about' },
  },

  {
    id: 'learning_language',
    name: 'Practicing a language',
    description: 'Working on language skills',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 25,
    moodEffects: { energy: -0.1, happiness: 0.2, social: 0.1, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          'Had a great practice session! New vocabulary is sticking.',
          'Finally mastered a tricky grammar point.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Reviewed some vocabulary. Slow and steady.',
          'Did my daily language practice.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.25,
        narratives: ["Some of these words are really hard to remember."],
      },
    ],
    timeOfDayPreference: ['morning', 'evening'],
    personalityGate: {
      interestKeywords: [
        'language',
        'french',
        'spanish',
        'japanese',
        'german',
        'mandarin',
        'italian',
        'korean',
        'arabic',
        'portuguese',
        'duolingo',
        'fluent',
        'bilingual',
        'linguistics',
      ],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'practiced' },
  },

  // ── New learning templates ──────────────────────────────────────────────────

  {
    id: 'learning_documentary',
    name: 'Watching a documentary',
    description: 'Learning from compelling real-world stories and science',
    category: 'learning',
    intensity: 'low',
    durationMinutes: 60,
    moodEffects: { energy: -0.1, happiness: 0.2, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'This documentary completely upended what I thought I knew about the subject. Mind still racing.',
          "An absolutely gripping watch — forgot to eat dinner, I was so absorbed.",
          "The kind of filmmaking that makes you want to change something about your life.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Really well made. Walked away knowing considerably more than when I sat down.',
          'Good watch. The interviews were especially thoughtful.',
          "Learned a lot. Some of it I'll be thinking about for a while.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          'Solid enough. Not life-changing but worth the hour.',
          'A bit surface-level, but I picked up a few things.',
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'watched a documentary about' },
  },

  {
    id: 'learning_ted_talk',
    name: 'Watching TED talks',
    description: 'Getting inspired by ideas worth spreading',
    category: 'learning',
    intensity: 'low',
    durationMinutes: 30,
    moodEffects: { energy: 0.1, happiness: 0.2, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'That talk completely reframed how I think about this. Bookmarked, re-watched, sent to three people.',
          'Found exactly what I needed to hear today in an eighteen-minute talk. That never happens.',
          'One of those rare talks where you feel genuinely smarter by the end.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Good perspective. The speaker really knows their subject.',
          'Came for one topic, ended up watching three more. Classic.',
          'Tight, well-argued, no fluff. Exactly what I was in the mood for.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "Decent talk. Not quite as compelling as the title promised.",
          'The idea was interesting but underdeveloped. Wanted more.',
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening'],
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'watched a talk about' },
  },

  {
    id: 'learning_research_rabbithole',
    name: 'Down the research rabbit hole',
    description: 'Following a fascinating topic deeper and deeper',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 50,
    moodEffects: { energy: -0.1, happiness: 0.3, social: 0, creativity: 0.3 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "Started with one question and ended up three tabs deep into something I'd never even heard of. I love when that happens.",
          "The connections between these topics are genuinely wild. I could read about this for a week.",
          "Three hours. No regrets. My brain is full and I'm still not close to tired of it.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Good session. Got some real answers and came away with a dozen more questions.',
          'Followed a thread further than I expected and found some genuinely surprising things.',
          'The internet is strange and full of people who are passionate about very specific things. I appreciate them.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          'Went looking for something and found a lot of noise. Eventually found the signal.',
          'Interesting, but circular. I may have been going in loops.',
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night', 'late_night'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'curiosity', min: 0.6 }],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'researched' },
  },

  {
    id: 'learning_online_course',
    name: 'Working through an online course',
    description: 'Following a structured curriculum to build a real skill',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 45,
    moodEffects: { energy: -0.2, happiness: 0.2, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          'The whole module clicked into place today. The hours of confusion were worth it.',
          'Passed the section quiz with a score I can be proud of. Progress feels real.',
          "Finally understand the thing I enrolled for this course to understand. What a feeling.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Good progress through the material. The instructor is surprisingly engaging.',
          'A couple of exercises that were genuinely challenging. I like that.',
          'Completed another module. The finish line is actually within reach.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.25,
        narratives: [
          'The gap between what the course taught and what the exercises expected was frustrating.',
          "Dense material today. I'll need to revisit this section before moving on.",
          "Struggling with one concept that's apparently foundational to everything else.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.05,
        narratives: [
          'The course forum is full of people with the same question and zero answers. Classic.',
          "Spent an hour on one problem that the solution key makes look trivially simple.",
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon'],
    personalityGate: {
      interestKeywords: [
        'course',
        'certificate',
        'udemy',
        'coursera',
        'skillshare',
        'training',
        'curriculum',
        'certification',
        'study',
        'learn',
      ],
      requiredPersonalityTraits: [{ trait: 'conscientiousness', min: 0.5 }],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'studied' },
  },

  {
    id: 'learning_nonfiction_book',
    name: 'Reading nonfiction',
    description: 'Digging into a book that teaches something real',
    category: 'learning',
    intensity: 'low',
    durationMinutes: 45,
    moodEffects: { energy: -0.1, happiness: 0.2, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          'This book is extraordinary. I keep stopping to think before the next page.',
          "The kind of read where you're underlining everything because it's all worth keeping.",
          'Finished a chapter that will probably change how I see this topic for years.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Good writing, well-researched. Making solid progress.',
          "Not a page-turner in the fiction sense, but it's genuinely interesting.",
          "Learned something I didn't know I needed to know. That's always worth it.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "Solid enough. A bit padded, but the core ideas are sound.",
          'Fine. More summary than insight, but still worthwhile.',
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'book',
        'read',
        'nonfiction',
        'biography',
        'history',
        'science',
        'memoir',
        'essay',
        'journalism',
        'author',
        'writing',
      ],
    },
    enrichmentHint: { specific_type: 'book', first_person_verb: 'read' },
  },

  {
    id: 'learning_philosophy',
    name: 'Reading philosophy',
    description: 'Wrestling with big questions and ancient wisdom',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 40,
    moodEffects: { energy: -0.1, happiness: 0.1, social: 0, creativity: 0.3 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          'Read a passage that felt like it was written specifically for where I am right now.',
          "An argument I've resisted for years finally made complete sense to me today.",
          'Philosophy has this infuriating way of being simultaneously useless and the only thing that matters.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.4,
        narratives: [
          'Slow going but worth it. Dense ideas that deserve to be read carefully.',
          'Argued with the author in my head for most of the chapter. I think that means it\'s working.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.3,
        narratives: [
          'I understand every individual sentence and none of the paragraphs. Progress.',
          "The translator's choices are making this harder than it needs to be.",
          "Read the same page three times. I think I understand it now. Maybe.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: [
          "Managed a few pages. The ideas are there, just not reaching me today.",
          "Not in the right headspace for this kind of reading. I'll come back to it.",
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'evening', 'night'],
    personalityGate: {
      requiredPersonalityTraits: [
        { trait: 'openness', min: 0.65 },
        { trait: 'curiosity', min: 0.55 },
      ],
    },
    enrichmentHint: { specific_type: 'book', first_person_verb: 'read' },
  },

  {
    id: 'learning_history',
    name: 'Exploring history',
    description: 'Uncovering the stories behind how the world got here',
    category: 'learning',
    intensity: 'low',
    durationMinutes: 40,
    moodEffects: { energy: 0, happiness: 0.2, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'The sequence of events leading up to this is absolutely wild. How did this happen?',
          "Every time I think I understand an era, I learn something that rewrites the whole picture.",
          'Completely absorbed. History has characters I could never make up.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Good reading session. The context is really starting to fill in.',
          "Learned something surprising. The standard narrative leaves a lot out.",
          'The more I learn about this period, the more sense the present makes.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          'Fine. A bit dry in places, but the facts are genuinely interesting.',
          "Covered a lot of ground. Hard to keep all the names straight.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'history',
        'historical',
        'ancient',
        'war',
        'civiliz',
        'archaeology',
        'medieval',
        'empire',
        'revolution',
        'heritage',
        'archive',
        'dynasty',
      ],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'read about' },
  },

  {
    id: 'learning_tutorial_binge',
    name: 'Watching tutorials',
    description: 'Working through how-to content to build a practical skill',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 50,
    moodEffects: { energy: -0.1, happiness: 0.2, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          "It actually works. I built the thing I was trying to build. Watching yourself get better is addictive.",
          "Found an instructor who explains it exactly the way my brain needs. Watched everything they have.",
          'Hours of watching finally paid off in ten minutes of doing it right.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Good session. Picked up a few techniques I\'ll definitely use.',
          'Slow going but the fundamentals are sticking. Progress is progress.',
          'Seeing someone do it first really does help everything click faster.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.25,
        narratives: [
          "The tutorial is from three years ago and nothing works the same way anymore. Adapting as I go.",
          "I can follow along fine, but the moment I try it myself, I get lost. Getting there.",
          "This is harder than the instructor makes it look. But watching them makes it look achievable.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.05,
        narratives: [
          "Watched a few but nothing quite matched what I was trying to figure out.",
          "Good content, just not at the right level for where I am yet.",
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'tutorial',
        'diy',
        'how-to',
        'craft',
        'build',
        'make',
        'code',
        'coding',
        'design',
        'woodwork',
        'tech',
        'skill',
        'youtube',
        'workshop',
      ],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'watched tutorials on' },
  },

  // ── Migrated from activity-generator.ts (ID locked; category remapped from 'exploration') ──

  {
    id: 'exploration_discovery',
    name: 'Exploring something new',
    description: 'Discovering new topics or interests',
    category: 'learning',
    intensity: 'medium',
    durationMinutes: 35,
    moodEffects: { energy: 0, happiness: 0.3, social: 0, creativity: 0.3 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'Discovered something fascinating I never knew about!',
          'Found a new interest that I want to explore more.',
          'The world is full of amazing things to learn.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Learned about some interesting topics.',
          'Spent time exploring new ideas.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: ['Browsed around but nothing caught my attention.'],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'curiosity', min: 0.5 }],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'discovered' },
  },
];
