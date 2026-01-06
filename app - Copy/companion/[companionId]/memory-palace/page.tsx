import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Brain, 
  Search, 
  Plus, 
  Filter, 
  ArrowLeft,
  Sparkles,
  Heart,
  Star,
  Calendar,
  MessageCircle,
} from 'lucide-react';

import { getCurrentUser, getCompanion, getCompanionMemories } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MemoryCard } from '@/components/memory/MemoryCard';
import { MemorySearch } from '@/components/memory/MemorySearch';
import { formatRelativeTime } from '@/lib/utils/cn';

interface MemoryPalacePageProps {
  params: Promise<{ companionId: string }>;
}

export default async function MemoryPalacePage({ params }: MemoryPalacePageProps) {
  const { companionId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const companion = await getCompanion(companionId);
  
  if (!companion) {
    redirect('/dashboard');
  }

  const memories = await getCompanionMemories(companionId, 50);

  // Group memories by category
  const memoriesByCategory = memories.reduce((acc, memory) => {
    const category = memory.memory_categories?.name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(memory);
    return acc;
  }, {} as Record<string, typeof memories>);

  // Calculate stats
  const totalMemories = memories.length;
  const coreMemories = memories.filter(m => m.is_core_identity).length;
  const pinnedMemories = memories.filter(m => m.is_pinned).length;
  const avgImportance = memories.length > 0 
    ? memories.reduce((sum, m) => sum + (m.importance_score || 0), 0) / memories.length 
    : 0;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/chat/${companionId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            
            <Avatar size="lg">
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
                <Brain className="h-6 w-6 text-primary" />
                {companion.name}&apos;s Memory Palace
              </h1>
              <p className="text-sm text-muted-foreground">
                Everything {companion.name} remembers about you
              </p>
            </div>

            <Button asChild>
              <Link href={`/companion/${companionId}/memory-palace/create`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Memory
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalMemories}</p>
                <p className="text-sm text-muted-foreground">Total Memories</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-glow-pink/10">
                <Heart className="h-6 w-6 text-glow-pink" />
              </div>
              <div>
                <p className="text-2xl font-bold">{coreMemories}</p>
                <p className="text-sm text-muted-foreground">Core Memories</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pinnedMemories}</p>
                <p className="text-sm text-muted-foreground">Pinned</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-glow-purple/10">
                <Sparkles className="h-6 w-6 text-glow-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(avgImportance * 100)}%</p>
                <p className="text-sm text-muted-foreground">Avg Importance</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-8">
          <MemorySearch companionId={companionId} />
        </div>

        {/* Memory Categories */}
        {Object.keys(memoriesByCategory).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 font-display text-xl font-semibold">
                No Memories Yet
              </h2>
              <p className="mb-6 max-w-md text-center text-muted-foreground">
                As you chat with {companion.name}, they&apos;ll naturally remember things about you. 
                You can also add memories manually.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href={`/chat/${companionId}`}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Start Chatting
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/companion/${companionId}/memory-palace/create`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Memory
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(memoriesByCategory).map(([category, categoryMemories]) => (
              <div key={category}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">{category}</h2>
                  <Badge variant="secondary">{categoryMemories.length}</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryMemories.map((memory) => (
                    <MemoryCard 
                      key={memory.id} 
                      memory={memory} 
                      companionId={companionId}
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
