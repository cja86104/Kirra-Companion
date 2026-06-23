'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge, CountBadge } from '@/components/ui/badge';
import { signOut, getClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface NavbarProps {
  user: Profile;
}

interface Notification {
  id: string;
  title: string;
  description: string | null;
  emoji: string | null;
  occurred_at: string;
  companion_name: string;
  notified_at: string | null;
}

interface LifeEventRow {
  id: string;
  title: string;
  description: string | null;
  emoji: string | null;
  occurred_at: string;
  notified_at: string | null;
  companions: { name: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Fetch real notification count and data
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const supabase = getClient();
        
        // Get unread life events that should notify user
        const { data, error } = await supabase
          .from('life_events')
          .select(`
            id,
            title,
            description,
            emoji,
            occurred_at,
            notified_at,
            companions!inner(name)
          `)
          .eq('should_notify_user', true)
          .is('notified_at', null)
          .order('occurred_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }

        if (data) {
          const mapped = (data as LifeEventRow[]).map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            emoji: item.emoji,
            occurred_at: item.occurred_at,
            companion_name: item.companions?.name || 'Companion',
            notified_at: item.notified_at,
          }));
          setNotifications(mapped);
          setNotificationCount(mapped.length);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      const supabase = getClient();
      const now = new Date().toISOString();
      
      // Mark all unread notifications as read
      const { error } = await supabase
        .from('life_events')
        .update({ notified_at: now })
        .eq('should_notify_user', true)
        .is('notified_at', null);

      if (error) {
        console.error('Error marking notifications as read:', error);
        toast.error('Failed to mark notifications as read');
        return;
      }

      setNotifications([]);
      setNotificationCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
      toast.success('Signed out successfully');
    } catch (signOutError) {
      console.error('Sign out error:', signOutError);
      toast.error('Failed to sign out');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return user.email[0]?.toUpperCase() || 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'basic':
        return <Badge variant="secondary">Basic</Badge>;
      case 'pro':
        return <Badge variant="info">Pro</Badge>;
      case 'ultimate':
        return <Badge variant="gradient">Ultimate</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card pl-16 pr-4 lg:pl-6 lg:pr-6">
      {/* Left Section - Search */}
      <div className="flex items-center gap-4">
        <div className="hidden w-[300px] lg:block">
          <SearchInput
            placeholder="Search conversations, memories..."
            onSearch={(value) => {
              if (value.trim()) {
                router.push(`/search?q=${encodeURIComponent(value.trim())}`);
              }
            }}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsSearchOpen(!isSearchOpen)}
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5">
                  <CountBadge count={notificationCount} variant="destructive" />
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[320px]">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {notificationCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-xs"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Notification Items */}
            <div className="max-h-[300px] overflow-y-auto">
              {loadingNotifications ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium">
                        {notification.emoji && `${notification.emoji} `}
                        {notification.title}
                      </span>
                    </div>
                    {notification.description && (
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {notification.description}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {notification.companion_name} • {formatTimeAgo(notification.occurred_at)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center">
              <Link href="/life-feed">View all activity</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-1">
              <Avatar size="sm">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />
                ) : (
                  <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                )}
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline-block">
                {user.full_name || 'User'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span>{user.full_name || 'User'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
                <div className="mt-1">{getTierBadge(user.subscription_tier)}</div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/billing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/help" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Help & Support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="absolute inset-x-0 top-16 z-50 border-b border-border bg-background p-4 lg:hidden">
          <SearchInput
            placeholder="Search conversations, memories..."
            autoFocus
            onSearch={(value) => {
              if (value.trim()) {
                router.push(`/search?q=${encodeURIComponent(value.trim())}`);
              }
              setIsSearchOpen(false);
            }}
          />
        </div>
      )}
    </header>
  );
}
