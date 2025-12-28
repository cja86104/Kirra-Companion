'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
        '2xl': 'h-20 w-20',
        '3xl': 'h-24 w-24',
      },
      border: {
        none: '',
        default: 'ring-2 ring-background',
        primary: 'ring-2 ring-primary',
        gradient: 'ring-2 ring-offset-2 ring-offset-background',
      },
    },
    defaultVariants: {
      size: 'default',
      border: 'none',
    },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, border, status, ...props }, ref) => (
  <div className="relative inline-block">
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size, border }), className)}
      {...props}
    />
    {status && (
      <span
        className={cn(
          'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
          size === 'xs' && 'h-1.5 w-1.5',
          size === 'sm' && 'h-2 w-2',
          size === 'default' && 'h-2.5 w-2.5',
          size === 'lg' && 'h-3 w-3',
          size === 'xl' && 'h-3.5 w-3.5',
          size === '2xl' && 'h-4 w-4',
          size === '3xl' && 'h-5 w-5',
          status === 'online' && 'bg-green-500',
          status === 'offline' && 'bg-gray-400',
          status === 'away' && 'bg-yellow-500',
          status === 'busy' && 'bg-red-500'
        )}
      />
    )}
  </div>
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Gradient Avatar for companions
export interface GradientAvatarProps extends AvatarProps {
  src?: string;
  fallback?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

const GradientAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  GradientAvatarProps
>(
  (
    {
      className,
      size,
      status,
      src,
      fallback,
      gradientFrom = '#0c8ce9',
      gradientTo = '#a855f7',
      ...props
    },
    ref
  ) => (
    <div className="relative inline-block">
      <div
        className={cn(
          'absolute -inset-0.5 rounded-full opacity-75 blur-sm',
          avatarVariants({ size })
        )}
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        }}
      />
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          avatarVariants({ size }),
          'relative ring-2 ring-background',
          className
        )}
        {...props}
      >
        {src ? (
          <AvatarImage src={src} alt={fallback || 'Avatar'} />
        ) : (
          <AvatarFallback
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
            }}
            className="text-white"
          >
            {fallback}
          </AvatarFallback>
        )}
      </AvatarPrimitive.Root>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            size === 'xs' && 'h-1.5 w-1.5',
            size === 'sm' && 'h-2 w-2',
            size === 'default' && 'h-2.5 w-2.5',
            size === 'lg' && 'h-3 w-3',
            size === 'xl' && 'h-3.5 w-3.5',
            size === '2xl' && 'h-4 w-4',
            size === '3xl' && 'h-5 w-5',
            status === 'online' && 'bg-green-500',
            status === 'offline' && 'bg-gray-400',
            status === 'away' && 'bg-yellow-500',
            status === 'busy' && 'bg-red-500'
          )}
        />
      )}
    </div>
  )
);
GradientAvatar.displayName = 'GradientAvatar';

// Avatar Group
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max = 4, size = 'default', ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    return (
      <div
        ref={ref}
        className={cn('flex -space-x-2', className)}
        {...props}
      >
        {visibleChildren.map((child, index) => (
          <div key={index} className="relative" style={{ zIndex: max - index }}>
            {React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size, border: 'default' })
              : child}
          </div>
        ))}
        {remainingCount > 0 && (
          <Avatar size={size} border="default">
            <AvatarFallback className="bg-muted text-xs font-medium">
              +{remainingCount}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarImage, AvatarFallback, GradientAvatar, AvatarGroup, avatarVariants };
