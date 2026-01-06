import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Gamepad2, Brain, Trophy } from 'lucide-react';

import { getCurrentUser, getUserCompanions } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default async function ActivitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const companions = await getUserCompanions();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-kirra-forest-light" />
            Activities
          </h1>
          <p className="mt-1 text-muted-foreground">
            Fun things to do with your companions
          </p>
        </div>

        {/* Check if user has companions */}
        {companions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Gamepad2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 font-display text-xl font-semibold">
                Create a Companion First
              </h2>
              <p className="mb-4 text-center text-muted-foreground">
                You need at least one companion to play activities with
              </p>
              <Button asChild>
                <Link href="/companion/create">Create Companion</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Trivia Game Card */}
            <Card className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Left side - Info */}
                <div className="flex-1 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-kirra-amber/20">
                      <Brain className="h-6 w-6 text-kirra-amber" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Trivia Challenge</h2>
                      <p className="text-sm text-muted-foreground">Test your knowledge together</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    Answer trivia questions across different categories while your companion 
                    cheers you on. Choose from General Knowledge, Science, History, 
                    Entertainment, Sports, and Geography.
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-kirra-amber" />
                      <span>5 questions per game</span>
                    </div>
                    <div>•</div>
                    <div>6 categories</div>
                  </div>

                  {/* Companion selector for quick start */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Play with:</p>
                    <div className="flex flex-wrap gap-2">
                      {companions.map((companion) => (
                        <Link
                          key={companion.id}
                          href={`/activities/trivia?companion=${companion.id}`}
                        >
                          <Button variant="outline" className="gap-2">
                            <Avatar size="sm">
                              {companion.avatar_url ? (
                                <AvatarImage src={companion.avatar_url} alt={companion.name} />
                              ) : (
                                <AvatarFallback className="bg-kirra-forest text-white text-xs">
                                  {getInitials(companion.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            {companion.name}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side - Visual */}
                <div className="hidden md:flex w-48 bg-gradient-to-br from-kirra-amber/20 to-kirra-amber/5 items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">🧠</div>
                    <p className="text-sm font-medium text-kirra-amber">Trivia Time!</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* More activities placeholder - honest about what's coming */}
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">More activities coming soon!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
