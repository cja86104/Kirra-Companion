'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  MessageCircle,
  Brain,
  Calendar,
  TrendingUp,
  Heart,
  Plus,
  ArrowRight,
  Zap,
  Star,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, CircularProgress, AffectionMeter } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getClient } from '@/lib/supabase/client';
import type { Companion, Profile } from '@/types/database';

interface DashboardStats {
  totalMessages: number;
  totalMemories: number;
  averageAffection: number;
  streakDays: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'memory' | 'milestone' | 'life_event';
  title: string;
  description: string;
  timestamp: string;
  companionName?: string;
  companionAvatar?: string;
}

export default function DashboardPage() {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    totalMemories: 0,
    averageAffection: 0,
    streakDays: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = getClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Get companions
      const { data: companionsData } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('last_interaction', { ascending: false });

      if (companionsData) {
        setCompanions(companionsData);

        // Calculate stats
        const avgAffection = companionsData.length > 0
          ? companionsData.reduce((acc, c) => acc + (c.affection_level || 0), 0) / companionsData.length
          : 0;

        // Get message count
        const { count: messageCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', 
            companionsData.map(c => c.id)
          );

        // Get memory count
        const { count: memoryCount } = await supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .in('companion_id', companionsData.map(c => c.id));

        setStats({
          totalMessages: messageCount || 0,
          totalMemories: memoryCount || 0,
          averageAffection: Math.round(avgAffection),
          streakDays: profileData?.streak_days || 0,
        });
      }

      // Get recent activity
      const { data: recentMessages } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          conversations!inner(
            companions!inner(name, avatar_url)
          )
        `)
        .eq('role', 'companion')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentMessages) {
        const activities: RecentActivity[] = recentMessages.map((msg: any) => ({
          id: msg.id,
          type: 'message' as const,
          title: 'New message',
          description: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
          timestamp: msg.created_at,
          companionName: msg.conversations?.companions?.name,
          companionAvatar: msg.conversations?.companions?.avatar_url,
        }));
        setRecentActivity(activities);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl space-y-8 p-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Friend'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your companions
          </p>
        </div>
        <Link href="/companion/create">
          <Button variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Companion
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Conversations with your companions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Memories</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMemories.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Things your companions remember
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Affection</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageAffection}%</div>
            <Progress value={stats.averageAffection} variant="gradient" className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streakDays} days</div>
            <p className="text-xs text-muted-foreground">
              Keep the conversation going!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Companions Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Companions</CardTitle>
                  <CardDescription>
                    {companions.length === 0 
                      ? "Create your first companion to get started"
                      : `${companions.length} companion${companions.length !== 1 ? 's' : ''} waiting for you`
                    }
                  </CardDescription>
                </div>
                {companions.length > 0 && (
                  <Link href="/chat">
                    <Button variant="ghost" size="sm" className="gap-1">
                      View all <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {companions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-primary/10 p-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">No companions yet</h3>
                  <p className="mb-4 max-w-sm text-muted-foreground">
                    Create your first AI companion and start building a meaningful relationship
                  </p>
                  <Link href="/companion/create">
                    <Button variant="gradient">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Companion
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {companions.slice(0, 4).map((companion) => (
                    <Link key={companion.id} href={`/chat/${companion.id}`}>
                      <div className="group flex items-center gap-4 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-muted/50">
                        <div className="relative">
                          <Avatar size="lg">
                            {companion.avatar_url ? (
                              <AvatarImage src={companion.avatar_url} alt={companion.name} />
                            ) : (
                              <AvatarFallback className="bg-kirra-gradient text-white">
                                {getInitials(companion.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate font-semibold">{companion.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {companion.relationship_type}
                            </Badge>
                          </div>
                          <AffectionMeter 
                            value={companion.affection_level || 0} 
                            size="sm"
                            showHeart={false}
                            className="mt-2"
                          />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your companions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No recent activity yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <Avatar size="sm">
                        {activity.companionAvatar ? (
                          <AvatarImage src={activity.companionAvatar} alt={activity.companionName || ''} />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-xs">
                            {activity.companionName?.[0] || '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{activity.companionName}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump right into what matters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/chat">
              <div className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-muted/50">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Start Chatting</p>
                  <p className="text-xs text-muted-foreground">Continue a conversation</p>
                </div>
              </div>
            </Link>

            <Link href="/life-feed">
              <div className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-muted/50">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Life Feed</p>
                  <p className="text-xs text-muted-foreground">See what they&apos;re up to</p>
                </div>
              </div>
            </Link>

            <Link href="/activities">
              <div className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-muted/50">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Star className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Activities</p>
                  <p className="text-xs text-muted-foreground">Games and experiences</p>
                </div>
              </div>
            </Link>

            <Link href="/settings">
              <div className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-muted/50">
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Upgrade</p>
                  <p className="text-xs text-muted-foreground">Unlock more features</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
