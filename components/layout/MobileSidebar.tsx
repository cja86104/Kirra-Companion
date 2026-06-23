'use client';

/**
 * MobileSidebar
 * =============
 * Mobile-only (<lg) replacement for the desktop Sidebar. Renders:
 *   1. A fixed hamburger button in the top-left corner
 *   2. A slide-from-left drawer (Radix Dialog) containing the same
 *      navigation surface the desktop sidebar shows: main nav, companion
 *      list, secondary nav, theme toggle, sign out.
 *
 * The desktop Sidebar is hidden via `hidden lg:flex` on its outer <aside>,
 * so the two never appear at the same time and there's no duplicate state
 * to keep in sync.
 *
 * Why a custom drawer instead of the existing Dialog component? The Dialog
 * component centers and caps width — we need full-height, edge-aligned,
 * narrow (280px) slide-in. Using DialogPrimitive directly gives us that
 * without forking Dialog. Animation is CSS-only (no Framer) so the bundle
 * cost is near zero.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Menu,
  X,
  Sparkles,
  MessageCircle,
  Gamepad2,
  Calendar,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { signOut } from '@/lib/supabase/client';
import type { Profile, Companion } from '@/types/database';

interface MobileSidebarProps {
  user: Profile;
  companions: Companion[];
}

const mainNavItems = [
  { href: '/dashboard', icon: Sparkles, label: 'Dashboard' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/life-feed', icon: Calendar, label: 'Life Feed' },
  { href: '/activities', icon: Gamepad2, label: 'Activities' },
];

const secondaryNavItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/help', icon: HelpCircle, label: 'Help' },
];

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function MobileSidebar({ user, companions }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setOpen(false);
      router.push('/');
      router.refresh();
      toast.success('Signed out successfully');
    } catch (err) {
      console.error('Sign out error:', err);
      toast.error('Failed to sign out');
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Hamburger trigger — fixed top-left so it's always reachable on
          mobile even when scrolled inside the main content area. lg:hidden
          mirrors the desktop sidebar's lg:flex so exactly one is visible. */}
      <DialogPrimitive.Trigger
        aria-label="Open navigation"
        className="fixed left-3 top-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card shadow-md transition-colors hover:bg-secondary lg:hidden"
        style={{
          // Push below the notch on iOS
          top: 'calc(0.75rem + env(safe-area-inset-top))',
        }}
      >
        <Menu className="h-5 w-5" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden"
        />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-sidebar shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          // The visual viewport on mobile already constrains height; no need
          // for explicit h-dvh here. Radix's DialogContent is fixed.
        >
          {/* Header: logo + close */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-4">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-kirra-gradient shadow-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">Kirra</span>
            </Link>
            <DialogPrimitive.Close
              aria-label="Close navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Hide title from sighted users but keep for screen readers — Radix
              warns when no DialogTitle is present. */}
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Main navigation and companion list.
          </DialogPrimitive.Description>

          {/* Scrollable nav body */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {/* Main nav */}
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Companion list */}
            {companions.length > 0 && (
              <div className="mt-6">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Companions
                </p>
                <div className="space-y-1">
                  {companions.map((c) => {
                    const href = `/chat/${c.id}`;
                    const isActive = pathname === href;
                    return (
                      <Link
                        key={c.id}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          {c.avatar_url ? (
                            <AvatarImage src={c.avatar_url} alt={c.name} />
                          ) : (
                            <AvatarFallback className="text-xs">
                              {getInitials(c.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="truncate">{c.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Secondary nav */}
            <nav className="mt-6 space-y-1 border-t border-border/50 pt-4">
              {secondaryNavItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer: user + theme + sign out */}
          <div className="shrink-0 border-t border-border/50 p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar className="h-9 w-9">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />
                ) : (
                  <AvatarFallback>{getInitials(user.full_name || user.email)}</AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.full_name || 'User'}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <ThemeToggle />
            </div>
            <button
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sign out
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
