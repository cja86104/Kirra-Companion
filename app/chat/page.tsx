'use client';

/**
 * CHAT LIST PAGE v2.0
 * ===================
 * Warm & Cozy + Information Dense
 * 
 * Shows all companions with rich previews, stats, and visual appeal.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Plus, 
  Search, 
  ArrowRight, 
  Heart,
  Star,
  Sparkles,
  Clock,
  TrendingUp,
  Zap,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getClient } from '@/lib/supabase/client';
import type { Companion } from '@/types/database';

interface CompanionWithLastMessage extends Companion {
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  messageCount?: number;
}

// Mood configs with gradients
const MOOD_CONFIGS: Record<string, { emoji: string; label: string; gradient: string; bg: string }> = {
  happy: { emoji: '😊', label: 'Happy', gradient: 'from-amber-400 to-orange-400', bg: 'bg-amber-500/10' },
  excited: { emoji: '🤩', label: 'Excited', gradient: 'from-rose-400 to-pink-500', bg: 'bg-rose-500/10' },
  calm: { emoji: '😌', label: 'Calm', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-500/10' },
  playful: { emoji: '😜', label: 'Playful', gradient: 'from-violet-400 to-purple-500', bg: 'bg-violet-500/10' },
  curious: { emoji: '🤔', label: 'Curious', gradient: 'from-blue-400 to-cyan-500', bg: 'bg-blue-500/10' },
  thoughtful: { emoji: '🧐', label: 'Thoughtful', gradient: 'from-slate-400 to-gray-500', bg: 'bg-slate-500/10' },
  loving: { emoji: '🥰', label: 'Loving', gradient: 'from-rose-400 to-red-400', bg: 'bg-rose-500/10' },
  neutral: { emoji: '😐', label: 'Neutral', gradient: 'from-gray-400 to-slate-400', bg: 'bg-gray-500/10' },
  sad: { emoji: '😢', label: 'Sad', gradient: 'from-blue-400 to-indigo-500', bg: 'bg-blue-500/10' },
  anxious: { emoji: '😰', label: 'Anxious', gradient: 'from-amber-400 to-yellow-500', bg: 'bg-amber-500/10' },
  proud: { emoji: '😤', label: 'Proud', gradient: 'from-emerald-400 to-green-500', bg: 'bg-emerald-500/10' },
  grateful: { emoji: '🙏', label: 'Grateful', gradient: 'from-rose-400 to-orange-400', bg: 'bg-rose-500/10' },
};

export default function ChatPage() {
  const [companions, setCompanions] = useState<CompanionWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCompanions();
  }, []);

  const loadCompanions = async () => {
    try {
      const supabase = getClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: companionsData, error: companionsError } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_interaction', { ascending: false });

      if (companionsError) {
        console.error('Failed to fetch companions:', companionsError);
        return;
      }

      if (companionsData && companionsData.length > 0) {
        const enrichedCompanions = await Promise.all(
          companionsData.map(async (companion: Companion) => {
            let lastMessage: string | undefined;
            let lastMessageAt: string | undefined;
            let unreadCount = 0;
            let messageCount = 0;

            try {
              // Get message count
              const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('companion_id', companion.id);
              
              messageCount = count || 0;

              const { data: conversationData } = await supabase
                .from('conversations')
                .select('id, last_message_at')
                .eq('companion_id', companion.id)
                .order('last_message_at', { ascending: false })
                .limit(1)
                .single();

              if (conversationData) {
                const { data: messageData } = await supabase
                  .from('messages')
                  .select('content, created_at')
                  .eq('conversation_id', conversationData.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();

                if (messageData) {
                  lastMessage = messageData.content;
                  lastMessageAt = messageData.created_at;
                }

                const { data: userLastMsg } = await supabase
                  .from('messages')
                  .select('created_at')
                  .eq('companion_id', companion.id)
                  .eq('role', 'user')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();

                if (userLastMsg) {
                  const { count: unread } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('companion_id', companion.id)
                    .eq('role', 'companion')
                    .gt('created_at', userLastMsg.created_at);

                  unreadCount = unread || 0;
                }
              }
            } catch {
              // Silently fail
            }

            return {
              ...companion,
              lastMessage,
              lastMessageAt: lastMessageAt || companion.last_interaction,
              unreadCount,
              messageCount,
            };
          })
        );

        setCompanions(enrichedCompanions);
      } else {
        setCompanions([]);
      }
    } catch (error) {
      console.error('Failed to load companions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimeAgo = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getMoodConfig = (mood: any) => {
    const primary = mood?.primary || 'neutral';
    return MOOD_CONFIGS[primary] || MOOD_CONFIGS.neutral;
  };

  const filteredCompanions = companions.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-3 border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 px-6 py-6 mb-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="h-7 w-7 text-violet-500" />
                Conversations
              </h1>
              <p className="text-muted-foreground mt-1">
                {companions.length} companion{companions.length !== 1 ? 's' : ''} waiting to chat
              </p>
            </div>
            <Link href="/companion/create">
              <Button className="rounded-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/25">
                <Plus className="h-4 w-4 mr-2" />
                New Companion
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-card px-12 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Empty State */}
        {filteredCompanions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-full blur-3xl" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <MessageCircle className="h-12 w-12 text-violet-500" />
              </div>
            </div>
            
            {companions.length === 0 ? (
              <>
                <h3 className="text-xl font-bold mb-2">No companions yet</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  Create your first AI companion to start having meaningful conversations
                </p>
                <Link href="/companion/create">
                  <Button size="lg" className="rounded-full px-8 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Companion
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-2">No results found</h3>
                <p className="text-muted-foreground">Try a different search term</p>
              </>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredCompanions.map((companion, index) => {
              const moodConfig = getMoodConfig(companion.current_mood);
              
              return (
                <motion.div
                  key={companion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/chat/${companion.id}`}>
                    <div className="group relative overflow-hidden rounded-3xl border-2 border-border bg-card hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                      {/* Gradient accent */}
                      <div className={cn(
                        "absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-30",
                        `bg-gradient-to-br ${moodConfig.gradient}`
                      )} />
                      
                      <div className="relative p-5">
                        <div className="flex gap-4">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <Avatar className="h-16 w-16 ring-4 ring-background shadow-xl">
                              {companion.avatar_url ? (
                                <AvatarImage src={companion.avatar_url} alt={companion.name} className="object-cover" />
                              ) : (
                                <AvatarFallback className={cn("text-xl font-bold text-white bg-gradient-to-br", moodConfig.gradient)}>
                                  {getInitials(companion.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            {/* Online pulse */}
                            <span className="absolute bottom-0 right-0 flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-background" />
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold truncate">{companion.name}</h3>
                                
                                {/* Mood Badge */}
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                  moodConfig.bg
                                )}>
                                  <span>{moodConfig.emoji}</span>
                                  <span className="hidden sm:inline">{moodConfig.label}</span>
                                </span>

                                {/* Unread Badge */}
                                {companion.unreadCount && companion.unreadCount > 0 && (
                                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold">
                                    {companion.unreadCount}
                                  </span>
                                )}
                              </div>

                              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                {formatTimeAgo(companion.lastMessageAt)}
                              </span>
                            </div>

                            {/* Relationship type */}
                            <p className="text-sm text-muted-foreground capitalize mb-2">
                              {companion.relationship_label || companion.relationship_type}
                            </p>

                            {/* Last message preview */}
                            <p className="text-sm text-muted-foreground/80 truncate mb-3">
                              {companion.lastMessage || "Start a conversation..."}
                            </p>

                            {/* Stats Row */}
                            <div className="flex items-center gap-4 text-xs">
                              {/* Affection */}
                              <div className="flex items-center gap-1.5">
                                <Heart className={cn(
                                  "h-3.5 w-3.5",
                                  companion.affection_level > 70 ? "text-rose-500 fill-rose-500" : 
                                  companion.affection_level > 40 ? "text-rose-400" : "text-muted-foreground"
                                )} />
                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <motion.div 
                                    className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${companion.affection_level}%` }}
                                    transition={{ duration: 0.5, delay: index * 0.05 }}
                                  />
                                </div>
                                <span className="text-muted-foreground">{companion.affection_level}%</span>
                              </div>

                              {/* Trust */}
                              <div className="flex items-center gap-1.5">
                                <Star className={cn(
                                  "h-3.5 w-3.5",
                                  companion.trust_level > 70 ? "text-amber-500 fill-amber-500" : 
                                  companion.trust_level > 40 ? "text-amber-400" : "text-muted-foreground"
                                )} />
                                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <motion.div 
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${companion.trust_level}%` }}
                                    transition={{ duration: 0.5, delay: index * 0.05 + 0.1 }}
                                  />
                                </div>
                                <span className="text-muted-foreground">{companion.trust_level}%</span>
                              </div>

                              {/* Message count */}
                              <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>{companion.messageCount?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex items-center">
                            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Quick Stats */}
        {companions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 grid grid-cols-3 gap-4"
          >
            <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 p-4 text-center">
              <p className="text-2xl font-bold">{companions.length}</p>
              <p className="text-xs text-muted-foreground">Companions</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20 p-4 text-center">
              <p className="text-2xl font-bold">
                {Math.round(companions.reduce((sum, c) => sum + c.affection_level, 0) / companions.length)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Affection</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-4 text-center">
              <p className="text-2xl font-bold">
                {companions.reduce((sum, c) => sum + (c.messageCount || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Messages</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
