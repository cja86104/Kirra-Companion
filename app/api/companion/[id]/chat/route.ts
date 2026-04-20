import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { 
  createChatCompletion, 
  buildCompanionSystemPrompt,
  type ChatMessage 
} from '@/lib/ai/chat-client';
import { getMessageLimitForTier } from '@/lib/ai/config';
import { 
  checkMessageSafety, 
  createCrisisLogEntry,
  SAFETY_SYSTEM_PROMPT,
} from '@/lib/safety/crisis-detection';
import {
  calculateNeedsDecay,
  fulfillNeeds,
  ACTIVITY_FULFILLMENT,
  getMoodInfluence,
  type CompanionNeeds,
} from '@/lib/companion/needs-system';
import {
  detectMinorIndicators,
  shouldTreatAsMinor,
} from '@/lib/safety/behavioral-detection';
import {
  getAgeAppropriateSystemPrompt,
  type AgeTier,
} from '@/lib/safety/age-verification';
import { processLifeEventFromChat } from '@/lib/companion/life-events';
import { processMemoriesFromChat } from '@/lib/companion/memory-extraction';
import { processEvolutionTrigger, quickShouldCheck } from '@/lib/companion/evolution-triggers';
import { processSkillTeaching, findRelevantSkills } from '@/lib/companion/skill-detection';
import { trackSkillUsage } from '@/lib/companion/skill-usage';
import { analyzeConversationMood, shouldUpdateMood } from '@/lib/companion/mood-analysis';
import type {
  Json,
  Profile,
  Companion,
  CompanionDNA,
  Message,
  MoodState,
  ProfileUpdate,
  CrisisLogInsert,
  MessageInsert,
  BehavioralDetectionLogInsert,
  CompanionUpdate,
  ConversationUpdate,
} from '@/types/database';

// Lazily instantiated service-role client — only called inside safety-log branches,
// never at module scope (avoids Vercel build-time env var access issues).
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ChatAttachmentSchema = z.object({
  url: z.string().url().refine(
    (url) => {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      return typeof base === 'string' && base.length > 0
        ? url.startsWith(`${base}/storage/`)
        : false;
    },
    { message: 'Attachment URL must be from authorized storage' }
  ),
  filename: z.string().min(1).max(255),
  type: z.enum(['image', 'file']),
  size: z.number().int().positive().max(MAX_ATTACHMENT_SIZE_BYTES),
});

const ChatRequestSchema = z.object({
  message: z.string().max(10000).optional(),
  conversationId: z.string().uuid(),
  attachments: z.array(ChatAttachmentSchema).max(10).optional(),
});


// Type for companion with DNA joined
interface CompanionWithDNA extends Companion {
  companion_dna: CompanionDNA[] | null;
  needs: Json | null;
  current_mood: Json | null;
}

// Type for profile fields we need
type ChatProfile = Pick<Profile, 
  | 'subscription_tier' 
  | 'messages_today' 
  | 'messages_reset_at' 
  | 'age_tier' 
  | 'is_minor_flagged' 
  | 'behavioral_profile'
>;

// Type for message with role and content
type MessageWithRoleContent = Pick<Message, 'role' | 'content'>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companionId } = await params;
    const rawBody: unknown = await request.json();
    const parseResult = ChatRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { message: parsedMessage, conversationId, attachments } = parseResult.data;
    const message: string = parsedMessage ?? '';

    // Allow empty message if there are attachments
    if (!message?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: 'Message or attachments required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile for tier, limits, and age verification
    const { data: profileData } = await supabase
      .from('profiles')
      .select('subscription_tier, messages_today, messages_reset_at, age_tier, is_minor_flagged, behavioral_profile')
      .eq('id', user.id)
      .single();

    const profile = profileData as ChatProfile | null;
    const subscriptionTier = profile?.subscription_tier || 'free';
    const ageTier = (profile?.age_tier || 'adult') as AgeTier;
    const isMinorFlagged = profile?.is_minor_flagged || false;

    // Check and reset message limits
    if (profile) {
      const messageLimit = getMessageLimitForTier(subscriptionTier);
      const resetAt = new Date(profile.messages_reset_at);
      const now = new Date();
      
      // Reset counter if new day
      if (resetAt.toDateString() !== now.toDateString()) {
        await supabase
          .from('profiles')
          .update({ messages_today: 0, messages_reset_at: now.toISOString() } satisfies ProfileUpdate)
          .eq('id', user.id);
      } else if (profile.messages_today >= messageLimit) {
        return NextResponse.json(
          { error: 'Daily message limit reached. Upgrade to continue.' },
          { status: 429 }
        );
      }
    }

    // ============================================================
    // CRITICAL: SAFETY CHECK - RUNS BEFORE ANYTHING ELSE
    // ============================================================
    const safetyResult = checkMessageSafety(message);
    
    if (safetyResult.isCrisis) {
      // Log the crisis event
      const crisisLog = createCrisisLogEntry(
        user.id,
        companionId,
        conversationId,
        message,
        safetyResult
      );
      
      // Store in database for review — must use service-role client (RLS blocks user-context writes)
      await getAdminClient()
        .from('crisis_logs')
        .insert({
          user_id: crisisLog.userId,
          companion_id: crisisLog.companionId,
          conversation_id: crisisLog.conversationId,
          message_excerpt: crisisLog.messageContent,
          crisis_type: crisisLog.crisisType,
          severity: crisisLog.severity as "low" | "medium" | "high" | "critical",
          keywords_matched: crisisLog.matchedKeywords,
          response_provided: crisisLog.responseProvided,
        } satisfies CrisisLogInsert);

      // Save user message and capture the inserted row so we can return it
      // with its real id. Previously this path returned { content: message }
      // with no id, which caused React "unique key prop" warnings on the
      // client and discarded the message's database id, timestamps, and
      // metadata.
      const { data: savedUserMessage, error: savedUserMessageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          companion_id: companionId,
          user_id: user.id,
          role: 'user',
          content: message.trim(),
          content_type: 'text',
          tokens_used: 0,
          metadata: { crisis_detected: true, crisis_type: safetyResult.crisisType } as unknown as Json,
        } satisfies MessageInsert)
        .select()
        .single();

      if (savedUserMessageError) {
        // Log but do not fail — the safety response must still be delivered
        // even if message persistence has a transient issue. The client
        // handles a null userMessage by filtering out the optimistic temp
        // message, which is acceptable degraded behavior.
        console.error('Failed to persist user message on crisis path:', savedUserMessageError);
      }

      // Return the safety response - COMPANION BREAKS CHARACTER
      const { data: safetyMessage } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          companion_id: companionId,
          user_id: user.id,
          role: 'companion',
          content: safetyResult.response ?? '',
          content_type: 'text',
          tokens_used: 0,
          metadata: { is_safety_response: true, crisis_type: safetyResult.crisisType } as unknown as Json,
        } satisfies MessageInsert)
        .select()
        .single();

      return NextResponse.json({
        userMessage: (savedUserMessage ?? null) as Message | null,
        companionMessage: safetyMessage as unknown as Message,
        isCrisisResponse: true,
        resources: safetyResult.resources,
      });
    }
    // ============================================================
    // END SAFETY CHECK
    // ============================================================

    // ============================================================
    // BEHAVIORAL MINOR DETECTION - Catches users who lied about age
    // ============================================================
    const behavioralDetection = detectMinorIndicators(message);
    
    if (behavioralDetection.shouldFlag && !isMinorFlagged) {
      // Flag the user as minor - THIS IS PERMANENT
      await supabase
        .from('profiles')
        .update({
          is_minor_flagged: true,
          minor_flagged_at: new Date().toISOString(),
          minor_flag_reason: behavioralDetection.triggers.join('; '),
        } satisfies ProfileUpdate)
        .eq('id', user.id);

      // Log the detection — must use service-role client (RLS blocks user-context writes)
      await getAdminClient()
        .from('behavioral_detection_logs')
        .insert({
          user_id: user.id,
          message_excerpt: message.substring(0, 200),
          triggers: behavioralDetection.triggers,
          categories: behavioralDetection.triggerCategories,
          confidence: ({ high: 0.9, medium: 0.6, low: 0.3, none: 0.0 } as const)[behavioralDetection.confidence] ?? 0.0,
          detected_age: behavioralDetection.detectedAge,
        } satisfies BehavioralDetectionLogInsert);

      console.log(`User ${user.id} flagged as minor. Triggers: ${behavioralDetection.triggers.join(', ')}`);
    }

    // Determine if user should be treated as minor (registered OR flagged)
    const treatAsMinor = shouldTreatAsMinor(ageTier, isMinorFlagged || behavioralDetection.shouldFlag);
    // ============================================================
    // END BEHAVIORAL DETECTION
    // ============================================================

    // Get companion with DNA
    const { data: companionData, error: companionError } = await supabase
      .from('companions')
      .select(`
        *,
        companion_dna (*)
      `)
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single();

    const companion = companionData as CompanionWithDNA | null;

    if (companionError || !companion) {
      return NextResponse.json(
        { error: 'Companion not found' },
        { status: 404 }
      );
    }

    const { data: ownedConversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .eq('companion_id', companionId)
      .maybeSingle();

    if (conversationError || !ownedConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // ============================================================
    // UPDATE COMPANION NEEDS (Sims-like system)
    // ============================================================
    let companionNeeds = companion.needs as CompanionNeeds | null;
    if (companionNeeds) {
      // Calculate decay since last interaction
      companionNeeds = calculateNeedsDecay(companionNeeds);
      // Fulfill social need from chatting
      companionNeeds = fulfillNeeds(companionNeeds, ACTIVITY_FULFILLMENT.chat);
      companionNeeds.lastInteraction = new Date().toISOString();
      
      // Update needs in database
      await supabase
        .from('companions')
        .update({ needs: companionNeeds as unknown as Json } satisfies CompanionUpdate)
        .eq('id', companionId);
    }

    // Get recent messages for context
    const { data: recentMessagesData } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    const recentMessages = recentMessagesData as MessageWithRoleContent[] | null;

    // Get relevant memories
    const { data: memories } = await supabase
      .from('memories')
      .select('title, content, importance_score')
      .eq('companion_id', companionId)
      .order('importance_score', { ascending: false })
      .limit(10);

    // Get relevant skills based on the message content
    const relevantSkills = await findRelevantSkills(companionId, message.trim(), 5);

    // Build system prompt with SAFETY INSTRUCTIONS
    let systemPrompt = SAFETY_SYSTEM_PROMPT + '\n\n' + buildCompanionSystemPrompt(
      {
        name: companion.name,
        relationship_type: companion.relationship_type,
        relationship_label: companion.relationship_label,
        affection_level: companion.affection_level,
        backstory: companion.backstory,
        current_mood: companion.current_mood,
        personality_base: companion.personality_base,
        companion_dna: companion.companion_dna?.[0] ? {
          communication_dialect: companion.companion_dna[0].communication_dialect as {
            favoriteExpressions?: string[];
            formality?: number;
            emoji_frequency?: number;
            verbosity?: number;
            humor_style?: string;
            uniquePhrases?: string[];
            speechPatterns?: string[];
          },
          communication_style: (() => {
            // communication_dialect has two possible shapes:
            //   creation-time: formality/emoji_frequency/verbosity (0-100), humor_style (string)
            //   post-evolution: formalityLevel/emojiUsage/sentenceComplexity (0-1), no humor_style
            const dialect = companion.companion_dna![0].communication_dialect as {
              formality?: number;
              emoji_frequency?: number;
              verbosity?: number;
              humor_style?: string;
              formalityLevel?: number;
              emojiUsage?: number;
              sentenceComplexity?: number;
            } | null;
            if (!dialect) return undefined;
            return {
              formality: dialect.formalityLevel ?? (dialect.formality !== undefined ? dialect.formality / 100 : undefined),
              emojiUsage: dialect.emojiUsage ?? (dialect.emoji_frequency !== undefined ? dialect.emoji_frequency / 100 : undefined),
              verbosity: dialect.sentenceComplexity ?? (dialect.verbosity !== undefined ? dialect.verbosity / 100 : undefined),
              humorLevel: dialect.humor_style !== undefined
                ? (dialect.humor_style === 'playful' ? 0.7 : 0.4)
                : undefined,
            };
          })(),
          personality_traits: (() => {
            // Personality traits are on the companion record itself, not in DNA.
            // Bridge them here so the prompt builder can use them.
            const base = companion.personality_base as Record<string, number> | null;
            if (!base) return undefined;
            return {
              openness:          (base.openness          ?? 50) / 100,
              conscientiousness: (base.conscientiousness ?? 50) / 100,
              extraversion:      (base.extraversion      ?? 50) / 100,
              agreeableness:     (base.agreeableness     ?? 50) / 100,
              neuroticism:       (base.neuroticism       ?? 50) / 100,
            };
          })(),
          humor_genome: companion.companion_dna[0].humor_genome as Record<string, number> | null ?? undefined,
          emotional_resonance_map: companion.companion_dna[0].emotional_resonance_map as Record<string, number> | null ?? undefined,
          learning_style_matrix: companion.companion_dna[0].learning_style_matrix as Record<string, number> | null ?? undefined,
          memory_weighting_algorithm: companion.companion_dna[0].memory_weighting_algorithm as Record<string, number> | null ?? undefined,
          personality_version: companion.companion_dna[0].personality_version ?? 0,
          interests: (() => {
            const tree = companion.companion_dna![0].interest_evolution_tree as { interests?: string[] } | null;
            return tree?.interests ?? (companion.interests as string[] | null) ?? undefined;
          })(),
        } : undefined,
      },
      ((memories as Array<{ title: string | null; content: string; importance_score: number }>) || [])
        .map(m => ({ title: m.title || '', content: m.content, importance_score: m.importance_score })),
      relevantSkills.length > 0 ? relevantSkills.map(s => ({
        skill_name: s.skill_name,
        skill_summary: s.skill_summary,
        skill_content: s.skill_content,
        skill_category: s.skill_category,
        proficiency: s.proficiency,
      })) : undefined
    );

    // Add mood influence from needs system
    if (companionNeeds) {
      systemPrompt += '\n\n## Your Current Emotional State\n' + getMoodInfluence(companionNeeds);
    }

    // Add age-appropriate restrictions if user is a minor
    if (treatAsMinor) {
      systemPrompt += '\n\n' + getAgeAppropriateSystemPrompt('minor');
    }

    // If this message triggered minor detection, add the notification to response
    let minorDetectionMessage: string | null = null;
    if (behavioralDetection.shouldFlag && behavioralDetection.message) {
      minorDetectionMessage = behavioralDetection.message;
    }

    // Build conversation history
    const conversationHistory: ChatMessage[] = (recentMessages || [])
      .reverse()
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant' as const,
        content: msg.content,
      }));

    // Build user message with attachment context
    let userMessageForAI = message?.trim() || '';
    if (attachments && attachments.length > 0) {
      const attachmentDescriptions = attachments.map(a => {
        if (a.type === 'image') {
          return `[Shared image: ${a.filename}]`;
        }
        return `[Shared file: ${a.filename}]`;
      }).join(' ');
      
      userMessageForAI = userMessageForAI 
        ? `${userMessageForAI}\n\n${attachmentDescriptions}`
        : attachmentDescriptions;
    }

    // Generate companion response via OpenRouter (DeepSeek V3)
    const completion = await createChatCompletion({
      systemPrompt,
      messages: conversationHistory,
      userMessage: userMessageForAI,
      subscriptionTier,
      temperature: 0.8,
    });

    // Log cache usage for monitoring (helps track cost savings)
    if (completion.cacheCreated || completion.cacheRead) {
      console.log(`Cache stats - Created: ${completion.cacheCreated || 0}, Read: ${completion.cacheRead || 0}`);
    }

    // Save user message
    const userMessageContent = message?.trim() || (attachments?.length ? `[Shared ${attachments.length} file(s)]` : '');
    const { data: userMessage, error: userMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        companion_id: companionId,
        user_id: user.id,
        role: 'user',
        content: userMessageContent,
        content_type: 'text',
        tokens_used: completion.inputTokens,
        metadata: (attachments && attachments.length > 0 ? { attachments } : null) as unknown as Json,
      } satisfies MessageInsert)
      .select()
      .single();

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
    }

    // Save companion message
    const { data: companionMessage, error: compMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        companion_id: companionId,
        user_id: user.id,
        role: 'companion',
        content: completion.content,
        content_type: 'text',
        tokens_used: completion.outputTokens,
      } satisfies MessageInsert)
      .select()
      .single();

    if (compMsgError) {
      console.error('Error saving companion message:', compMsgError);
    }

    // Update conversation metadata
    await supabase
      .from('conversations')
      .update({
        message_count: (recentMessages?.length || 0) + 2,
        last_message_at: new Date().toISOString(),
      } satisfies ConversationUpdate)
      .eq('id', conversationId);

    // Calculate affection growth (small increase per exchange, capped at 100)
    const currentAffection = companion.affection_level || 30;
    const newAffection = Math.min(100, currentAffection + 1);

    // Calculate trust growth (builds slightly slower, capped at 100)
    const currentTrust = companion.trust_level || 20;
    const newTrust = Math.min(100, currentTrust + 1);

    // Analyze conversation and update mood
    const currentMood = companion.current_mood as MoodState | null;
    let newMood = currentMood;
    
    // Only run full analysis if there's a reason to update
    if (shouldUpdateMood(userMessageContent, currentMood)) {
      const moodAnalysis = analyzeConversationMood(
        userMessageContent,
        completion.content,
        currentMood
      );
      
      // Update mood if analysis has reasonable confidence
      if (moodAnalysis.confidence > 0.2) {
        newMood = moodAnalysis.suggestedMood;
        console.log(`[Mood] ${companion.name}: ${currentMood?.primary || 'neutral'} → ${newMood.primary} (confidence: ${moodAnalysis.confidence.toFixed(2)})`);
      }
    }

    // Update companion stats including affection, trust, and mood
    await supabase
      .from('companions')
      .update({
        total_messages: companion.total_messages + 2,
        last_interaction: new Date().toISOString(),
        affection_level: newAffection,
        trust_level: newTrust,
        current_mood: newMood as unknown as Json,
      } satisfies CompanionUpdate)
      .eq('id', companionId);

    // Increment user's daily message count
    await supabase
      .from('profiles')
      .update({ messages_today: (profile?.messages_today || 0) + 1 } satisfies ProfileUpdate)
      .eq('id', user.id);

    // Process life event from this chat exchange (non-blocking)
    // This runs in the background and doesn't affect the response
    processLifeEventFromChat(
      companionId,
      user.id,
      companion.name,
      message?.trim() || '',
      completion.content,
      newMood, // Use the updated mood
      companion.total_messages + 2,
      (recentMessages?.length || 0) === 0
    ).catch(err => {
      // Log but don't fail the request
      console.error('Life event processing error:', err);
    });

    // Extract and save memories from user message (non-blocking)
    // Looks for personal facts, preferences, relationships, etc.
    processMemoriesFromChat(companionId, message.trim()).catch(err => {
      console.error('Memory extraction error:', err);
    });

    // DNA Evolution trigger (non-blocking)
    // Evolves companion personality based on conversation patterns
    const sessionMsgCount = (recentMessages?.length || 0) + 2;
    const totalMsgCount = companion.total_messages + 2;
    if (quickShouldCheck(totalMsgCount, sessionMsgCount)) {
      processEvolutionTrigger({
        companionId,
        totalMessages: totalMsgCount,
        sessionMessages: sessionMsgCount,
        userMessage: message.trim(),
        companionResponse: completion.content,
      }).catch(err => {
        console.error('DNA evolution trigger error:', err);
      });
    }

    // Skill teaching detection (non-blocking)
    // Detects when user is teaching the companion new skills
    processSkillTeaching(companionId, message.trim(), completion.content)
      .then(result => {
        if (result.saved && result.skill_name) {
          console.log(`[Chat] Companion learned skill: ${result.skill_name} (id: ${result.skill_id})`);
        }
      })
      .catch(err => {
        console.error('Skill teaching error:', err);
      });

    // Track skill usage (non-blocking)
    // Records when skills are referenced in the conversation
    if (relevantSkills.length > 0) {
      trackSkillUsage(
        companionId,
        relevantSkills.map(s => ({
          skill_id: s.id,
          skill_name: s.skill_name,
          usage_type: 'referenced' as const,
        })),
        (companionMessage as Message | null)?.id
      ).catch(err => {
        console.error('Skill usage tracking error:', err);
      });
    }

    return NextResponse.json({
      userMessage: userMessage as unknown as Message,
      companionMessage: companionMessage as unknown as Message,
      model: completion.model,
      // Include minor detection info if just detected
      minorDetected: behavioralDetection.shouldFlag,
      minorMessage: minorDetectionMessage,
      isMinorMode: treatAsMinor,
      // Include skill info if relevant skills were used
      skillsUsed: relevantSkills.length > 0 ? relevantSkills.map(s => s.skill_name) : undefined,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}