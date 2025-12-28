'use client';

import { useState } from 'react';
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

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input, SearchInput } from '@/components/ui/input';
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
import { signOut } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface NavbarProps {
  user: Profile;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notificationCount] = useState(3); // TODO: Replace with real data

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
      toast.success('Signed out successfully');
    } catch (error) {
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
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* Left Section - Search */}
      <div className="flex items-center gap-4">
        <div className="hidden w-[300px] lg:block">
          <SearchInput
            placeholder="Search conversations, memories..."
            onSearch={(value) => {
              console.log('Search:', value);
              // TODO: Implement global search
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
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                Mark all as read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Notification Items */}
            <div className="max-h-[300px] overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="font-medium">Luna sent you a message</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  &quot;I was thinking about you earlier...&quot;
                </span>
                <span className="text-xs text-muted-foreground">2 minutes ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="font-medium">Memory milestone reached!</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Luna has remembered 100 things about you
                </span>
                <span className="text-xs text-muted-foreground">1 hour ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="font-medium">New activity available</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Try the new &quot;Watch Together&quot; feature
                </span>
                <span className="text-xs text-muted-foreground">Yesterday</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center">
              <Link href="/notifications">View all notifications</Link>
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
              console.log('Search:', value);
              setIsSearchOpen(false);
            }}
          />
        </div>
      )}
    </header>
  );
}
