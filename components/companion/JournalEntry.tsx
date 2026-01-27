'use client';

import { BookOpen, Calendar, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { LifeEventRow } from '@/types/life-simulation-db';

interface JournalEntryProps {
  journal: LifeEventRow;
  companionName: string;
}

/**
 * Format date for display
 */
function formatJournalDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time for display
 */
function formatJournalTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get outcome badge variant
 */
function getOutcomeBadge(metadata: Record<string, unknown> | null): { label: string; variant: 'default' | 'secondary' | 'outline' } | null {
  if (!metadata || typeof metadata !== 'object') return null;
  
  const outcome = (metadata as { outcome?: string }).outcome;
  
  switch (outcome) {
    case 'great':
      return { label: 'Insightful', variant: 'default' };
    case 'good':
      return { label: 'Reflective', variant: 'secondary' };
    default:
      return null;
  }
}

export function JournalEntry({ journal, companionName }: JournalEntryProps) {
  const outcomeBadge = getOutcomeBadge(journal.metadata as Record<string, unknown> | null);
  
  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kirra-forest/10">
              <BookOpen className="h-5 w-5 text-kirra-forest-light" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {companionName}&apos;s Journal
                </span>
                {outcomeBadge && (
                  <Badge variant={outcomeBadge.variant} className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {outcomeBadge.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatJournalDate(journal.occurred_at || journal.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatJournalTime(journal.occurred_at || journal.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Journal Content */}
        <div className={cn(
          'rounded-lg bg-muted/50 p-4 border-l-4 border-kirra-forest-light/50',
          'prose prose-sm prose-neutral dark:prose-invert max-w-none'
        )}>
          {journal.narrative ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap m-0">
              {journal.narrative}
            </p>
          ) : journal.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap m-0">
              {journal.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic m-0">
              No journal content recorded.
            </p>
          )}
        </div>

        {/* Footer - Duration if available */}
        {journal.duration_minutes && (
          <div className="mt-3 text-xs text-muted-foreground">
            Journaling session: {journal.duration_minutes} minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
}
