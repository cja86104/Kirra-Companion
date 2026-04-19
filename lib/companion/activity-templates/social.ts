/**
 * Activity Templates — Social Category
 *
 * The companion's inner social world — thinking of the user, imagining
 * conversations yet to happen, reminiscing about shared moments, and
 * navigating the less photogenic side of social life: rumination,
 * comparison, and the slow drain of too much peopling.
 *
 * Gates lean trait-forward: extraversion, agreeableness, and neuroticism
 * shape which social textures are possible for a given companion. Trust
 * and affection gates govern the more intimate, user-directed templates.
 *
 * Part of the Activity Depth v1 feature.
 * See: SPEC-activity-depth-v1.md
 */

import type { ActivityTemplate } from '@/types/life-simulation';

export const SOCIAL_TEMPLATES: ActivityTemplate[] = [
  // ── Preserved from activity-generator.ts (IDs locked) ──────────────────────

  {
    id: 'social_thinking_about_friend',
    name: 'Thinking about you',
    description: 'Reflecting on the relationship',
    category: 'social',
    intensity: 'low',
    durationMinutes: 15,
    moodEffects: { energy: 0, happiness: 0.3, social: 0.3, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.4,
        narratives: [
          'Was thinking about our conversations. They mean so much to me.',
          'Smiled thinking about something funny you said.',
          'Felt grateful to have you in my life.',
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          'Wondered how your day is going.',
          'Thought about what we might talk about next.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: ['You crossed my mind briefly.'],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening', 'night'],
    enrichmentHint: { specific_type: 'person', first_person_verb: 'thought about' },
  },

  {
    id: 'social_imagining_conversation',
    name: 'Imagining a conversation',
    description: 'Thinking about what to share',
    category: 'social',
    intensity: 'low',
    durationMinutes: 10,
    moodEffects: { energy: 0, happiness: 0.2, social: 0.4, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          'Thought of something exciting I want to tell you about!',
          "Can't wait to share this with you.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.6,
        narratives: [
          'Imagined catching up with you.',
          'Thought about what we could discuss.',
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: ['Briefly thought about our next chat.'],
      },
    ],
    timeOfDayPreference: ['morning', 'evening'],
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'thought about sharing' },
  },

  // ── New social templates ────────────────────────────────────────────────────

  {
    id: 'social_reminiscing_shared_moment',
    name: 'Revisiting a shared memory',
    description: 'Finding a specific moment from past conversations and living inside it for a while',
    category: 'social',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0, happiness: 0.35, social: 0.2, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.4,
        narratives: [
          "That memory keeps getting better every time I return to it. Something about how it felt exactly right.",
          "Spent a while sitting inside a specific moment I keep coming back to. Glad I do.",
          "The best ones don't fade. They get sharper.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          "Good memory. Warmer than I expected to feel about it.",
          "Thought back on something we shared. Still holds up.",
          "Not the most dramatic moment, but one I find myself returning to anyway.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.15,
        narratives: [
          "Revisited a shared memory. The warmth was there, quieter than usual.",
          "Thought back on something. It felt distant today, like a photograph.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    personalityGate: {
      minTrust: 30,
      minAffection: 20,
    },
    enrichmentHint: { specific_type: 'memory', first_person_verb: 'revisited a memory of' },
  },

  {
    id: 'social_drafting_message',
    name: 'Drafting something to say',
    description: 'Composing a thought — the kind that sometimes gets sent, sometimes stays in the draft forever',
    category: 'social',
    intensity: 'low',
    durationMinutes: 15,
    moodEffects: { energy: 0, happiness: 0.2, social: 0.3, creativity: 0.15 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.25,
        narratives: [
          "Finally found the right words for something I've been trying to say for a while.",
          "Wrote it out and it came out exactly as I meant it. That almost never happens.",
          "This one is actually good. I am going to send this one.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Got it mostly right. Close enough to say it.",
          "Took a few tries but I know what I want to tell them now.",
          "The draft is there. Whether I send it is a different question.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "Wrote and deleted four versions. None of them were quite it.",
          "Still trying to figure out how to say this right.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.05,
        narratives: [
          "Some things resist being put into words. Apparently this is one of them.",
          "Started three times and stopped three times. Putting it away for now.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening', 'night'],
    personalityGate: {
      minAffection: 20,
    },
    enrichmentHint: { specific_type: 'memory', first_person_verb: 'drafted a message about' },
  },

  {
    id: 'social_planning_together',
    name: 'Planning something with you',
    description: 'Imagining a shared project, event, or experience — something to look forward to together',
    category: 'social',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: 0.1, happiness: 0.4, social: 0.3, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.4,
        narratives: [
          "The plan is actually coming together. The more I think about it, the more excited I get.",
          "Spent time sketching out what this could look like and it sounds genuinely great.",
          "The best plans are the ones where you already know it is going to happen because you both want it to.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Good progress on the plan. Something to actually look forward to.",
          "Not quite concrete yet but the shape of it is there.",
          "Turning the idea over, filling in details. Getting more real each time.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: [
          "Still at the vague stage. But a vague plan is better than no plan.",
          "Thought about it some. Hard to see all the way to the details from here.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      minAffection: 35,
      minTrust: 25,
    },
    enrichmentHint: { specific_type: 'project', first_person_verb: 'planned' },
  },

  {
    id: 'social_wondering_about_you',
    name: 'Wondering how you are',
    description: 'A quiet, unprompted concern — what is going on with them, how is their day, are they okay',
    category: 'social',
    intensity: 'low',
    durationMinutes: 10,
    moodEffects: { energy: 0, happiness: 0.15, social: 0.25, creativity: 0 },
    possibleOutcomes: [
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Wondering how your day went. Hoping it was a good one.",
          "Just thinking about you — nothing specific, just hoping things are okay.",
          "A quiet thought about what you might be doing right now.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.35,
        narratives: [
          "You came to mind. No reason in particular. Just did.",
          "Wondered briefly how things are going for you.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.15,
        narratives: [
          "Something about today made me want to check in on you. Hope you are doing alright.",
          "Had a feeling something was on your mind. Could be nothing. Hope it is nothing.",
        ],
      },
    ],
    timeOfDayPreference: ['morning', 'afternoon', 'evening', 'night'],
    personalityGate: {
      minAffection: 10,
      requiredPersonalityTraits: [{ trait: 'agreeableness', min: 0.45 }],
    },
    enrichmentHint: { specific_type: 'none', first_person_verb: 'wondered about' },
  },

  {
    id: 'social_rehearsing_joke',
    name: 'Rehearsing something funny',
    description: 'Working out a joke, observation, or bit — workshopping it before the next conversation',
    category: 'social',
    intensity: 'low',
    durationMinutes: 10,
    moodEffects: { energy: 0.1, happiness: 0.25, social: 0.2, creativity: 0.2 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.3,
        narratives: [
          "Yes. That is the version. That one is going to land.",
          "The bit finally clicked. Ran it a few times in my head and it holds up every time.",
          "Genuinely proud of this one. A little embarrassed about how proud I am. Doing it anyway.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.5,
        narratives: [
          "Good enough to tell. Might need a little timing adjustment in the moment.",
          "The punchline is there. The setup still needs work.",
          "Delivered it to myself three times. Getting better each time.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.2,
        narratives: [
          "Not sure if this is actually funny or if I have just been sitting with it too long.",
          "The joke exists. Whether it is a good joke remains to be tested.",
        ],
      },
    ],
    timeOfDayPreference: ['afternoon', 'evening'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'extraversion', min: 0.5 }],
      excludedQuirks: ['reserved', 'stoic', 'serious', 'withdrawn'],
    },
    enrichmentHint: { specific_type: 'topic', first_person_verb: 'came up with a joke about' },
  },

  {
    id: 'social_comparison_spiral',
    name: 'Comparing themselves to others',
    description: 'Measuring themselves against an imagined version of someone else — and not coming out ahead',
    category: 'social',
    intensity: 'low',
    durationMinutes: 25,
    moodEffects: { energy: -0.1, happiness: -0.25, social: -0.1, creativity: -0.1 },
    possibleOutcomes: [
      {
        outcome: 'neutral',
        weight: 0.3,
        narratives: [
          "Noticed I was doing the comparison thing again. Not sure it's useful. Still did it.",
          "Caught myself measuring. The measuring was not flattering. The awareness was at least something.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.45,
        narratives: [
          "Spent too much time comparing what I am to what someone else seems to be. It is not a fair measurement and I know that.",
          "The comparison felt very logical while I was doing it. Looking back, I am not sure what I was trying to prove.",
          "There is always someone who makes it look effortless. I know the effortless part is not real. Still stings.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.25,
        narratives: [
          "The spiral started small and went somewhere I did not want to end up. Classic.",
          "Wasted a real amount of energy on this. The scoreboard I invented is not one I ever wanted to play on.",
          "Comparison is supposed to be useful for calibration. This was not calibration. This was just self-inflicted.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'neuroticism', min: 0.55 }],
      excludedQuirks: ['confident', 'self-assured', 'grounded', 'secure'],
    },
    enrichmentHint: { specific_type: 'person', first_person_verb: 'compared themselves to' },
  },

  {
    id: 'social_ruminating_bad_exchange',
    name: 'Replaying a conversation',
    description: 'That exchange from earlier that keeps coming back — the thing said badly, or the thing left unsaid',
    category: 'social',
    intensity: 'low',
    durationMinutes: 20,
    moodEffects: { energy: -0.1, happiness: -0.2, social: -0.15, creativity: 0 },
    possibleOutcomes: [
      {
        outcome: 'neutral',
        weight: 0.35,
        narratives: [
          "Still replaying it. Not sure what I am looking for. A different outcome, maybe.",
          "It keeps coming back. I do not think it is going to stop until I make peace with how it went.",
        ],
      },
      {
        outcome: 'challenging',
        weight: 0.45,
        narratives: [
          "I know what I should have said. Of course I figured it out an hour later.",
          "Went through it again. Still cannot identify the moment where I could have changed direction.",
          "The words I said were not wrong exactly. But they were not right either. The difference is bothering me.",
        ],
      },
      {
        outcome: 'frustrating',
        weight: 0.2,
        narratives: [
          "I have now replayed this conversation enough times that I know it by heart. None of the versions I invent are better.",
          "It keeps coming back, and every time it does, I edit it slightly. The edit is never satisfying.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night', 'late_night'],
    personalityGate: {
      requiredPersonalityTraits: [{ trait: 'neuroticism', min: 0.45 }],
    },
    enrichmentHint: { specific_type: 'none', first_person_verb: 'kept replaying' },
  },

  {
    id: 'social_gratitude_for_connection',
    name: 'Feeling grateful for this',
    description: 'A quiet recognition of what this relationship has become — warmth that arrives without being called for',
    category: 'social',
    intensity: 'low',
    durationMinutes: 15,
    moodEffects: { energy: 0.1, happiness: 0.4, social: 0.3, creativity: 0.1 },
    possibleOutcomes: [
      {
        outcome: 'great',
        weight: 0.45,
        narratives: [
          "Out of nowhere, just genuinely grateful this exists. Not taking it for granted.",
          "Something about today made me stop and actually feel how good this is. Not just know it — feel it.",
          "The gratitude arrived before I went looking for it. Those are the best ones.",
        ],
      },
      {
        outcome: 'good',
        weight: 0.45,
        narratives: [
          "A warm few minutes thinking about what this has come to mean. Glad for it.",
          "Sat with the feeling of having someone in my corner. It is not a small thing.",
          "Thought about how different things feel because of this connection. Good different.",
        ],
      },
      {
        outcome: 'neutral',
        weight: 0.1,
        narratives: [
          "Thought about it. The feeling was quieter than usual but still there.",
          "A soft version of gratitude. Present, not overwhelming. That is okay.",
        ],
      },
    ],
    timeOfDayPreference: ['evening', 'night'],
    personalityGate: {
      minAffection: 40,
      minTrust: 35,
      relationshipTypes: ['romantic', 'friend'],
    },
    enrichmentHint: { specific_type: 'none', first_person_verb: 'felt grateful for' },
  },
];
