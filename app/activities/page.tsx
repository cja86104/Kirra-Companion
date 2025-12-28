import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Gamepad2, 
  Film, 
  Music2, 
  BookOpen, 
  Dices,
  Palette,
  Brain,
  Heart,
  Lock,
  Sparkles,
} from 'lucide-react';

import { getCurrentUser, getUserProfile, getUserCompanions } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/cn';

interface Activity {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  requiredTier: 'free' | 'basic' | 'pro' | 'ultimate';
  comingSoon?: boolean;
}

const activities: Activity[] = [
  {
    id: 'trivia',
    name: 'Trivia Games',
    description: 'Test your knowledge together with fun quiz games',
    icon: Brain,
    color: 'bg-blue-500/10 text-blue-600',
    requiredTier: 'free',
  },
  {
    id: 'storytelling',
    name: 'Collaborative Stories',
    description: 'Create stories together, taking turns adding to the narrative',
    icon: BookOpen,
    color: 'bg-purple-500/10 text-purple-600',
    requiredTier: 'free',
  },
  {
    id: 'games',
    name: 'Mini Games',
    description: 'Play simple games like 20 questions, word association, and more',
    icon: Dices,
    color: 'bg-green-500/10 text-green-600',
    requiredTier: 'basic',
  },
  {
    id: 'movie-night',
    name: 'Watch Together',
    description: 'Watch videos together and discuss them in real-time',
    icon: Film,
    color: 'bg-red-500/10 text-red-600',
    requiredTier: 'pro',
    comingSoon: true,
  },
  {
    id: 'music',
    name: 'Music Sharing',
    description: 'Share and discover music together, create playlists',
    icon: Music2,
    color: 'bg-pink-500/10 text-pink-600',
    requiredTier: 'pro',
    comingSoon: true,
  },
  {
    id: 'art',
    name: 'Creative Corner',
    description: 'Draw together, create art, and express yourselves',
    icon: Palette,
    color: 'bg-orange-500/10 text-orange-600',
    requiredTier: 'pro',
    comingSoon: true,
  },
  {
    id: 'roleplay',
    name: 'Roleplay Scenarios',
    description: 'Engage in immersive roleplay adventures together',
    icon: Sparkles,
    color: 'bg-indigo-500/10 text-indigo-600',
    requiredTier: 'basic',
  },
  {
    id: 'therapy',
    name: 'Wellness Check-ins',
    description: 'Guided conversations for mental wellness and reflection',
    icon: Heart,
    color: 'bg-rose-500/10 text-rose-600',
    requiredTier: 'basic',
  },
];

const tierOrder = ['free', 'basic', 'pro', 'ultimate'];

export default async function ActivitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [profile, companions] = await Promise.all([
    getUserProfile(),
    getUserCompanions(),
  ]);

  if (!profile) redirect('/login');

  const userTierIndex = tierOrder.indexOf(profile.subscription_tier);

  const canAccessActivity = (requiredTier: string) => {
    const requiredIndex = tierOrder.indexOf(requiredTier);
    return userTierIndex >= requiredIndex;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-primary" />
            Activities
          </h1>
          <p className="mt-1 text-muted-foreground">
            Fun things to do with your companions
          </p>
        </div>

        {/* Companion Selection */}
        {companions.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Choose a Companion</CardTitle>
              <CardDescription>
                Select who you want to do activities with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {companions.map((companion) => (
                  <button
                    key={companion.id}
                    className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <Avatar size="sm">
                      {companion.avatar_url ? (
                        <AvatarImage src={companion.avatar_url} alt={companion.name} />
                      ) : (
                        <AvatarFallback className="bg-kirra-gradient text-white text-xs">
                          {getInitials(companion.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="font-medium">{companion.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activities Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => {
            const canAccess = canAccessActivity(activity.requiredTier);
            const Icon = activity.icon;

            return (
              <Card 
                key={activity.id}
                className={cn(
                  'relative transition-all',
                  canAccess && !activity.comingSoon && 'hover:shadow-md cursor-pointer',
                  (!canAccess || activity.comingSoon) && 'opacity-60'
                )}
              >
                {/* Lock Overlay */}
                {!canAccess && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
                    <div className="text-center">
                      <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium">
                        Requires {activity.requiredTier.charAt(0).toUpperCase() + activity.requiredTier.slice(1)} Plan
                      </p>
                      <Button size="sm" className="mt-2" asChild>
                        <Link href="/settings/billing">Upgrade</Link>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Coming Soon Badge */}
                {activity.comingSoon && (
                  <div className="absolute right-3 top-3 z-10">
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                )}

                <CardContent className="p-6">
                  <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-lg', activity.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{activity.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {activity.description}
                  </p>

                  {canAccess && !activity.comingSoon && companions.length > 0 && (
                    <Button className="mt-4 w-full" asChild>
                      <Link href={`/activities/${activity.id}?companion=${companions[0]?.id}`}>
                        Start Activity
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No Companions State */}
        {companions.length === 0 && (
          <Card className="mt-8 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Gamepad2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 font-display text-xl font-semibold">
                Create a Companion First
              </h2>
              <p className="mb-4 text-center text-muted-foreground">
                You need at least one companion to start activities
              </p>
              <Button asChild>
                <Link href="/companion/create">Create Companion</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
