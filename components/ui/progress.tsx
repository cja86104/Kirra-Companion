'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const progressVariants = cva('relative w-full overflow-hidden rounded-full', {
  variants: {
    size: {
      sm: 'h-1.5',
      default: 'h-2',
      lg: 'h-3',
      xl: 'h-4',
    },
    variant: {
      default: 'bg-primary/20',
      secondary: 'bg-secondary',
      success: 'bg-green-500/20',
      warning: 'bg-yellow-500/20',
      danger: 'bg-red-500/20',
      gradient: 'bg-kirra-gradient-subtle',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

const indicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-500 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary-foreground',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        danger: 'bg-red-500',
        gradient: 'bg-kirra-gradient',
      },
      animated: {
        true: 'animate-pulse',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      animated: false,
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorClassName?: string;
  animated?: boolean;
  showValue?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value,
      size,
      variant,
      indicatorClassName,
      animated,
      showValue,
      ...props
    },
    ref
  ) => (
    <div className="w-full">
      {showValue && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{value || 0}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size, variant }), className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            indicatorVariants({ variant, animated }),
            'rounded-full',
            indicatorClassName
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;

// Circular Progress
export interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  showValue?: boolean;
  variant?: 'default' | 'gradient';
}

const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  (
    {
      value,
      size = 60,
      strokeWidth = 4,
      className,
      trackClassName,
      indicatorClassName,
      showValue = false,
      variant = 'default',
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className={cn('relative inline-flex', className)}>
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={cn('stroke-muted', trackClassName)}
          />
          {/* Indicator */}
          {variant === 'gradient' ? (
            <>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0c8ce9" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                stroke="url(#gradient)"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={cn(
                  'transition-all duration-500 ease-out',
                  indicatorClassName
                )}
              />
            </>
          ) : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(
                'stroke-primary transition-all duration-500 ease-out',
                indicatorClassName
              )}
            />
          )}
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium">{Math.round(value)}%</span>
          </div>
        )}
      </div>
    );
  }
);
CircularProgress.displayName = 'CircularProgress';

// Affection Meter (custom progress for companion affection)
export interface AffectionMeterProps {
  value: number;
  size?: 'sm' | 'default' | 'lg';
  showHeart?: boolean;
  className?: string;
}

const AffectionMeter = React.forwardRef<HTMLDivElement, AffectionMeterProps>(
  ({ value, size = 'default', showHeart = true, className }, ref) => {
    const getColor = (val: number) => {
      if (val < 25) return 'from-affection-low to-affection-low';
      if (val < 50) return 'from-affection-low to-affection-medium';
      if (val < 75) return 'from-affection-medium to-affection-high';
      return 'from-affection-high to-affection-max';
    };

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        {showHeart && (
          <div
            className={cn(
              'text-affection-high',
              value >= 75 && 'animate-heart-beat'
            )}
          >
            ❤️
          </div>
        )}
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-muted',
            size === 'sm' && 'h-1.5',
            size === 'default' && 'h-2',
            size === 'lg' && 'h-3'
          )}
        >
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r transition-all duration-500',
              getColor(value)
            )}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="min-w-[2.5rem] text-right text-sm font-medium text-muted-foreground">
          {value}%
        </span>
      </div>
    );
  }
);
AffectionMeter.displayName = 'AffectionMeter';

export { Progress, CircularProgress, AffectionMeter, progressVariants };
