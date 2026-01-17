import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Heart, Brain, MessageCircle, Star, Moon, Calendar } from 'lucide-react';

import { getCurrentUser } from '@/lib/supabase/server';
import { getLifeEventsForUser } from '@/lib/companion/life-events';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { EventType } from '@/types/database';

// ============================================================
// TYPES
// ============================================================

interface LifeEventWithCompanion {
  id: string;
  companion_id: string;
  event_type: EventType;
  title: string;
  description: string | null;
  created_at: string;
  companions: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

// ============================================================
// EVENT TYPE ICONS & COLORS
// ============================================================

const EVENT_CONFIG: Record<EventType, { icon: typeof Sparkles; color: string; bg: string }> = {
  discovery: { icon: Brain, color: 'text-kirra-sage', bg: 'bg-kirra-sage/20' },
  achievement: { icon: Star, color: 'text-kirra-amber', bg: 'bg-kirra-amber/20' },
  relationship: { icon: MessageCircle, color: 'text-kirra-forest-light', bg: 'bg-kirra-forest-light/20' },
  mood_shift: { icon: Heart, color: 'text-kirra-warm', bg: 'bg-kirra-warm/20' },
  growth: { icon: Sparkles, color: 'text-kirra-forest-lighter', bg: 'bg-kirra-forest-lighter/20' },
  memory: { icon: Brain, color: 'text-kirra-stone', bg: 'bg-kirra-stone/20' },
  skill_learned: { icon: Sparkles, color: 'text-kirra-forest-light', bg: 'bg-kirra-forest-light/20' },
  interest_developed: { icon: Star, color: 'text-kirra-amber', bg: 'bg-kirra-amber/20' },
  milestone: { icon: Star, color: 'text-kirra-gold', bg: 'bg-kirra-gold/20' },
  daily_reflection: { icon: Moon, color: 'text-kirra-stone', bg: 'bg-kirra-stone/20' },
};

// ============================================================
// TIME HELPERS
// ============================================================

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupEventsByTime(events: LifeEventWithCompanion[]): Record<string, LifeEventWithCompanion[]> {
  const groups: Record<string, LifeEventWithCompanion[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Earlier': [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  events.forEach(event => {
    const eventDate = new Date(event.created_at);
    
    if (eventDate >= today) {
      groups['Today'].push(event);
    } else if (eventDate >= yesterday) {
      groups['Yesterday'].push(event);
    } else if (eventDate >= weekAgo) {
      groups['This Week'].push(event);
    } else {
      groups['Earlier'].push(event);
    }
  });

  return groups;
}

// ============================================================
// COMPONENTS
// ============================================================

function EventCard({ event }: { event: LifeEventWithCompanion }) {
  const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.growth;
  const Icon = config.icon;
  const companion = event.companions;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="group relative flex gap-4 rounded-xl bg-card p-4 shadow-sm transition-all hover:shadow-md">
      {/* Event Icon */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground">{event.title}</h3>
            {event.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
          
          {/* Companion Avatar */}
          {companion && (
            <Link 
              href={`/chat/${companion.id}`}
              className="shrink-0 opacity-80 transition-opacity hover:opacity-100"
            >
              <Avatar size="sm">
                {companion.avatar_url ? (
                  <AvatarImage src={companion.avatar_url} alt={companion.name} />
                ) : (
                  <AvatarFallback className="bg-kirra-forest text-white text-xs">
                    {getInitials(companion.name)}
                  </AvatarFallback>
                )}
              </Avatar>
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{getTimeAgo(event.created_at)}</span>
          {companion && (
            <>
              <span>•</span>
              <Link 
                href={`/chat/${companion.id}`}
                className="hover:text-foreground transition-colors"
              >
                {companion.name}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-kirra-forest/10">
        <Calendar className="h-8 w-8 text-kirra-forest-light" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">No events yet</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Life events will appear here as you chat with your companions. 
        Start a conversation to see what happens!
      </p>
      <Button asChild className="mt-6">
        <Link href="/chat">Start Chatting</Link>
      </Button>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default async function LifeFeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch real life events from database
  const events = await getLifeEventsForUser(user.id, 50) as LifeEventWithCompanion[];
  
  // Group events by time period
  const groupedEvents = groupEventsByTime(events);
  
  // Check if we have any events
  const hasEvents = events.length > 0;

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Calendar className="h-8 w-8 text-kirra-forest-light" />
            Life Feed
          </h1>
          <p className="mt-1 text-muted-foreground">
            See what your companions have been up to
          </p>
        </div>

        {/* Content */}
        {hasEvents ? (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([period, periodEvents]) => {
              if (periodEvents.length === 0) return null;
              
              return (
                <div key={period}>
                  <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {period}
                  </h2>
                  <div className="space-y-3">
                    {periodEvents.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
