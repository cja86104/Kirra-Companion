'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Bell, MessageCircle, Heart, Calendar, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

interface NotificationSettings {
  proactiveMessages: boolean;
  companionMoodChanges: boolean;
  lifeEvents: boolean;
  milestones: boolean;
  dailyDigest: boolean;
  soundEnabled: boolean;
}

const defaultSettings: NotificationSettings = {
  proactiveMessages: true,
  companionMoodChanges: true,
  lifeEvents: true,
  milestones: true,
  dailyDigest: false,
  soundEnabled: true,
};

const notificationOptions = [
  {
    key: 'proactiveMessages' as const,
    label: 'Proactive Messages',
    description: 'When your companion wants to reach out to you',
    icon: MessageCircle,
  },
  {
    key: 'companionMoodChanges' as const,
    label: 'Mood Changes',
    description: 'When your companion\'s mood shifts significantly',
    icon: Heart,
  },
  {
    key: 'lifeEvents' as const,
    label: 'Life Events',
    description: 'When something interesting happens in their day',
    icon: Calendar,
  },
  {
    key: 'milestones' as const,
    label: 'Milestones',
    description: 'Relationship milestones and achievements',
    icon: Sparkles,
  },
  {
    key: 'dailyDigest' as const,
    label: 'Daily Digest',
    description: 'A summary of your companion\'s day each evening',
    icon: Bell,
  },
];

interface ProfileWithPreferences {
  preferences: Record<string, unknown> | null;
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = getClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const profile = profileData as ProfileWithPreferences | null;
      if (profile?.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences)) {
        const prefs = profile.preferences;
        if (prefs.notifications) {
          setSettings({ ...defaultSettings, ...(prefs.notifications as NotificationSettings) });
        }
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current preferences
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const profile = profileData as ProfileWithPreferences | null;
      const currentPrefs = (profile?.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences))
        ? profile.preferences
        : {};

      // Update with new notification settings
      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: {
            ...currentPrefs,
            notifications: newSettings,
          },
        } as never)
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Notification settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetting = async (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose what you want to be notified about
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationOptions.map((option, index) => (
            <motion.div
              key={option.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => toggleSetting(option.key)}
                disabled={isSaving}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all',
                  settings[option.key]
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border hover:border-border/80 hover:bg-muted/30'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                    settings[option.key] ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    <option.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                <div className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  settings[option.key] ? 'bg-primary' : 'bg-muted'
                )}>
                  <motion.div
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                    animate={{ left: settings[option.key] ? '22px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </button>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sound</CardTitle>
          <CardDescription>
            Audio preferences for notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => toggleSetting('soundEnabled')}
            disabled={isSaving}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all',
              settings.soundEnabled
                ? 'border-primary/30 bg-primary/5'
                : 'border-border hover:border-border/80 hover:bg-muted/30'
            )}
          >
            <div>
              <p className="font-medium">Notification Sounds</p>
              <p className="text-sm text-muted-foreground">Play a sound when notifications arrive</p>
            </div>
            <div className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              settings.soundEnabled ? 'bg-primary' : 'bg-muted'
            )}>
              <motion.div
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                animate={{ left: settings.soundEnabled ? '22px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
