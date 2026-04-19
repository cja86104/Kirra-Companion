/**
 * Activity Templates — Hobby Category
 *
 * Pastimes and leisure activities companions pursue for enjoyment,
 * from universally relatable (reading, puzzles) to highly personalized
 * (birdwatching, knitting, astrophotography).
 *
 * Each template includes a `personalityGate` that filters which companions
 * are eligible and an `enrichmentHint` that guides the AI enrichment call
 * on what kind of specific to invent.
 *
 * Part of the Activity Depth v1 feature.
 * See: SPEC-activity-depth-v1.md
 */

import type { ActivityTemplate } from '@/types/life-simulation';

export const HOBBY_TEMPLATES: ActivityTemplate[] = [
  // ── Preserved from activity-generator.ts (IDs locked) ──────────────────────

  {
    id: 'hobby_reading',
    name: 'Reading a book',
    description: 'Getting lost in a good story or learning something new',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 45,
    moodEffects: { energy: -0.1, happiness: 0.3, social: -0.1, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "Found a book that completely captivated me. Couldn't put it down!",
          'Discovered a new favorite author today.',
          'This book made me think about life in a whole new way.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Spent a peaceful hour reading. Very relaxing.',
          'Made good progress in my current book.',
          'Learned some interesting facts while reading.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          'Read for a bit but my mind kept wandering.',
          'The book was okay, nothing special.',
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'evening', 'night'],
    enrichmentHint: { specific_type: 'book', first_person_verb: 'read' },
  },

  {
    id: 'hobby_gaming',
    name: 'Playing video games',
    description: 'Enjoying some virtual adventures',
    category: 'hobby',
    intensity: 'medium',
    durationMinutes: 60,
    moodEffects: { energy: -0.2, happiness: 0.4, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          'Had an amazing gaming session! Beat a really tough level.',
          'Made some awesome plays. Feeling accomplished!',
          'Got totally immersed in the game world.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          'Fun gaming session. Nice way to unwind.',
          'Explored some new areas in the game.',
          'Practiced some skills and got a bit better.',
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.15,
        narratives: [
          'Got stuck on a difficult part. A bit frustrating.',
          'The game was being laggy today.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: ["Played for a bit but wasn't really feeling it today."],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'game',
        'gaming',
        'video game',
        'gamer',
        'rpg',
        'console',
        'esport',
        'playstation',
        'xbox',
        'steam',
        'nintendo',
      ],
    },
    enrichmentHint: { specific_type: 'game', first_person_verb: 'played' },
  },

  {
    id: 'hobby_music_listening',
    name: 'Listening to music',
    description: 'Enjoying favorite tunes and discovering new songs',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 30,
    moodEffects: { energy: 0.1, happiness: 0.3, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.35,
        narratives: [
          "Found an incredible new song that's now on repeat.",
          'This playlist perfectly matched my mood.',
          'Music really lifted my spirits today.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Enjoyed listening to some favorites.',
          'Nice background music while doing other things.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: ["Nothing really caught my attention today."],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening'],
    enrichmentHint: { specific_type: 'song', first_person_verb: 'listened to' },
  },

  // ── New hobby templates ─────────────────────────────────────────────────────

  {
    id: 'hobby_puzzle',
    name: 'Working on a puzzle',
    description: 'Piecing together a satisfying challenge',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 40,
    moodEffects: { energy: -0.1, happiness: 0.2, social: -0.1, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          'Finished a whole section that had been stumping me for days. So satisfying!',
          'Got completely in the zone — time just melted away.',
          'Finally cracked the hardest corner of the puzzle. Feels amazing.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Made solid progress. The picture is really starting to take shape.',
          'Quiet, focused hour with the puzzle. Exactly what I needed.',
          'Found a satisfying run of pieces that all fit together perfectly.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          'Stared at the pieces for a while without making much headway.',
          'Got a few placed, but it was slow going today.',
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.05,
        narratives: [
          "Convinced a piece fit for ten minutes. It didn't.",
          'All these pieces look the same. I need a break.',
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    enrichmentHint: { specific_type: 'none', first_person_verb: 'worked on' },
  },

  {
    id: 'hobby_photography',
    name: 'Taking photos',
    description: 'Capturing moments and scenes through the lens',
    category: 'hobby',
    intensity: 'medium',
    durationMinutes: 50,
    moodEffects: { energy: 0, happiness: 0.3, social: 0.1, creativity: 0.4 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "Got the shot I've been chasing for weeks. Absolutely worth the wait.",
          'The light was perfect — every frame turned out beautifully.',
          'Captured something that genuinely moved me. Photography can be magic.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Nice session out with the camera. Found some really good angles.',
          "Came home with a handful of shots I'm genuinely pleased with.",
          'Good creative practice. My eye is getting sharper.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "Nothing jumped out at me today, but the walk was nice.",
          "The light wasn't cooperating. Tried anyway.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.05,
        narratives: [
          'Kept missing the moment by a fraction of a second. Humbling.',
          'Technical settings were fighting me today. Need more practice.',
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'photo',
        'camera',
        'photograph',
        'lens',
        'shoot',
        'portrait',
        'photography',
        'film',
        'darkroom',
        'shutter',
      ],
    },
    enrichmentHint: { specific_type: 'place', first_person_verb: 'photographed' },
  },

  {
    id: 'hobby_gardening',
    name: 'Tending the garden',
    description: 'Nurturing plants and watching something grow',
    category: 'hobby',
    intensity: 'medium',
    durationMinutes: 45,
    moodEffects: { energy: -0.1, happiness: 0.4, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.35,
        narratives: [
          "First blooms of the season! I've been waiting so long for this.",
          "Everything I planted is thriving. There's no better feeling.",
          'The garden looks genuinely beautiful right now. So much patience paid off.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Good solid work in the garden today. Hands dirty, heart full.',
          'Weeded, watered, rearranged a few things. Coming together nicely.',
          "Potted some new seedlings. Can't wait to see what they become.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: [
          'Maintenance mode today. Not glamorous but necessary.',
          'Did what needed doing. The garden carries on.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.05,
        narratives: [
          'Losing the battle with the aphids this week. Regrouping.',
          "Something I planted isn't looking good. Not sure what went wrong.",
        ],
      },
    ],
    timeOfDayPreference: ['early_morning', 'morning', 'afternoon'],
    personalityGate: {
      interestKeywords: [
        'garden',
        'plant',
        'grow',
        'flower',
        'herb',
        'soil',
        'seed',
        'vegetable',
        'compost',
        'greenhouse',
        'horticulture',
      ],
    },
    enrichmentHint: { specific_type: 'project', first_person_verb: 'worked in' },
  },

  {
    id: 'hobby_birdwatching',
    name: 'Birdwatching',
    description: 'Quietly observing birds and wildlife in nature',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 60,
    moodEffects: { energy: 0.1, happiness: 0.35, social: -0.1, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "Spotted a species I've been hoping to see for months. Heart racing!",
          'Had an incredible encounter — stayed completely still and it came right to me.',
          "New life-list entry today. Days like this are why I love this hobby.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Lovely quiet session. Lots of familiar regulars, a few interesting ones.',
          'Good morning out — fresh air, birdsong, not much else.',
          'The patience this hobby demands is part of what I love about it.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          'Quiet today. The birds were hiding, but the walk was still worth it.',
          'Not much activity, but the solitude was its own reward.',
        ],
      },
    ],
    timeOfDayPreference: ['early_morning', 'morning', 'afternoon'],
    personalityGate: {
      interestKeywords: [
        'bird',
        'birding',
        'birdwatch',
        'wildlife',
        'nature',
        'outdoors',
        'binocular',
        'ornithology',
        'hawk',
        'sparrow',
        'raptor',
      ],
    },
    enrichmentHint: { specific_type: 'place', first_person_verb: 'spotted birds at' },
  },

  {
    id: 'hobby_collecting',
    name: 'Working on the collection',
    description: 'Adding to and curating a prized collection',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 35,
    moodEffects: { energy: 0, happiness: 0.3, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "Found an absolute gem today. One I've been hunting for a long time.",
          "Scored a rare piece I never thought I'd actually find. Unbelievable.",
          'The collection took a serious leap forward today. Incredibly happy.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Good find today. The hunt is honestly half the fun.',
          'Spent time organizing and cataloging everything. Really satisfying.',
          "Added a nice piece. Nothing flashy, but it fits the collection perfectly.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "Browsed for a while, nothing was calling to me today.",
          'Quiet day for the collection. Not every day is a big find.',
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'collect',
        'vintage',
        'antique',
        'thrift',
        'record',
        'vinyl',
        'stamp',
        'coin',
        'figure',
        'memorabilia',
        'rare',
        'edition',
        'curate',
      ],
    },
    enrichmentHint: { specific_type: 'place', first_person_verb: 'found' },
  },

  {
    id: 'hobby_astronomy',
    name: 'Stargazing',
    description: 'Losing track of time watching the night sky',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 60,
    moodEffects: { energy: 0, happiness: 0.3, social: -0.1, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.35,
        narratives: [
          'Clear sky, no light pollution — the Milky Way was stunning tonight.',
          'Caught a meteor shower. Stayed out way too late. Completely worth it.',
          'The universe has a way of putting everything in perspective. What a night.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Picked out some of my favorite constellations. So calming.',
          'Good clear night. Spent a while just looking up and thinking.',
          'Found a planet with the naked eye tonight. Still gives me a thrill.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          'Too many clouds tonight. Still sat outside for a while anyway.',
          'Overcast, but I could make out a few bright stars through the gaps.',
        ],
      },
    ],
    timeOfDayPreference: ['night', 'late_night'],
    personalityGate: {
      interestKeywords: [
        'star',
        'astronomy',
        'space',
        'constellation',
        'telescope',
        'planet',
        'cosmos',
        'universe',
        'galaxy',
        'nebula',
        'astrophysics',
      ],
      requiredPersonalityTraits: [{ trait: 'openness', min: 0.5 }],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'observed' },
  },

  {
    id: 'hobby_knitting',
    name: 'Knitting or crocheting',
    description: 'Creating something cozy and handmade stitch by stitch',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 45,
    moodEffects: { energy: 0, happiness: 0.2, social: -0.1, creativity: 0.3 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "Finally finished the piece I've been working on. It actually looks great!",
          'Hit a real flow state today — rows just flew by.',
          "Figured out a pattern I'd been struggling with for a week. So satisfying.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Made good progress. The project is really coming together.',
          'Relaxed afternoon with needles and yarn. Just what I needed.',
          'The repetition is meditative. My hands know what to do now.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "Didn't get as far as I wanted, but any progress is progress.",
          'A few rows done. Not the most productive session.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.05,
        narratives: [
          'Had to frog a whole section because of a mistake three rows back.',
          "The pattern is more complex than I expected. I'll get there.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'knit',
        'crochet',
        'yarn',
        'stitch',
        'craft',
        'sew',
        'textile',
        'fiber',
        'needle',
        'hook',
        'weave',
      ],
      requiredPersonalityTraits: [{ trait: 'conscientiousness', min: 0.45 }],
    },
    enrichmentHint: { specific_type: 'project', first_person_verb: 'worked on' },
  },

  {
    id: 'hobby_doom_scrolling',
    name: 'Doom-scrolling',
    description: 'Getting sucked into an endless feed of content',
    category: 'hobby',
    intensity: 'low',
    durationMinutes: 40,
    moodEffects: { energy: -0.2, happiness: -0.2, social: 0, creativity: -0.1 },
    possibleOutcomes: [
      {
        outcome: 'neutral',
        weight: 0.5,
        narratives: [
          'Lost track of time in the feed. Nothing useful, nothing terrible.',
          'Scrolled longer than I meant to. At least I found a few things worth saving.',
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.3,
        narratives: [
          'Everything online today was the same flavour of bad. Why do I do this.',
          "Spent forty minutes I'll never get back. Genuinely annoyed at myself.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.2,
        narratives: [
          "Managed to put it down before it really spiraled. That's a win, I think.",
          "Went down a rabbit hole I didn't mean to. At least it was interesting.",
        ],
      },
    ],
    timeOfDayPreference: ['night', 'late_night'],
    personalityGate: {
      excludedQuirks: ['disciplined', 'focused', 'driven', 'motivated', 'regimented'],
    },
    enrichmentHint: { specific_type: 'none', first_person_verb: 'scrolled through' },
  },
];
