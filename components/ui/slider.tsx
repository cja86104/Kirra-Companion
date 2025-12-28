'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils/cn';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

// Gradient Slider
const GradientSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
      <SliderPrimitive.Range className="absolute h-full bg-kirra-gradient" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-kirra-500 bg-background shadow-glow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kirra-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
GradientSlider.displayName = 'GradientSlider';

// Personality Slider with labels on both ends
interface PersonalitySliderProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    'value' | 'onValueChange'
  > {
  leftLabel: string;
  rightLabel: string;
  value: number;
  onValueChange: (value: number) => void;
  showValue?: boolean;
}

const PersonalitySlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  PersonalitySliderProps
>(
  (
    {
      className,
      leftLabel,
      rightLabel,
      value,
      onValueChange,
      showValue = false,
      ...props
    },
    ref
  ) => {
    const handleChange = (values: number[]) => {
      onValueChange(values[0] ?? 0);
    };

    return (
      <div className={cn('w-full space-y-2', className)}>
        <div className="flex items-center justify-between text-sm">
          <span
            className={cn(
              'text-muted-foreground transition-colors',
              value < 0.4 && 'font-medium text-foreground'
            )}
          >
            {leftLabel}
          </span>
          {showValue && (
            <span className="text-xs text-muted-foreground">
              {Math.round(value * 100)}%
            </span>
          )}
          <span
            className={cn(
              'text-muted-foreground transition-colors',
              value > 0.6 && 'font-medium text-foreground'
            )}
          >
            {rightLabel}
          </span>
        </div>
        <SliderPrimitive.Root
          ref={ref}
          className="relative flex w-full touch-none select-none items-center"
          value={[value]}
          onValueChange={handleChange}
          max={1}
          step={0.01}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Range className="absolute h-full bg-kirra-gradient" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-kirra-500 bg-background shadow transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kirra-500 focus-visible:ring-offset-2 active:scale-110 disabled:pointer-events-none disabled:opacity-50" />
        </SliderPrimitive.Root>
      </div>
    );
  }
);
PersonalitySlider.displayName = 'PersonalitySlider';

// Range Slider (two thumbs)
const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
RangeSlider.displayName = 'RangeSlider';

export { Slider, GradientSlider, PersonalitySlider, RangeSlider };
