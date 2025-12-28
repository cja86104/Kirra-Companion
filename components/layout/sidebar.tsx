'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  MessageCircle,
  Users,
  Gamepad2,
  Brain,
  Calendar,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { AffectionMeter } from '@/components/ui/progress';
import type { Profile, Companion } from '@/types/database';

interface SidebarProps {
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
];

export function Sidebar({ user, companions }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-border bg-card transition-all duration-300',
        isCollapsed ? 'w-[70px]' : 'w-[280px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kirra-gradient">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold">Kirra</span>
          </Link>
        )}
        {isCollapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-kirra-gradient">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main Navigation */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const NavLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <SimpleTooltip key={item.href} content={item.label} side="right">
                  {NavLink}
                </SimpleTooltip>
              );
            }

            return NavLink;
          })}
        </nav>

        {/* Companions Section */}
        <div className="mt-6">
          {!isCollapsed && (
            <div className="mb-2 flex items-center justify-between px-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Companions
              </h3>
              <SimpleTooltip content="Create new companion">
                <Link href="/companion/create">
                  <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </SimpleTooltip>
            </div>
          )}

          <div className="space-y-1">
            {companions.length === 0 ? (
              !isCollapsed && (
                <Link
                  href="/companion/create"
                  className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create your first companion</span>
                </Link>
              )
            ) : (
              companions.map((companion) => {
                const isActive = pathname.includes(companion.id);
                const CompanionLink = (
                  <Link
                    key={companion.id}
                    href={`/chat/${companion.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                      isActive
                        ? 'bg-primary/10'
                        : 'hover:bg-muted',
                      isCollapsed && 'justify-center px-2'
                    )}
                  >
                    <div className="relative">
                      <Avatar size="sm">
                        {companion.avatar_url ? (
                          <AvatarImage src={companion.avatar_url} alt={companion.name} />
                        ) : (
                          <AvatarFallback className="bg-kirra-gradient text-white text-xs">
                            {getInitials(companion.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
                    </div>
                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{companion.name}</p>
                        <div className="mt-1">
                          <AffectionMeter 
                            value={companion.affection_level} 
                            size="sm" 
                            showHeart={false} 
                          />
                        </div>
                      </div>
                    )}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <SimpleTooltip key={companion.id} content={companion.name} side="right">
                      {CompanionLink}
                    </SimpleTooltip>
                  );
                }

                return CompanionLink;
              })
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="border-t border-border p-3">
        {/* Secondary Nav */}
        <nav className="mb-3 space-y-1">
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href;
            const NavLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <SimpleTooltip key={item.href} content={item.label} side="right">
                  {NavLink}
                </SimpleTooltip>
              );
            }

            return NavLink;
          })}
        </nav>

        {/* User Info */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg bg-muted/50 p-2',
            isCollapsed && 'justify-center'
          )}
        >
          <Avatar size="sm">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />
            ) : (
              <AvatarFallback>
                {user.full_name ? getInitials(user.full_name) : user.email[0]?.toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {user.full_name || 'User'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.subscription_tier === 'free' ? 'Free Plan' : `${user.subscription_tier} Plan`}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
