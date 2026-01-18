'use client';

/**
 * CHAT INPUT v3.0
 * ================
 * Full featured input with:
 * - Text messaging
 * - Voice recording (browser speech recognition)
 * - Image attachments
 * - File attachments
 * - Emoji picker
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image as ImageIcon, Paperclip, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { VoiceMessageRecorder, useVoiceRecordingSupported } from '@/components/chat/VoiceMessageRecorder';
import { toast } from 'sonner';

// Common emojis organized by category
const EMOJI_CATEGORIES = {
  'Smileys': ['😊', '😂', '🥰', '😍', '🤔', '😢', '😭', '😡', '🥺', '😴', '🤗', '😎', '🙄', '😏', '🤭'],
  'Gestures': ['👍', '👎', '👋', '🙏', '👏', '🤝', '💪', '🤞', '✌️', '🤟', '👌', '🫶', '❤️', '💕', '💖'],
  'Nature': ['🌸', '🌺', '🌻', '🌹', '🌈', '⭐', '🌙', '☀️', '🔥', '💧', '🍀', '🌴', '🌊', '❄️', '🦋'],
  'Food': ['☕', '🍕', '🍔', '🍟', '🍩', '🍪', '🎂', '🍫', '🍿', '🥤', '🍷', '🍺', '🥂', '🍎', '🍓'],
  'Activities': ['🎉', '🎊', '🎁', '🎮', '🎬', '🎵', '🎸', '📚', '✈️', '🚗', '🏠', '💻', '📱', '💡', '🎯'],
};

interface Attachment {
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
  companionName: string;
  voiceEnabled?: boolean;
}

export function ChatInput({ 
  onSend, 
  isLoading, 
  companionName,
  voiceEnabled = true,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const isVoiceSupported = useVoiceRecordingSupported();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleSubmit = () => {
    if ((message.trim() || attachments.length > 0) && !isLoading) {
      onSend(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
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

  const handleTranscriptionComplete = (text: string) => {
    if (text.trim()) {
      onSend(text.trim());
    }
    setIsRecording(false);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  const startRecording = () => {
    setIsRecording(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxAttachments = 5;

    if (attachments.length + files.length > maxAttachments) {
      toast.error(`Maximum ${maxAttachments} attachments allowed`);
      return;
    }

    const newAttachments: Attachment[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return;
      }

      const attachment: Attachment = { file, type };

      // Create preview for images
      if (type === 'image' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          setAttachments((prev) => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);
    });

    setAttachments((prev) => [...prev, ...newAttachments]);

    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);
      
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setMessage((prev) => prev + emoji);
    }
  };

  // Show voice recorder when recording
  if (isRecording) {
    return (
      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto max-w-3xl">
          <VoiceMessageRecorder
            onTranscriptionComplete={handleTranscriptionComplete}
            onCancel={handleCancelRecording}
            maxDuration={120}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="mx-auto max-w-3xl">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="relative group rounded-lg border border-border bg-muted/50 overflow-hidden"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.file.name}
                    className="h-20 w-20 object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 flex flex-col items-center justify-center p-2">
                    <Paperclip className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate w-full text-center mt-1">
                      {attachment.file.name.slice(0, 10)}...
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -right-1 -top-1 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
          {/* Attachment Buttons */}
          <div className="flex gap-1">
            {/* File Attachment */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
              onChange={(e) => handleFileSelect(e, 'file')}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            {/* Image Attachment */}
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'image')}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => imageInputRef.current?.click()}
              disabled={isLoading}
              title="Attach image"
            >
              <ImageIcon className="h-5 w-5" />
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
            {/* Emoji Picker */}
            <div className="relative" ref={emojiPickerRef}>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  'shrink-0 text-muted-foreground hover:text-foreground',
                  showEmojiPicker && 'bg-muted text-foreground'
                )}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={isLoading}
                title="Add emoji"
              >
                <Smile className="h-5 w-5" />
              </Button>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 w-72 rounded-lg border border-border bg-card shadow-lg z-50">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                      <div key={category} className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
                          {category}
                        </p>
                        <div className="grid grid-cols-8 gap-0.5">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                insertEmoji(emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Voice Recording Button */}
            {voiceEnabled && isVoiceSupported && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={startRecording}
                disabled={isLoading}
                title="Record voice message"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
            
            {/* Send Button */}
            <Button
              size="icon-sm"
              className={cn(
                'shrink-0 transition-all',
                (message.trim() || attachments.length > 0)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
              onClick={handleSubmit}
              disabled={(!message.trim() && attachments.length === 0) || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Helper Text */}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Press Enter to send, Shift + Enter for new line
          {voiceEnabled && isVoiceSupported && ' • Click mic to record'}
        </p>
      </div>
    </div>
  );
}

// Export the Attachment type for use in other components
export type { Attachment };
