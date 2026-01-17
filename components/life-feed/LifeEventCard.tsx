'use client';

import { 
  Coffee, 
  Book, 
  Music, 
  Moon, 
  Sun,
  Heart,
  Sparkles,
  Brain,
  MessageCircle,
  Gamepad2,
  Clock,
  Utensils,
  Dumbbell,
  Palette,
  Tv,
} from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatRelativeTime } from '@/lib/utils/cn';
import type { Json } from '@/types/database';

interface LifeEventCardProps {
  event: {
    id: string;
    event_type: string;
    title: string;
    description: string;
    significance: 'trivial' | 'minor' | 'moderate' | 'major' | 'milestone';
    emotional_impact: Json | null;
    metadata: Json | null;
    is_shared: boolean;
    created_at: string;
  };
  companion: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  morning_routine: Sun,
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Utensils,
  exercise: Dumbbell,
  reading: Book,
  music: Music,
  creative: Palette,
  thinking: Brain,
  meditation: Sparkles,
  gaming: Gamepad2,
  watching: Tv,
  evening_routine: Moon,
  sleep: Moon,
  social: Heart,
  default: Clock,
};

const eventColors: Record<string, string> = {
  morning_routine: 'bg-yellow-500/10 text-yellow-600',
  breakfast: 'bg-orange-500/10 text-orange-600',
  lunch: 'bg-green-500/10 text-green-600',
  dinner: 'bg-red-500/10 text-red-600',
  exercise: 'bg-blue-500/10 text-blue-600',
  reading: 'bg-indigo-500/10 text-indigo-600',
  music: 'bg-pink-500/10 text-pink-600',
  creative: 'bg-purple-500/10 text-purple-600',
  thinking: 'bg-cyan-500/10 text-cyan-600',
  meditation: 'bg-teal-500/10 text-teal-600',
  gaming: 'bg-violet-500/10 text-violet-600',
  watching: 'bg-rose-500/10 text-rose-600',
  evening_routine: 'bg-slate-500/10 text-slate-600',
  sleep: 'bg-slate-500/10 text-slate-600',
  social: 'bg-pink-500/10 text-pink-600',
  default: 'bg-muted text-muted-foreground',
};

export function LifeEventCard({ event, companion }: LifeEventCardProps) {
  const Icon = eventIcons[event.event_type] || eventIcons.default;
  const colorClass = eventColors[event.event_type] || eventColors.default;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'milestone': return { label: 'Milestone', color: 'text-purple-500' };
      case 'major': return { label: 'Major', color: 'text-green-500' };
      case 'moderate': return { label: 'Moderate', color: 'text-blue-500' };
      case 'minor': return { label: 'Minor', color: 'text-yellow-500' };
      default: return { label: 'Trivial', color: 'text-muted-foreground' };
    }
  };

  const significanceInfo = getSignificanceColor(event.significance);

  return (
    <div className="relative">
      {/* Timeline Dot */}
      <div className={cn(
        'absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-primary'
      )} />

      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Event Icon */}
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colorClass)}>
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{event.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.description || ''}
                  </p>
                </div>

                {/* Companion Avatar */}
                {companion && (
                  <Link href={`/chat/${companion.id}`}>
                    <Avatar size="sm" className="shrink-0">
                      {companion.avatar_url ? (
                        <AvatarImage src={companion.avatar_url} alt={companion.name} />
                      ) : (
                        <AvatarFallback className="bg-kirra-gradient text-white text-xs">
                          {getInitials(companion.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Link>
                )}
              </div>

              {/* Footer */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(event.created_at)}
                </span>
                
                <Badge variant="outline" className="text-xs">
                  {event.event_type.replace(/_/g, ' ')}
                </Badge>

                <span className={cn('text-xs', significanceInfo.color)}>
                  {significanceInfo.label}
                </span>

                {event.is_shared && (
                  <Badge variant="secondary" className="text-xs">
                    Shared
                  </Badge>
                )}
              </div>

              {/* Action */}
              {companion && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/chat/${companion.id}`}>
                      <MessageCircle className="mr-2 h-3 w-3" />
                      Chat about this
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
