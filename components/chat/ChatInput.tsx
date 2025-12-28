'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  companionName: string;
}

export function ChatInput({ onSend, isLoading, companionName }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
          {/* Attachment Buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              disabled
              title="Attachments coming soon"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              disabled
              title="Images coming soon"
            >
              <Image className="h-5 w-5" />
            </Button>
          </div>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${companionName}...`}
            className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            rows={1}
            disabled={isLoading}
          />

          {/* Right Side Buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              disabled
              title="Emoji picker coming soon"
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              disabled
              title="Voice messages coming soon"
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              size="icon-sm"
              className={cn(
                'shrink-0 transition-all',
                message.trim()
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
              onClick={handleSubmit}
              disabled={!message.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Helper Text */}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
