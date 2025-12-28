'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Plus, Search, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AffectionMeter } from '@/components/ui/progress';
import { getClient } from '@/lib/supabase/client';
import type { Companion } from '@/types/database';

interface CompanionWithLastMessage extends Companion {
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export default function ChatPage() {
  const [companions, setCompanions] = useState<CompanionWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCompanions();
  }, []);

  const loadCompanions = async () => {
    try {
      const supabase = getClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get companions with their latest conversation
      const { data: companionsData } = await supabase
        .from('companions')
        .select(`
          *,
          conversations(
            id,
            last_message_at,
            messages(
              content,
              role,
              created_at
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('last_interaction', { ascending: false });

      if (companionsData) {
        const enrichedCompanions = companionsData.map((companion: any) => {
          const lastConversation = companion.conversations?.[0];
          const lastMessage = lastConversation?.messages
            ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())?.[0];

          return {
            ...companion,
            lastMessage: lastMessage?.content,
            lastMessageAt: lastMessage?.created_at || companion.last_interaction,
            unreadCount: 0, // TODO: Implement unread tracking
          };
        });

        setCompanions(enrichedCompanions);
      }
    } catch (error) {
      console.error('Failed to load companions:', error);
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

  const formatTimeAgo = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return then.toLocaleDateString();
  };

  const getMoodEmoji = (mood: any) => {
    if (!mood) return '😊';
    const primary = mood.primary || 'content';
    const moodEmojis: Record<string, string> = {
      happy: '😊',
      excited: '🤩',
      content: '😌',
      thoughtful: '🤔',
      sad: '😢',
      anxious: '😰',
      playful: '😜',
      loving: '🥰',
    };
    return moodEmojis[primary] || '😊';
  };

  const filteredCompanions = companions.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">
            Chat with your companions
          </p>
        </div>
        <Link href="/companion/create">
          <Button variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            New Companion
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search companions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Companion List */}
      {filteredCompanions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            {companions.length === 0 ? (
              <>
                <h3 className="mb-2 text-lg font-semibold">No companions yet</h3>
                <p className="mb-4 max-w-sm text-muted-foreground">
                  Create your first AI companion to start chatting
                </p>
                <Link href="/companion/create">
                  <Button variant="gradient">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Companion
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-semibold">No results found</h3>
                <p className="text-muted-foreground">
                  Try a different search term
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCompanions.map((companion) => (
            <Link key={companion.id} href={`/chat/${companion.id}`}>
              <div className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-muted/50">
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
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{companion.name}</h3>
                    <span className="text-lg">{getMoodEmoji(companion.current_mood)}</span>
                    <Badge variant="outline" className="text-xs">
                      {companion.relationship_type}
                    </Badge>
                    {companion.unreadCount && companion.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {companion.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {companion.lastMessage || "Start a conversation..."}
                  </p>

                  <div className="mt-2 flex items-center gap-4">
                    <AffectionMeter 
                      value={companion.affection_level || 0} 
                      size="sm"
                      showHeart={false}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(companion.lastMessageAt)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
