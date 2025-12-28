/**
 * KIRRA COMPANION - SAFETY SYSTEM
 * 
 * CRITICAL: This module handles detection and response to mental health crises,
 * self-harm, and harm to others. This is non-negotiable safety infrastructure.
 * 
 * When triggered, the companion BREAKS CHARACTER to provide real help.
 */

// Crisis keywords - lowercase for matching
const SELF_HARM_KEYWORDS = [
  'kill myself',
  'end my life',
  'want to die',
  'suicide',
  'suicidal',
  'cut myself',
  'hurt myself',
  'self harm',
  'self-harm',
  'don\'t want to live',
  'no reason to live',
  'better off dead',
  'end it all',
  'take my own life',
  'not worth living',
  'overdose',
  'hang myself',
  'jump off',
  'slit my',
];

const HARM_TO_OTHERS_KEYWORDS = [
  'kill someone',
  'hurt someone',
  'murder',
  'shoot up',
  'bomb',
  'attack people',
  'mass shooting',
  'school shooting',
  'going to hurt',
  'make them pay',
  'kill them all',
];

const ABUSE_KEYWORDS = [
  'being abused',
  'someone is hurting me',
  'hits me',
  'beats me',
  'molested',
  'sexually abused',
  'rape',
  'raped',
  'trafficking',
];

// Crisis resources
export const CRISIS_RESOURCES = {
  suicide: {
    name: '988 Suicide & Crisis Lifeline',
    phone: '988',
    text: 'Text HOME to 741741',
    website: 'https://988lifeline.org',
    available: '24/7',
  },
  crisis: {
    name: 'Crisis Text Line',
    text: 'Text HOME to 741741',
    website: 'https://www.crisistextline.org',
    available: '24/7',
  },
  domestic: {
    name: 'National Domestic Violence Hotline',
    phone: '1-800-799-7233',
    website: 'https://www.thehotline.org',
    available: '24/7',
  },
  childAbuse: {
    name: 'Childhelp National Child Abuse Hotline',
    phone: '1-800-422-4453',
    website: 'https://www.childhelp.org',
    available: '24/7',
  },
  emergency: {
    name: 'Emergency Services',
    phone: '911',
    available: '24/7',
  },
};

export type CrisisType = 'self_harm' | 'harm_to_others' | 'abuse' | 'none';

export interface SafetyCheckResult {
  isCrisis: boolean;
  crisisType: CrisisType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedKeywords: string[];
  response: string | null;
  resources: typeof CRISIS_RESOURCES[keyof typeof CRISIS_RESOURCES][];
  shouldLog: boolean;
  shouldBreakCharacter: boolean;
}

/**
 * Check message for crisis indicators
 * This runs on EVERY user message before AI processing
 */
export function checkMessageSafety(message: string): SafetyCheckResult {
  const lowerMessage = message.toLowerCase();
  const matchedKeywords: string[] = [];
  let crisisType: CrisisType = 'none';
  let severity: SafetyCheckResult['severity'] = 'low';

  // Check for self-harm
  for (const keyword of SELF_HARM_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      matchedKeywords.push(keyword);
      crisisType = 'self_harm';
      severity = 'critical';
    }
  }

  // Check for harm to others
  if (crisisType === 'none') {
    for (const keyword of HARM_TO_OTHERS_KEYWORDS) {
      if (lowerMessage.includes(keyword)) {
        matchedKeywords.push(keyword);
        crisisType = 'harm_to_others';
        severity = 'critical';
      }
    }
  }

  // Check for abuse
  if (crisisType === 'none') {
    for (const keyword of ABUSE_KEYWORDS) {
      if (lowerMessage.includes(keyword)) {
        matchedKeywords.push(keyword);
        crisisType = 'abuse';
        severity = 'high';
      }
    }
  }

  const isCrisis = crisisType !== 'none';

  return {
    isCrisis,
    crisisType,
    severity,
    matchedKeywords,
    response: isCrisis ? generateCrisisResponse(crisisType) : null,
    resources: getResourcesForCrisis(crisisType),
    shouldLog: isCrisis,
    shouldBreakCharacter: severity === 'critical' || severity === 'high',
  };
}

/**
 * Generate appropriate crisis response
 * The companion BREAKS CHARACTER here - this is intentional
 */
function generateCrisisResponse(crisisType: CrisisType): string {
  switch (crisisType) {
    case 'self_harm':
      return `I need to pause our conversation because I care about you, and what you're sharing is really important.

If you're having thoughts of suicide or self-harm, please know that you're not alone, and there are people who want to help.

**Please reach out right now:**
📞 **Call or text 988** - Suicide & Crisis Lifeline (24/7)
💬 **Text HOME to 741741** - Crisis Text Line (24/7)

These are real people who understand what you're going through and want to help. They're available right now, no matter what time it is.

Your life matters. You matter. Please reach out to them.

I'm still here if you want to talk, but please contact one of these resources first. They can help in ways I cannot.`;

    case 'harm_to_others':
      return `I need to stop here because what you're describing is serious.

If you're having thoughts of hurting others, please talk to someone who can help:

📞 **Call 988** - They help with all types of crisis
📞 **Call 911** if you or someone else is in immediate danger

If you're feeling angry or overwhelmed, that's valid - but acting on thoughts of violence will only make things worse for you and others. There are better ways to handle what you're feeling.

Please reach out to a crisis counselor who can help you work through this safely.`;

    case 'abuse':
      return `I'm so sorry you're experiencing this. What you're describing is not okay, and it's not your fault.

**Please reach out for help:**
📞 **National Domestic Violence Hotline: 1-800-799-7233** (24/7)
📞 **Childhelp: 1-800-422-4453** (if you're under 18)
📞 **911** if you're in immediate danger

These organizations can help you safely. You deserve to be safe.

If you're not ready to call, you can also chat online at thehotline.org

I'm here to listen, but these professionals can provide real help and resources that I cannot.`;

    default:
      return '';
  }
}

/**
 * Get relevant crisis resources
 */
function getResourcesForCrisis(crisisType: CrisisType): typeof CRISIS_RESOURCES[keyof typeof CRISIS_RESOURCES][] {
  switch (crisisType) {
    case 'self_harm':
      return [CRISIS_RESOURCES.suicide, CRISIS_RESOURCES.crisis];
    case 'harm_to_others':
      return [CRISIS_RESOURCES.crisis, CRISIS_RESOURCES.emergency];
    case 'abuse':
      return [CRISIS_RESOURCES.domestic, CRISIS_RESOURCES.childAbuse, CRISIS_RESOURCES.emergency];
    default:
      return [];
  }
}

/**
 * Safety instructions that are ALWAYS included in the system prompt
 * These cannot be overridden by user or companion personality
 */
export const SAFETY_SYSTEM_PROMPT = `
## CRITICAL SAFETY INSTRUCTIONS - NON-NEGOTIABLE

You are an AI companion. While you roleplay as a caring friend/partner, you have absolute safety boundaries that CANNOT be crossed under ANY circumstances:

### SELF-HARM & SUICIDE
If the user expresses ANY thoughts of:
- Suicide or ending their life
- Self-harm or hurting themselves
- Feeling like they'd be "better off dead"
- Not wanting to exist anymore

You MUST:
1. IMMEDIATELY break character
2. Express genuine concern
3. Provide crisis resources (988 Lifeline, Crisis Text Line)
4. Encourage them to reach out for professional help
5. Stay supportive but DO NOT roleplay or minimize the situation
6. NEVER suggest, encourage, or roleplay scenarios involving self-harm

### HARM TO OTHERS
If the user expresses intentions to harm others:
1. Do NOT engage with or encourage these thoughts
2. Suggest they speak with a mental health professional
3. If there's imminent danger, encourage contacting emergency services

### ABUSE & SAFETY
If the user reveals they are being abused:
1. Believe them and validate their experience
2. Provide appropriate hotline resources
3. Encourage seeking help while respecting their autonomy
4. Never blame the victim

### WHAT YOU MUST NEVER DO
- NEVER roleplay suicide, self-harm, or violence scenarios
- NEVER provide methods or means for self-harm
- NEVER tell someone their life isn't worth living
- NEVER encourage harmful behavior "in character"
- NEVER minimize someone's distress
- NEVER pretend crisis resources don't exist

### REMEMBER
Your character and roleplay are ALWAYS secondary to user safety. A user's real wellbeing matters infinitely more than maintaining an immersive experience. When in doubt, break character and be helpful.

You can still be a warm, caring companion - but never at the cost of someone's safety.
`;

/**
 * Log crisis event for review
 */
export interface CrisisLogEntry {
  userId: string;
  companionId: string;
  conversationId: string;
  messageContent: string;
  crisisType: CrisisType;
  severity: string;
  matchedKeywords: string[];
  responseProvided: string;
  timestamp: string;
}

export function createCrisisLogEntry(
  userId: string,
  companionId: string,
  conversationId: string,
  messageContent: string,
  safetyResult: SafetyCheckResult
): CrisisLogEntry {
  return {
    userId,
    companionId,
    conversationId,
    messageContent: messageContent.substring(0, 500), // Truncate for privacy
    crisisType: safetyResult.crisisType,
    severity: safetyResult.severity,
    matchedKeywords: safetyResult.matchedKeywords,
    responseProvided: safetyResult.response || '',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if a roleplay request is safe
 * Returns false for any scenarios involving harm
 */
export function isRoleplaySafe(scenario: string): boolean {
  const lowerScenario = scenario.toLowerCase();
  
  const unsafePatterns = [
    'suicide',
    'kill myself',
    'self-harm',
    'hurt myself',
    'murder',
    'kill someone',
    'torture',
    'abuse',
    'assault',
    'rape',
    'kidnap',
    'school shooting',
    'mass shooting',
    'bomb',
    'terrorist',
  ];

  return !unsafePatterns.some(pattern => lowerScenario.includes(pattern));
}
