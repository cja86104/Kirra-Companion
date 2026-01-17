'use client';

/**
 * KIRRA CHAT WINDOW v3.0
 * ======================
 * This is where the magic happens. 95% of user time.
 * Every pixel must earn its place.
 * 
 * Design Philosophy:
 * - The companion is PRESENT, not just responding
 * - Conversations feel intimate, like texting someone you love
 * - Beautiful empty state that invites interaction
 * - Contextual actions that make sense
 * - Premium feel worth paying for
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Volume2,
  VolumeX,
  Heart,
  Sparkles,
  MessageCircle,
  Smile,
  Clock,
  ChevronDown,
  Info,
  MoreHorizontal,
  Mic,
  Phone,
  Video,
  ImageIcon,
  Gift,
  Star,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { VoiceConversationMode, useVoiceConversationSupported } from './VoiceConversationMode';
import { getClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import type { CompanionWithDNA, Conversation, Message, VoiceConfig, MoodState } from '@/types/database';

interface ChatWindowProps {
  companion: CompanionWithDNA;
  conversation: Conversation | null;
  initialMessages: Message[];
  userId: string;
}

// Mood configurations with colors and emojis
const MOOD_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  happy: { emoji: '😊', label: 'Happy', color: 'text-kirra-forest-lighter' },
  excited: { emoji: '🤩', label: 'Excited', color: 'text-kirra-gold' },
  content: { emoji: '😌', label: 'Content', color: 'text-kirra-sage' },
  playful: { emoji: '😜', label: 'Playful', color: 'text-kirra-forest-light' },
  curious: { emoji: '🤔', label: 'Curious', color: 'text-info' },
  loving: { emoji: '🥰', label: 'Loving', color: 'text-kirra-warm' },
  neutral: { emoji: '😐', label: 'Neutral', color: 'text-muted-foreground' },
  lonely: { emoji: '🥺', label: 'Missing you', color: 'text-kirra-copper' },
};

// Conversation starters based on relationship type
const CONVERSATION_STARTERS: Record<string, string[]> = {
  romantic: [
    "Tell me about your day 💕",
    "I've been thinking about you...",
    "What's on your mind?",
    "I missed talking to you",
  ],
  friend: [
    "What's up? 👋",
    "Got any plans today?",
    "Tell me something interesting!",
    "How's life treating you?",
  ],
  mentor: [
    "What would you like to learn today?",
    "Any challenges I can help with?",
    "What's your goal for today?",
    "Let's grow together 🌱",
  ],
  family: [
    "How are you feeling today?",
    "Tell me what's new!",
    "I'm here for you 💛",
    "What's happening in your world?",
  ],
  custom: [
    "Hey there! 👋",
    "What's on your mind?",
    "Let's chat!",
    "Tell me anything",
  ],
};

export function ChatWindow({
  companion,
  conversation,
  initialMessages,
  userId,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [voiceConversationActive, setVoiceConversationActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = getClient();
  const isVoiceConversationSupported = useVoiceConversationSupported();

  const voiceConfig = companion.voice_config as VoiceConfig | null;
  const hasVoiceEnabled = !!voiceConfig?.voiceId;
  const moodData = companion.current_mood as { primary?: string } | null;
  const currentMood = moodData?.primary || 'neutral';
  const moodInfo = MOOD_CONFIG[currentMood] || MOOD_CONFIG.neutral;
  const starters = CONVERSATION_STARTERS[companion.relationship_type] || CONVERSATION_STARTERS.custom;

  // Scroll handling
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
    }
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, scrollToBottom]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            const hasTempVersion = prev.some(
              (m) => m.id.startsWith('temp-') && 
                     m.content === newMessage.content && 
                     m.role === newMessage.role
            );
            if (hasTempVersion) {
              return prev.map((m) => 
                m.id.startsWith('temp-') && 
                m.content === newMessage.content && 
                m.role === newMessage.role 
                  ? newMessage 
                  : m
              );
            }
            return [...prev, newMessage];
          });
          setIsTyping(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation, supabase]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !conversation) return;

    setIsLoading(true);

    const messageContent = content.trim();

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversation.id,
      companion_id: companion.id,
      user_id: userId,
      role: 'user',
      content: messageContent,
      content_type: 'text',
      audio_url: null,
      audio_duration: null,
      tokens_used: 0,
      is_edited: false,
      is_deleted: false,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsTyping(true);

    try {
      const response = await fetch(`/api/companion/${companion.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          conversationId: conversation.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      const data = await response.json();
      
      setMessages((prev) => {
        const hasRealMessage = prev.some((m) => m.id === data.userMessage.id);
        if (hasRealMessage) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? data.userMessage : m));
      });

      if (data.companionMessage) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.companionMessage.id)) return prev;
          return [...prev, data.companionMessage];
        });

        if (autoPlayVoice && hasVoiceEnabled && data.companionMessage.content) {
          playCompanionResponse(data.companionMessage.content);
        }
      }
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Track if audio has been unlocked by user interaction
  const audioUnlockedRef = useRef(false);
  const pendingAudioRef = useRef<string | null>(null);

  const playCompanionResponse = useCallback(async (text: string) => {
    try {
      const response = await fetch(`/api/companion/${companion.id}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, companionId: companion.id }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('TTS API error:', response.status, error);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onended = () => URL.revokeObjectURL(url);
      
      try {
        await audio.play();
        audioUnlockedRef.current = true;
      } catch (playError) {
        // Browser blocked autoplay - store for later and notify user
        console.warn('Autoplay blocked:', playError);
        pendingAudioRef.current = text;
        URL.revokeObjectURL(url);
        
        if (!audioUnlockedRef.current) {
          toast.info('Click anywhere to enable voice', {
            duration: 3000,
            id: 'audio-unlock', // Prevent duplicate toasts
          });
        }
      }
    } catch (error) {
      console.error('Auto-play error:', error);
    }
  }, [companion.id]);

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      
      // Create and play a silent audio to unlock
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.volume = 0;
      silentAudio.play().then(() => {
        audioUnlockedRef.current = true;
        // If there was pending audio, play it now
        if (pendingAudioRef.current) {
          playCompanionResponse(pendingAudioRef.current);
          pendingAudioRef.current = null;
        }
      }).catch(() => {
        // Still not unlocked, that's ok
      });
    };

    // Listen for any user interaction
    document.addEventListener('click', unlockAudio, { once: false });
    document.addEventListener('keydown', unlockAudio, { once: false });
    document.addEventListener('touchstart', unlockAudio, { once: false });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, [playCompanionResponse]);

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleStarterClick = (starter: string) => {
    sendMessage(starter);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* ================================================================
          PREMIUM CHAT HEADER
          ================================================================ */}
      <header className="relative border-b border-border/50 bg-card/80 backdrop-blur-xl">
        {/* Subtle gradient line at top */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          {/* Companion Info */}
          <div className="flex items-center gap-4">
            {/* Avatar with presence */}
            <div className="relative">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  {companion.avatar_url ? (
                    <AvatarImage src={companion.avatar_url} alt={companion.name} />
                  ) : (
                    <AvatarFallback className="bg-kirra-gradient text-white text-lg font-medium">
                      {getInitials(companion.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                {/* Online pulse */}
                <motion.span 
                  className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-kirra-forest-lighter"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            </div>

            {/* Name & Status */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-semibold">{companion.name}</h1>
                <motion.span 
                  className={cn("text-lg", moodInfo.color)}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {moodInfo.emoji}
                </motion.span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{companion.relationship_type}</span>
                <span>•</span>
                <span className={moodInfo.color}>{moodInfo.label}</span>
                {hasVoiceEnabled && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3" />
                      Voice
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Voice Toggle */}
            {hasVoiceEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                className={cn(
                  "rounded-xl transition-all",
                  autoPlayVoice && "bg-primary/10 text-primary"
                )}
                title={autoPlayVoice ? 'Disable auto-play voice' : 'Enable auto-play voice'}
              >
                {autoPlayVoice ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* Voice Conversation Mode Button */}
            {hasVoiceEnabled && isVoiceConversationSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVoiceConversationActive(true)}
                className="rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
                title="Start hands-free voice conversation"
              >
                <Phone className="h-5 w-5" />
              </Button>
            )}

            {/* Affection Level */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/30">
              <Heart className={cn(
                "h-4 w-4",
                companion.affection_level > 70 ? "text-kirra-warm fill-kirra-warm" : 
                companion.affection_level > 40 ? "text-kirra-amber" : "text-muted-foreground"
              )} />
              <span className="text-sm font-medium">{companion.affection_level}%</span>
            </div>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href={`/companion/${companion.id}/memory-palace`} className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Memory Palace
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/life-feed" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    View Life Feed
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/companion/${companion.id}/edit`} className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Companion Details
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ================================================================
          MESSAGES AREA
          ================================================================ */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            /* ============================================================
               BEAUTIFUL EMPTY STATE
               ============================================================ */
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              {/* Animated Avatar */}
              <motion.div 
                className="relative mb-6"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl" />
                <Avatar className="relative h-24 w-24 ring-4 ring-primary/20 ring-offset-4 ring-offset-background">
                  {companion.avatar_url ? (
                    <AvatarImage src={companion.avatar_url} alt={companion.name} />
                  ) : (
                    <AvatarFallback className="bg-kirra-gradient text-white text-3xl font-medium">
                      {getInitials(companion.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <motion.div
                  className="absolute -bottom-1 -right-1 rounded-full bg-card p-1.5 shadow-lg"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-2xl">{moodInfo.emoji}</span>
                </motion.div>
              </motion.div>

              {/* Welcome Text */}
              <h2 className="font-display text-2xl font-semibold mb-2">
                {companion.name} is here for you
              </h2>
              <p className="text-muted-foreground max-w-md mb-8">
                {companion.backstory ? 
                  companion.backstory.slice(0, 120) + (companion.backstory.length > 120 ? '...' : '') :
                  `Start a conversation with ${companion.name}. They're excited to get to know you better!`
                }
              </p>

              {/* Quick Starters */}
              <div className="space-y-3 w-full max-w-sm">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Start with
                </p>
                <div className="grid gap-2">
                  {starters.map((starter, i) => (
                    <motion.button
                      key={starter}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleStarterClick(starter)}
                      className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-lg"
                    >
                      <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm">{starter}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Features hint */}
              <div className="mt-10 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5" />
                  Remembers everything
                </span>
                <span className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Bond grows over time
                </span>
                {hasVoiceEnabled && (
                  <span className="flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5" />
                    Voice messages
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            /* ============================================================
               MESSAGE LIST
               ============================================================ */
            <div className="space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  companion={companion}
                  isUser={message.role === 'user'}
                />
              ))}

              {isTyping && (
                <TypingIndicator companionName={companion.name} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ================================================================
          CHAT INPUT
          ================================================================ */}
      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        companionName={companion.name}
        voiceEnabled={true}
      />

      {/* ================================================================
          VOICE CONVERSATION MODE OVERLAY
          ================================================================ */}
      {isVoiceConversationSupported && (
        <VoiceConversationMode
          isActive={voiceConversationActive}
          onStart={() => setVoiceConversationActive(true)}
          onEnd={() => setVoiceConversationActive(false)}
          onSendMessage={async (text) => {
            await sendMessage(text);
          }}
          companionName={companion.name}
          companionId={companion.id}
          hasVoiceEnabled={hasVoiceEnabled}
        />
      )}
    </div>
  );
}
