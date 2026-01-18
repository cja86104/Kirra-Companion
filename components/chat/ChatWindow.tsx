'use client';

/**
 * KIRRA IMMERSIVE CHAT v8.1
 * =========================
 * - Full scene background
 * - Companion avatar on left with speech bubble
 * - Floating conversation history on right (NO container box)
 * - Input bar at bottom
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
  ChevronLeft,
  MoreHorizontal,
  Phone,
  Star,
  Settings,
  Send,
  Mic,
  Paperclip,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VoiceConversationMode, useVoiceConversationSupported } from './VoiceConversationMode';
import { getClient } from '@/lib/supabase/client';
import { uploadMultipleAttachments } from '@/lib/supabase/storage';
import { cn } from '@/lib/utils/cn';
import type { CompanionWithDNA, Conversation, Message, VoiceConfig } from '@/types/database';
import type { Attachment } from './ChatInput';

interface ChatWindowProps {
  companion: CompanionWithDNA;
  conversation: Conversation | null;
  initialMessages: Message[];
  userId: string;
}

// =============================================================================
// SCENE BACKGROUNDS
// =============================================================================

function getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getSceneBackground(relationshipType: string, timeOfDay: string): string {
  const validTypes = ['romantic', 'friend', 'mentor', 'family', 'custom'];
  const type = validTypes.includes(relationshipType) ? relationshipType : 'custom';
  return `/scenes/${type}-${timeOfDay}.jpg`;
}

// =============================================================================
// MOOD CONFIG
// =============================================================================

interface MoodConfig {
  emoji: string;
  label: string;
  bubbleColor: string;
}

const MOOD_CONFIG: Record<string, MoodConfig> = {
  happy: { emoji: '😊', label: 'Happy', bubbleColor: 'from-amber-100 to-orange-100 border-amber-200' },
  excited: { emoji: '🤩', label: 'Excited', bubbleColor: 'from-rose-100 to-pink-100 border-rose-200' },
  loving: { emoji: '🥰', label: 'Loving', bubbleColor: 'from-rose-100 to-red-100 border-rose-200' },
  calm: { emoji: '😌', label: 'Calm', bubbleColor: 'from-emerald-100 to-teal-100 border-emerald-200' },
  playful: { emoji: '😜', label: 'Playful', bubbleColor: 'from-violet-100 to-purple-100 border-violet-200' },
  curious: { emoji: '🤔', label: 'Curious', bubbleColor: 'from-blue-100 to-cyan-100 border-blue-200' },
  thoughtful: { emoji: '🧐', label: 'Thoughtful', bubbleColor: 'from-slate-100 to-gray-100 border-slate-200' },
  sad: { emoji: '😢', label: 'Sad', bubbleColor: 'from-blue-100 to-indigo-100 border-blue-200' },
  neutral: { emoji: '😐', label: 'Neutral', bubbleColor: 'from-gray-100 to-slate-100 border-gray-200' },
  proud: { emoji: '😤', label: 'Proud', bubbleColor: 'from-emerald-100 to-green-100 border-emerald-200' },
  grateful: { emoji: '🙏', label: 'Grateful', bubbleColor: 'from-rose-100 to-orange-100 border-rose-200' },
  anxious: { emoji: '😰', label: 'Anxious', bubbleColor: 'from-amber-100 to-yellow-100 border-amber-200' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

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
  const [voiceConversationActive, setVoiceConversationActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'day' | 'evening' | 'night'>('day');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = getClient();
  const isVoiceConversationSupported = useVoiceConversationSupported();

  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
  }, []);

  const voiceConfig = companion.voice_config as VoiceConfig | null;
  const hasVoiceEnabled = !!voiceConfig?.voiceId;
  const moodData = companion.current_mood as { primary?: string } | null;
  const currentMood = moodData?.primary || 'neutral';
  const mood = MOOD_CONFIG[currentMood] || MOOD_CONFIG.neutral;

  const lastCompanionMessage = [...messages].reverse().find(m => m.role === 'assistant');
  const sceneUrl = getSceneBackground(companion.relationship_type, timeOfDay);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          const hasTempVersion = prev.some(
            (m) => m.id.startsWith('temp-') && m.content === newMessage.content && m.role === newMessage.role
          );
          if (hasTempVersion) {
            return prev.map((m) =>
              m.id.startsWith('temp-') && m.content === newMessage.content && m.role === newMessage.role
                ? newMessage : m
            );
          }
          return [...prev, newMessage];
        });
        setIsTyping(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation, supabase]);

  const sendMessage = async (content: string, attachments?: Attachment[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || !conversation) return;

    setIsLoading(true);
    setInputValue('');
    const messageContent = content.trim();

    let uploadedAttachments: { url: string; filename: string; type: string; size: number }[] = [];

    if (attachments && attachments.length > 0) {
      const files = attachments.map(a => a.file);
      const { uploaded, failed } = await uploadMultipleAttachments(supabase, userId, companion.id, files);
      if (failed.length > 0) toast.error(`Failed to upload: ${failed.join(', ')}`);
      uploadedAttachments = uploaded.filter(u => u.success && u.url).map((u, i) => ({
        url: u.url!, filename: files[i].name, type: attachments[i].type, size: files[i].size,
      }));
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversation.id,
      companion_id: companion.id,
      user_id: userId,
      role: 'user',
      content: messageContent || `[Sent ${uploadedAttachments.length} attachment(s)]`,
      content_type: 'text',
      audio_url: null,
      audio_duration: null,
      tokens_used: 0,
      is_edited: false,
      is_deleted: false,
      metadata: uploadedAttachments.length > 0 ? { attachments: uploadedAttachments } : null,
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
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      const data = await response.json();

      setMessages((prev) => {
        if (!data.userMessage) return prev.filter((m) => m.id !== tempId);
        const hasRealMessage = prev.some((m) => m.id === data.userMessage.id);
        if (hasRealMessage) return prev.filter((m) => m.id !== tempId);
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

  const audioUnlockedRef = useRef(false);
  const pendingAudioRef = useRef<string | null>(null);

  const playCompanionResponse = useCallback(async (text: string) => {
    try {
      const response = await fetch(`/api/companion/${companion.id}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, companionId: companion.id }),
      });

      if (!response.ok) return;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);

      try {
        await audio.play();
        audioUnlockedRef.current = true;
      } catch {
        pendingAudioRef.current = text;
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Auto-play error:', error);
    }
  }, [companion.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* SCENE BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${sceneUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      </div>

      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4">
        <div className="flex items-center justify-between">
          <Link href="/chat">
            <Button variant="ghost" size="icon" className="rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            {hasVoiceEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                className={cn(
                  "rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm",
                  autoPlayVoice && "bg-white/30"
                )}
              >
                {autoPlayVoice ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            )}
            {hasVoiceEnabled && isVoiceConversationSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVoiceConversationActive(true)}
                className="rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
              >
                <Phone className="h-5 w-5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem asChild>
                  <Link href={`/companion/${companion.id}`} className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/companion/${companion.id}/memory-palace`} className="cursor-pointer">
                    <Brain className="h-4 w-4 mr-2" /> Memories
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* RELATIONSHIP STATS */}
      <div className="absolute top-16 right-4 z-20">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/40 backdrop-blur-md rounded-2xl p-3 text-white"
        >
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4 text-rose-400" />
              <span>{companion.affection_level}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-400" />
              <span>{companion.trust_level}%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* COMPANION AVATAR - Left side */}
      <div className="absolute left-8 bottom-32 z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <Avatar className="h-32 w-32 ring-4 ring-white/50 shadow-2xl">
              {companion.avatar_url ? (
                <AvatarImage src={companion.avatar_url} alt={companion.name} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-4xl font-bold">
                  {getInitials(companion.name)}
                </AvatarFallback>
              )}
            </Avatar>

            <motion.div
              className="absolute -top-2 -right-2 text-3xl bg-white rounded-full p-1 shadow-lg"
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {mood.emoji}
            </motion.div>
          </motion.div>

          <div className="mt-3 text-center">
            <h2 className="text-xl font-bold text-white drop-shadow-lg">{companion.name}</h2>
            <p className="text-sm text-white/80 drop-shadow">{mood.label}</p>
          </div>
        </motion.div>
      </div>

      {/* COMPANION'S SPEECH BUBBLE - Near avatar */}
      <AnimatePresence mode="wait">
        {(lastCompanionMessage || isTyping) && (
          <motion.div
            key={lastCompanionMessage?.id || 'typing'}
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            className="absolute left-44 bottom-48 z-20 max-w-md"
          >
            <div className={cn(
              "relative px-5 py-4 rounded-3xl rounded-bl-lg shadow-xl border-2 bg-gradient-to-br",
              mood.bubbleColor
            )}>
              <div className="absolute -left-3 bottom-4 w-4 h-4 bg-white border-l-2 border-b-2 border-inherit transform rotate-45" />

              {isTyping ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-gray-800 text-base leading-relaxed">
                  {lastCompanionMessage?.content}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING CONVERSATION HISTORY - Right side, NO container box */}
      <div className="absolute right-4 top-28 bottom-28 w-80 z-10 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col gap-3 p-2">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.85 }}
              className={cn(
                "text-sm px-4 py-2.5 rounded-2xl backdrop-blur-sm max-w-[90%]",
                message.role === 'user'
                  ? "bg-white/25 text-white ml-auto"
                  : "bg-black/25 text-white mr-auto"
              )}
            >
              <p>{message.content}</p>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Say something to ${companion.name}...`}
                rows={1}
                className="w-full px-5 py-4 pr-24 rounded-3xl bg-white/90 backdrop-blur-md border-0 shadow-2xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-800 placeholder-gray-500"
                style={{ minHeight: '56px', maxHeight: '120px' }}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <Mic className="h-5 w-5" />
                </Button>
                <Button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <p className="text-center text-white/60 text-xs mt-2 drop-shadow">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Voice conversation mode */}
      {isVoiceConversationSupported && (
        <VoiceConversationMode
          isActive={voiceConversationActive}
          onStart={() => setVoiceConversationActive(true)}
          onEnd={() => setVoiceConversationActive(false)}
          onSendMessage={sendMessage}
          companionName={companion.name}
          companionId={companion.id}
          hasVoiceEnabled={hasVoiceEnabled}
        />
      )}
    </div>
  );
}
