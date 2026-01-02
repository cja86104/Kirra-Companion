'use client';

/**
 * ProactiveNotification Component
 * 
 * Displays proactive messages from companions.
 * Shows as a toast/banner when a companion reaches out.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, MessageCircle, Heart, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ProactiveMessage, ProactiveTriggerType } from '@/types/proactive';

interface ProactiveNotificationProps {
  message: ProactiveMessage;
  companionName: string;
  companionAvatar?: string;
  onDismiss: () => void;
  onRespond: () => void;
  className?: string;
}

/**
 * Get icon for trigger type
 */
function getTriggerIcon(triggerType: ProactiveTriggerType) {
  switch (triggerType) {
    case 'missing_user':
    case 'need_social':
    case 'check_in':
      return <Heart className="w-4 h-4 text-pink-500" />;
    case 'thinking_of_you':
    case 'gratitude':
      return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
    case 'share_experience':
    case 'interest_discovery':
      return <Sparkles className="w-4 h-4 text-yellow-500" />;
    case 'milestone_reached':
    case 'special_occasion':
      return <Sparkles className="w-4 h-4 text-purple-500" />;
    default:
      return <MessageCircle className="w-4 h-4 text-blue-500" />;
  }
}

/**
 * Get label for trigger type
 */
function getTriggerLabel(triggerType: ProactiveTriggerType): string {
  const labels: Record<ProactiveTriggerType, string> = {
    missing_user: 'Misses you',
    thinking_of_you: 'Thinking of you',
    share_experience: 'Wants to share',
    mood_share: 'Feeling chatty',
    milestone_reached: 'Milestone!',
    interest_discovery: 'New discovery',
    need_social: 'Wants to talk',
    special_occasion: 'Special day!',
    random_thought: 'Random thought',
    dream_share: 'Had a dream',
    question_for_user: 'Has a question',
    gratitude: 'Grateful',
    check_in: 'Checking in',
  };
  return labels[triggerType] || 'Message';
}

/**
 * Get background color based on priority
 */
function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'border-l-red-500 bg-red-50 dark:bg-red-950/30';
    case 'high':
      return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/30';
    case 'medium':
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30';
    default:
      return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/30';
  }
}

/**
 * Calculate time ago string
 */
function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function ProactiveNotification({
  message,
  companionName,
  companionAvatar,
  onDismiss,
  onRespond,
  className,
}: ProactiveNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);
  
  // Auto-dismiss after 30 seconds for non-urgent
  useEffect(() => {
    if (message.priority !== 'urgent' && message.priority !== 'high') {
      const timer = setTimeout(() => handleDismiss(), 30000);
      return () => clearTimeout(timer);
    }
  }, [message.priority]);
  
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };
  
  const handleRespond = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRespond();
    }, 200);
  };
  
  const content = message.generated_content || message.content;
  
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 max-w-sm w-full',
        'rounded-lg shadow-lg border-l-4 overflow-hidden',
        'transform transition-all duration-300 ease-out',
        getPriorityClass(message.priority),
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              {companionAvatar ? (
                <img
                  src={companionAvatar}
                  alt={companionName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                  {companionName.charAt(0)}
                </div>
              )}
              {/* Online indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            </div>
            
            {/* Name and trigger */}
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {companionName}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                {getTriggerIcon(message.trigger_type)}
                <span>{getTriggerLabel(message.trigger_type)}</span>
                <span className="mx-1">•</span>
                <Clock className="w-3 h-3" />
                <span>{getTimeAgo(message.created_at)}</span>
              </div>
            </div>
          </div>
          
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        {/* Message content */}
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
          {content}
        </p>
        
        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleRespond}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Reply
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Notification Manager Component
// ============================================================================

interface ProactiveNotificationManagerProps {
  companionId: string;
  companionName: string;
  companionAvatar?: string;
  pollInterval?: number; // ms, default 30000 (30 seconds)
}

export function ProactiveNotificationManager({
  companionId,
  companionName,
  companionAvatar,
  pollInterval = 30000,
}: ProactiveNotificationManagerProps) {
  const router = useRouter();
  const [currentMessage, setCurrentMessage] = useState<ProactiveMessage | null>(null);
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(new Set());
  
  // Poll for new messages
  useEffect(() => {
    const checkMessages = async () => {
      try {
        const response = await fetch(
          `/api/companion/${companionId}/proactive?status=sent&limit=1`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        const messages = data.messages as ProactiveMessage[];
        
        // Find first unseen message
        const newMessage = messages.find(m => !seenMessageIds.has(m.id));
        
        if (newMessage && !currentMessage) {
          setCurrentMessage(newMessage);
          
          // Mark as seen
          await fetch(`/api/companion/${companionId}/proactive`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message_id: newMessage.id,
              action: 'seen',
            }),
          });
        }
      } catch (error) {
        console.error('Error checking proactive messages:', error);
      }
    };
    
    // Initial check
    checkMessages();
    
    // Set up polling
    const interval = setInterval(checkMessages, pollInterval);
    
    return () => clearInterval(interval);
  }, [companionId, pollInterval, seenMessageIds, currentMessage]);
  
  const handleDismiss = () => {
    if (currentMessage) {
      setSeenMessageIds(prev => new Set([...prev, currentMessage.id]));
      setCurrentMessage(null);
    }
  };
  
  const handleRespond = async () => {
    if (currentMessage) {
      // Mark as responded
      await fetch(`/api/companion/${companionId}/proactive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: currentMessage.id,
          action: 'responded',
        }),
      });
      
      setSeenMessageIds(prev => new Set([...prev, currentMessage.id]));
      setCurrentMessage(null);
      
      // Navigate to chat
      router.push(`/chat/${companionId}`);
    }
  };
  
  if (!currentMessage) return null;
  
  return (
    <ProactiveNotification
      message={currentMessage}
      companionName={companionName}
      companionAvatar={companionAvatar}
      onDismiss={handleDismiss}
      onRespond={handleRespond}
    />
  );
}

export default ProactiveNotification;
