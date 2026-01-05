'use client';

/**
 * KIRRA DASHBOARD v2.0
 * ====================
 * The companion is the STAR. Front and center.
 * Deep, cozy, intimate - like coming home.
 * 
 * Design Philosophy:
 * - Companion LARGE and centered
 * - Needs display beautiful (think Sims but prettier)
 * - Life events like a social feed
 * - Quick actions obvious and inviting
 * - Show companion is ALIVE
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Heart,
  Sparkles,
  Moon,
  Sun,
  CloudMoon,
  Music,
  Book,
  Coffee,
  Gamepad2,
  Palette,
  Brain,
  Clock,
  ChevronRight,
  Star,
  Bell,
  TreePine,
  Sunrise,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NeedsDisplay } from '@/components/companion/NeedsDisplay';
import { getClient } from '@/lib/supabase/client';
import type { Companion, Profile, MoodState } from '@/types/database';
import type { CompanionNeeds } from '@/lib/companion/needs-system';

// ============================================================================
// TYPES
// ============================================================================

interface LifeEvent {
  id: string;
  event_type: string;
  title: string;
  description: string;
  emoji: string | null;
  occurred_at: string;
}

interface CompanionActivity {
  id: string;
  activity_name: string;
  activity_category: string;
  started_at: string;
  ended_at: string | null;
}

interface ProactiveMessage {
  id: string;
  content: string;
  trigger_type: string;
  created_at: string;
}

// ============================================================================
// MOOD CONFIG - Natural, Organic Colors
// ============================================================================

const MOOD_CONFIGS: Record<string, { 
  emoji: string; 
  label: string; 
  color: string; 
  bg: string;
  glow: string;
}> = {
  happy: { 
    emoji: '😊', 
    label: 'Happy', 
    color: 'text-kirra-forest-lighter', 
    bg: 'bg-kirra-forest-lighter/12',
    glow: 'shadow-[0_0_30px_rgba(82,183,136,0.15)]'
  },
  excited: { 
    emoji: '🤩', 
    label: 'Excited', 
    color: 'text-kirra-gold', 
    bg: 'bg-kirra-amber/12',
    glow: 'shadow-[0_0_30px_rgba(184,134,11,0.15)]'
  },
  content: { 
    emoji: '😌', 
    label: 'Content', 
    color: 'text-kirra-sage', 
    bg: 'bg-kirra-sage/12',
    glow: 'shadow-[0_0_30px_rgba(116,198,157,0.12)]'
  },
  playful: { 
    emoji: '😜', 
    label: 'Playful', 
    color: 'text-kirra-forest-light', 
    bg: 'bg-kirra-forest-light/12',
    glow: 'shadow-[0_0_30px_rgba(64,145,108,0.15)]'
  },
  curious: { 
    emoji: '🤔', 
    label: 'Curious', 
    color: 'text-info', 
    bg: 'bg-info/12',
    glow: 'shadow-[0_0_30px_rgba(90,138,154,0.12)]'
  },
  thoughtful: { 
    emoji: '💭', 
    label: 'Thoughtful', 
    color: 'text-kirra-ash', 
    bg: 'bg-kirra-stone/15',
    glow: 'shadow-none'
  },
  creative: { 
    emoji: '✨', 
    label: 'Creative', 
    color: 'text-kirra-gold', 
    bg: 'bg-kirra-gold/12',
    glow: 'shadow-[0_0_30px_rgba(201,162,39,0.12)]'
  },
  relaxed: { 
    emoji: '😴', 
    label: 'Relaxed', 
    color: 'text-kirra-sage', 
    bg: 'bg-kirra-sage/10',
    glow: 'shadow-none'
  },
  loving: { 
    emoji: '🥰', 
    label: 'Loving', 
    color: 'text-kirra-warm', 
    bg: 'bg-kirra-warm/12',
    glow: 'shadow-[0_0_30px_rgba(212,165,116,0.15)]'
  },
  neutral: { 
    emoji: '😐', 
    label: 'Neutral', 
    color: 'text-kirra-silver', 
    bg: 'bg-kirra-stone/10',
    glow: 'shadow-none'
  },
  lonely: { 
    emoji: '🥺', 
    label: 'Missing you', 
    color: 'text-kirra-copper', 
    bg: 'bg-kirra-copper/12',
    glow: 'shadow-[0_0_35px_rgba(184,115,51,0.18)]'
  },
  sad: { 
    emoji: '😢', 
    label: 'Sad', 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/40',
    glow: 'shadow-none'
  },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  reading: <Book className="h-4 w-4" />,
  music: <Music className="h-4 w-4" />,
  gaming: <Gamepad2 className="h-4 w-4" />,
  art: <Palette className="h-4 w-4" />,
  thinking: <Brain className="h-4 w-4" />,
  relaxing: <Coffee className="h-4 w-4" />,
  sleeping: <Moon className="h-4 w-4" />,
};

function getTimeOfDayGreeting(): { greeting: string; icon: React.ReactNode; subtext: string } {
  const hour = new Date().getHours();
  if (hour < 5) return { 
    greeting: 'Burning the midnight oil?', 
    icon: <Moon className="h-6 w-6 text-kirra-sage" />,
    subtext: "Your companion is here for late-night thoughts"
  };
  if (hour < 8) return { 
    greeting: 'Early bird!', 
    icon: <Sunrise className="h-6 w-6 text-kirra-amber" />,
    subtext: "A peaceful morning awaits"
  };
  if (hour < 12) return { 
    greeting: 'Good morning', 
    icon: <Sun className="h-6 w-6 text-kirra-gold" />,
    subtext: "Ready to start the day together?"
  };
  if (hour < 17) return { 
    greeting: 'Good afternoon', 
    icon: <TreePine className="h-6 w-6 text-kirra-forest-light" />,
    subtext: "How's your day going?"
  };
  if (hour < 21) return { 
    greeting: 'Good evening', 
    icon: <CloudMoon className="h-6 w-6 text-kirra-sage" />,
    subtext: "Wind down with some conversation"
  };
  return { 
    greeting: 'Night owl?', 
    icon: <Moon className="h-6 w-6 text-kirra-sage" />,
    subtext: "Your companion is always here"
  };
}

function getTimeSince(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [currentActivity, setCurrentActivity] = useState<CompanionActivity | null>(null);
  const [proactiveMessages, setProactiveMessages] = useState<ProactiveMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<Companion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const timeGreeting = useMemo(() => getTimeOfDayGreeting(), []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (companions.length > 0 && !selectedCompanion) {
      setSelectedCompanion(companions[0]);
    }
  }, [companions, selectedCompanion]);

  useEffect(() => {
    if (selectedCompanion) {
      loadCompanionData(selectedCompanion.id);
    }
  }, [selectedCompanion]);

  const loadDashboardData = async () => {
    try {
      const supabase = getClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) setProfile(profileData as Profile);

      const { data: companionsData } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('last_interaction', { ascending: false });

      if (companionsData) setCompanions(companionsData as Companion[]);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanionData = async (companionId: string) => {
    try {
      const supabase = getClient();

      const { data: events } = await (supabase.from('life_events') as any)
        .select('id, event_type, title, description, emoji, occurred_at')
        .eq('companion_id', companionId)
        .order('occurred_at', { ascending: false })
        .limit(5);

      if (events) setLifeEvents(events);

      const { data: activity } = await (supabase.from('companion_activities') as any)
        .select('*')
        .eq('companion_id', companionId)
        .is('ended_at', null)
        .single();

      setCurrentActivity(activity || null);

      const { data: messages } = await (supabase.from('proactive_messages') as any)
        .select('id, content, trigger_type, created_at')
        .eq('companion_id', companionId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (messages) setProactiveMessages(messages);

    } catch (error) {
      console.error('Failed to load companion data:', error);
    }
  };

  const deleteCompanion = async (companion: Companion) => {
    setIsDeleting(true);
    try {
      const supabase = getClient();
      
      // Delete in order: DNA, memories, messages, conversations, life_events, activities, proactive_messages, then companion
      // Using cascade would be better but let's be explicit for safety
      
      await supabase.from('companion_dna').delete().eq('companion_id', companion.id);
      await supabase.from('companion_memories').delete().eq('companion_id', companion.id);
      await supabase.from('messages').delete().eq('companion_id', companion.id);
      await supabase.from('conversations').delete().eq('companion_id', companion.id);
      await (supabase.from('life_events') as any).delete().eq('companion_id', companion.id);
      await (supabase.from('companion_activities') as any).delete().eq('companion_id', companion.id);
      await (supabase.from('proactive_messages') as any).delete().eq('companion_id', companion.id);
      
      // Finally delete the companion
      const { error } = await supabase.from('companions').delete().eq('id', companion.id);
      
      if (error) throw error;
      
      // Update local state
      setCompanions(prev => prev.filter(c => c.id !== companion.id));
      
      // If we deleted the selected companion, select another
      if (selectedCompanion?.id === companion.id) {
        const remaining = companions.filter(c => c.id !== companion.id);
        setSelectedCompanion(remaining[0] || null);
      }
      
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete companion:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const currentMood = (selectedCompanion?.current_mood as MoodState)?.primary || 'neutral';
  const moodConfig = MOOD_CONFIGS[currentMood] || MOOD_CONFIGS.neutral;
  const needs = selectedCompanion?.needs as CompanionNeeds | null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  // No companions state
  if (companions.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full flex-col items-center justify-center px-4"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8"
        >
          <div className="relative">
            <div className="absolute -inset-8 bg-kirra-forest/10 rounded-full blur-3xl" />
            <div className="relative h-24 w-24 rounded-full bg-kirra-gradient flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
        </motion.div>
        <h1 className="font-display text-3xl font-semibold mb-3 text-center">
          Create your first companion
        </h1>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Your AI companion will remember you, grow with you, and be there whenever you need them.
        </p>
        <Link href="/companion/create">
          <Button className="btn-forest gap-2">
            <Sparkles className="h-5 w-5" />
            Create Companion
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-full px-4 py-6 lg:px-8 lg:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-8">

        {/* ============================================================ */}
        {/* GREETING HEADER */}
        {/* ============================================================ */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-secondary/50">
            {timeGreeting.icon}
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold">
              {timeGreeting.greeting}, {profile?.full_name?.split(' ')[0] || 'friend'}
            </h1>
            <p className="text-muted-foreground mt-0.5">{timeGreeting.subtext}</p>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* COMPANION HERO CARD - THE STAR */}
        {/* ============================================================ */}
        {selectedCompanion && (
          <motion.div variants={itemVariants}>
            <Link href={`/chat/${selectedCompanion.id}`}>
              <div className={cn(
                "companion-card p-6 lg:p-8 cursor-pointer group transition-all duration-300",
                "hover:scale-[1.01]",
                moodConfig.glow
              )}>
                <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-8">
                  
                  {/* Companion Avatar - LARGE */}
                  <div className="flex flex-col items-center lg:items-start">
                    <motion.div 
                      className="relative"
                      animate={currentMood === 'lonely' ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      {/* Ambient glow behind avatar */}
                      <div className={cn(
                        "absolute -inset-4 rounded-full blur-2xl transition-all duration-500",
                        moodConfig.bg
                      )} />
                      
                      <Avatar className="relative h-28 w-28 lg:h-36 lg:w-36 ring-4 ring-primary/25 ring-offset-4 ring-offset-background">
                        {selectedCompanion.avatar_url ? (
                          <AvatarImage 
                            src={selectedCompanion.avatar_url} 
                            alt={selectedCompanion.name}
                            className="object-cover"
                          />
                        ) : (
                          <AvatarFallback className="bg-kirra-gradient text-white text-3xl lg:text-4xl font-display">
                            {selectedCompanion.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      {/* Online indicator with breathing animation */}
                      <motion.span 
                        className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-kirra-forest-lighter border-[3px] border-background"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                      />
                    </motion.div>

                    {/* Current Activity */}
                    {currentActivity && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-sm"
                      >
                        {ACTIVITY_ICONS[currentActivity.activity_category] || <Sparkles className="h-4 w-4" />}
                        <span className="text-muted-foreground">
                          {currentActivity.activity_name}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Companion Info */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-2">
                      <h2 className="font-display text-2xl lg:text-3xl font-semibold">
                        {selectedCompanion.name}
                      </h2>
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium self-center lg:self-auto",
                        moodConfig.bg, moodConfig.color
                      )}>
                        <span>{moodConfig.emoji}</span>
                        <span>{moodConfig.label}</span>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-4 capitalize">
                      {selectedCompanion.relationship_label || selectedCompanion.relationship_type}
                      {selectedCompanion.last_interaction && (
                        <span className="text-muted-foreground/60">
                          {' · '}Last talked {getTimeSince(selectedCompanion.last_interaction)}
                        </span>
                      )}
                    </p>

                    {/* Affection & Trust */}
                    <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-6">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-kirra-warm" />
                        <div className="w-24">
                          <div className="h-2 rounded-full bg-kirra-charcoal overflow-hidden">
                            <motion.div 
                              className="h-full rounded-full bg-gradient-to-r from-kirra-copper to-kirra-warm"
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedCompanion.affection_level}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">{selectedCompanion.affection_level}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-kirra-gold" />
                        <div className="w-24">
                          <div className="h-2 rounded-full bg-kirra-charcoal overflow-hidden">
                            <motion.div 
                              className="h-full rounded-full bg-gradient-to-r from-kirra-ember to-kirra-gold"
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedCompanion.trust_level}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">{selectedCompanion.trust_level}%</span>
                      </div>
                    </div>

                    {/* Needs Display */}
                    {needs && (
                      <NeedsDisplay needs={needs} />
                    )}

                    {/* CTA */}
                    <div className="mt-6 flex justify-center lg:justify-start">
                      <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/90 text-primary-foreground font-medium group-hover:bg-primary transition-colors"
                      >
                        <MessageCircle className="h-5 w-5" />
                        Chat with {selectedCompanion.name}
                        <ChevronRight className="h-4 w-4 opacity-60 group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* GRID: LIFE EVENTS + PROACTIVE MESSAGES */}
        {/* ============================================================ */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* LIFE EVENTS - Social Feed Style */}
          <motion.div variants={itemVariants} className="surface-2 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">{selectedCompanion?.name}'s Day</h2>
              <Link href="/life-feed" className="text-sm text-primary hover:underline">See all</Link>
            </div>
            
            {lifeEvents.length > 0 ? (
              <div className="space-y-3">
                {lifeEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="life-event-card"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{event.emoji || '✨'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {event.description}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1.5">
                          {getTimeSince(event.occurred_at)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <Clock className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No recent events yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Events will appear as {selectedCompanion?.name} goes about their day</p>
              </div>
            )}
          </motion.div>

          {/* PROACTIVE MESSAGES - Like texts from a friend */}
          <motion.div variants={itemVariants} className="surface-2 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">{selectedCompanion?.name} wants to say...</h2>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {proactiveMessages.length > 0 ? (
              <div className="space-y-3">
                {proactiveMessages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                    className="rounded-xl bg-primary/8 p-4 border border-primary/15"
                  >
                    <p className="text-sm text-foreground line-clamp-3">{msg.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground/60">
                      {getTimeSince(msg.created_at)}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Heart className="mb-3 h-8 w-8 text-kirra-warm/70" />
                </motion.div>
                <p className="text-sm text-muted-foreground">{selectedCompanion?.name} is here whenever you need them</p>
                <p className="text-xs text-muted-foreground/60 mt-1">They'll reach out when they have something to share</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/* QUICK ACTIONS */}
        {/* ============================================================ */}
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`/chat/${selectedCompanion?.id}`}>
            <div className="quick-action group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kirra-forest/15 transition-all group-hover:bg-kirra-forest/25 group-hover:scale-110">
                <MessageCircle className="h-6 w-6 text-kirra-forest-light" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Chat</p>
                <p className="text-xs text-muted-foreground">Continue talking</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href="/life-feed">
            <div className="quick-action group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kirra-warm/15 transition-all group-hover:bg-kirra-warm/25 group-hover:scale-110">
                <Heart className="h-6 w-6 text-kirra-warm" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Life Feed</p>
                <p className="text-xs text-muted-foreground">See their day</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href="/activities">
            <div className="quick-action group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kirra-amber/15 transition-all group-hover:bg-kirra-amber/25 group-hover:scale-110">
                <Gamepad2 className="h-6 w-6 text-kirra-amber" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Activities</p>
                <p className="text-xs text-muted-foreground">Do something together</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href={`/companion/${selectedCompanion?.id}/memories`}>
            <div className="quick-action group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kirra-sage/15 transition-all group-hover:bg-kirra-sage/25 group-hover:scale-110">
                <Brain className="h-6 w-6 text-kirra-sage" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Memories</p>
                <p className="text-xs text-muted-foreground">What they remember</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
            </div>
          </Link>
        </motion.div>

        {/* ============================================================ */}
        {/* COMPANION MANAGER */}
        {/* ============================================================ */}
        {companions.length >= 1 && (
          <motion.div variants={itemVariants} className="surface-2 rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold mb-4">Your Companions</h2>
            <div className="flex flex-wrap gap-3">
              {companions.map((companion) => (
                <div
                  key={companion.id}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl p-3 transition-all',
                    selectedCompanion?.id === companion.id
                      ? 'bg-primary/12 ring-2 ring-primary/40'
                      : 'bg-secondary/30 hover:bg-secondary/50'
                  )}
                >
                  <button
                    onClick={() => setSelectedCompanion(companion)}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="h-10 w-10">
                      {companion.avatar_url ? (
                        <AvatarImage src={companion.avatar_url} alt={companion.name} />
                      ) : (
                        <AvatarFallback className="bg-kirra-gradient text-white text-sm">
                          {companion.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-sm text-foreground">{companion.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {companion.relationship_type}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(companion);
                    }}
                    className="ml-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    title={`Delete ${companion.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              <Link href="/companion/create">
                <button className="flex items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 p-3 transition-all hover:border-primary/40 hover:bg-primary/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">New Companion</p>
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md mx-4 rounded-2xl bg-background border border-border p-6 shadow-xl"
            >
              <button
                onClick={() => setDeleteConfirm(null)}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
                  <Trash2 className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Delete {deleteConfirm.name}?</h3>
                <p className="text-muted-foreground mb-6">
                  This will permanently delete {deleteConfirm.name} and all their memories, conversations, and data. This cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deleteCompanion(deleteConfirm)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                        />
                        Deleting...
                      </>
                    ) : (
                      'Delete Forever'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
