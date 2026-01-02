'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image, Paperclip, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { VoiceMessageRecorder, useVoiceRecordingSupported } from '@/components/chat/VoiceMessageRecorder';
import { AudioPlayer } from '@/components/chat/AudioPlayer';

interface ChatInputProps {
  onSend: (message: string, voiceBlob?: Blob, voiceDuration?: number) => void;
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
  const [recordedAudio, setRecordedAudio] = useState<{
    blob: Blob;
    duration: number;
  } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isVoiceSupported = useVoiceRecordingSupported();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (recordedAudio) {
      // Send voice message
      onSend('', recordedAudio.blob, recordedAudio.duration);
      setRecordedAudio(null);
      return;
    }

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

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setRecordedAudio({ blob, duration });
    setIsRecording(false);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
    setRecordedAudio(null);
  };

  const clearRecordedAudio = () => {
    setRecordedAudio(null);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordedAudio(null);
  };

  // Show voice recorder when recording
  if (isRecording) {
    return (
      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto max-w-3xl">
          <VoiceMessageRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={handleCancelRecording}
            maxDuration={60}
          />
        </div>
      </div>
    );
  }

  // Show recorded audio preview
  if (recordedAudio) {
    return (
      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
            <div className="flex-1">
              <AudioPlayer
                audioBlob={recordedAudio.blob}
                compact
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearRecordedAudio}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                size="icon-sm"
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-primary text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {Math.round(recordedAudio.duration)}s voice message ready to send
          </p>
        </div>
      </div>
    );
  }

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
          {voiceEnabled && isVoiceSupported && ' • Click mic to record'}
        </p>
      </div>
    </div>
  );
}
