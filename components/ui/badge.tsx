import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-green-500/10 text-green-600 dark:text-green-400',
        warning:
          'border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        info: 'border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400',
        gradient:
          'border-transparent bg-kirra-gradient text-white shadow',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

function Badge({
  className,
  variant,
  dot,
  dotColor,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            dotColor || 'bg-current'
          )}
        />
      )}
      {children}
    </div>
  );
}

// Emotion Badge for displaying companion emotions
const emotionColors = {
  happy: 'bg-emotion-happy/20 text-emotion-happy border-emotion-happy/30',
  sad: 'bg-emotion-sad/20 text-emotion-sad border-emotion-sad/30',
  excited: 'bg-emotion-excited/20 text-emotion-excited border-emotion-excited/30',
  calm: 'bg-emotion-calm/20 text-emotion-calm border-emotion-calm/30',
  curious: 'bg-emotion-curious/20 text-emotion-curious border-emotion-curious/30',
  loving: 'bg-emotion-loving/20 text-emotion-loving border-emotion-loving/30',
  playful: 'bg-emotion-playful/20 text-emotion-playful border-emotion-playful/30',
  thoughtful: 'bg-emotion-thoughtful/20 text-emotion-thoughtful border-emotion-thoughtful/30',
  neutral: 'bg-muted text-muted-foreground border-muted',
} as const;

const emotionEmojis = {
  happy: '😊',
  sad: '😢',
  excited: '🤩',
  calm: '😌',
  curious: '🤔',
  loving: '🥰',
  playful: '😜',
  thoughtful: '💭',
  neutral: '😐',
} as const;

export type EmotionType = keyof typeof emotionColors;

interface EmotionBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  emotion: EmotionType;
  showEmoji?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

function EmotionBadge({
  emotion,
  showEmoji = true,
  size = 'default',
  className,
  ...props
}: EmotionBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium transition-colors',
        emotionColors[emotion],
        size === 'sm' && 'px-2 py-0.5 text-2xs',
        size === 'default' && 'px-2.5 py-0.5 text-xs',
        size === 'lg' && 'px-3 py-1 text-sm',
        className
      )}
      {...props}
    >
      {showEmoji && <span>{emotionEmojis[emotion]}</span>}
      <span className="capitalize">{emotion}</span>
    </div>
  );
}

// Status Badge
const statusColors = {
  online: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  offline: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30',
  away: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  busy: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
} as const;

type StatusType = keyof typeof statusColors;

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
  showDot?: boolean;
}

function StatusBadge({
  status,
  showDot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        statusColors[status],
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            status === 'online' && 'bg-green-500',
            status === 'offline' && 'bg-gray-500',
            status === 'away' && 'bg-yellow-500',
            status === 'busy' && 'bg-red-500'
          )}
        />
      )}
      {children || <span className="capitalize">{status}</span>}
    </div>
  );
}

// Count Badge (for notifications, etc.)
interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number;
  max?: number;
  variant?: 'default' | 'destructive' | 'outline';
}

function CountBadge({
  count,
  max = 99,
  variant = 'default',
  className,
  ...props
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  if (count === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-2xs font-bold',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground',
        variant === 'outline' && 'border border-border bg-background text-foreground',
        className
      )}
      {...props}
    >
      {displayCount}
    </span>
  );
}

export { Badge, badgeVariants, EmotionBadge, StatusBadge, CountBadge };
