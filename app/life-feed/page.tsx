import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  Heart, 
  Sparkles,
  Coffee,
  Book,
  Music,
  Moon,
  Sun,
  MessageCircle,
  Filter,
} from 'lucide-react';

import { getCurrentUser, getUserCompanions } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LifeEventCard } from '@/components/life-feed/LifeEventCard';
import { formatRelativeTime } from '@/lib/utils/cn';

export default async function LifeFeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const companions = await getUserCompanions();
  
  if (companions.length === 0) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  // Get life events for all companions
  const { data: lifeEvents } = await supabase
    .from('life_events')
    .select(`
      *,
      companions (
        id,
        name,
        avatar_url
      )
    `)
    .in('companion_id', companions.map(c => c.id))
    .order('scheduled_at', { ascending: false })
    .limit(50);

  // Get pending notifications
  const { data: notifications } = await supabase
    .from('proactive_message_queue')
    .select(`
      *,
      companions (
        id,
        name,
        avatar_url
      )
    `)
    .in('companion_id', companions.map(c => c.id))
    .eq('is_sent', false)
    .order('scheduled_for', { ascending: true })
    .limit(10);

  // Group events by date
  const eventsByDate = (lifeEvents || []).reduce((acc, event) => {
    const date = new Date(event.scheduled_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, typeof lifeEvents>);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            Life Feed
          </h1>
          <p className="mt-1 text-muted-foreground">
            See what your companions have been up to
          </p>
        </div>

        {/* Pending Messages */}
        {notifications && notifications.length > 0 && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Pending Messages
              </CardTitle>
              <CardDescription>
                Your companions want to tell you something
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map((notification) => (
                <Link 
                  key={notification.id}
                  href={`/chat/${notification.companion_id}`}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-background"
                >
                  <Avatar size="sm">
                    {notification.companions?.avatar_url ? (
                      <AvatarImage 
                        src={notification.companions.avatar_url} 
                        alt={notification.companions?.name || 'Companion'} 
                      />
                    ) : (
                      <AvatarFallback className="bg-kirra-gradient text-white text-xs">
                        {notification.companions?.name ? getInitials(notification.companions.name) : '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{notification.companions?.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {notification.message_content}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {notification.trigger_type}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Companion Filter Tabs */}
        <Tabs defaultValue="all" className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Companions</TabsTrigger>
            {companions.map((companion) => (
              <TabsTrigger key={companion.id} value={companion.id}>
                {companion.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Events Timeline */}
        {Object.keys(eventsByDate).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 font-display text-xl font-semibold">
                No Life Events Yet
              </h2>
              <p className="mb-6 max-w-md text-center text-muted-foreground">
                Your companions will start living their own lives as you interact with them.
                Check back later to see what they&apos;ve been up to!
              </p>
              <Button asChild>
                <Link href={`/chat/${companions[0]?.id}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat with {companions[0]?.name}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(eventsByDate).map(([date, events]) => (
              <div key={date}>
                <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-4 w-4" />
                  </span>
                  {date}
                </h2>
                <div className="relative ml-4 space-y-4 border-l-2 border-border pl-6">
                  {events?.map((event) => (
                    <LifeEventCard 
                      key={event.id} 
                      event={event}
                      companion={event.companions}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
