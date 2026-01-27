import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Trophy, 
  ArrowLeft,
  Calendar,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

import { getCurrentUser, getCompanion } from '@/lib/supabase/server';
import { getCompanionMilestoneStats } from '@/lib/companion/milestones';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MilestoneStats } from '@/components/companion/MilestoneCard';

interface MilestonesPageProps {
  params: Promise<{ companionId: string }>;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Format date nicely
 */
function formatStartDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function MilestonesPage({ params }: MilestonesPageProps) {
  const { companionId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const companion = await getCompanion(companionId);
  
  if (!companion) {
    redirect('/dashboard');
  }

  const milestoneStats = await getCompanionMilestoneStats(companionId);

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
                <Trophy className="h-6 w-6 text-kirra-amber" />
                Milestones with {companion.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Celebrating your journey together
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {milestoneStats ? (
          <>
            {/* Journey Start */}
            <Card className="mb-8 border-kirra-forest/20 bg-gradient-to-r from-kirra-forest/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kirra-forest/10">
                    <Sparkles className="h-7 w-7 text-kirra-forest-light" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Your Journey Began</h2>
                    <p className="text-muted-foreground">
                      {formatStartDate(milestoneStats.createdAt)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {milestoneStats.achievedMilestones.length} milestones achieved together
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milestone Stats */}
            <MilestoneStats
              daysTogetherCount={milestoneStats.daysTogetherCount}
              totalMessages={milestoneStats.totalMessages}
              totalMemories={milestoneStats.totalMemories}
              conversationStreak={milestoneStats.conversationStreak}
              achievedMilestones={milestoneStats.achievedMilestones}
              nextMilestones={milestoneStats.nextMilestones}
              companionName={companion.name}
            />
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-kirra-amber/10">
                <Trophy className="h-8 w-8 text-kirra-amber" />
              </div>
              <h2 className="mb-2 font-display text-xl font-semibold">
                No Milestones Yet
              </h2>
              <p className="mb-6 max-w-md text-center text-muted-foreground">
                Start chatting with {companion.name} to begin achieving milestones together!
              </p>
              <Button asChild>
                <Link href={`/chat/${companionId}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Start Chatting
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
