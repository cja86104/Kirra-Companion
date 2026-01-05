'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils/cn';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        'flex items-center gap-2 rounded-xl p-2 transition-all',
        'hover:bg-secondary/50 active:scale-95',
        className
      )}
      title={`Theme: ${theme}`}
    >
      <motion.div
        key={theme}
        initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
        transition={{ duration: 0.2 }}
      >
        {theme === 'light' && <Sun className="h-5 w-5 text-kirra-amber" />}
        {theme === 'dark' && <Moon className="h-5 w-5 text-kirra-sage" />}
        {theme === 'system' && <Monitor className="h-5 w-5 text-muted-foreground" />}
      </motion.div>
      {showLabel && (
        <span className="text-sm capitalize text-muted-foreground">{theme}</span>
      )}
    </button>
  );
}
