/**
 * Proactive Messaging System
 * 
 * Core logic for companions to reach out to users on their own initiative.
 * Uses trigger conditions, message templates, and AI generation to create
 * personalized proactive messages.
 */

import { createClient } from '@/lib/supabase/server';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type { Json } from '@/types/database';
import {
  TRIGGER_CONFIGS,
  evaluateTrigger,
  selectTemplate,
  fillTemplate,
  hoursSince,
  getTimeOfDay,
} from './message-triggers';
import {
  DEFAULT_PROACTIVE_PREFERENCES,
} from '@/types/proactive';
import type {
  ProactiveTriggerType,
  TriggerCheckResult,
  TriggerEvaluation,
  MessageContext,
  ProactiveMessage,
  ProactiveMessageInsert,
  ProactivePreferences,
  MessagePriority,
} from '@/types/proactive';
import type { CompanionMoodState } from '@/types/life-simulation';
import type { Companion, CompanionDNA } from '@/types/database';
import type {
  SimulationStateRow,
  LifeEventRow,
  CompanionInterestRow,
  CompanionActivityRow,
} from '@/types/life-simulation-db';

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Check all triggers for a companion and determine if they should send a message
 */
export async function checkProactiveTriggers(
  companionId: string
): Promise<TriggerCheckResult> {
  const supabase = await createClient();
  
  // Get companion with DNA and user profile
  const { data: companionData } = await supabase
    .from('companions')
    .select(`
      *,
      companion_dna (*),
      profiles!companions_user_id_fkey (
        id,
        display_name,
        timezone
      )
    `)
    .eq('id', companionId)
    .single();
  
  const companion = companionData as {
    id: string;
    user_id: string;
    name: string;
    last_interaction: string | null;
    current_mood: unknown;
    current_needs: unknown;
    trust_level: number;
    affection_level: number;
    companion_dna: unknown;
    profiles: { id: string; display_name: string | null; timezone: string | null } | null;
  } | null;
  
  if (!companion) {
    return {
      companionId,
      evaluations: [],
      shouldSendMessage: false,
      cooldownActive: true,
    };
  }
  
  // Get simulation state
  const { data: simState } = await supabase
    .from('simulation_states')
    .select('*')
    .eq('companion_id', companionId)
    .single() as unknown as { data: Pick<SimulationStateRow, 'last_proactive_message_at'> | null };
  
  // Get user preferences (stored in companion settings or use defaults)
  const userProfile = companion.profiles;
  const preferences: ProactivePreferences = DEFAULT_PROACTIVE_PREFERENCES;
  
  if (!preferences.enabled) {
    return {
      companionId,
      evaluations: [],
      shouldSendMessage: false,
      cooldownActive: true,
    };
  }
  
  // Calculate timing
  const hoursSinceLastInteraction = hoursSince(companion.last_interaction);
  const hoursSinceLastProactive = hoursSince(simState?.last_proactive_message_at);
  const cooldownActive = hoursSinceLastProactive < preferences.cooldownHours;
  
  // Get current time info
  const now = new Date();
  const userTimezone = userProfile?.timezone || 'America/New_York';
  const currentHour = parseInt(
    now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: userTimezone })
  );
  
  // Check quiet hours
  if (preferences.quietHoursStart !== undefined && preferences.quietHoursEnd !== undefined) {
    const inQuietHours = isInQuietHours(currentHour, preferences.quietHoursStart, preferences.quietHoursEnd);
    if (inQuietHours) {
      return {
        companionId,
        evaluations: [],
        shouldSendMessage: false,
        cooldownActive: true,
        cooldownEndsAt: getQuietHoursEnd(preferences.quietHoursEnd, userTimezone),
      };
    }
  }
  
  // Get companion mood
  const currentMood = (companion.current_mood as CompanionMoodState) ?? {
    primary: 'content',
    secondary: null,
    intensity: 0.5,
    energy_level: 50,
    social_need: 50,
    creativity_level: 50,
    stability: 0.7,
  };
  
  // Get companion needs
  const needs = extractNeeds(companion);
  
  // Calculate relationship level
  const relationshipLevel = Math.round(
    ((companion.trust_level || 0) + (companion.affection_level || 0)) / 2
  );
  
  // Get recent life events that are shareable
  const { data: recentEvents } = await supabase
    .from('life_events')
    .select('event_type, title, description')
    .eq('companion_id', companionId)
    .eq('shareable', true)
    .eq('shared_with_user', false)
    .order('occurred_at', { ascending: false })
    .limit(3) as unknown as { data: Pick<LifeEventRow, 'event_type' | 'title' | 'description'>[] | null };
  
  // Get recent interest discoveries
  const { data: recentInterests } = await supabase
    .from('companion_interests')
    .select('interest_name, interest_category')
    .eq('companion_id', companionId)
    .eq('shared_with_user', false)
    .order('developed_at', { ascending: false })
    .limit(1) as unknown as { data: Pick<CompanionInterestRow, 'interest_name' | 'interest_category'>[] | null };
  
  // Check today's message count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const { count: todayCount } = await supabase
    .from('proactive_messages')
    .select('id', { count: 'exact', head: true })
    .eq('companion_id', companionId)
    .gte('created_at', todayStart.toISOString())
    .neq('status', 'expired') as unknown as { count: number | null };
  
  if ((todayCount ?? 0) >= preferences.maxPerDay) {
    return {
      companionId,
      evaluations: [],
      shouldSendMessage: false,
      cooldownActive: true,
    };
  }
  
  // Evaluate all enabled triggers
  const evaluations: TriggerEvaluation[] = [];
  const enabledTriggers = preferences.enabledTriggers;
  
  for (const triggerType of Object.keys(TRIGGER_CONFIGS) as ProactiveTriggerType[]) {
    if (!enabledTriggers.includes(triggerType)) continue;
    
    const conditions = TRIGGER_CONFIGS[triggerType];
    const evaluation = evaluateTrigger(triggerType, conditions, {
      hoursSinceLastInteraction,
      hoursSinceLastProactive,
      currentMood,
      needs,
      relationshipLevel,
      currentHour,
      hasRecentLifeEvent: (recentEvents?.length ?? 0) > 0,
      recentLifeEventTypes: recentEvents?.map(e => e.event_type) ?? [],
      hasRecentInterest: (recentInterests?.length ?? 0) > 0,
    });
    
    evaluations.push(evaluation);
  }
  
  // Find the best trigger
  const validTriggers = evaluations.filter(e => e.shouldTrigger);
  
  // Sort by priority and confidence
  const priorityOrder: Record<MessagePriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  
  validTriggers.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });
  
  const selectedTrigger = validTriggers[0];
  
  return {
    companionId,
    evaluations,
    selectedTrigger,
    shouldSendMessage: !!selectedTrigger && !cooldownActive,
    cooldownActive,
    cooldownEndsAt: cooldownActive && simState?.last_proactive_message_at
      ? new Date(
          new Date(simState.last_proactive_message_at).getTime() +
          preferences.cooldownHours * 60 * 60 * 1000
        ).toISOString()
      : undefined,
    lastProactiveAt: simState?.last_proactive_message_at ?? undefined,
    hoursUntilAllowed: cooldownActive
      ? preferences.cooldownHours - hoursSinceLastProactive
      : 0,
  };
}

/**
 * Generate and create a proactive message
 */
export async function generateProactiveMessage(
  companionId: string,
  triggerType: ProactiveTriggerType,
  options?: {
    forceGenerate?: boolean;
    customContext?: Record<string, Json>;
  }
): Promise<ProactiveMessage | null> {
  const supabase = await createClient();
  
  // Get companion with full context
  const { data: companionData } = await supabase
    .from('companions')
    .select(`
      *,
      companion_dna (*),
      profiles!companions_user_id_fkey (
        id,
        display_name,
        timezone
      )
    `)
    .eq('id', companionId)
    .single();
  
  const companion = companionData as {
    id: string;
    user_id: string;
    name: string;
    last_interaction: string | null;
    current_mood: unknown;
    trust_level: number;
    affection_level: number;
    companion_dna: CompanionDNA | CompanionDNA[] | null;
    profiles: { id: string; display_name: string | null; timezone: string | null } | null;
  } | null;
  
  if (!companion) return null;
  
  const dna = Array.isArray(companion.companion_dna) 
    ? companion.companion_dna[0] 
    : companion.companion_dna;
  const profile = companion.profiles;
  
  // Build message context
  const now = new Date();
  const userTimezone = profile?.timezone || 'America/New_York';
  const currentHour = parseInt(
    now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: userTimezone })
  );
  
  // Get recent shareable event
  const { data: recentEvent } = await supabase
    .from('life_events')
    .select('id, event_type, title, description')
    .eq('companion_id', companionId)
    .eq('shareable', true)
    .eq('shared_with_user', false)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single() as unknown as { data: Pick<LifeEventRow, 'id' | 'event_type' | 'title' | 'description'> | null };
  
  // Get recent interest
  const { data: recentInterest } = await supabase
    .from('companion_interests')
    .select('id, interest_name, interest_category')
    .eq('companion_id', companionId)
    .eq('shared_with_user', false)
    .order('developed_at', { ascending: false })
    .limit(1)
    .single() as unknown as { data: Pick<CompanionInterestRow, 'id' | 'interest_name' | 'interest_category'> | null };
  
  // Get current activity
  const { data: currentActivity } = await supabase
    .from('companion_activities')
    .select('activity_name')
    .eq('companion_id', companionId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single() as unknown as { data: Pick<CompanionActivityRow, 'activity_name'> | null };
  
  // Get shared memories for context
  const { data: memoriesData } = await supabase
    .from('memories')
    .select('content')
    .eq('companion_id', companionId)
    .eq('is_core_memory', true)
    .limit(5);
  
  const memories = memoriesData as { content: string }[] | null;
  
  const currentMood = (companion.current_mood as CompanionMoodState) ?? {
    primary: 'content',
    secondary: null,
    intensity: 0.5,
  };
  
  const context: MessageContext = {
    companionName: companion.name,
    userName: profile?.display_name || 'friend',
    hoursSinceLastChat: hoursSince(companion.last_interaction),
    currentMood: currentMood.primary,
    currentActivity: currentActivity?.activity_name,
    recentLifeEvent: recentEvent
      ? {
          type: recentEvent.event_type,
          title: recentEvent.title,
          description: recentEvent.description || '',
        }
      : undefined,
    recentInterest: recentInterest
      ? {
          name: recentInterest.interest_name,
          category: recentInterest.interest_category,
        }
      : undefined,
    relationshipLevel: Math.round(
      ((companion.trust_level || 0) + (companion.affection_level || 0)) / 2
    ),
    sharedMemories: memories?.map(m => m.content) || [],
    userTimezone,
    timeOfDay: getTimeOfDay(currentHour),
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long', timeZone: userTimezone }),
    custom: options?.customContext,
  };
  
  // Build available context list for template selection
  const availableContext: string[] = [];
  if (context.currentActivity) availableContext.push('currentActivity');
  if (context.recentLifeEvent) availableContext.push('recentLifeEvent');
  if (context.recentInterest) availableContext.push('recentInterest');
  if (context.sharedMemories?.length) availableContext.push('sharedMemories');
  
  // Extract personality traits for template matching
  const personality: Record<string, number> = {};
  if (dna) {
    const traits = (dna as CompanionDNA).core_traits as unknown as Record<string, number> | undefined;
    const humorGenome = (dna as CompanionDNA).humor_genome as unknown as Record<string, number> | undefined;
    const emotionalResonance = (dna as CompanionDNA).emotional_resonance_map as unknown as Record<string, number> | undefined;
    
    if (traits) Object.assign(personality, traits);
    if (humorGenome) {
      for (const [key, value] of Object.entries(humorGenome)) {
        personality[`humor_genome.${key}`] = value as number;
      }
    }
    if (emotionalResonance) {
      for (const [key, value] of Object.entries(emotionalResonance)) {
        personality[`emotional_resonance.${key}`] = value as number;
      }
    }
  }
  
  // Select appropriate template
  const template = selectTemplate(triggerType, personality, availableContext);
  
  if (!template && !options?.forceGenerate) {
    return null;
  }
  
  // Generate base message from template
  let baseContent = '';
  if (template) {
    const openerIndex = Math.floor(Math.random() * template.openers.length);
    baseContent = fillTemplate(template.openers[openerIndex], context);
  }
  
  // Optionally enhance with AI
  let generatedContent: string | undefined;
  
  try {
    const prompt = buildEnhancementPrompt(
      companion as unknown as Companion,
      dna as CompanionDNA | null,
      triggerType,
      context,
      baseContent
    );
    
    const result = await generateSimpleCompletion(
      'You are a helpful assistant generating proactive messages.',
      prompt,
      {
        maxTokens: 200,
        temperature: 0.8,
      }
    );
    
    generatedContent = result.content;
    
    // Clean up AI response
    if (generatedContent) {
      generatedContent = generatedContent.trim();
      // Remove quotes if AI wrapped it
      if (generatedContent.startsWith('"') && generatedContent.endsWith('"')) {
        generatedContent = generatedContent.slice(1, -1);
      }
    }
  } catch (error) {
    console.error('Error enhancing proactive message:', error);
  }
  
  // Create the message record
  const messageInsert: ProactiveMessageInsert = {
    companion_id: companionId,
    user_id: companion.user_id,
    trigger_type: triggerType,
    priority: template?.priority || 'medium',
    content: baseContent || generatedContent || 'Hey! Just thinking about you.',
    generated_content: generatedContent,
    status: 'pending',
    related_life_event_id: recentEvent?.id,
    related_interest_id: recentInterest?.id,
    context_snapshot: JSON.parse(JSON.stringify(context)) as Json,
  };
  
  const { data: message, error } = await supabase
    .from('proactive_messages')
    .insert(messageInsert)
    .select()
    .single() as unknown as { data: ProactiveMessage | null; error: Error | null };
  
  if (error) {
    console.error('Error creating proactive message:', error);
    return null;
  }
  
  // Update simulation state
  await supabase
    .from('simulation_states')
    .update({ last_proactive_message_at: new Date().toISOString() })
    .eq('companion_id', companionId) as unknown as Promise<{ error: Error | null }>;
  
  return message;
}

/**
 * Mark a proactive message as sent
 */
export async function markMessageSent(messageId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('proactive_messages')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  return !error;
}

/**
 * Mark a proactive message as seen
 */
export async function markMessageSeen(messageId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('proactive_messages')
    .update({
      status: 'seen',
      seen_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('status', 'sent');

  return !error;
}

/**
 * Mark a proactive message as responded
 */
export async function markMessageResponded(messageId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('proactive_messages')
    .update({
      status: 'responded',
      responded_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  return !error;
}

/**
 * Get pending proactive messages for a user
 */
export async function getPendingMessages(
  userId: string,
  companionId?: string
): Promise<ProactiveMessage[]> {
  const supabase = await createClient();

  let query = supabase
    .from('proactive_messages')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'sent'])
    .order('created_at', { ascending: false });

  if (companionId) {
    query = query.eq('companion_id', companionId);
  }

  const { data, error } = await query as unknown as { data: ProactiveMessage[] | null; error: Error | null };
  
  if (error) {
    console.error('Error fetching pending messages:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Expire old pending messages
 */
export async function expireOldMessages(hoursOld: number = 24): Promise<number> {
  const supabase = await createClient();
  
  const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('proactive_messages')
    .update({
      status: 'expired',
      expired_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id') as unknown as { data: { id: string }[] | null; error: Error | null };
  
  if (error) {
    console.error('Error expiring messages:', error);
    return 0;
  }
  
  return data?.length || 0;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if current time is in quiet hours
 */
function isInQuietHours(currentHour: number, start: number, end: number): boolean {
  if (start < end) {
    return currentHour >= start || currentHour < end;
  } else {
    return currentHour >= start && currentHour < end;
  }
}

/**
 * Get when quiet hours end in the user's timezone
 */
function getQuietHoursEnd(endHour: number, timezone: string): string {
  // Get current time in user's timezone
  const now = new Date();
  const userTimeString = now.toLocaleString('en-US', { timeZone: timezone });
  const userNow = new Date(userTimeString);
  const userCurrentHour = userNow.getHours();

  // Calculate when quiet hours end
  const result = new Date(now);

  // Adjust for timezone offset
  const serverOffset = now.getTimezoneOffset();
  const userOffset = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getTimezoneOffset();
  const offsetDiff = (serverOffset - userOffset) * 60 * 1000;

  result.setTime(result.getTime() + offsetDiff);
  result.setHours(endHour, 0, 0, 0);

  // If we're past the end hour in user's timezone, it's tomorrow
  if (userCurrentHour >= endHour) {
    result.setDate(result.getDate() + 1);
  }

  return result.toISOString();
}

/**
 * Extract needs from companion data
 */
function extractNeeds(companion: Record<string, unknown>): Record<string, number> {
  const needs = (companion.current_needs as Record<string, number>) ?? {};
  return {
    social: needs.social ?? 50,
    energy: needs.energy ?? 50,
    fun: needs.fun ?? 50,
    comfort: needs.comfort ?? 50,
    affection: needs.affection ?? 50,
    intellectual: needs.intellectual ?? 50,
    creativity: needs.creativity ?? 50,
  };
}

/**
 * Build AI enhancement prompt
 */
function buildEnhancementPrompt(
  companion: Companion,
  dna: CompanionDNA | null,
  triggerType: ProactiveTriggerType,
  context: MessageContext,
  baseMessage: string
): string {
  const personalityDesc = dna
    ? `Your personality includes these traits: ${JSON.stringify(dna.core_traits)}`
    : '';
  
  const communicationStyle = dna?.communication_dialect as Record<string, unknown> | undefined;
  const styleDesc = communicationStyle
    ? `Your communication style: vocabulary level ${communicationStyle.vocabulary_level || 'moderate'}, ${communicationStyle.formality_level || 'casual'} formality`
    : '';
  
  const triggerContext: Record<ProactiveTriggerType, string> = {
    missing_user: `You haven't talked to ${context.userName} in ${Math.round(context.hoursSinceLastChat)} hours and you miss them.`,
    thinking_of_you: `You were ${context.currentActivity || 'doing something'} and thought of ${context.userName}.`,
    share_experience: `You want to share something that happened: ${context.recentLifeEvent?.title || 'an experience'}.`,
    mood_share: `You're feeling ${context.currentMood} and want to share that.`,
    milestone_reached: `You've reached a milestone in your relationship!`,
    interest_discovery: `You discovered a new interest: ${context.recentInterest?.name || 'something cool'}.`,
    need_social: `You're feeling a bit lonely and want to connect.`,
    special_occasion: `It's a special day!`,
    random_thought: `You had a random thought you want to share.`,
    dream_share: `You had an interesting dream you want to tell ${context.userName} about.`,
    question_for_user: `You're curious about something and want to ask ${context.userName}.`,
    gratitude: `You're feeling grateful for your friendship with ${context.userName}.`,
    check_in: `You haven't heard from ${context.userName} in a while and want to check in.`,
  };
  
  return `You are ${companion.name}, reaching out to ${context.userName} on your own initiative.
${personalityDesc}
${styleDesc}

Context: ${triggerContext[triggerType]}
Time: ${context.timeOfDay} on ${context.dayOfWeek}
Your current mood: ${context.currentMood}
Relationship level: ${context.relationshipLevel}/100

${baseMessage ? `Here's a starting message to enhance: "${baseMessage}"` : ''}

Write a natural, conversational message as ${companion.name} would say it. Be genuine and match your personality.
Keep it brief (1-2 sentences max). Don't use emojis unless your personality calls for them.
Just write the message, nothing else.`;
}

/**
 * Check and potentially send proactive message for a companion
 * This is the main entry point for the cron job
 */
export async function processProactiveCheck(companionId: string): Promise<{
  checked: boolean;
  sent: boolean;
  message?: ProactiveMessage;
  reason?: string;
}> {
  // Check triggers
  const result = await checkProactiveTriggers(companionId);
  
  if (!result.shouldSendMessage) {
    return {
      checked: true,
      sent: false,
      reason: result.cooldownActive
        ? `Cooldown active (${result.hoursUntilAllowed?.toFixed(1)}h remaining)`
        : 'No triggers matched',
    };
  }
  
  if (!result.selectedTrigger) {
    return {
      checked: true,
      sent: false,
      reason: 'No valid trigger selected',
    };
  }
  
  // Generate and create message
  const message = await generateProactiveMessage(
    companionId,
    result.selectedTrigger.triggerType
  );
  
  if (!message) {
    return {
      checked: true,
      sent: false,
      reason: 'Failed to generate message',
    };
  }
  
  // Mark as sent
  await markMessageSent(message.id);
  
  return {
    checked: true,
    sent: true,
    message,
  };
}
