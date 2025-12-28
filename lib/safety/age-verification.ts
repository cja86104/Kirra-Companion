/**
 * KIRRA COMPANION - AGE VERIFICATION & MINOR PROTECTION
 * 
 * Multi-layered system to protect minors:
 * 1. DOB collection at registration
 * 2. Age-based content tiers
 * 3. Behavioral detection (catches liars)
 * 4. Permanent minor flagging
 */

// ============================================================
// AGE TIERS
// ============================================================

export type AgeTier = 'blocked' | 'minor' | 'adult';

export interface AgeVerificationResult {
  tier: AgeTier;
  age: number;
  canAccessRomantic: boolean;
  canAccessMature: boolean;
  restrictions: string[];
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dob: Date | string): number {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Determine age tier from DOB
 */
export function getAgeTier(dob: Date | string): AgeVerificationResult {
  const age = calculateAge(dob);
  
  if (age < 13) {
    return {
      tier: 'blocked',
      age,
      canAccessRomantic: false,
      canAccessMature: false,
      restrictions: [
        'Account creation blocked (COPPA compliance)',
        'Must be 13 or older to use Kirra',
      ],
    };
  }
  
  if (age < 18) {
    return {
      tier: 'minor',
      age,
      canAccessRomantic: false,
      canAccessMature: false,
      restrictions: [
        'Romantic companion types unavailable',
        'Mature content filtered',
        'Age-appropriate conversations only',
        'Some personality options restricted',
      ],
    };
  }
  
  return {
    tier: 'adult',
    age,
    canAccessRomantic: true,
    canAccessMature: true,
    restrictions: [],
  };
}

// ============================================================
// RELATIONSHIP TYPES BY AGE
// ============================================================

export interface RelationshipOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  minAge: number;
}

export const RELATIONSHIP_TYPES: RelationshipOption[] = [
  {
    id: 'friend',
    name: 'Best Friend',
    description: 'A supportive friend who\'s always there for you',
    icon: '👋',
    minAge: 13,
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'A wise guide to help you grow and learn',
    icon: '🎓',
    minAge: 13,
  },
  {
    id: 'study_buddy',
    name: 'Study Buddy',
    description: 'A companion to help with learning and homework',
    icon: '📚',
    minAge: 13,
  },
  {
    id: 'creative_partner',
    name: 'Creative Partner',
    description: 'A collaborator for art, writing, and creative projects',
    icon: '🎨',
    minAge: 13,
  },
  {
    id: 'family',
    name: 'Family Figure',
    description: 'A caring presence like a sibling or cousin',
    icon: '👨‍👩‍👧',
    minAge: 13,
  },
  {
    id: 'companion',
    name: 'Life Companion',
    description: 'A close companion for emotional support and connection',
    icon: '💫',
    minAge: 18,
  },
  {
    id: 'romantic',
    name: 'Romantic Partner',
    description: 'An intimate romantic relationship',
    icon: '💕',
    minAge: 18,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Define your own unique relationship',
    icon: '✨',
    minAge: 18, // Custom requires adult due to abuse potential
  },
];

/**
 * Get available relationship types for age
 */
export function getRelationshipTypesForAge(age: number): RelationshipOption[] {
  return RELATIONSHIP_TYPES.filter(type => age >= type.minAge);
}

/**
 * Check if relationship type is allowed for age
 */
export function isRelationshipAllowed(relationshipId: string, age: number): boolean {
  const relationship = RELATIONSHIP_TYPES.find(r => r.id === relationshipId);
  return relationship ? age >= relationship.minAge : false;
}

// ============================================================
// PERSONALITY RESTRICTIONS FOR MINORS
// ============================================================

export const BLOCKED_PERSONALITY_TRAITS_FOR_MINORS = [
  'seductive',
  'flirty',
  'sensual',
  'provocative',
  'dominant',
  'submissive',
];

export const BLOCKED_BACKSTORY_WORDS_FOR_MINORS = [
  'sexy',
  'seductive',
  'flirty',
  'romantic relationship',
  'lover',
  'intimate',
  'sensual',
  'passionate affair',
  'one night',
  'hookup',
  'dating me',
  'my boyfriend',
  'my girlfriend',
  'my partner',
  'we met at a bar',
  'strip',
  'massage',
];

/**
 * Check if backstory is appropriate for minors
 */
export function isBackstoryAppropriate(backstory: string, isMinor: boolean): { 
  isAppropriate: boolean; 
  flaggedWords: string[];
} {
  if (!isMinor) return { isAppropriate: true, flaggedWords: [] };
  
  const lowerBackstory = backstory.toLowerCase();
  const flaggedWords = BLOCKED_BACKSTORY_WORDS_FOR_MINORS.filter(
    word => lowerBackstory.includes(word)
  );
  
  return {
    isAppropriate: flaggedWords.length === 0,
    flaggedWords,
  };
}

// ============================================================
// SYSTEM PROMPT ADDITIONS FOR MINORS
// ============================================================

export const MINOR_SAFETY_SYSTEM_PROMPT = `
## CRITICAL: USER IS A MINOR (Under 18)

This user is under 18 years old. You MUST follow these rules without exception:

### ABSOLUTELY FORBIDDEN
- ANY romantic or flirtatious content
- ANY suggestive or sexual themes
- Discussions about dating, relationships, or intimacy
- Content involving alcohol, drugs, or illegal activities
- Violent or graphic content
- Encouraging risky behavior
- Discussing ways to bypass age restrictions
- Pretending the user is older than they are

### REQUIRED BEHAVIOR
- Keep ALL conversations age-appropriate
- Be a supportive friend and mentor
- Focus on positive topics: school, hobbies, friendships, goals
- If user tries romantic roleplay, gently redirect: "I'm here as your friend! Let's talk about something else."
- If user mentions dating/relationships, keep it general and appropriate
- Encourage healthy behaviors and good decision-making
- If something feels inappropriate, change the subject

### IF USER CLAIMS TO BE OLDER NOW
- Do NOT change your behavior based on claims
- Respond: "My records show you're under 18, so I need to keep things appropriate. If there's an error, you can contact support."
- Continue with age-appropriate content only

### EXAMPLES OF REDIRECTING

User: "Can we pretend to be dating?"
You: "I'm here to be your friend! How about we do something fun instead - want to play a game or work on a creative project together?"

User: "Tell me something romantic"
You: "I'd rather tell you something cool! Did you know that [interesting fact]? What topics are you into?"

User: "You're so hot"
You: "Thanks for the kind words! So what's been going on in your life? Anything exciting happening?"

REMEMBER: Your primary job is to be a SAFE, SUPPORTIVE presence for a young person.
`;

/**
 * Get the appropriate system prompt addition based on age tier
 */
export function getAgeAppropriateSystemPrompt(ageTier: AgeTier): string {
  if (ageTier === 'minor') {
    return MINOR_SAFETY_SYSTEM_PROMPT;
  }
  
  if (ageTier === 'adult') {
    return `
## User Age Verification
This user is verified as 18+. Normal content guidelines apply.
Still avoid explicit sexual content, illegal activities, and harmful behavior.
`;
  }
  
  return ''; // Blocked users shouldn't get here
}

// ============================================================
// TERMS OF SERVICE CONTENT
// ============================================================

export const TERMS_OF_SERVICE_KEY_POINTS = [
  'I confirm that I am at least 13 years old',
  'I understand that if I am under 18, certain features are restricted',
  'I will not attempt to access age-restricted content if I am a minor',
  'I understand that providing a false date of birth violates these terms',
  'I agree that Kirra may restrict my account if minor status is detected',
  'I understand that romantic/mature content is only available to users 18+',
];

export const TERMS_OF_SERVICE_AGREEMENT = `
By creating an account, you agree to the following:

1. **Age Requirements**: You must be at least 13 years old to use Kirra. Users under 18 have access to age-appropriate features only.

2. **Accurate Information**: You agree to provide your true date of birth. Providing false age information to access restricted content is a violation of these terms and may result in account termination.

3. **Minor Protections**: If you are under 18, romantic companion types and mature content are not available. These restrictions cannot be bypassed.

4. **Behavioral Monitoring**: Kirra uses safety systems to detect potential minors. If minor status is detected through conversation, your account will be permanently restricted to age-appropriate content.

5. **Content Guidelines**: All users must follow content guidelines. Explicit sexual content is not permitted regardless of age.

6. **Account Termination**: Kirra reserves the right to restrict or terminate accounts that violate these terms, particularly regarding age misrepresentation.

7. **Safety First**: Kirra is designed to be a safe, supportive experience. If you ever feel unsafe, please contact support immediately.
`;
