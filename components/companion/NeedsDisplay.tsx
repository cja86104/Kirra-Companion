'use client';

import { 
  Heart, 
  Zap, 
  Smile, 
  Home, 
  Sparkles, 
  Brain, 
  Palette,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { 
  type CompanionNeeds, 
  getNeedStatus, 
  calculateOverallMood,
  type NeedLevel,
} from '@/lib/companion/needs-system';

interface NeedsDisplayProps {
  needs: CompanionNeeds;
  compact?: boolean;
  showLabels?: boolean;
  className?: string;
}

interface NeedConfig {
  key: keyof Omit<CompanionNeeds, 'lastUpdated' | 'lastInteraction'>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const NEED_CONFIGS: NeedConfig[] = [
  {
    key: 'social',
    label: 'Social',
    icon: Heart,
    description: 'How much they want to interact with you',
    color: 'text-pink-500',
  },
  {
    key: 'energy',
    label: 'Energy',
    icon: Zap,
    description: 'Their current energy level',
    color: 'text-yellow-500',
  },
  {
    key: 'fun',
    label: 'Fun',
    icon: Smile,
    description: 'How entertained they are',
    color: 'text-green-500',
  },
  {
    key: 'comfort',
    label: 'Comfort',
    icon: Home,
    description: 'How comfortable and settled they feel',
    color: 'text-blue-500',
  },
  {
    key: 'affection',
    label: 'Affection',
    icon: Sparkles,
    description: 'Their need for love and closeness',
    color: 'text-rose-500',
  },
  {
    key: 'intellectual',
    label: 'Intellectual',
    icon: Brain,
    description: 'Their desire for stimulating conversation',
    color: 'text-purple-500',
  },
  {
    key: 'creativity',
    label: 'Creativity',
    icon: Palette,
    description: 'Their urge to express themselves',
    color: 'text-orange-500',
  },
];

const LEVEL_COLORS: Record<NeedLevel, string> = {
  critical: 'bg-red-500',
  low: 'bg-orange-500',
  medium: 'bg-yellow-500',
  high: 'bg-green-500',
  full: 'bg-emerald-500',
};

const LEVEL_BG_COLORS: Record<NeedLevel, string> = {
  critical: 'bg-red-500/20',
  low: 'bg-orange-500/20',
  medium: 'bg-yellow-500/20',
  high: 'bg-green-500/20',
  full: 'bg-emerald-500/20',
};

export function NeedsDisplay({ 
  needs, 
  compact = false, 
  showLabels = true,
  className 
}: NeedsDisplayProps) {
  const { mood, score } = calculateOverallMood(needs);

  const getMoodEmoji = () => {
    switch (mood) {
      case 'ecstatic': return '😄';
      case 'happy': return '😊';
      case 'neutral': return '😐';
      case 'unhappy': return '😟';
      case 'miserable': return '😢';
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 70) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (value < 30) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-2', className)}>
          {/* Overall Mood */}
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                <span className="text-lg">{getMoodEmoji()}</span>
                <span className="text-xs font-medium">{Math.round(score)}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Overall Mood: {mood.charAt(0).toUpperCase() + mood.slice(1)}
            </TooltipContent>
          </Tooltip>

          {/* Individual Needs (icons only) */}
          <div className="flex items-center gap-1">
            {NEED_CONFIGS.map((config) => {
              const value = needs[config.key];
              const status = getNeedStatus(value);
              const Icon = config.icon;

              return (
                <Tooltip key={config.key}>
                  <TooltipTrigger>
                    <div className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full',
                      LEVEL_BG_COLORS[status.level]
                    )}>
                      <Icon className={cn('h-3 w-3', config.color)} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{Math.round(value)}%</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Mood Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getMoodEmoji()}</span>
          <div>
            <p className="font-medium capitalize">{mood}</p>
            <p className="text-xs text-muted-foreground">Overall Mood</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{Math.round(score)}%</p>
          <p className="text-xs text-muted-foreground">Happiness</p>
        </div>
      </div>

      {/* Individual Needs */}
      <div className="space-y-3">
        {NEED_CONFIGS.map((config) => {
          const value = needs[config.key];
          const status = getNeedStatus(value);
          const Icon = config.icon;

          return (
            <TooltipProvider key={config.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="group cursor-help">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', config.color)} />
                        {showLabels && (
                          <span className="text-sm font-medium">{config.label}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(value)}
                        <span className="text-sm tabular-nums">{Math.round(value)}%</span>
                      </div>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                      <div 
                        className={cn(
                          'absolute left-0 top-0 h-full rounded-full transition-all duration-500',
                          LEVEL_COLORS[status.level]
                        )}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                  <p className="mt-1 text-xs">
                    Status: <span className={status.color}>{status.level}</span>
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Low Need Alerts */}
      {NEED_CONFIGS.some(c => needs[c.key] < 30) && (
        <div className="rounded-lg border border-orange-500/50 bg-orange-500/10 p-3">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
            Needs Attention
          </p>
          <p className="text-xs text-muted-foreground">
            {NEED_CONFIGS
              .filter(c => needs[c.key] < 30)
              .map(c => c.label)
              .join(', ')} {NEED_CONFIGS.filter(c => needs[c.key] < 30).length === 1 ? 'is' : 'are'} running low
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MINI NEEDS BAR (For chat header)
// ============================================================

export function MiniNeedsBar({ needs, className }: { needs: CompanionNeeds; className?: string }) {
  const { score } = calculateOverallMood(needs);
  
  // Get the lowest need
  const lowestNeed = NEED_CONFIGS.reduce((lowest, config) => {
    return needs[config.key] < needs[lowest.key] ? config : lowest;
  }, NEED_CONFIGS[0]);

  const lowestValue = needs[lowestNeed.key];
  const LowestIcon = lowestNeed.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Overall happiness bar */}
      <div className="flex items-center gap-1">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div 
            className={cn(
              'h-full rounded-full transition-all',
              score > 60 ? 'bg-green-500' : score > 30 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{Math.round(score)}%</span>
      </div>

      {/* Alert for lowest need */}
      {lowestValue < 40 && (
        <div className={cn(
          'flex items-center gap-1 rounded-full px-2 py-0.5',
          lowestValue < 20 ? 'bg-red-500/20 text-red-600' : 'bg-orange-500/20 text-orange-600'
        )}>
          <LowestIcon className="h-3 w-3" />
          <span className="text-xs font-medium">{Math.round(lowestValue)}%</span>
        </div>
      )}
    </div>
  );
}
