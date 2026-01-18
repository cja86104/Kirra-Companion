/**
 * KIRRA MESSAGE BUBBLE v4.0
 * =========================
 * Messages that feel ALIVE
 * 
 * Features:
 * - Mood-colored accents on companion messages
 * - Glow effects that match mood
 * - Enhanced entrance animations
 * - Reaction support
 * - Special effects for emotional moments
 */

import { motion } from 'framer-motion';
import { FileText, Download, Heart, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/cn';
import type { Message, CompanionWithDNA } from '@/types/database';

interface Attachment {
  url: string;
  filename: string;
  type: 'image' | 'file';
  size: number;
}

interface MessageBubbleProps {
  message: Message;
  companion: CompanionWithDNA;
  isUser: boolean;
}

// Mood colors for companion message accents
const MOOD_COLORS: Record<string, { border: string; glow: string; bg: string }> = {
  happy: { border: 'border-amber-500/30', glow: 'shadow-amber-500/20', bg: 'from-amber-500/5 to-orange-500/5' },
  excited: { border: 'border-rose-500/30', glow: 'shadow-rose-500/20', bg: 'from-rose-500/5 to-pink-500/5' },
  loving: { border: 'border-rose-500/40', glow: 'shadow-rose-500/30', bg: 'from-rose-500/10 to-red-500/5' },
  calm: { border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', bg: 'from-emerald-500/5 to-teal-500/5' },
  playful: { border: 'border-violet-500/30', glow: 'shadow-violet-500/20', bg: 'from-violet-500/5 to-purple-500/5' },
  curious: { border: 'border-blue-500/30', glow: 'shadow-blue-500/20', bg: 'from-blue-500/5 to-cyan-500/5' },
  thoughtful: { border: 'border-slate-500/30', glow: 'shadow-slate-500/10', bg: 'from-slate-500/5 to-gray-500/5' },
  sad: { border: 'border-blue-500/30', glow: 'shadow-blue-500/20', bg: 'from-blue-500/5 to-indigo-500/5' },
  anxious: { border: 'border-amber-500/30', glow: 'shadow-amber-500/20', bg: 'from-amber-500/5 to-yellow-500/5' },
  neutral: { border: 'border-gray-500/20', glow: 'shadow-gray-500/10', bg: 'from-gray-500/5 to-slate-500/5' },
  proud: { border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', bg: 'from-emerald-500/5 to-green-500/5' },
  grateful: { border: 'border-rose-500/30', glow: 'shadow-rose-500/20', bg: 'from-rose-500/5 to-orange-500/5' },
};

// Keywords that trigger special effects
const EMOTIONAL_KEYWORDS = {
  love: ['love', 'adore', '❤️', '💕', '💖', '🥰', 'heart'],
  happy: ['happy', 'joy', 'excited', '😊', '🎉', '✨', 'amazing', 'wonderful'],
  supportive: ['proud', 'believe', 'support', 'always here', 'care about'],
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectEmotionalMoment(content: string): 'love' | 'happy' | 'supportive' | null {
  const lowerContent = content.toLowerCase();
  
  for (const [emotion, keywords] of Object.entries(EMOTIONAL_KEYWORDS)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      return emotion as 'love' | 'happy' | 'supportive';
    }
  }
  return null;
}

export function MessageBubble({ message, companion, isUser }: MessageBubbleProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get mood colors
  const moodData = companion.current_mood as { primary?: string } | null;
  const currentMood = moodData?.primary || 'neutral';
  const moodStyle = MOOD_COLORS[currentMood] || MOOD_COLORS.neutral;
  
  // Detect emotional content in companion messages
  const emotionalMoment = !isUser ? detectEmotionalMoment(message.content || '') : null;

  // Extract attachments
  const attachments: Attachment[] = (message.metadata as { attachments?: Attachment[] })?.attachments || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1],
        scale: { type: 'spring', stiffness: 200, damping: 20 }
      }}
      className={cn(
        'group flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Companion Avatar */}
      {!isUser && (
        <motion.div 
          className="relative mt-1 shrink-0"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
        >
          <Avatar className={cn(
            "h-10 w-10 ring-2 ring-offset-2 ring-offset-background transition-all",
            moodStyle.border.replace('border-', 'ring-')
          )}>
            {companion.avatar_url ? (
              <AvatarImage src={companion.avatar_url} alt={companion.name} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-bold">
                {getInitials(companion.name)}
              </AvatarFallback>
            )}
          </Avatar>
          {/* Online indicator with glow */}
          <motion.span 
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      )}

      {/* Message Content */}
      <div className={cn(
        'flex max-w-[78%] flex-col gap-2',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', isUser ? 'justify-end' : 'justify-start')}>
            {attachments.map((attachment, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {attachment.type === 'image' ? (
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                    <motion.img
                      whileHover={{ scale: 1.02 }}
                      src={attachment.url}
                      alt={attachment.filename}
                      className={cn(
                        "max-h-56 max-w-xs rounded-2xl object-cover cursor-pointer transition-all",
                        isUser 
                          ? "ring-2 ring-white/20" 
                          : cn("ring-2", moodStyle.border.replace('border-', 'ring-'))
                      )}
                    />
                  </a>
                ) : (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.filename}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all',
                      isUser 
                        ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                        : cn('border bg-card/80 hover:bg-card', moodStyle.border)
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isUser ? "bg-white/20" : "bg-muted"
                    )}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{attachment.filename}</p>
                      <p className={cn('text-xs', isUser ? 'text-white/60' : 'text-muted-foreground')}>
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    <Download className="h-4 w-4 opacity-50" />
                  </motion.a>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Message Bubble */}
        {message.content && !message.content.startsWith('[Shared ') && (
          <motion.div
            whileHover={{ scale: 1.01 }}
            className={cn(
              'relative overflow-hidden',
              isUser
                ? 'rounded-3xl rounded-br-lg bg-gradient-to-br from-violet-500 to-purple-600 px-5 py-3.5 text-white shadow-lg shadow-violet-500/20'
                : cn(
                    'rounded-3xl rounded-bl-lg border-2 bg-card/90 backdrop-blur-sm px-5 py-3.5 shadow-lg',
                    moodStyle.border,
                    moodStyle.glow
                  )
            )}
          >
            {/* Mood gradient overlay for companion messages */}
            {!isUser && (
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
                moodStyle.bg
              )} />
            )}
            
            {/* Shine effect on user messages */}
            {isUser && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 pointer-events-none"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            )}
            
            {/* Special effects for emotional moments */}
            {emotionalMoment === 'love' && (
              <motion.div
                className="absolute top-2 right-2 text-rose-400"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                <Heart className="h-4 w-4 fill-current" />
              </motion.div>
            )}
            {emotionalMoment === 'happy' && (
              <motion.div
                className="absolute top-2 right-2 text-amber-400"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            )}
            
            {/* Message Text */}
            <p className={cn(
              'relative whitespace-pre-wrap text-[15px] leading-relaxed',
              isUser ? 'text-white' : 'text-foreground'
            )}>
              {message.content}
            </p>
          </motion.div>
        )}

        {/* Timestamp */}
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          whileHover={{ opacity: 1 }}
          className={cn(
            'px-2 text-xs text-muted-foreground transition-opacity cursor-default',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formatRelativeTime(message.created_at)}
        </motion.span>
      </div>

      {/* Spacer for alignment */}
      {isUser && <div className="w-10 shrink-0" />}
    </motion.div>
  );
}
