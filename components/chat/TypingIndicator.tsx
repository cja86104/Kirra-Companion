'use client';

import { cn } from '@/lib/utils/cn';

interface TypingIndicatorProps {
  companionName: string;
  className?: string;
}

export function TypingIndicator({ companionName, className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <span
          className="h-2 w-2 animate-typing-dot rounded-full bg-muted-foreground/60"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-2 w-2 animate-typing-dot rounded-full bg-muted-foreground/60"
          style={{ animationDelay: '200ms' }}
        />
        <span
          className="h-2 w-2 animate-typing-dot rounded-full bg-muted-foreground/60"
          style={{ animationDelay: '400ms' }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {companionName} is typing...
      </span>
    </div>
  );
}
