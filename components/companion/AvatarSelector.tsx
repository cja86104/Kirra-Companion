'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Check, User, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getClient } from '@/lib/supabase/client';

// Generate placeholder gradient avatars
const GRADIENT_AVATARS = [
  { id: 'gradient-1', gradient: 'from-pink-400 to-purple-500', emoji: '💜' },
  { id: 'gradient-2', gradient: 'from-blue-400 to-cyan-500', emoji: '💙' },
  { id: 'gradient-3', gradient: 'from-green-400 to-emerald-500', emoji: '💚' },
  { id: 'gradient-4', gradient: 'from-yellow-400 to-orange-500', emoji: '🧡' },
  { id: 'gradient-5', gradient: 'from-red-400 to-pink-500', emoji: '❤️' },
  { id: 'gradient-6', gradient: 'from-indigo-400 to-violet-500', emoji: '💜' },
  { id: 'gradient-7', gradient: 'from-teal-400 to-blue-500', emoji: '💎' },
  { id: 'gradient-8', gradient: 'from-rose-400 to-red-500', emoji: '🌹' },
];

interface AvatarSelectorProps {
  selectedAvatar: string | null;
  onSelect: (avatarUrl: string | null) => void;
  companionName: string;
  disabled?: boolean;
}

export function AvatarSelector({
  selectedAvatar,
  onSelect,
  companionName,
  disabled = false,
}: AvatarSelectorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'premade' | 'gradient' | 'upload'>('gradient');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const supabase = getClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to upload an avatar');
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `companion-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `companion-avatars/${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      onSelect(publicUrl);
      toast.success('Avatar uploaded successfully!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getInitials = () => {
    return companionName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const isGradientSelected = (gradientId: string) => {
    return selectedAvatar === `gradient:${gradientId}`;
  };

  return (
    <div className="space-y-4">
      <Label>Choose an Avatar for {companionName || 'your companion'}</Label>
      
      {/* Tab Selection */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('gradient')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeTab === 'gradient'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          disabled={disabled}
        >
          <Sparkles className="inline-block w-4 h-4 mr-1" />
          Colors
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeTab === 'upload'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          disabled={disabled}
        >
          <Upload className="inline-block w-4 h-4 mr-1" />
          Upload
        </button>
      </div>

      {/* Current Selection Preview */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
        <div className="relative">
          {selectedAvatar ? (
            selectedAvatar.startsWith('gradient:') ? (
              <div 
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br',
                  GRADIENT_AVATARS.find(g => `gradient:${g.id}` === selectedAvatar)?.gradient || 'from-primary to-primary/60'
                )}
              >
                {GRADIENT_AVATARS.find(g => `gradient:${g.id}` === selectedAvatar)?.emoji || getInitials()}
              </div>
            ) : (
              <Image
                src={selectedAvatar}
                alt="Selected avatar"
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover"
              />
            )
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {selectedAvatar && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
        </div>
        <div>
          <p className="font-medium">
            {selectedAvatar ? 'Avatar Selected' : 'No Avatar Selected'}
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedAvatar 
              ? 'Looking great! You can change this anytime.'
              : 'Choose a color or upload your own image'}
          </p>
        </div>
      </div>

      {/* Gradient Avatars */}
      {activeTab === 'gradient' && (
        <div className="grid grid-cols-4 gap-3">
          {GRADIENT_AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelect(`gradient:${avatar.id}`)}
              disabled={disabled}
              className={cn(
                'relative aspect-square rounded-xl transition-all hover:scale-105',
                'bg-gradient-to-br flex items-center justify-center text-2xl',
                avatar.gradient,
                isGradientSelected(avatar.id)
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'hover:ring-2 hover:ring-muted-foreground/30'
              )}
            >
              <span className="text-white drop-shadow-lg">{getInitials()}</span>
              {isGradientSelected(avatar.id) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Upload Option */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              disabled || isUploading
                ? 'border-muted bg-muted/30 cursor-not-allowed'
                : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5'
            )}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="font-medium">Click to upload an image</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {selectedAvatar && !selectedAvatar.startsWith('gradient:') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelect(null)}
              disabled={disabled}
            >
              Remove uploaded avatar
            </Button>
          )}
        </div>
      )}

      {/* Skip Option */}
      {selectedAvatar && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelect(null)}
          disabled={disabled}
          className="text-muted-foreground"
        >
          Skip for now
        </Button>
      )}
    </div>
  );
}

/**
 * Convert gradient selection to actual avatar URL for database
 * Returns null for gradient (will use initials), or the URL for uploaded images
 */
export function resolveAvatarUrl(selection: string | null): string | null {
  if (!selection) return null;
  if (selection.startsWith('gradient:')) {
    // Gradient avatars are rendered client-side, no URL needed
    return null;
  }
  return selection;
}

/**
 * Get gradient config from selection for storing preference
 */
export function getGradientConfig(selection: string | null): string | null {
  if (!selection || !selection.startsWith('gradient:')) return null;
  const gradientId = selection.replace('gradient:', '');
  const gradient = GRADIENT_AVATARS.find(g => g.id === gradientId);
  return gradient ? gradient.gradient : null;
}
