'use client';

import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

const themes = [
  {
    id: 'light' as const,
    label: 'Light',
    description: 'Warm cream and sage tones',
    icon: Sun,
    preview: 'bg-gradient-to-br from-[#f5e6d3] to-[#dce5e0]',
  },
  {
    id: 'dark' as const,
    label: 'Dark',
    description: 'Deep forest at twilight',
    icon: Moon,
    preview: 'bg-gradient-to-br from-[#0a1610] to-[#1b4332]',
  },
  {
    id: 'system' as const,
    label: 'System',
    description: 'Match your device settings',
    icon: Monitor,
    preview: 'bg-gradient-to-br from-[#f5e6d3] via-[#3a4a42] to-[#0a1610]',
  },
];

export default function AppearancePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how Kirra looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <h3 className="text-sm font-medium mb-4">Theme</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {themes.map((t) => (
                  <motion.button
                    key={t.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all',
                      theme === t.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    {/* Preview Box */}
                    <div className={cn(
                      'mb-3 h-20 w-full rounded-lg',
                      t.preview
                    )}>
                      {/* Mini UI preview */}
                      <div className="flex h-full items-end p-2">
                        <div className="flex gap-1">
                          <div className={cn(
                            'h-3 w-8 rounded-full',
                            t.id === 'light' ? 'bg-[#2d6a4f]' : 
                            t.id === 'dark' ? 'bg-[#52b788]' : 'bg-[#40916c]'
                          )} />
                          <div className={cn(
                            'h-3 w-12 rounded-full',
                            t.id === 'light' ? 'bg-[#1b4332]/20' : 
                            t.id === 'dark' ? 'bg-[#52b788]/20' : 'bg-[#40916c]/30'
                          )} />
                        </div>
                      </div>
                    </div>

                    {/* Label */}
                    <div className="flex items-center gap-2">
                      <t.icon className={cn(
                        'h-4 w-4',
                        theme === t.id ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span className="font-medium">{t.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.description}
                    </p>

                    {/* Check mark */}
                    {theme === t.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      >
                        <Check className="h-3 w-3" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Current Theme Info */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  resolvedTheme === 'dark' ? 'bg-kirra-forest/20' : 'bg-kirra-sage/20'
                )}>
                  {resolvedTheme === 'dark' ? (
                    <Moon className="h-5 w-5 text-kirra-sage" />
                  ) : (
                    <Sun className="h-5 w-5 text-kirra-amber" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Currently using {resolvedTheme} mode
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {theme === 'system' 
                      ? 'Following your system preference' 
                      : `Manually set to ${theme}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future: More appearance options */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-base">Coming Soon</CardTitle>
          <CardDescription>
            More customization options are on the way
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary/40" />
              Custom accent colors
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary/40" />
              Font size options
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary/40" />
              Chat bubble styles
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary/40" />
              Background patterns
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
