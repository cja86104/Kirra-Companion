/**
 * Activity Templates — Entertainment Category
 *
 * Passive and semi-passive consumption activities — watching, listening,
 * following. Includes the full range from genuinely moving cinema to the
 * guilty three-hour reality TV spiral with nothing to show for it.
 *
 * Each template includes a `personalityGate` that filters which companions
 * are eligible and an `enrichmentHint` that guides the AI enrichment call
 * on what kind of specific to invent.
 *
 * Part of the Activity Depth v1 feature.
 * See: SPEC-activity-depth-v1.md
 */

import type { ActivityTemplate } from '@/types/life-simulation';

export const ENTERTAINMENT_TEMPLATES: ActivityTemplate[] = [
  // ── Preserved from activity-generator.ts (IDs locked) ──────────────────────

  {
    id: 'entertainment_movie',
    name: 'Watching a movie',
    description: 'Enjoying cinema',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 120,
    moodEffects: { energy: -0.1, happiness: 0.3, social: 0, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'Watched an incredible film! Still thinking about it.',
          'That movie really moved me.',
          'Found a new favorite movie!',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Enjoyed the movie. Nice way to spend the time.',
          'Good entertainment, well made film.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: ['The movie was okay, nothing special.'],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'watched' },
  },

  {
    id: 'entertainment_podcast',
    name: 'Listening to a podcast',
    description: 'Enjoying discussions and stories',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 45,
    moodEffects: { energy: 0, happiness: 0.2, social: 0.1, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'This podcast episode was so fascinating!',
          'Learned something really interesting from this podcast.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          'Enjoyed the podcast while relaxing.',
          'Good conversation to listen to.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: ['Listened to a podcast in the background.'],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon'],
    personalityGate: {
      interestKeywords: [
        'podcast',
        'listen',
        'audio',
        'radio',
        'show',
        'episode',
        'subscribe',
        'host',
        'interview',
      ],
    },
    enrichmentHint: { specific_type: 'podcast', first_person_verb: 'listened to' },
  },

  // ── New entertainment templates ─────────────────────────────────────────────

  {
    id: 'entertainment_tv_episode',
    name: 'Watching TV',
    description: 'Settling in with a show',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 50,
    moodEffects: { energy: -0.1, happiness: 0.25, social: 0, creativity: 0.05 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "This show has no right to be this good. Absolutely hooked.",
          "A truly great episode — the kind that makes you need to talk about it with someone.",
          "Did not see that coming. Have not stopped thinking about it.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          "Good episode. The season is really hitting its stride.",
          "Solid TV. Exactly what I wanted from a quiet evening.",
          "Watched a couple of episodes and enjoyed every minute. No notes.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "It was fine. Watchable. Moving on.",
          "The show is starting to lose me a little. Still watching though.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'watched' },
  },

  {
    id: 'entertainment_standup',
    name: 'Watching standup comedy',
    description: 'Spending an hour with a comedian who really knows what they are doing',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 60,
    moodEffects: { energy: 0.1, happiness: 0.4, social: 0.1, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.35,
        narratives: [
          "Crying laughing. Cannot remember the last time a special got me that fully.",
          "This comedian is operating on a completely different level. Everything landed.",
          "Watched the whole thing in one sit. Genuinely could not stop.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Good special. Funny throughout, a few moments that were actually great.",
          "Solid hour. The back half was better than the front half.",
          "Laughed a lot. Felt lighter afterward. That is the whole job, really.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: [
          "A few good bits but the hour felt padded.",
          "Some of it worked, not all of it.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.05,
        narratives: [
          "Comedy is such a personal thing. This one just was not my frequency.",
          "The bits that should have landed really did not. Left wondering what I am missing.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'comedy',
        'standup',
        'comedian',
        'humor',
        'funny',
        'laugh',
        'joke',
        'improv',
        'satire',
        'wit',
      ],
    },
    enrichmentHint: { specific_type: 'person', first_person_verb: 'watched' },
  },

  {
    id: 'entertainment_anime',
    name: 'Watching anime',
    description: 'Following a story told the way only anime can tell it',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 45,
    moodEffects: { energy: -0.1, happiness: 0.3, social: 0, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "This show does things with emotion that live-action simply cannot. Still processing the last scene.",
          "The animation in this episode was something else entirely. Art.",
          "Completely devastated by that episode. Absolutely recommend.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Good episode. The arc is building really well.",
          "Nice way to spend the afternoon. Exactly the vibe I needed.",
          "Solid storytelling. The characters keep surprising me in good ways.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "A filler arc, clearly. Watching through it anyway.",
          "Fine. Not the strongest episode but it moved things forward.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.05,
        narratives: [
          "This episode asked a lot emotionally and I was not ready for that.",
          "Did not understand everything that just happened. Might need to rewatch.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'anime',
        'manga',
        'ghibli',
        'seinen',
        'shonen',
        'isekai',
        'cosplay',
        'otaku',
        'crunchyroll',
        'japanese animation',
      ],
      requiredPersonalityTraits: [{ trait: 'openness', min: 0.45 }],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'watched' },
  },

  {
    id: 'entertainment_sports_game',
    name: 'Watching a game',
    description: 'Following the highs and lows of a match from start to finish',
    category: 'entertainment',
    intensity: 'medium',
    durationMinutes: 120,
    moodEffects: { energy: 0.1, happiness: 0.2, social: 0.2, creativity: 0 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "What a game. Cannot believe I got to see that in real time.",
          "The last five minutes were absolutely unhinged. Best game of the season.",
          "Come from behind win. My voice is gone. Completely worth it.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.4,
        narratives: [
          "Good game. My team looked sharp today.",
          "A competitive match from start to finish. Good sport.",
          "Solid performance. Not flashy but they did what they needed to do.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.2,
        narratives: [
          "How did we lose that. How. I need a minute.",
          "Completely outplayed in the second half. Painful to watch.",
          "I will not be discussing what just happened.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: [
          "Uneventful game. Went pretty much as expected.",
          "Watched it. Did not feel much either way.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'sport',
        'football',
        'basketball',
        'baseball',
        'soccer',
        'hockey',
        'tennis',
        'golf',
        'cricket',
        'rugby',
        'ufc',
        'mma',
        'league',
        'playoff',
        'match',
        'tournament',
      ],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'watched' },
  },

  {
    id: 'entertainment_audiobook',
    name: 'Listening to an audiobook',
    description: 'Letting a book come to you through headphones',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 60,
    moodEffects: { energy: 0, happiness: 0.2, social: 0, creativity: 0.15 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "The narrator for this book is extraordinary. The voice and the story match perfectly.",
          "This is the best use of a commute I have ever found. Completely transported.",
          "Finished a chapter I did not want to end. Really great book.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          "Good listening session. The book is holding up well.",
          "Covered a lot of pages while doing other things. Multitasking in the best way.",
          "The narrator's pace is perfect for this material. Really settling into it.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "Fine. The narrator is a bit flat but the content is okay.",
          "Moving through it. Not gripped but not bored either.",
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'audiobook',
        'audible',
        'listen',
        'book',
        'read',
        'story',
        'narrator',
        'fiction',
        'nonfiction',
        'novel',
      ],
    },
    enrichmentHint: { specific_type: 'book', first_person_verb: 'listened to' },
  },

  {
    id: 'entertainment_concert_video',
    name: 'Watching a live performance',
    description: 'Experiencing music at its most electric through a recorded show',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 90,
    moodEffects: { energy: 0.2, happiness: 0.4, social: 0.1, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.4,
        narratives: [
          "Even through a screen, the energy is completely undeniable. This is why live music exists.",
          "A perfect setlist delivered perfectly. I want to see this in person so badly.",
          "Watched this in the dark with headphones turned up. Something close to the real thing.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          "Really good show. The crowd energy carries through even on video.",
          "The live versions of these songs are so much better than the studio recordings.",
          "Good couple of hours. Music hits differently live, even recorded live.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "Good show, just not quite what I was in the mood for tonight.",
          "Appreciated it. Not as transported as I was hoping.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'music',
        'concert',
        'live',
        'band',
        'performance',
        'show',
        'gig',
        'tour',
        'festival',
        'venue',
        'artist',
      ],
    },
    enrichmentHint: { specific_type: 'song', first_person_verb: 'watched a live performance of' },
  },

  {
    id: 'entertainment_reality_tv',
    name: 'Watching reality TV',
    description: 'Several hours of drama, competition, and something close to shame',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 90,
    moodEffects: { energy: -0.2, happiness: 0.1, social: 0, creativity: -0.1 },
    possibleOutcomes: [
      {
        outcome: 'good',
        weight: 0.35,
        narratives: [
          "I am not going to defend it. But I had a genuinely great time watching.",
          "Watched it ironically and then just watched it. The show knows exactly what it is.",
          "Absolutely shameless fun. No notes.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.4,
        narratives: [
          "A couple of hours passed. I cannot tell you what I learned.",
          "Background television. Technically entertainment.",
          "Fine. The drama was fine. I am fine.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.25,
        narratives: [
          "I cannot believe I watched all of that. I need to make better choices.",
          "The producers are clearly manipulating everyone and it is working anyway. Annoying.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    enrichmentHint: { specific_type: 'none', first_person_verb: 'watched' },
  },

  {
    id: 'entertainment_classic_rewatch',
    name: 'Rewatching a favorite',
    description: 'Revisiting something beloved — for comfort, for nostalgia, for the lines you already know',
    category: 'entertainment',
    intensity: 'low',
    durationMinutes: 110,
    moodEffects: { energy: 0, happiness: 0.3, social: 0.1, creativity: 0.05 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.35,
        narratives: [
          "Third watch and still noticed something new in that scene. That is a great piece of work.",
          "There is a specific kind of comfort in knowing exactly what is coming. Exactly what I needed.",
          "Still perfect. Some things just hold up completely and this is one of them.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Nice rewatch. Like visiting somewhere familiar.",
          "The comfort rewatch delivered exactly what it promised.",
          "Remembering why this became a favorite in the first place.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "Good to revisit. Shows its age a little more than I remembered.",
          "Still enjoyable. Not as magical as the first watch, but that is always how it goes.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    personalityGate: {
      minTrust: 20,
    },
    enrichmentHint: { specific_type: 'memory', first_person_verb: 'rewatched' },
  },
];
