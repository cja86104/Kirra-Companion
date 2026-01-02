'use client';

/**
 * KIRRA SIDEBAR v2.0
 * ==================
 * Always visible navigation with companion status.
 * Premium, warm, inviting.
 * 
 * Shows:
 * - Companions with mood/status
 * - Affection meters
 * - Clear active states
 * - Smooth collapse animation
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MessageCircle,
  Gamepad2,
  Calendar,
  Settings,
  Plus,
  ChevronLeft,
  HelpCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { AffectionMeter } from '@/components/ui/progress';
import type { Profile, Companion, MoodState } from '@/types/database';

interface SidebarProps {
  user: Profile;
  companions: Companion[];
}

// Mood emoji mapping
const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  content: '😌',
  playful: '😜',
  curious: '🤔',
  thoughtful: '💭',
  creative: '✨',
  relaxed: '😴',
  loving: '🥰',
  neutral: '😐',
  lonely: '🥺',
  sad: '😢',
};

const mainNavItems = [
  { href: '/dashboard', icon: Sparkles, label: 'Dashboard' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/life-feed', icon: Calendar, label: 'Life Feed' },
  { href: '/activities', icon: Gamepad2, label: 'Activities' },
];

const secondaryNavItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/help', icon: HelpCircle, label: 'Help' },
];

export function Sidebar({ user, companions }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-border/50 bg-sidebar transition-all duration-300 ease-out',
        isCollapsed ? 'w-[72px]' : 'w-[280px]'
      )}
    >
      {/* ============================================================ */}
      {/* LOGO */}
      {/* ============================================================ */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-kirra-forest/20 rounded-xl blur-md" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-kirra-gradient shadow-glow">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                </div>
                <span className="font-display text-xl font-bold tracking-tight">Kirra</span>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mx-auto"
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-kirra-forest/20 rounded-xl blur-md" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-kirra-gradient shadow-glow">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-elevation-2 hover:bg-secondary transition-colors"
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </motion.div>
      </button>

      {/* ============================================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================================ */}
      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main Navigation */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const NavLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'nav-item',
                  isActive && 'active',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : ''
                )} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            if (isCollapsed) {
              return (
                <SimpleTooltip key={item.href} content={item.label} side="right">
                  {NavLink}
                </SimpleTooltip>
              );
            }

            return NavLink;
          })}
        </nav>

        {/* ============================================================ */}
        {/* COMPANIONS SECTION */}
        {/* ============================================================ */}
        <div className="mt-6">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-3 flex items-center justify-between px-3"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Companions
                </h3>
                <SimpleTooltip content="Create new companion">
                  <Link href="/companion/create">
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                </SimpleTooltip>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            {companions.length === 0 ? (
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Link
                      href="/companion/create"
                      className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Create your first companion</span>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              companions.map((companion) => {
                const isActive = pathname.includes(companion.id);
                const mood = (companion.current_mood as MoodState)?.primary || 'neutral';
                const moodEmoji = MOOD_EMOJI[mood] || '😐';
                
                const CompanionLink = (
                  <Link
                    key={companion.id}
                    href={`/chat/${companion.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
                      isActive
                        ? 'bg-primary/10 ring-1 ring-primary/20'
                        : 'hover:bg-secondary/50',
                      isCollapsed && 'justify-center px-2'
                    )}
                  >
                    {/* Avatar with Status */}
                    <div className="relative shrink-0">
                      <Avatar className={cn(
                        'h-9 w-9 transition-all',
                        isActive && 'ring-2 ring-primary/40 ring-offset-1 ring-offset-background'
                      )}>
                        {companion.avatar_url ? (
                          <AvatarImage src={companion.avatar_url} alt={companion.name} />
                        ) : (
                          <AvatarFallback className="bg-kirra-gradient text-white text-xs font-medium">
                            {getInitials(companion.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {/* Online Indicator */}
                      <motion.span 
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-kirra-forest-lighter"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                      />
                    </div>
                    
                    {/* Companion Info - only when expanded */}
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex-1 min-w-0 overflow-hidden"
                        >
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{companion.name}</p>
                            <span className="shrink-0 text-xs">{moodEmoji}</span>
                          </div>
                          <div className="mt-1.5">
                            <AffectionMeter 
                              value={companion.affection_level} 
                              size="sm" 
                              showHeart={false} 
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <SimpleTooltip 
                      key={companion.id} 
                      content={`${companion.name} ${moodEmoji}`} 
                      side="right"
                    >
                      {CompanionLink}
                    </SimpleTooltip>
                  );
                }

                return CompanionLink;
              })
            )}
          </div>
        </div>
      </ScrollArea>

      {/* ============================================================ */}
      {/* BOTTOM SECTION */}
      {/* ============================================================ */}
      <div className="border-t border-border/50 p-3">
        {/* Secondary Nav */}
        <nav className="mb-3 space-y-1">
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href;
            const NavLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'nav-item',
                  isActive && 'active',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            if (isCollapsed) {
              return (
                <SimpleTooltip key={item.href} content={item.label} side="right">
                  {NavLink}
                </SimpleTooltip>
              );
            }

            return NavLink;
          })}
        </nav>

        {/* User Profile Card */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl bg-secondary/30 p-2.5 transition-colors hover:bg-secondary/50',
            isCollapsed && 'justify-center'
          )}
        >
          <Avatar className="h-9 w-9 shrink-0">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />
            ) : (
              <AvatarFallback className="bg-kirra-slate text-kirra-silver text-xs">
                {user.full_name ? getInitials(user.full_name) : user.email[0]?.toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="truncate text-sm font-medium">
                  {user.full_name || 'User'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.subscription_tier === 'free' 
                    ? 'Free Plan' 
                    : `${user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)} Plan`
                  }
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
