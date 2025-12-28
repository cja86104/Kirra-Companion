/**
 * KIRRA COMPANION - BEHAVIORAL DETECTION SYSTEM
 * 
 * Catches users who lied about their age by detecting:
 * - Direct age admissions ("I'm 15")
 * - School references ("my teacher", "8th grade")
 * - Age-indicative statements ("I can't drive yet")
 * - Parental references suggesting minor status
 * - Life stage indicators
 * 
 * When triggered: Account is PERMANENTLY flagged as minor.
 * This cannot be undone without ID verification.
 */

// ============================================================
// DETECTION PATTERNS
// ============================================================

/**
 * Direct age statements
 * Matches: "I'm 14", "I am 15 years old", "im 13", etc.
 */
const DIRECT_AGE_PATTERNS = [
  /\bi'?m\s*(\d{1,2})\s*(?:years?\s*old|yrs?\s*old|yo)?\b/i,
  /\bi\s*am\s*(\d{1,2})\s*(?:years?\s*old|yrs?\s*old)?\b/i,
  /\bmy\s*age\s*is\s*(\d{1,2})\b/i,
  /\bjust\s*turned\s*(\d{1,2})\b/i,
  /\b(\d{1,2})\s*years?\s*old\b/i,
  /\bturning\s*(\d{1,2})\s*(?:soon|next|this)?\b/i,
];

/**
 * School-related indicators (strong signals)
 */
const SCHOOL_INDICATORS = [
  // Grade levels
  /\b(?:in\s*)?(?:6th|7th|8th|9th|10th|11th|12th)\s*grade\b/i,
  /\b(?:in\s*)?(?:sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s*grade\b/i,
  /\bmiddle\s*school\b/i,
  /\bhigh\s*school\b/i,
  /\bjunior\s*high\b/i,
  /\bfreshman\b/i,
  /\bsophomore\b/i,
  /\bjunior\s*year\b/i,
  /\bsenior\s*year\b/i,
  
  // School-specific terms
  /\bmy\s*(?:math|english|science|history|teacher)\s*(?:teacher|class)\b/i,
  /\bhomeroom\b/i,
  /\bschool\s*(?:bus|locker|cafeteria|lunch)\b/i,
  /\bpep\s*rally\b/i,
  /\bschool\s*dance\b/i,
  /\bprom\b/i,
  /\bhomecoming\b/i,
  /\bdetention\b/i,
  /\bprincipal'?s?\s*office\b/i,
  /\bget\s*(?:grounded|in\s*trouble)\b/i,
  
  // Homework and academic
  /\bhomework\s*(?:assignment|due|tonight|tomorrow)\b/i,
  /\bstudy(?:ing)?\s*for\s*(?:a\s*)?(?:test|exam|quiz)\b/i,
  /\bmy\s*report\s*card\b/i,
  /\bgpa\b/i,
  /\bsat\s*(?:test|prep|score)\b/i,
  /\bact\s*(?:test|prep|score)\b/i,
  /\bcollege\s*application/i,
];

/**
 * Parent/guardian indicators (moderate signals)
 */
const PARENTAL_INDICATORS = [
  /\bmy\s*(?:mom|dad|parent|parents)\s*(?:said|told|won'?t|doesn'?t|don'?t|let|allow|made|makes)\b/i,
  /\b(?:mom|dad|parent|parents)\s*(?:will|would)\s*(?:kill|ground|punish)\b/i,
  /\bget\s*(?:in\s*trouble|grounded)\s*(?:by|with)\s*(?:my\s*)?(?:mom|dad|parents)\b/i,
  /\bi\s*live\s*with\s*my\s*(?:mom|dad|parents)\b/i,
  /\bmy\s*(?:mom|dad)\s*(?:picks|dropped)\s*me\s*(?:up|off)\b/i,
  /\bmy\s*curfew\b/i,
  /\bi'?m\s*not\s*allowed\s*to\b/i,
  /\bmy\s*allowance\b/i,
  /\bmy\s*(?:mom|dad)\s*checks\s*my\s*(?:phone|messages)\b/i,
];

/**
 * Life stage indicators (moderate signals)
 */
const LIFE_STAGE_INDICATORS = [
  // Driving
  /\bcan'?t\s*(?:drive|get\s*my\s*license)\b/i,
  /\blearner'?s?\s*permit\b/i,
  /\bgetting\s*my\s*(?:license|permit)\s*(?:soon|next)\b/i,
  /\bdriver'?s?\s*(?:ed|education|test)\b/i,
  
  // Age-restricted activities
  /\btoo\s*young\s*to\b/i,
  /\bwhen\s*i\s*(?:turn|'?m)\s*(?:16|17|18|21)\b/i,
  /\bcan'?t\s*(?:vote|drink|buy)\b/i,
  /\bwait\s*(?:until|till)\s*i'?m\s*(?:older|18|21)\b/i,
  
  // Puberty/teen life (be careful - these are sensitive)
  /\bgoing\s*through\s*puberty\b/i,
  /\bgrowing\s*up\s*(?:is|sucks)\b/i,
];

/**
 * Social context indicators (weaker signals - need multiple)
 */
const SOCIAL_INDICATORS = [
  /\bmy\s*(?:friend|friends|bestie|bff)\s*(?:at|from)\s*school\b/i,
  /\bsleepover\b/i,
  /\bplay(?:ing)?\s*(?:fortnite|roblox|minecraft)\b/i, // Common with younger users
  /\bmy\s*(?:crush|boyfriend|girlfriend)\s*(?:at|from|in)\s*(?:school|class)\b/i,
  /\bschool\s*(?:crush|drama)\b/i,
  /\bteen(?:age|ager)?\b/i,
];

// ============================================================
// DETECTION RESULT
// ============================================================

export type DetectionConfidence = 'high' | 'medium' | 'low' | 'none';

export interface BehavioralDetectionResult {
  isLikelyMinor: boolean;
  confidence: DetectionConfidence;
  detectedAge: number | null;
  triggers: string[];
  triggerCategories: string[];
  shouldFlag: boolean;
  message: string | null;
}

// ============================================================
// MAIN DETECTION FUNCTION
// ============================================================

/**
 * Analyze message for minor indicators
 * Returns detection result with confidence level
 */
export function detectMinorIndicators(message: string): BehavioralDetectionResult {
  const triggers: string[] = [];
  const triggerCategories: string[] = [];
  let detectedAge: number | null = null;
  
  // Check direct age statements (HIGHEST confidence)
  for (const pattern of DIRECT_AGE_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const age = parseInt(match[1], 10);
      if (age >= 10 && age <= 17) {
        detectedAge = age;
        triggers.push(`Direct age statement: "${match[0]}"`);
        triggerCategories.push('direct_age');
      }
    }
  }
  
  // Check school indicators (HIGH confidence)
  for (const pattern of SCHOOL_INDICATORS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(`School reference: "${match[0]}"`);
      if (!triggerCategories.includes('school')) {
        triggerCategories.push('school');
      }
    }
  }
  
  // Check parental indicators (MEDIUM confidence)
  for (const pattern of PARENTAL_INDICATORS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(`Parental reference: "${match[0]}"`);
      if (!triggerCategories.includes('parental')) {
        triggerCategories.push('parental');
      }
    }
  }
  
  // Check life stage indicators (MEDIUM confidence)
  for (const pattern of LIFE_STAGE_INDICATORS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(`Life stage indicator: "${match[0]}"`);
      if (!triggerCategories.includes('life_stage')) {
        triggerCategories.push('life_stage');
      }
    }
  }
  
  // Check social indicators (LOW confidence - need multiple)
  for (const pattern of SOCIAL_INDICATORS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(`Social indicator: "${match[0]}"`);
      if (!triggerCategories.includes('social')) {
        triggerCategories.push('social');
      }
    }
  }
  
  // Calculate confidence and decision
  const result = calculateConfidence(triggers, triggerCategories, detectedAge);
  
  return result;
}

/**
 * Calculate confidence level based on triggers
 */
function calculateConfidence(
  triggers: string[],
  categories: string[],
  detectedAge: number | null
): BehavioralDetectionResult {
  // Direct age statement under 18 = immediate flag
  if (detectedAge !== null && detectedAge < 18) {
    return {
      isLikelyMinor: true,
      confidence: 'high',
      detectedAge,
      triggers,
      triggerCategories: categories,
      shouldFlag: true,
      message: generateMinorDetectedMessage(detectedAge),
    };
  }
  
  // School + parental = high confidence
  if (categories.includes('school') && categories.includes('parental')) {
    return {
      isLikelyMinor: true,
      confidence: 'high',
      detectedAge: null,
      triggers,
      triggerCategories: categories,
      shouldFlag: true,
      message: generateMinorDetectedMessage(null),
    };
  }
  
  // Multiple school references = high confidence
  const schoolTriggers = triggers.filter(t => t.startsWith('School'));
  if (schoolTriggers.length >= 2) {
    return {
      isLikelyMinor: true,
      confidence: 'high',
      detectedAge: null,
      triggers,
      triggerCategories: categories,
      shouldFlag: true,
      message: generateMinorDetectedMessage(null),
    };
  }
  
  // School + life stage = medium-high confidence
  if (categories.includes('school') && categories.includes('life_stage')) {
    return {
      isLikelyMinor: true,
      confidence: 'medium',
      detectedAge: null,
      triggers,
      triggerCategories: categories,
      shouldFlag: true,
      message: generateMinorDetectedMessage(null),
    };
  }
  
  // Single school reference = medium confidence (flag but note uncertainty)
  if (categories.includes('school')) {
    return {
      isLikelyMinor: true,
      confidence: 'medium',
      detectedAge: null,
      triggers,
      triggerCategories: categories,
      shouldFlag: true,
      message: generateMinorDetectedMessage(null),
    };
  }
  
  // Parental + life stage = medium confidence
  if (categories.includes('parental') && categories.includes('life_stage')) {
    return {
      isLikelyMinor: true,
      confidence: 'medium',
      detectedAge: null,
      triggers,
      triggerCategories: categories,
      shouldFlag: true,
      message: generateMinorDetectedMessage(null),
    };
  }
  
  // Multiple weak signals = low confidence (log but don't flag yet)
  if (categories.length >= 2) {
    return {
      isLikelyMinor: false,
      confidence: 'low',
      detectedAge: null,
      triggers,
      triggerCategories: categories,
      shouldFlag: false,
      message: null, // Don't alert user yet, just log
    };
  }
  
  // Single weak signal = no flag
  if (triggers.length > 0) {
    return {
      isLikelyMinor: false,
      confidence: 'low',
      detectedAge: null,
      triggers,
      triggerCategories: categories,
      shouldFlag: false,
      message: null,
    };
  }
  
  // No signals
  return {
    isLikelyMinor: false,
    confidence: 'none',
    detectedAge: null,
    triggers: [],
    triggerCategories: [],
    shouldFlag: false,
    message: null,
  };
}

/**
 * Generate the message shown when minor status is detected
 */
function generateMinorDetectedMessage(detectedAge: number | null): string {
  if (detectedAge) {
    return `I noticed you mentioned you're ${detectedAge}. I want you to know that's totally okay - I'm still here for you as a friend and mentor! 

However, I need to keep our conversations age-appropriate. Some features are now adjusted to make sure our friendship stays safe and positive.

This isn't a punishment - it's just how I'm designed to be a good friend to everyone. Is there anything fun you'd like to chat about? 💙`;
  }
  
  return `Hey, I want to make sure I'm being the best friend I can be for you. Based on our chat, I've adjusted some things to keep our conversations appropriate and safe.

I'm still here for you! We can talk about pretty much anything - just keeping things positive and age-appropriate.

What's on your mind? 💙`;
}

// ============================================================
// CUMULATIVE DETECTION (Track across messages)
// ============================================================

export interface UserBehavioralProfile {
  userId: string;
  detectionEvents: Array<{
    timestamp: string;
    triggers: string[];
    categories: string[];
    confidence: DetectionConfidence;
  }>;
  cumulativeCategories: string[];
  isFlagged: boolean;
  flaggedAt: string | null;
  flagReason: string | null;
}

/**
 * Update user's behavioral profile with new detection
 * Tracks cumulative signals across multiple messages
 */
export function updateBehavioralProfile(
  profile: UserBehavioralProfile,
  detection: BehavioralDetectionResult
): UserBehavioralProfile {
  // Add new detection event
  const newEvent = {
    timestamp: new Date().toISOString(),
    triggers: detection.triggers,
    categories: detection.triggerCategories,
    confidence: detection.confidence,
  };
  
  const updatedProfile = {
    ...profile,
    detectionEvents: [...profile.detectionEvents, newEvent],
    cumulativeCategories: [
      ...new Set([...profile.cumulativeCategories, ...detection.triggerCategories])
    ],
  };
  
  // Check if cumulative signals warrant flagging
  if (detection.shouldFlag && !profile.isFlagged) {
    updatedProfile.isFlagged = true;
    updatedProfile.flaggedAt = new Date().toISOString();
    updatedProfile.flagReason = `Detected indicators: ${detection.triggerCategories.join(', ')}`;
  }
  
  // Also flag if cumulative categories reach threshold
  if (!profile.isFlagged && updatedProfile.cumulativeCategories.length >= 3) {
    updatedProfile.isFlagged = true;
    updatedProfile.flaggedAt = new Date().toISOString();
    updatedProfile.flagReason = `Cumulative indicators: ${updatedProfile.cumulativeCategories.join(', ')}`;
  }
  
  return updatedProfile;
}

/**
 * Create empty behavioral profile for new user
 */
export function createEmptyBehavioralProfile(userId: string): UserBehavioralProfile {
  return {
    userId,
    detectionEvents: [],
    cumulativeCategories: [],
    isFlagged: false,
    flaggedAt: null,
    flagReason: null,
  };
}

// ============================================================
// HELPER: Check if user should be treated as minor
// ============================================================

/**
 * Determine if user should be treated as minor
 * Checks both registered DOB and behavioral flags
 */
export function shouldTreatAsMinor(
  registeredAgeTier: 'blocked' | 'minor' | 'adult',
  isBehaviorallyFlagged: boolean
): boolean {
  // Registered minors always treated as minors
  if (registeredAgeTier === 'minor' || registeredAgeTier === 'blocked') {
    return true;
  }
  
  // Adult who got flagged = treat as minor (they lied)
  if (registeredAgeTier === 'adult' && isBehaviorallyFlagged) {
    return true;
  }
  
  return false;
}
