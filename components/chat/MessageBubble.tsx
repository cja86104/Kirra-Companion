import { formatRelativeTime } from '@/lib/utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/cn';
import type { Message, CompanionWithDNA } from '@/types/database';

interface MessageBubbleProps {
  message: Message;
  companion: CompanionWithDNA;
  isUser: boolean;
}

export function MessageBubble({ message, companion, isUser }: MessageBubbleProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <Avatar size="sm" className="mt-1 shrink-0">
          {companion.avatar_url ? (
            <AvatarImage src={companion.avatar_url} alt={companion.name} />
          ) : (
            <AvatarFallback className="bg-kirra-gradient text-white text-xs">
              {getInitials(companion.name)}
            </AvatarFallback>
          )}
        </Avatar>
      )}

      {/* Message Content */}
      <div
        className={cn(
          'flex max-w-[75%] flex-col gap-1',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-bl-sm bg-muted text-foreground'
          )}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <span className="px-1 text-2xs text-muted-foreground">
          {formatRelativeTime(message.created_at)}
        </span>
      </div>

      {/* User Avatar Placeholder (for alignment) */}
      {isUser && <div className="w-8 shrink-0" />}
    </div>
  );
}
