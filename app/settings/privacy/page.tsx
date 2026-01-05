'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Eye, Lock, Database, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

interface PrivacySettings {
  shareAnalytics: boolean;
  improveAI: boolean;
  showOnlineStatus: boolean;
  allowDataExport: boolean;
}

const defaultSettings: PrivacySettings = {
  shareAnalytics: false,
  improveAI: true,
  showOnlineStatus: true,
  allowDataExport: true,
};

const privacyOptions = [
  {
    key: 'shareAnalytics' as const,
    label: 'Share Usage Analytics',
    description: 'Help us improve by sharing anonymous usage data',
    icon: Database,
  },
  {
    key: 'improveAI' as const,
    label: 'Improve AI Responses',
    description: 'Allow your conversations to help improve AI quality (anonymized)',
    icon: Shield,
  },
  {
    key: 'showOnlineStatus' as const,
    label: 'Online Status',
    description: 'Show your companion when you\'re online',
    icon: Eye,
  },
  {
    key: 'allowDataExport' as const,
    label: 'Data Export',
    description: 'Allow exporting your data from the app',
    icon: Lock,
  },
];

export default function PrivacyPage() {
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
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

      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      if (data?.preferences?.privacy) {
        setSettings({ ...defaultSettings, ...data.preferences.privacy });
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: PrivacySettings) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      const currentPrefs = currentProfile?.preferences || {};

      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: {
            ...currentPrefs,
            privacy: newSettings,
          },
        } as never)
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Privacy settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetting = async (key: keyof PrivacySettings) => {
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
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Control how your data is used and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {privacyOptions.map((option, index) => (
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

      {/* Privacy Notice */}
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Your Privacy Matters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your conversations are encrypted and never shared with third parties. 
                We only use anonymized data to improve the service when you opt-in. 
                You can request a full export or deletion of your data at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
