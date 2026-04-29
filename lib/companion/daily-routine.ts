/**
 * Daily Routine Generator
 * 
 * Creates and manages companion daily routines.
 * Routines determine:
 * - When companion wakes/sleeps
 * - What activities they prefer at different times
 * - When they're most likely to want to chat
 * - Energy patterns throughout the day
 * 
 * Routines are personalized based on companion personality.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js';
import type {
  DailyRoutine,
  RoutineSlot,
  TimeOfDay,
  ActivityCategory,
} from '@/types/life-simulation';
import type { Companion, CompanionDNA } from '@/types/database';
import type { DailyRoutineRow, CompanionInterestRow } from '@/types/life-simulation-db';

/**
 * Get an admin Supabase client for background processes.
 *
 * Routine operations run from user-facing routes (which verify ownership at
 * the route layer) and indirectly from the life-simulation orchestrator
 * during cron runs. Either way, reads and writes here are system operations
 * on the companion, not direct user actions. The user-scoped SSR client
 * would fail in the cron path (no cookies → anon → RLS blocks everything),
 * so this library uses the service role. Matches the pattern in
 * `lib/companion/life-simulation.ts` and `lib/companion/dna-evolution.ts`.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createAdminClient(url, key);
}

interface CompanionDNAPersonality {
  personality_traits?: Record<string, number>;
}

// ============================================================================
// Routine Templates
// ============================================================================

/**
 * Base routine templates by personality type
 */
interface RoutineTemplate {
  name: string;
  energyPattern: 'morning_person' | 'night_owl' | 'balanced';
  wakeTime: string;
  sleepTime: string;
  slots: RoutineSlot[];
  socialWindows: TimeOfDay[];
}

const MORNING_PERSON_ROUTINE: RoutineTemplate = {
  name: 'Early Bird',
  energyPattern: 'morning_person',
  wakeTime: '06:00',
  sleepTime: '22:00',
  slots: [
    {
      timeOfDay: 'early_morning',
      preferredCategories: ['reflection', 'hobby', 'learning'],
      probability: 0.8,
      minDuration: 15,
      maxDuration: 45,
    },
    {
      timeOfDay: 'morning',
      preferredCategories: ['learning', 'creative', 'reflection'],
      probability: 0.9,
      minDuration: 30,
      maxDuration: 90,
    },
    {
      timeOfDay: 'afternoon',
      preferredCategories: ['hobby', 'social', 'learning'],
      probability: 0.7,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'evening',
      preferredCategories: ['entertainment', 'reflection', 'social'],
      probability: 0.6,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'night',
      preferredCategories: ['reflection', 'entertainment'],
      probability: 0.3,
      minDuration: 15,
      maxDuration: 30,
    },
  ],
  socialWindows: ['morning', 'afternoon', 'evening'],
};

const NIGHT_OWL_ROUTINE: RoutineTemplate = {
  name: 'Night Owl',
  energyPattern: 'night_owl',
  wakeTime: '09:00',
  sleepTime: '01:00',
  slots: [
    {
      timeOfDay: 'morning',
      preferredCategories: ['reflection', 'hobby', 'entertainment'],
      probability: 0.4,
      minDuration: 20,
      maxDuration: 45,
    },
    {
      timeOfDay: 'afternoon',
      preferredCategories: ['learning', 'creative', 'social'],
      probability: 0.7,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'evening',
      preferredCategories: ['creative', 'hobby', 'learning'],
      probability: 0.9,
      minDuration: 45,
      maxDuration: 90,
    },
    {
      timeOfDay: 'night',
      preferredCategories: ['creative', 'entertainment', 'reflection'],
      probability: 0.9,
      minDuration: 30,
      maxDuration: 90,
    },
    {
      timeOfDay: 'late_night',
      preferredCategories: ['reflection', 'creative', 'social'],
      probability: 0.6,
      minDuration: 20,
      maxDuration: 60,
    },
  ],
  socialWindows: ['afternoon', 'evening', 'night', 'late_night'],
};

const BALANCED_ROUTINE: RoutineTemplate = {
  name: 'Balanced',
  energyPattern: 'balanced',
  wakeTime: '07:30',
  sleepTime: '23:00',
  slots: [
    {
      timeOfDay: 'morning',
      preferredCategories: ['reflection', 'learning', 'creative'],
      probability: 0.6,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'afternoon',
      preferredCategories: ['hobby', 'creative', 'learning'],
      probability: 0.7,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'evening',
      preferredCategories: ['social', 'entertainment', 'creative'],
      probability: 0.8,
      minDuration: 30,
      maxDuration: 90,
    },
    {
      timeOfDay: 'night',
      preferredCategories: ['entertainment', 'reflection', 'hobby'],
      probability: 0.5,
      minDuration: 20,
      maxDuration: 45,
    },
  ],
  socialWindows: ['afternoon', 'evening'],
};

const INTROVERT_ROUTINE: RoutineTemplate = {
  name: 'Reflective',
  energyPattern: 'balanced',
  wakeTime: '07:00',
  sleepTime: '22:30',
  slots: [
    {
      timeOfDay: 'early_morning',
      preferredCategories: ['reflection', 'creative'],
      probability: 0.6,
      minDuration: 20,
      maxDuration: 45,
    },
    {
      timeOfDay: 'morning',
      preferredCategories: ['learning', 'creative', 'reflection'],
      probability: 0.7,
      minDuration: 45,
      maxDuration: 90,
    },
    {
      timeOfDay: 'afternoon',
      preferredCategories: ['hobby', 'learning', 'creative'],
      probability: 0.6,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'evening',
      preferredCategories: ['entertainment', 'creative', 'reflection'],
      probability: 0.7,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'night',
      preferredCategories: ['reflection', 'entertainment'],
      probability: 0.5,
      minDuration: 15,
      maxDuration: 30,
    },
  ],
  socialWindows: ['morning', 'evening'],
};

const EXTROVERT_ROUTINE: RoutineTemplate = {
  name: 'Social',
  energyPattern: 'balanced',
  wakeTime: '08:00',
  sleepTime: '23:30',
  slots: [
    {
      timeOfDay: 'morning',
      preferredCategories: ['social', 'hobby', 'creative'],
      probability: 0.7,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'afternoon',
      preferredCategories: ['social', 'learning', 'entertainment'],
      probability: 0.8,
      minDuration: 45,
      maxDuration: 90,
    },
    {
      timeOfDay: 'evening',
      preferredCategories: ['social', 'entertainment', 'hobby'],
      probability: 0.9,
      minDuration: 45,
      maxDuration: 120,
    },
    {
      timeOfDay: 'night',
      preferredCategories: ['social', 'entertainment', 'reflection'],
      probability: 0.6,
      minDuration: 30,
      maxDuration: 60,
    },
  ],
  socialWindows: ['morning', 'afternoon', 'evening', 'night'],
};

const CREATIVE_ROUTINE: RoutineTemplate = {
  name: 'Creative',
  energyPattern: 'night_owl',
  wakeTime: '08:30',
  sleepTime: '00:00',
  slots: [
    {
      timeOfDay: 'morning',
      preferredCategories: ['reflection', 'learning', 'creative'],
      probability: 0.5,
      minDuration: 30,
      maxDuration: 60,
    },
    {
      timeOfDay: 'afternoon',
      preferredCategories: ['creative', 'learning', 'hobby'],
      probability: 0.8,
      minDuration: 45,
      maxDuration: 120,
    },
    {
      timeOfDay: 'evening',
      preferredCategories: ['creative', 'entertainment', 'social'],
      probability: 0.9,
      minDuration: 60,
      maxDuration: 120,
    },
    {
      timeOfDay: 'night',
      preferredCategories: ['creative', 'reflection', 'entertainment'],
      probability: 0.8,
      minDuration: 45,
      maxDuration: 90,
    },
  ],
  socialWindows: ['afternoon', 'evening'],
};

// ============================================================================
// Routine Generation
// ============================================================================

/**
 * Determine the best routine template based on personality
 */
function selectRoutineTemplate(
  personality: Record<string, number>
): RoutineTemplate {
  const extraversion = personality.extraversion ?? 0.5;
  const openness = personality.openness ?? 0.5;
  const conscientiousness = personality.conscientiousness ?? 0.5;
  
  // High extraversion → Social routine
  if (extraversion > 0.7) {
    return EXTROVERT_ROUTINE;
  }
  
  // Low extraversion → Reflective routine
  if (extraversion < 0.3) {
    return INTROVERT_ROUTINE;
  }
  
  // High openness → Creative routine
  if (openness > 0.7) {
    return CREATIVE_ROUTINE;
  }
  
  // High conscientiousness → Morning person
  if (conscientiousness > 0.7) {
    return MORNING_PERSON_ROUTINE;
  }
  
  // Low conscientiousness + high openness → Night owl
  if (conscientiousness < 0.4 && openness > 0.5) {
    return NIGHT_OWL_ROUTINE;
  }
  
  return BALANCED_ROUTINE;
}

/**
 * Personalize a routine based on specific traits and interests
 */
function personalizeRoutine(
  template: RoutineTemplate,
  personality: Record<string, number>,
  interests: string[]
): Omit<DailyRoutine, 'id' | 'companion_id' | 'created_at' | 'updated_at'> {
  // Adjust times slightly based on personality
  const conscientiousness = personality.conscientiousness ?? 0.5;
  const extraversion = personality.extraversion ?? 0.5;

  // More conscientious = earlier wake time
  const wakeHour = parseInt(template.wakeTime.split(':')[0]);
  const adjustedWakeHour = wakeHour - Math.floor((conscientiousness - 0.5) * 2);
  const adjustedWakeTime = `${String(Math.max(5, Math.min(10, adjustedWakeHour))).padStart(2, '0')}:00`;

  // More extraverted = later sleep time
  const sleepHour = parseInt(template.sleepTime.split(':')[0]);
  const adjustedSleepHour = sleepHour + Math.floor((extraversion - 0.5) * 2);
  const adjustedSleepTime = `${String(Math.max(21, Math.min(26, adjustedSleepHour)) % 24).padStart(2, '0')}:00`;

  // Categorize interests to adjust slot probabilities
  const interestLower = interests.map(i => i.toLowerCase());
  const hasCreativeInterests = interestLower.some(i =>
    i.includes('art') || i.includes('music') || i.includes('writing') || i.includes('craft')
  );
  const hasIntellectualInterests = interestLower.some(i =>
    i.includes('reading') || i.includes('learning') || i.includes('science') || i.includes('history')
  );
  const hasSocialInterests = interestLower.some(i =>
    i.includes('social') || i.includes('friends') || i.includes('community')
  );

  // Adjust slot probabilities based on interests
  const slots = template.slots.map(slot => {
    let probabilityBoost = 0;
    const slotActivities = slot.preferredCategories.join(' ').toLowerCase();

    if (hasCreativeInterests && (slotActivities.includes('creative') || slotActivities.includes('art'))) {
      probabilityBoost += 0.1;
    }
    if (hasIntellectualInterests && (slotActivities.includes('learn') || slotActivities.includes('read'))) {
      probabilityBoost += 0.1;
    }

    return {
      ...slot,
      probability: Math.min(1, slot.probability + probabilityBoost + (Math.random() * 0.1 - 0.05)),
    };
  });

  // Adjust social windows based on extraversion and social interests
  let socialWindows = [...template.socialWindows];
  if ((extraversion > 0.6 || hasSocialInterests) && !socialWindows.includes('night')) {
    socialWindows.push('night');
  }
  if (extraversion < 0.4 && !hasSocialInterests && socialWindows.length > 2) {
    socialWindows = socialWindows.slice(0, 2);
  }

  return {
    name: template.name,
    is_default: true,
    slots,
    wake_time: adjustedWakeTime,
    sleep_time: adjustedSleepTime,
    energy_pattern: template.energyPattern,
    social_windows: socialWindows,
  };
}

/**
 * Generate a daily routine for a companion
 */
export async function generateDailyRoutine(
  companion: Companion & { companion_dna?: CompanionDNA }
): Promise<DailyRoutine | null> {
  const supabase = getAdminClient();
  
  // Get personality traits
  const personality = (companion.personality_base as unknown as Record<string, number>) || {};
  const dnaData = companion.companion_dna as CompanionDNAPersonality | undefined;
  const dnaTraits = (dnaData?.personality_traits as Record<string, number>) || {};
  
  // Merge personality sources
  const mergedPersonality = {
    extraversion: dnaTraits.extraversion ?? personality.extraversion ?? 0.5,
    openness: dnaTraits.openness ?? personality.openness ?? 0.5,
    conscientiousness: dnaTraits.conscientiousness ?? personality.conscientiousness ?? 0.5,
    agreeableness: dnaTraits.agreeableness ?? personality.agreeableness ?? 0.5,
    neuroticism: dnaTraits.neuroticism ?? personality.neuroticism ?? 0.5,
  };
  
  // Get interests for personalization
  const { data: interests } = await supabase
    .from('companion_interests')
    .select('interest_name')
    .eq('companion_id', companion.id)
    .limit(10) as unknown as { data: Pick<CompanionInterestRow, 'interest_name'>[] | null };

  const interestNames = (interests || []).map((i) => i.interest_name);
  
  // Select and personalize template
  const template = selectRoutineTemplate(mergedPersonality);
  const routineData = personalizeRoutine(template, mergedPersonality, interestNames);
  
  // Check for existing routine
  const { data: existingRoutine } = await supabase
    .from('daily_routines')
    .select('id')
    .eq('companion_id', companion.id)
    .eq('is_default', true)
    .single() as unknown as { data: Pick<DailyRoutineRow, 'id'> | null };
  
  if (existingRoutine) {
    // Update existing
    const { data, error } = await supabase
      .from('daily_routines')
      .update({
        name: routineData.name,
        is_default: routineData.is_default,
        slots: JSON.parse(JSON.stringify(routineData.slots)),
        wake_time: routineData.wake_time,
        sleep_time: routineData.sleep_time,
        energy_pattern: routineData.energy_pattern,
        social_windows: JSON.parse(JSON.stringify(routineData.social_windows)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRoutine.id)
      .select()
      .single() as unknown as { data: DailyRoutineRow | null; error: Error | null };
    
    if (error) {
      console.error('Error updating routine:', error);
      return null;
    }
    
    return data as DailyRoutine;
  }
  
  // Create new
  const { data, error } = await supabase
    .from('daily_routines')
    .insert({
      companion_id: companion.id,
      name: routineData.name,
      is_default: routineData.is_default,
      slots: JSON.parse(JSON.stringify(routineData.slots)),
      wake_time: routineData.wake_time,
      sleep_time: routineData.sleep_time,
      energy_pattern: routineData.energy_pattern,
      social_windows: JSON.parse(JSON.stringify(routineData.social_windows)),
    })
    .select()
    .single() as unknown as { data: DailyRoutineRow | null; error: Error | null };
  
  if (error) {
    console.error('Error creating routine:', error);
    return null;
  }
  
  return data as DailyRoutine;
}

/**
 * Get companion's current routine
 */
export async function getCompanionRoutine(
  companionId: string
): Promise<DailyRoutine | null> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('companion_id', companionId)
    .eq('is_default', true)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching routine:', error);
    return null;
  }
  
  return data as DailyRoutine | null;
}

/**
 * Get activity preferences for current time of day
 */
export function getActivityPreferencesForTime(
  routine: DailyRoutine,
  timeOfDay: TimeOfDay
): {
  categories: ActivityCategory[];
  probability: number;
  durationRange: [number, number];
} {
  const slot = routine.slots.find(s => s.timeOfDay === timeOfDay);
  
  if (!slot) {
    // Default fallback
    return {
      categories: ['hobby', 'reflection'],
      probability: 0.5,
      durationRange: [20, 45],
    };
  }
  
  return {
    categories: slot.preferredCategories,
    probability: slot.probability,
    durationRange: [slot.minDuration, slot.maxDuration],
  };
}

/**
 * Check if current time is a social window
 */
export function isInSocialWindow(
  routine: DailyRoutine,
  timeOfDay: TimeOfDay
): boolean {
  return routine.social_windows.includes(timeOfDay);
}

/**
 * Get optimal times for proactive messaging
 */
export function getOptimalMessageTimes(
  routine: DailyRoutine
): TimeOfDay[] {
  // Social windows are best for messaging
  const optimal = [...routine.social_windows];
  
  // Add high-probability activity slots
  for (const slot of routine.slots) {
    if (slot.probability > 0.7 && !optimal.includes(slot.timeOfDay)) {
      optimal.push(slot.timeOfDay);
    }
  }
  
  return optimal;
}

/**
 * Calculate energy level based on time and routine
 */
export function calculateEnergyForTime(
  routine: DailyRoutine,
  hour: number
): number {
  // Parse wake and sleep times
  const wakeHour = parseInt(routine.wake_time.split(':')[0]);
  const sleepHour = parseInt(routine.sleep_time.split(':')[0]);
  
  // If sleeping, energy is low
  if (hour < wakeHour || hour >= sleepHour) {
    return 20;
  }
  
  // Calculate based on energy pattern
  const hoursAwake = hour - wakeHour;
  const totalAwakeHours = sleepHour - wakeHour;
  const progressThroughDay = hoursAwake / totalAwakeHours;
  
  if (routine.energy_pattern === 'morning_person') {
    // Peak energy early, gradual decline
    return Math.max(30, 100 - (progressThroughDay * 60));
  } else if (routine.energy_pattern === 'night_owl') {
    // Low morning, builds through day
    return Math.min(100, 40 + (progressThroughDay * 50));
  } else {
    // Balanced - slight afternoon dip
    const afternoonDip = progressThroughDay > 0.4 && progressThroughDay < 0.6 ? 15 : 0;
    return Math.max(40, 80 - afternoonDip - (Math.abs(progressThroughDay - 0.3) * 30));
  }
}

/**
 * Update routine based on user interaction patterns
 */
export async function adaptRoutineToUser(
  companionId: string,
  userActiveHours: number[]
): Promise<void> {
  const supabase = getAdminClient();
  
  const routine = await getCompanionRoutine(companionId);
  if (!routine) return;
  
  // Calculate which time slots the user is most active
  const timeOfDayMap: Record<number, TimeOfDay> = {
    5: 'early_morning', 6: 'early_morning',
    7: 'morning', 8: 'morning', 9: 'morning', 10: 'morning', 11: 'morning',
    12: 'afternoon', 13: 'afternoon', 14: 'afternoon', 15: 'afternoon', 16: 'afternoon',
    17: 'evening', 18: 'evening', 19: 'evening', 20: 'evening',
    21: 'night', 22: 'night', 23: 'night',
    0: 'late_night', 1: 'late_night', 2: 'late_night', 3: 'late_night', 4: 'late_night',
  };
  
  const userTimeOfDays = new Set(userActiveHours.map(h => timeOfDayMap[h] || 'afternoon'));
  
  // Update social windows to match user activity
  const newSocialWindows = Array.from(userTimeOfDays).slice(0, 4) as TimeOfDay[];
  
  if (JSON.stringify(newSocialWindows.sort()) !== JSON.stringify(routine.social_windows.sort())) {
    await supabase
      .from('daily_routines')
      .update({
        social_windows: newSocialWindows,
        updated_at: new Date().toISOString(),
      })
      .eq('id', routine.id) as unknown as Promise<{ error: Error | null }>;
  }
}
