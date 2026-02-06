'use client';

/**
 * KIRRA DASHBOARD v4.0
 * ====================
 * Warm & Cozy + Information Dense
 * 
 * Design Philosophy:
 * - Rich warm colors, inviting atmosphere
 * - Show EVERYTHING - stats, events, memories, progress
 * - Feels like a cozy app you want to spend time in
 * - No empty space - every pixel earns its place
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  Settings,
  Trophy,
  Calendar,
  TrendingUp,
  Zap,
  Gift,
  Users,
  BookOpen,
  Activity,
  Target,
  Flame,
  Award,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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

interface Memory {
  id: string;
  title: string;
  memory_type: string;
  importance: number;
  created_at: string;
}

interface Stats {
  totalMessages: number;
  totalMemories: number;
  daysKnown: number;
  streakDays: number;
}

// ============================================================================
// MOOD CONFIG - Warm & Vibrant
// ============================================================================

const MOOD_CONFIGS: Record<string, { 
  emoji: string; 
  label: string; 
  gradient: string;
  glow: string;
}> = {
  happy: { 
    emoji: '😊', 
    label: 'Happy', 
    gradient: 'from-amber-400 to-orange-400',
    glow: 'shadow-amber-500/30',
  },
  excited: { 
    emoji: '🤩', 
    label: 'Excited', 
    gradient: 'from-rose-400 to-pink-500',
    glow: 'shadow-rose-500/30',
  },
  calm: { 
    emoji: '😌', 
    label: 'Calm', 
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'shadow-emerald-500/30',
  },
  playful: { 
    emoji: '😜', 
    label: 'Playful', 
    gradient: 'from-violet-400 to-purple-500',
    glow: 'shadow-violet-500/30',
  },
  curious: { 
    emoji: '🤔', 
    label: 'Curious', 
    gradient: 'from-blue-400 to-cyan-500',
    glow: 'shadow-blue-500/30',
  },
  thoughtful: { 
    emoji: '🧐', 
    label: 'Thoughtful', 
    gradient: 'from-slate-400 to-gray-500',
    glow: 'shadow-slate-500/30',
  },
  loving: { 
    emoji: '🥰', 
    label: 'Loving', 
    gradient: 'from-rose-400 to-red-400',
    glow: 'shadow-rose-500/30',
  },
  neutral: { 
    emoji: '😐', 
    label: 'Neutral', 
    gradient: 'from-gray-400 to-slate-400',
    glow: 'shadow-gray-500/20',
  },
  sad: { 
    emoji: '😢', 
    label: 'Sad', 
    gradient: 'from-blue-400 to-indigo-500',
    glow: 'shadow-blue-500/30',
  },
  anxious: { 
    emoji: '😰', 
    label: 'Anxious', 
    gradient: 'from-amber-400 to-yellow-500',
    glow: 'shadow-amber-500/30',
  },
  proud: { 
    emoji: '😤', 
    label: 'Proud', 
    gradient: 'from-emerald-400 to-green-500',
    glow: 'shadow-emerald-500/30',
  },
  grateful: { 
    emoji: '🙏', 
    label: 'Grateful', 
    gradient: 'from-rose-400 to-orange-400',
    glow: 'shadow-rose-500/30',
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

const NEED_ICONS: Record<string, React.ReactNode> = {
  social: <Users className="h-3.5 w-3.5" />,
  fun: <Sparkles className="h-3.5 w-3.5" />,
  energy: <Zap className="h-3.5 w-3.5" />,
  comfort: <Coffee className="h-3.5 w-3.5" />,
  intellectual: <Brain className="h-3.5 w-3.5" />,
  affection: <Heart className="h-3.5 w-3.5" />,
};

const NEED_COLORS: Record<string, string> = {
  social: 'bg-blue-500',
  fun: 'bg-amber-500',
  energy: 'bg-yellow-500',
  comfort: 'bg-emerald-500',
  intellectual: 'bg-violet-500',
  affection: 'bg-rose-500',
};

// ============================================================================
// HELPERS
// ============================================================================

function getTimeOfDayGreeting(): { greeting: string; emoji: string; bg: string } {
  const hour = new Date().getHours();
  if (hour < 5) return { greeting: 'Burning the midnight oil?', emoji: '🌙', bg: 'from-indigo-500/20 to-purple-500/20' };
  if (hour < 8) return { greeting: 'Early bird!', emoji: '🌅', bg: 'from-orange-500/20 to-amber-500/20' };
  if (hour < 12) return { greeting: 'Good morning!', emoji: '☀️', bg: 'from-amber-500/20 to-yellow-500/20' };
  if (hour < 17) return { greeting: 'Good afternoon!', emoji: '🌤️', bg: 'from-sky-500/20 to-blue-500/20' };
  if (hour < 21) return { greeting: 'Good evening!', emoji: '🌆', bg: 'from-orange-500/20 to-rose-500/20' };
  return { greeting: 'Night owl mode', emoji: '🦉', bg: 'from-indigo-500/20 to-violet-500/20' };
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

function getDaysKnown(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24)) + 1;
}

// ============================================================================
// SMALL COMPONENTS
// ============================================================================

function StatCard({ icon, label, value, color, trend }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  color: string;
  trend?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 p-4 hover:border-border transition-colors">
      <div className={cn("absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20", color)} />
      <div className="relative">
        <div className={cn("inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3", color.replace('bg-', 'bg-').replace('-500', '-500/20'))}>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {trend && (
          <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3" /> {trend}
          </p>
        )}
      </div>
    </div>
  );
}

function NeedBar({ name, value, icon, color }: { name: string; value: number; icon: React.ReactNode; color: string }) {
  const isLow = value < 30;
  const isCritical = value < 15;
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center justify-center w-6 h-6 rounded-lg",
        isCritical ? "bg-red-500/20 text-red-500" : isLow ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium capitalize">{name}</span>
          <span className={cn("text-xs", isCritical ? "text-red-500" : isLow ? "text-amber-500" : "text-muted-foreground")}>
            {Math.round(value)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div 
            className={cn("h-full rounded-full", isCritical ? "bg-red-500" : isLow ? "bg-amber-500" : color)}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [currentActivity, setCurrentActivity] = useState<CompanionActivity | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<Stats>({ totalMessages: 0, totalMemories: 0, daysKnown: 0, streakDays: 0 });
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
        .eq('is_active', true)
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

      // Life events
      const { data: events } = await (supabase.from('life_events') as any)
        .select('id, event_type, title, description, emoji, occurred_at')
        .eq('companion_id', companionId)
        .order('occurred_at', { ascending: false })
        .limit(8);

      if (events) setLifeEvents(events);

      // Current activity
      const { data: activity } = await (supabase.from('companion_activities') as any)
        .select('*')
        .eq('companion_id', companionId)
        .is('ended_at', null)
        .single();

      setCurrentActivity(activity || null);

      // Memories
      const { data: memoriesData, count: memoriesCount } = await supabase
        .from('memories')
        .select('id, title, memory_type, importance, created_at', { count: 'exact' })
        .eq('companion_id', companionId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (memoriesData) setMemories(memoriesData as Memory[]);

      // Message count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('companion_id', companionId);

      // Get companion for days known
      const companion = companions.find(c => c.id === companionId);
      const daysKnown = companion ? getDaysKnown(companion.created_at) : 0;

      setStats({
        totalMessages: messageCount || 0,
        totalMemories: memoriesCount || 0,
        daysKnown,
        streakDays: Math.min(daysKnown, 7), // Simplified streak
      });

    } catch (error) {
      console.error('Failed to load companion data:', error);
    }
  };

  const deleteCompanion = async (companion: Companion) => {
    setIsDeleting(true);
    try {
      const supabase = getClient();
      
      await supabase.from('companion_dna').delete().eq('companion_id', companion.id);
      await supabase.from('companion_memories').delete().eq('companion_id', companion.id);
      await supabase.from('messages').delete().eq('companion_id', companion.id);
      await supabase.from('conversations').delete().eq('companion_id', companion.id);
      await (supabase.from('life_events') as any).delete().eq('companion_id', companion.id);
      await (supabase.from('companion_activities') as any).delete().eq('companion_id', companion.id);
      
      const { error } = await supabase.from('companions').delete().eq('id', companion.id);
      
      if (error) throw error;
      
      setCompanions(prev => prev.filter(c => c.id !== companion.id));
      
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

  const moodData = selectedCompanion?.current_mood as { primary?: string; secondary?: string; intensity?: number } | null;
  const currentMood = moodData?.primary || 'neutral';
  const moodConfig = MOOD_CONFIGS[currentMood] || MOOD_CONFIGS.neutral;
  const needs = selectedCompanion?.needs as CompanionNeeds | null;

  // Loading state
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

  // No companions state
  if (companions.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-full flex-col items-center justify-center px-6"
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-rose-500/30 rounded-full blur-3xl" />
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-900/30 dark:to-rose-900/30 flex items-center justify-center">
            <Sparkles className="h-16 w-16 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-3 text-center">Create Your First Companion</h1>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Your companion will remember everything, grow with you, and always be here when you need them.
        </p>
        <Link href="/companion/create">
          <Button size="lg" className="rounded-full px-8 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-lg shadow-amber-500/25">
            <Plus className="h-5 w-5 mr-2" />
            Create Companion
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="min-h-full pb-8">
      {/* ============================================================ */}
      {/* GREETING HEADER */}
      {/* ============================================================ */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-b-3xl bg-gradient-to-br px-6 py-6 mb-6",
          timeGreeting.bg
        )}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {timeGreeting.greeting} <span className="text-2xl">{timeGreeting.emoji}</span>
            </h1>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Link href="/settings/notifications">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/companion/create">
              <Button size="sm" className="rounded-full bg-white/80 dark:bg-black/30 text-foreground hover:bg-white dark:hover:bg-black/50">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="px-4 sm:px-6 space-y-6">
        {/* ============================================================ */}
        {/* COMPANION SELECTOR (if multiple) */}
        {/* ============================================================ */}
        {companions.length > 1 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide"
          >
            {companions.map((companion) => (
              <button
                key={companion.id}
                onClick={() => setSelectedCompanion(companion)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all shrink-0",
                  selectedCompanion?.id === companion.id
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <Avatar className="h-10 w-10 ring-2 ring-background">
                  {companion.avatar_url ? (
                    <AvatarImage src={companion.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-amber-400 to-rose-400 text-white font-medium">
                      {companion.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="text-left">
                  <p className="font-semibold text-sm">{companion.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{companion.relationship_type}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {selectedCompanion && (
          <>
            {/* ============================================================ */}
            {/* MAIN COMPANION CARD */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-muted/30 border border-border shadow-xl"
            >
              {/* Decorative gradient blob */}
              <div className={cn(
                "absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-30",
                `bg-gradient-to-br ${moodConfig.gradient}`
              )} />
              
              <div className="relative p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Avatar & Mood */}
                  <div className="flex flex-col items-center sm:items-start">
                    <div className="relative">
                      <Avatar className={cn(
                        "h-28 w-28 ring-4 ring-background shadow-2xl",
                        moodConfig.glow
                      )}>
                        {selectedCompanion.avatar_url ? (
                          <AvatarImage src={selectedCompanion.avatar_url} className="object-cover" />
                        ) : (
                          <AvatarFallback className={cn("text-3xl font-bold text-white bg-gradient-to-br", moodConfig.gradient)}>
                            {selectedCompanion.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      {/* Online Pulse */}
                      <span className="absolute bottom-1 right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-background" />
                      </span>
                    </div>
                    
                    {/* Mood Badge */}
                    <div className={cn(
                      "mt-4 px-4 py-2 rounded-full text-white font-medium text-sm flex items-center gap-2 bg-gradient-to-r",
                      moodConfig.gradient
                    )}>
                      <span className="text-lg">{moodConfig.emoji}</span>
                      {moodConfig.label}
                    </div>
                    
                    {/* Current Activity */}
                    {currentActivity && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        {ACTIVITY_ICONS[currentActivity.activity_category] || <Activity className="h-4 w-4" />}
                        <span>{currentActivity.activity_name}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Info & Stats */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-3xl font-bold">{selectedCompanion.name}</h2>
                        <p className="text-muted-foreground capitalize flex items-center gap-2 mt-1">
                          {selectedCompanion.relationship_label || selectedCompanion.relationship_type}
                          <span className="text-muted-foreground/40">•</span>
                          <span className="text-sm">
                            {selectedCompanion.last_interaction ? getTimeSince(selectedCompanion.last_interaction) : 'New friend'}
                          </span>
                        </p>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Link href={`/companion/${selectedCompanion.id}`}>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(selectedCompanion)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Relationship Progress */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Heart className="h-4 w-4 text-rose-500" /> Affection
                          </span>
                          <span className="text-sm font-bold text-rose-500">{selectedCompanion.affection_level}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-rose-500/20 overflow-hidden">
                          <motion.div 
                            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedCompanion.affection_level}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500" /> Trust
                          </span>
                          <span className="text-sm font-bold text-amber-500">{selectedCompanion.trust_level}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-amber-500/20 overflow-hidden">
                          <motion.div 
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedCompanion.trust_level}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* CTA Button */}
                    <Link href={`/chat/${selectedCompanion.id}`} className="block">
                      <Button 
                        size="lg" 
                        className="w-full rounded-2xl h-14 text-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-lg shadow-amber-500/25"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Chat with {selectedCompanion.name}
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* STATS GRID */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <StatCard 
                icon={<MessageCircle className="h-5 w-5 text-blue-500" />}
                label="Messages"
                value={stats.totalMessages.toLocaleString()}
                color="bg-blue-500"
                trend={stats.totalMessages > 0 ? "+12 today" : undefined}
              />
              <StatCard 
                icon={<Brain className="h-5 w-5 text-violet-500" />}
                label="Memories"
                value={stats.totalMemories}
                color="bg-violet-500"
              />
              <StatCard 
                icon={<Calendar className="h-5 w-5 text-emerald-500" />}
                label="Days Together"
                value={stats.daysKnown}
                color="bg-emerald-500"
              />
              <StatCard 
                icon={<Flame className="h-5 w-5 text-orange-500" />}
                label="Day Streak"
                value={`${stats.streakDays} 🔥`}
                color="bg-orange-500"
              />
            </motion.div>

            {/* ============================================================ */}
            {/* NEEDS PANEL */}
            {/* ============================================================ */}
            {needs && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-3xl bg-card border border-border p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {selectedCompanion.name}'s Needs
                  </h3>
                  <Link href="/activities" className="text-sm text-primary hover:underline">
                    Activities →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(needs).map(([key, value]) => (
                    <NeedBar 
                      key={key}
                      name={key}
                      value={value as number}
                      icon={NEED_ICONS[key] || <Sparkles className="h-3.5 w-3.5" />}
                      color={NEED_COLORS[key] || 'bg-primary'}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* TWO COLUMN: EVENTS + MEMORIES */}
            {/* ============================================================ */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* LIFE EVENTS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-3xl bg-card border border-border p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Recent Activity
                  </h3>
                  <Link href="/life-feed" className="text-sm text-primary hover:underline">
                    See all →
                  </Link>
                </div>
                
                {lifeEvents.length > 0 ? (
                  <div className="space-y-3">
                    {lifeEvents.slice(0, 5).map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <span className="text-2xl">{event.emoji || '✨'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {event.description}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {getTimeSince(event.occurred_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No events yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Chat to see what {selectedCompanion.name} is up to!</p>
                  </div>
                )}
              </motion.div>

              {/* MEMORIES */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-3xl bg-card border border-border p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-violet-500" />
                    Shared Memories
                  </h3>
                  <Link href={`/companion/${selectedCompanion.id}/memory-palace`} className="text-sm text-primary hover:underline">
                    Memory Palace →
                  </Link>
                </div>
                
                {memories.length > 0 ? (
                  <div className="space-y-3">
                    {memories.map((memory, i) => (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          memory.importance > 7 ? "bg-amber-500/20 text-amber-500" :
                          memory.importance > 4 ? "bg-violet-500/20 text-violet-500" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {memory.importance > 7 ? <Star className="h-5 w-5" /> :
                           memory.importance > 4 ? <Brain className="h-5 w-5" /> :
                           <BookOpen className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{memory.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {memory.memory_type.replace('_', ' ')} • {getTimeSince(memory.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Brain className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No memories yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{selectedCompanion.name} will remember important things you share!</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* ============================================================ */}
            {/* QUICK LINKS */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <Link href="/activities" className="group">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                  <Gamepad2 className="h-6 w-6 text-amber-500 mb-2" />
                  <p className="font-medium text-sm">Activities</p>
                  <p className="text-xs text-muted-foreground">Play games together</p>
                </div>
              </Link>
              <Link href={`/companion/${selectedCompanion.id}/memory-palace`} className="group">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all">
                  <Brain className="h-6 w-6 text-violet-500 mb-2" />
                  <p className="font-medium text-sm">Memory Palace</p>
                  <p className="text-xs text-muted-foreground">Shared memories</p>
                </div>
              </Link>
              <Link href="/life-feed" className="group">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                  <Activity className="h-6 w-6 text-emerald-500 mb-2" />
                  <p className="font-medium text-sm">Life Feed</p>
                  <p className="text-xs text-muted-foreground">Daily updates</p>
                </div>
              </Link>
              <Link href={`/companion/${selectedCompanion.id}`} className="group">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all">
                  <Settings className="h-6 w-6 text-blue-500 mb-2" />
                  <p className="font-medium text-sm">Customize</p>
                  <p className="text-xs text-muted-foreground">Edit companion</p>
                </div>
              </Link>
            </motion.div>
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-2">Delete {deleteConfirm.name}?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  This will permanently delete all memories, messages, and history. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl"
                    onClick={() => setDeleteConfirm(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1 rounded-xl"
                    onClick={() => deleteCompanion(deleteConfirm)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
