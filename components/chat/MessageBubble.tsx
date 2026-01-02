/**
 * KIRRA MESSAGE BUBBLE v2.0
 * =========================
 * Messages should have PERSONALITY.
 * User messages: confident, clear
 * Companion messages: warm, alive, present
 */

import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.25, 
        ease: [0.4, 0, 0.2, 1] 
      }}
      className={cn(
        'group flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Companion Avatar - Only for companion messages */}
      {!isUser && (
        <motion.div 
          className="relative mt-1 shrink-0"
          whileHover={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
            {companion.avatar_url ? (
              <AvatarImage 
                src={companion.avatar_url} 
                alt={companion.name}
                className="object-cover"
              />
            ) : (
              <AvatarFallback className="bg-kirra-gradient text-white text-xs font-medium">
                {getInitials(companion.name)}
              </AvatarFallback>
            )}
          </Avatar>
          {/* Subtle presence indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-kirra-forest-lighter border-2 border-background" />
        </motion.div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          'flex max-w-[78%] flex-col gap-1.5',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message Bubble */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 500 }}
          className={cn(
            'relative px-4 py-3',
            isUser
              ? 'message-user rounded-2xl rounded-br-md'
              : 'message-companion rounded-2xl rounded-bl-md'
          )}
        >
          {/* Subtle shine effect on user messages */}
          {isUser && (
            <div className="absolute inset-0 rounded-2xl rounded-br-md bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
          )}
          
          {/* Message Text */}
          <p className={cn(
            'relative whitespace-pre-wrap text-[15px] leading-relaxed',
            isUser ? 'text-white' : 'text-foreground'
          )}>
            {message.content}
          </p>
        </motion.div>

        {/* Timestamp - appears on hover */}
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className={cn(
            'px-1 text-2xs text-muted-foreground transition-opacity',
            'group-hover:opacity-100'
          )}
        >
          {formatRelativeTime(message.created_at)}
        </motion.span>
      </div>

      {/* Spacer for user messages (alignment) */}
      {isUser && <div className="w-9 shrink-0" />}
    </motion.div>
  );
}
