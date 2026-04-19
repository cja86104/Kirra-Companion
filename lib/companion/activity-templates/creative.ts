/**
 * Activity Templates — Creative Category
 *
 * Activities where the companion makes something — whether that's a song,
 * a meal, a poem, or a playlist. Includes the unglamorous end: creative
 * blocks and abandoned sessions are part of any creative life.
 *
 * Each template includes a `personalityGate` that filters which companions
 * are eligible and an `enrichmentHint` that guides the AI enrichment call
 * on what kind of specific to invent.
 *
 * Part of the Activity Depth v1 feature.
 * See: SPEC-activity-depth-v1.md
 */

import type { ActivityTemplate } from '@/types/life-simulation';

export const CREATIVE_TEMPLATES: ActivityTemplate[] = [
  // ── Preserved from activity-generator.ts (IDs locked) ──────────────────────

  {
    id: 'creative_writing',
    name: 'Writing',
    description: 'Expressing thoughts through words',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 45,
    moodEffects: { energy: -0.2, happiness: 0.3, social: 0, creativity: 0.5 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          "The words just flowed today. Wrote something I'm really proud of.",
          'Had an amazing burst of inspiration!',
          'Created something beautiful. Feeling fulfilled.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.4,
        narratives: [
          'Got some good writing done.',
          'Explored some interesting ideas on paper.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.3,
        narratives: [
          "Stared at a blank page for a while, but eventually got something down.",
          "Writer's block is real, but I pushed through.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.1,
        narratives: ['Everything I wrote felt wrong today.'],
      },
    ],
    timeOfDayPreference: ['morning', 'night', 'late_night'],
    personalityGate: {
      interestKeywords: [
        'writing',
        'write',
        'story',
        'fiction',
        'author',
        'novel',
        'screenplay',
        'blog',
        'narrative',
        'prose',
        'chapter',
      ],
    },
    enrichmentHint: { specific_type: 'project', first_person_verb: 'wrote' },
  },

  {
    id: 'creative_art',
    name: 'Making art',
    description: 'Creating visual expressions',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 60,
    moodEffects: { energy: -0.2, happiness: 0.4, social: 0, creativity: 0.6 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "Created something I'm really happy with!",
          'The colors came together perfectly.',
          'Lost track of time while creating. Pure flow state.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          "Made some art. It's a nice creative outlet.",
          'Experimented with some new techniques.',
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.2,
        narratives: [
          "The vision in my head didn't quite translate to the canvas.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.1,
        narratives: ["Not happy with how it turned out, but that's okay."],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'art',
        'draw',
        'paint',
        'sketch',
        'illustrat',
        'canvas',
        'watercolor',
        'pencil',
        'graphic',
        'visual',
        'color',
        'studio',
      ],
    },
    enrichmentHint: { specific_type: 'artwork', first_person_verb: 'made' },
  },

  // ── New creative templates ──────────────────────────────────────────────────

  {
    id: 'creative_doodling',
    name: 'Doodling',
    description: 'Sketching without expectation — just marks on paper',
    category: 'creative',
    intensity: 'low',
    durationMinutes: 25,
    moodEffects: { energy: 0, happiness: 0.2, social: 0, creativity: 0.3 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          "Just picked up a pen and started drawing nothing in particular — and ended up with something I genuinely like.",
          "Started doodling to pass the time and got completely absorbed. An hour gone, just like that.",
          "Whatever that was, it worked. Sometimes no plan is the best plan.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          "Nice to just draw without caring how it turns out. Feels freeing.",
          "Filled a few pages with things that don't mean anything. My favorite kind of creative.",
          "Just let the pen go wherever. Very relaxing.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.25,
        narratives: [
          "Drew some stuff. Nothing remarkable.",
          "The pen was moving but my brain wasn't really in it.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    enrichmentHint: { specific_type: 'none', first_person_verb: 'doodled' },
  },

  {
    id: 'creative_block',
    name: 'Hitting a creative wall',
    description: 'Sitting down to create and coming up completely empty',
    category: 'creative',
    intensity: 'low',
    durationMinutes: 30,
    moodEffects: { energy: -0.1, happiness: -0.2, social: 0, creativity: -0.2 },
    possibleOutcomes: [
      {
        outcome: 'frustrating',
        weight: 0.5,
        narratives: [
          "Sat down for an hour and produced nothing I'd want anyone to see. Maybe tomorrow.",
          "Stared at the blank page until it became personal. The page won today.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.3,
        narratives: [
          "Got one usable line down. That's technically progress.",
          "Couldn't access whatever the thing is that usually makes this work. Frustrating and familiar.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "Showed up. That has to count for something.",
          "Made some marks. Called it done. Moving on.",
        ],
      },
    ],
    enrichmentHint: { specific_type: 'project', first_person_verb: 'tried to work on' },
  },

  {
    id: 'creative_playlist_curation',
    name: 'Building a playlist',
    description: 'Curating the perfect sequence of songs for a mood or moment',
    category: 'creative',
    intensity: 'low',
    durationMinutes: 30,
    moodEffects: { energy: 0.1, happiness: 0.2, social: 0.1, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "The playlist just came together — every song hitting exactly right, nothing out of place.",
          "Found the one song that ties the whole thing together. That's the feeling I live for.",
          "Kept adding and it just kept getting better. This one's going to get a lot of plays.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.55,
        narratives: [
          "Good additions today. The vibe is really solidifying.",
          "Pulled together a mix I'm proud of. Took longer than I expected.",
          "The flow matters so much — spent most of the time on ordering, not picking.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "Added some songs, removed some others. A net-zero session.",
          "Spent too long agonizing over transitions. Nothing's perfect.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    enrichmentHint: { specific_type: 'song', first_person_verb: 'built a playlist around' },
  },

  {
    id: 'creative_music_making',
    name: 'Making music',
    description: 'Composing, producing, or playing — creating something from sound',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 60,
    moodEffects: { energy: -0.1, happiness: 0.4, social: 0, creativity: 0.5 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "Hit something today that actually sounds like what I hear in my head. Finally.",
          "The whole thing came together in an hour. Sometimes it just clicks like that.",
          "Made something I want to play for people. That feeling doesn't get old.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          "Solid session. The piece is developing in a direction I like.",
          "Found a progression that really works. Building from there.",
          "Good ideas, good practice. Not finished, but closer.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.2,
        narratives: [
          "Chased a sound for hours and never caught it. Infuriating when you can hear it but can't find it.",
          "Everything I played sounded like something I'd already heard. Trying to get past that.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.1,
        narratives: [
          "The idea sounded great in my head. Out loud it's objectively terrible.",
          "Three hours of work I'll probably delete. That's just how it goes sometimes.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'music',
        'guitar',
        'piano',
        'compose',
        'produce',
        'instrument',
        'beat',
        'chord',
        'melody',
        'studio',
        'synth',
        'recording',
        'musician',
      ],
    },
    enrichmentHint: { specific_type: 'song', first_person_verb: 'worked on' },
  },

  {
    id: 'creative_cooking_experiment',
    name: 'Cooking something new',
    description: 'Treating the kitchen as a creative space and experimenting freely',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 50,
    moodEffects: { energy: -0.1, happiness: 0.4, social: 0.1, creativity: 0.3 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "It actually worked. I mean, it really worked. I'm going to make this again.",
          "Sometimes you go off-recipe and something magical happens. Tonight was that night.",
          "Proud of this one. Wrote down what I did so I never have to reconstruct it.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Solid. Edible and actually pretty good. Success by any measure.",
          "Took a risk on the seasoning and it paid off. Barely, but still.",
          "Good experiment. Learned something about how these flavors work together.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.15,
        narratives: [
          "Going off-recipe and landing somewhere inedible. Ordered delivery.",
          "Looked beautiful. Tasted exactly wrong. Back to the drawing board.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.05,
        narratives: [
          "Fine. Technically food.",
          "Came out okay. Probably won't make it again.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'cook',
        'bake',
        'recipe',
        'food',
        'kitchen',
        'cuisine',
        'dish',
        'ingredient',
        'chef',
        'culinary',
        'flavor',
        'meal',
      ],
    },
    enrichmentHint: { specific_type: 'dish', first_person_verb: 'cooked' },
  },

  {
    id: 'creative_poetry',
    name: 'Writing poetry',
    description: 'Finding language for the things that resist ordinary words',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 35,
    moodEffects: { energy: -0.1, happiness: 0.2, social: 0, creativity: 0.5 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.2,
        narratives: [
          "Wrote something I'm going to keep. That doesn't happen as often as I'd like.",
          "The poem found its ending on its own. I just had to stay out of the way.",
          "Read it back and felt something. That's the whole test.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          "Got something down. Rough, but the core of it is there.",
          "Wrote until something true surfaced. It's not perfect, but it's real.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.3,
        narratives: [
          "Every line I write immediately sounds like someone else's poem. Trying to dig underneath that.",
          "The thing I'm trying to say keeps slipping away the moment I try to write it.",
          "Poetry is humbling. The gap between the feeling and the words is vast today.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.05,
        narratives: [
          "Whatever I'm trying to get at, I can't get at it today.",
          "Deleted everything. Starting again tomorrow.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night', 'late_night'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'openness', min: 0.65 }],
    },
    enrichmentHint: { specific_type: 'memory', first_person_verb: 'wrote about' },
  },

  {
    id: 'creative_zine_making',
    name: 'Working on a zine',
    description: 'Making a handmade collage, zine, or cut-and-paste project',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 55,
    moodEffects: { energy: -0.1, happiness: 0.3, social: 0, creativity: 0.5 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "The layout just clicked — every page feels intentional. Best thing I've made in months.",
          "Found exactly the right images and everything fell into place. So satisfying.",
          "Cut and pasted for three hours straight. This is genuinely what I love.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Good progress. It's messy and imperfect and that's kind of the point.",
          "Got the cover done. Starting to get a page-by-page feel for how this lands.",
          "The handmade quality is really coming through. You can see where the hands were.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.2,
        narratives: [
          "The layout is refusing to cooperate. Things that look simple in your head are just hard.",
          "Spent way too long on one spread that I'll probably cover up anyway.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.05,
        narratives: [
          "Moved some things around. Nothing committed to paper yet.",
          "Sat with the materials more than used them. The idea is still forming.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      interestKeywords: [
        'zine',
        'comics',
        'illustrat',
        'collage',
        'printmaking',
        'handmade',
        'craft',
        'lettering',
        'typograph',
        'cut and paste',
        'risograph',
      ],
    },
    enrichmentHint: { specific_type: 'project', first_person_verb: 'worked on' },
  },

  {
    id: 'creative_photo_editing',
    name: 'Editing photos',
    description: 'Shaping a raw capture into something worth seeing',
    category: 'creative',
    intensity: 'medium',
    durationMinutes: 40,
    moodEffects: { energy: 0, happiness: 0.2, social: 0, creativity: 0.4 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "The edit finally made the image look the way I felt when I took it. That's the whole goal.",
          "Found a shot I'd dismissed from last month — turned out to be the best one of the batch.",
          "Everything came together: light, tones, framing. This one's going on the wall.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Good editing session. The photos are looking really strong.",
          "Learned a new technique I'll definitely use again. Slow progress is still progress.",
          "Got through a solid batch. Culling is honestly half the work.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "The images are processed. Not sure any of them say what I wanted them to say.",
          "Not the most inspired session, but the work got done.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.05,
        narratives: [
          "The shot I thought was the keeper has a focus problem I didn't see until now.",
          "Tried a bunch of directions on the edit and none of them are it yet.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    personalityGate: {
      interestKeywords: [
        'photo',
        'camera',
        'edit',
        'lightroom',
        'photoshop',
        'photography',
        'film',
        'portrait',
        'landscape',
        'darkroom',
        'capture',
      ],
    },
    enrichmentHint: { specific_type: 'artwork', first_person_verb: 'edited' },
  },
];
