'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Brain, 
  Save, 
  Loader2,
  Star,
  Heart,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

interface MemoryCreatePageProps {
  params: Promise<{ companionId: string }>;
}

interface Companion {
  id: string;
  name: string;
  avatar_url: string | null;
}

// Memory categories (can be expanded)
const MEMORY_CATEGORIES = [
  { id: 'personal', name: 'Personal Facts', icon: '👤', description: 'Name, age, job, location' },
  { id: 'preferences', name: 'Preferences', icon: '❤️', description: 'Likes, dislikes, favorites' },
  { id: 'relationships', name: 'Relationships', icon: '👥', description: 'Family, friends, pets' },
  { id: 'experiences', name: 'Experiences', icon: '🌟', description: 'Stories, events, memories' },
  { id: 'goals', name: 'Goals & Dreams', icon: '🎯', description: 'Aspirations and plans' },
  { id: 'emotions', name: 'Emotional', icon: '💭', description: 'Feelings and moods' },
];

export default function MemoryCreatePage({ params }: MemoryCreatePageProps) {
  const { companionId } = use(params);
  const router = useRouter();
  const supabase = getClient();

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [importance, setImportance] = useState(50);
  const [isCoreMemory, setIsCoreMemory] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Load companion
  useEffect(() => {
    async function loadCompanion() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('companions')
        .select('id, name, avatar_url')
        .eq('id', companionId)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setCompanion(data);
      } else {
        toast.error('Companion not found');
        router.push('/dashboard');
      }
      setIsLoading(false);
    }

    loadCompanion();
  }, [companionId, router, supabase]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Please enter the memory content');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/companion/${companionId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
          category_id: selectedCategory,
          importance_score: importance / 100,
          is_core_memory: isCoreMemory,
          is_pinned: isPinned,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save memory');
      }

      toast.success('Memory saved!');
      router.push(`/companion/${companionId}/memory-palace`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save memory');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!companion) {
    return null;
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/20 p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/companion/${companionId}/memory-palace`}>
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

          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Add Memory
            </h1>
            <p className="text-sm text-muted-foreground">
              Tell {companion.name} something to remember
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Memory</CardTitle>
            <CardDescription>
              This memory will help {companion.name} understand you better
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title (optional) */}
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="e.g., My favorite food"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Memory *</Label>
              <textarea
                id="content"
                placeholder="e.g., I love Italian food, especially homemade pasta. My grandmother used to make it every Sunday..."
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                rows={4}
                maxLength={2000}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'placeholder:text-muted-foreground focus:outline-none focus:ring-2',
                  'focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
              <p className="text-xs text-muted-foreground text-right">
                {content.length}/2000
              </p>
            </div>

            {/* Category */}
            <div className="space-y-3">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MEMORY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors',
                      selectedCategory === cat.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Importance */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Importance</Label>
                <span className="text-sm text-muted-foreground">{importance}%</span>
              </div>
              <Slider
                value={[importance]}
                onValueChange={(v) => setImportance(v[0])}
                min={0}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Higher importance memories are recalled more often
              </p>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <div>
                    <span className="text-sm font-medium">Core Memory</span>
                    <p className="text-xs text-muted-foreground">
                      Fundamental to who you are
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isCoreMemory}
                  onChange={(e) => setIsCoreMemory(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <div>
                    <span className="text-sm font-medium">Pinned</span>
                    <p className="text-xs text-muted-foreground">
                      Always visible in Memory Palace
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </label>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/companion/${companionId}/memory-palace`}>
                  Cancel
                </Link>
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!content.trim() || isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Memory
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="mt-6 border-dashed">
          <CardContent className="flex items-start gap-3 p-4">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Tips for great memories:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Be specific - &quot;I love pepperoni pizza&quot; is better than &quot;I like food&quot;</li>
                <li>Include context - why is this important to you?</li>
                <li>Add emotions - how does this make you feel?</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
