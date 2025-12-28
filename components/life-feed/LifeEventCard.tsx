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

interface LifeEventCardProps {
  event: {
    id: string;
    event_type: string;
    title: string;
    description: string;
    mood_impact: number;
    is_completed: boolean;
    scheduled_at: string;
    completed_at: string | null;
    notify_user: boolean;
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

  const getMoodLabel = (impact: number) => {
    if (impact > 0.5) return { label: 'Very Happy', color: 'text-green-600' };
    if (impact > 0.2) return { label: 'Happy', color: 'text-green-500' };
    if (impact > -0.2) return { label: 'Neutral', color: 'text-muted-foreground' };
    if (impact > -0.5) return { label: 'Sad', color: 'text-yellow-600' };
    return { label: 'Very Sad', color: 'text-red-500' };
  };

  const mood = getMoodLabel(event.mood_impact);

  return (
    <div className="relative">
      {/* Timeline Dot */}
      <div className={cn(
        'absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-background',
        event.is_completed ? 'bg-primary' : 'bg-muted'
      )} />

      <Card className={cn(
        'transition-all hover:shadow-md',
        !event.is_completed && 'opacity-60'
      )}>
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
                    {event.description}
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
                  {formatRelativeTime(event.scheduled_at)}
                </span>
                
                <Badge variant="outline" className="text-xs">
                  {event.event_type.replace(/_/g, ' ')}
                </Badge>

                <span className={cn('text-xs', mood.color)}>
                  {mood.label}
                </span>

                {event.notify_user && !event.is_completed && (
                  <Badge variant="secondary" className="text-xs">
                    Will notify you
                  </Badge>
                )}
              </div>

              {/* Action */}
              {event.notify_user && companion && (
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
