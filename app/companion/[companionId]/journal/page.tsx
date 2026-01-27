import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpen, 
  ArrowLeft,
  Calendar,
  Sparkles,
  MessageCircle,
  PenLine,
} from 'lucide-react';

import { getCurrentUser, getCompanion, getCompanionJournals } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { JournalEntry } from '@/components/companion/JournalEntry';
import type { LifeEventRow } from '@/types/life-simulation-db';

interface JournalPageProps {
  params: Promise<{ companionId: string }>;
}

/**
 * Group journals by month/year
 */
function groupJournalsByMonth(journals: LifeEventRow[]): Record<string, LifeEventRow[]> {
  const groups: Record<string, LifeEventRow[]> = {};

  journals.forEach(journal => {
    const date = new Date(journal.occurred_at || journal.created_at);
    const key = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(journal);
  });

  return groups;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default async function JournalPage({ params }: JournalPageProps) {
  const { companionId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const companion = await getCompanion(companionId);
  
  if (!companion) {
    redirect('/dashboard');
  }

  const journals = await getCompanionJournals(companionId, 100);
  
  // Group journals by month
  const groupedJournals = groupJournalsByMonth(journals);
  
  // Calculate stats
  const totalEntries = journals.length;
  const insightfulEntries = journals.filter(j => {
    const metadata = j.metadata as Record<string, unknown> | null;
    return metadata?.outcome === 'great';
  }).length;
  
  // Calculate streak (consecutive days with entries)
  const calculateStreak = (): number => {
    if (journals.length === 0) return 0;
    
    const sortedDates = journals
      .map(j => new Date(j.occurred_at || j.created_at).toDateString())
      .filter((date, index, self) => self.indexOf(date) === index); // unique dates
    
    let streak = 1;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // Check if most recent entry is today or yesterday
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 0;
    }
    
    for (let i = 1; i < sortedDates.length; i++) {
      const curr = new Date(sortedDates[i - 1]);
      const prev = new Date(sortedDates[i]);
      const diffDays = Math.floor((curr.getTime() - prev.getTime()) / 86400000);
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };
  
  const currentStreak = calculateStreak();

  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/chat/${companionId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            
            <Avatar className="h-12 w-12">
              {companion.avatar_url ? (
                <AvatarImage src={companion.avatar_url} alt={companion.name} />
              ) : (
                <AvatarFallback className="bg-kirra-gradient text-white">
                  {getInitials(companion.name)}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-kirra-forest-light" />
                {companion.name}&apos;s Journal
              </h1>
              <p className="text-sm text-muted-foreground">
                Private reflections and thoughts
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-kirra-forest/10">
                <BookOpen className="h-6 w-6 text-kirra-forest-light" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEntries}</p>
                <p className="text-sm text-muted-foreground">Journal Entries</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-kirra-amber/10">
                <Sparkles className="h-6 w-6 text-kirra-amber" />
              </div>
              <div>
                <p className="text-2xl font-bold">{insightfulEntries}</p>
                <p className="text-sm text-muted-foreground">Insightful Days</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-kirra-warm/10">
                <Calendar className="h-6 w-6 text-kirra-warm" />
              </div>
              <div>
                <p className="text-2xl font-bold">{currentStreak}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Journal Entries */}
        {journals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-kirra-forest/10">
                <PenLine className="h-8 w-8 text-kirra-forest-light" />
              </div>
              <h2 className="mb-2 font-display text-xl font-semibold">
                No Journal Entries Yet
              </h2>
              <p className="mb-6 max-w-md text-center text-muted-foreground">
                {companion.name} hasn&apos;t written any journal entries yet. 
                As the life simulation runs, they&apos;ll reflect on their day and 
                share their thoughts here.
              </p>
              <Button variant="outline" asChild>
                <Link href={`/chat/${companionId}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat with {companion.name}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedJournals).map(([month, monthJournals]) => (
              <div key={month}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-muted-foreground">
                    {month}
                  </h2>
                  <Badge variant="secondary">{monthJournals.length} entries</Badge>
                </div>
                <div className="space-y-4">
                  {monthJournals.map((journal) => (
                    <JournalEntry 
                      key={journal.id} 
                      journal={journal} 
                      companionName={companion.name}
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
