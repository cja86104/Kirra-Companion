'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Brain, Volume2, VolumeX, MoreVertical } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmotionBadge } from '@/components/ui/badge';
import { AffectionMeter } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { getClient } from '@/lib/supabase/client';
import type { CompanionWithDNA, Conversation, Message, VoiceConfig } from '@/types/database';

interface ChatWindowProps {
  companion: CompanionWithDNA;
  conversation: Conversation | null;
  initialMessages: Message[];
  userId: string;
}

export function ChatWindow({
  companion,
  conversation,
  initialMessages,
  userId,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = getClient();

  const voiceConfig = companion.voice_config as VoiceConfig | null;
  const hasVoiceEnabled = !!voiceConfig?.voiceId;

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
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
          // Only add if not already in list (avoid duplicates)
          setMessages((prev) => {
            // Check if message already exists
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            // Check if there's a temp message for this (optimistic update in progress)
            // We compare content and role to detect the match
            const hasTempVersion = prev.some(
              (m) => m.id.startsWith('temp-') && 
                     m.content === newMessage.content && 
                     m.role === newMessage.role
            );
            if (hasTempVersion) {
              // Replace temp with real
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

  const sendMessage = async (content: string, voiceBlob?: Blob, voiceDuration?: number) => {
    if ((!content.trim() && !voiceBlob) || !conversation) return;

    setIsLoading(true);

    // Determine content type
    const contentType = voiceBlob ? 'voice' : 'text';
    const messageContent = voiceBlob ? '[Voice message]' : content.trim();

    // Optimistic update - add user message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversation.id,
      companion_id: companion.id,
      user_id: userId,
      role: 'user',
      content: messageContent,
      content_type: contentType,
      attachments: [],
      voice_url: null,
      voice_duration_seconds: voiceDuration || null,
      emotion_analysis: {},
      response_context: {},
      memory_triggers: [],
      tokens_used: 0,
      is_edited: false,
      edited_at: null,
      original_content: null,
      is_deleted: false,
      deleted_at: null,
      user_rating: null,
      user_feedback: null,
      metadata: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsTyping(true);

    try {
      // If voice message, upload first
      let voiceUrl = null;
      if (voiceBlob) {
        const formData = new FormData();
        formData.append('audio', voiceBlob, 'voice-message.webm');
        formData.append('companionId', companion.id);
        formData.append('conversationId', conversation.id);

        const uploadResponse = await fetch('/api/voice/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload voice message');
        }

        const uploadData = await uploadResponse.json();
        voiceUrl = uploadData.url;
      }

      // Send message to chat API
      const response = await fetch(`/api/companion/${companion.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          conversationId: conversation.id,
          voiceUrl,
          voiceDuration,
          contentType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      const data = await response.json();
      
      // Replace optimistic message with real one, or add if realtime beat us
      setMessages((prev) => {
        // Check if realtime already added the real user message
        const hasRealMessage = prev.some((m) => m.id === data.userMessage.id);
        if (hasRealMessage) {
          // Remove the temp message, real one is already there
          return prev.filter((m) => m.id !== tempId);
        }
        // Replace temp with real
        return prev.map((m) => (m.id === tempId ? data.userMessage : m));
      });

      // Add companion response (check for duplicates from realtime)
      if (data.companionMessage) {
        setMessages((prev) => {
          // Avoid duplicate if realtime already added it
          if (prev.some((m) => m.id === data.companionMessage.id)) return prev;
          return [...prev, data.companionMessage];
        });

        // Auto-play companion's voice response if enabled
        if (autoPlayVoice && hasVoiceEnabled && data.companionMessage.content) {
          playCompanionResponse(data.companionMessage.content);
        }
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const playCompanionResponse = async (text: string) => {
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
      await audio.play();
    } catch (error) {
      // Silent fail for auto-play
      console.error('Auto-play error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentMood = (companion.current_mood as { primary?: string })?.primary || 'neutral';

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar size="lg">
              {companion.avatar_url ? (
                <AvatarImage src={companion.avatar_url} alt={companion.name} />
              ) : (
                <AvatarFallback className="bg-kirra-gradient text-white">
                  {getInitials(companion.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold">{companion.name}</h2>
              <EmotionBadge emotion={currentMood as 'happy' | 'calm' | 'neutral'} size="sm" />
              {hasVoiceEnabled && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  Voice
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {companion.relationship_label || companion.relationship_type}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <div className="w-20">
                <AffectionMeter value={companion.affection_level} size="sm" showHeart={false} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/companion/${companion.id}/memory-palace`}>
              <Brain className="h-5 w-5" />
            </Link>
          </Button>
          
          {/* Auto-play voice toggle */}
          {hasVoiceEnabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAutoPlayVoice(!autoPlayVoice)}
              title={autoPlayVoice ? 'Disable auto-play voice' : 'Enable auto-play voice'}
              className={autoPlayVoice ? 'text-primary' : ''}
            >
              {autoPlayVoice ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/companion/${companion.id}/memory-palace`}>
                  <Brain className="mr-2 h-4 w-4" />
                  Memory Palace
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 h-16 w-16 rounded-full bg-kirra-gradient/10 p-4">
                <Avatar size="lg">
                  {companion.avatar_url ? (
                    <AvatarImage src={companion.avatar_url} alt={companion.name} />
                  ) : (
                    <AvatarFallback className="bg-kirra-gradient text-white">
                      {getInitials(companion.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <h3 className="font-display text-lg font-semibold">
                Start chatting with {companion.name}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Say hello! {companion.name} is excited to get to know you better.
                {hasVoiceEnabled && ' You can also send voice messages!'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                companion={companion}
                isUser={message.role === 'user'}
              />
            ))
          )}

          {isTyping && (
            <TypingIndicator companionName={companion.name} />
          )}
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <ChatInput
        onSend={sendMessage}
        isLoading={isLoading}
        companionName={companion.name}
        voiceEnabled={true}
      />
    </div>
  );
}
