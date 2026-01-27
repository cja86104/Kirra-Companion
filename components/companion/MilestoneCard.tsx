'use client';

import { Trophy, Calendar, MessageCircle, Brain, Flame, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils/cn';
import type { MilestoneDefinition, AchievedMilestone, MilestoneType } from '@/lib/companion/milestones';

// ============================================================================
// TYPES
// ============================================================================

interface MilestoneCardProps {
  milestone: MilestoneDefinition;
  achieved?: boolean;
  achievedAt?: string;
  currentValue?: number;
  showProgress?: boolean;
}

interface MilestoneStatsProps {
  daysTogetherCount: number;
  totalMessages: number;
  totalMemories: number;
  conversationStreak: number;
  achievedMilestones: AchievedMilestone[];
  nextMilestones: MilestoneDefinition[];
  companionName: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getMilestoneIcon(type: MilestoneType) {
  switch (type) {
    case 'first_conversation':
      return MessageCircle;
    case 'days_together':
    case 'anniversary':
      return Calendar;
    case 'messages_shared':
      return MessageCircle;
    case 'memories_created':
      return Brain;
    case 'streak':
      return Flame;
    default:
      return Trophy;
  }
}

function getMilestoneColor(type: MilestoneType): { bg: string; text: string; border: string } {
  switch (type) {
    case 'first_conversation':
      return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' };
    case 'days_together':
    case 'anniversary':
      return { bg: 'bg-kirra-forest/10', text: 'text-kirra-forest-light', border: 'border-kirra-forest/20' };
    case 'messages_shared':
      return { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' };
    case 'memories_created':
      return { bg: 'bg-kirra-amber/10', text: 'text-kirra-amber', border: 'border-kirra-amber/20' };
    case 'streak':
      return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' };
    default:
      return { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20' };
  }
}

function formatAchievedDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// SINGLE MILESTONE CARD
// ============================================================================

export function MilestoneCard({
  milestone,
  achieved = false,
  achievedAt,
  currentValue = 0,
  showProgress = false,
}: MilestoneCardProps) {
  const Icon = getMilestoneIcon(milestone.type);
  const colors = getMilestoneColor(milestone.type);
  const progress = Math.min(100, Math.round((currentValue / milestone.threshold) * 100));

  return (
    <Card className={cn(
      'transition-all',
      achieved 
        ? `${colors.border} border-2` 
        : 'opacity-70 border-dashed'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            achieved ? colors.bg : 'bg-muted'
          )}>
            {achieved ? (
              <span className="text-lg">{milestone.emoji}</span>
            ) : (
              <Icon className={cn('h-5 w-5', achieved ? colors.text : 'text-muted-foreground')} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={cn(
                'font-medium',
                achieved ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {milestone.title}
              </h4>
              {achieved && (
                <Badge variant="secondary" className="text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  Achieved
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-0.5">
              {milestone.description}
            </p>

            {/* Progress bar for upcoming milestones */}
            {showProgress && !achieved && (
              <div className="mt-2 space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {currentValue} / {milestone.threshold} ({progress}%)
                </p>
              </div>
            )}

            {/* Achievement date */}
            {achieved && achievedAt && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Achieved {formatAchievedDate(achievedAt)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MILESTONE STATS DISPLAY
// ============================================================================

export function MilestoneStats({
  daysTogetherCount,
  totalMessages,
  totalMemories,
  conversationStreak,
  achievedMilestones,
  nextMilestones,
  companionName,
}: MilestoneStatsProps) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto text-kirra-forest-light mb-2" />
            <p className="text-2xl font-bold">{daysTogetherCount}</p>
            <p className="text-xs text-muted-foreground">Days Together</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-6 w-6 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{totalMessages}</p>
            <p className="text-xs text-muted-foreground">Messages</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="h-6 w-6 mx-auto text-kirra-amber mb-2" />
            <p className="text-2xl font-bold">{totalMemories}</p>
            <p className="text-xs text-muted-foreground">Memories</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{conversationStreak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Milestones */}
      {nextMilestones.length > 0 && (
        <div>
          <h3 className="font-medium text-muted-foreground mb-3">
            Next Milestones
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {nextMilestones.map((milestone) => {
              let currentValue = 0;
              switch (milestone.type) {
                case 'days_together':
                  currentValue = daysTogetherCount;
                  break;
                case 'messages_shared':
                  currentValue = totalMessages;
                  break;
                case 'memories_created':
                  currentValue = totalMemories;
                  break;
                case 'streak':
                  currentValue = conversationStreak;
                  break;
              }
              return (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  achieved={false}
                  currentValue={currentValue}
                  showProgress
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Achieved Milestones */}
      {achievedMilestones.length > 0 && (
        <div>
          <h3 className="font-medium text-muted-foreground mb-3">
            Achievements with {companionName}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {achievedMilestones.slice(0, 6).map((achieved) => (
              <MilestoneCard
                key={achieved.milestone.id}
                milestone={achieved.milestone}
                achieved
                achievedAt={achieved.achievedAt}
              />
            ))}
          </div>
          {achievedMilestones.length > 6 && (
            <p className="text-sm text-muted-foreground text-center mt-3">
              +{achievedMilestones.length - 6} more achievements
            </p>
          )}
        </div>
      )}
    </div>
  );
}
