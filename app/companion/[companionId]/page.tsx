'use client';

/**
 * COMPANION DETAILS & EDIT PAGE
 * 
 * View and edit companion settings including avatar.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import NiceAvatar from 'react-nice-avatar';
import {
  ArrowLeft,
  MessageCircle,
  Sparkles,
  Loader2,
  Save,
  Heart,
  Brain,
  Palette,
  BookOpen,
  Trophy,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getClient } from '@/lib/supabase/client';
import { NiceAvatarCustomizer } from '@/components/avatar/NiceAvatarCustomizer';
import type { Companion, Json, CompanionUpdate } from '@/types/database';
import type { NiceAvatarConfig } from '@/types/nice-avatar';

// ============================================================================
// TYPES
// ============================================================================

interface PersonalityBase {
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
}

type TabId = 'overview' | 'avatar' | 'personality' | 'appearance';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Heart },
  { id: 'avatar', label: 'Avatar', icon: Sparkles },
  { id: 'personality', label: 'Personality', icon: Brain },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CompanionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const companionId = params.companionId as string;

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [hasChanges, setHasChanges] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<NiceAvatarConfig | null>(null);
  const [traits, setTraits] = useState({
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 30,
  });

  // Load companion
  useEffect(() => {
    const loadCompanion = async () => {
      if (!companionId) return;

      setIsLoading(true);
      const supabase = getClient();

      const { data, error } = await supabase
        .from('companions')
        .select('*')
        .eq('id', companionId)
        .single();

      if (error || !data) {
        toast.error('Companion not found');
        router.push('/dashboard');
        return;
      }

      const comp = data as Companion;
      setCompanion(comp);
      setName(comp.name);
      setAvatarConfig(comp.avatar_3d_config as NiceAvatarConfig | null);
      const personalityBase = comp.personality_base as PersonalityBase | null;
      if (personalityBase) {
        setTraits({
          openness: personalityBase.openness ?? 50,
          conscientiousness: personalityBase.conscientiousness ?? 50,
          extraversion: personalityBase.extraversion ?? 50,
          agreeableness: personalityBase.agreeableness ?? 50,
          neuroticism: personalityBase.neuroticism ?? 30,
        });
      }
      setIsLoading(false);
    };

    loadCompanion();
  }, [companionId, router]);

  // Handle save
  const handleSave = async () => {
    if (!companion) return;

    setIsSaving(true);
    const supabase = getClient();

    const { error } = await supabase
      .from('companions')
      .update({
        name,
        avatar_3d_config: avatarConfig as unknown as Json,
        personality_base: traits as unknown as Json,
        updated_at: new Date().toISOString(),
      } satisfies CompanionUpdate)
      .eq('id', companion.id);

    if (error) {
      toast.error('Failed to save changes');
      console.error(error);
    } else {
      toast.success('Changes saved!');
      setHasChanges(false);
      setCompanion((prev) => prev ? { ...prev, name, avatar_3d_config: avatarConfig as unknown as Json, personality_base: traits as unknown as Json } : null);
    }
    setIsSaving(false);
  };

  // Handle avatar config change
  const handleAvatarChange = useCallback((config: NiceAvatarConfig) => {
    setAvatarConfig(config);
    setHasChanges(true);
  }, []);

  // Handle trait change
  const handleTraitChange = (trait: keyof typeof traits, value: number) => {
    setTraits((prev) => ({ ...prev, [trait]: value }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Companion not found</p>
        <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {companion.avatar_url ? (
                <AvatarImage src={companion.avatar_url} alt={companion.name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {companion.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{companion.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {companion.relationship_type}
                </Badge>
                {avatarConfig && (
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Custom Avatar
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/chat/${companion.id}`}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/companion/${companion.id}/journal`}>
              <BookOpen className="mr-2 h-4 w-4" />
              Journal
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/companion/${companion.id}/memory-palace`}>
              <Brain className="mr-2 h-4 w-4" />
              Memories
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/companion/${companion.id}/milestones`}>
              <Trophy className="mr-2 h-4 w-4" />
              Milestones
            </Link>
          </Button>
          {hasChanges && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="Companion name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <p className="text-sm text-muted-foreground capitalize">{companion.relationship_type}</p>
                </div>
                <div className="space-y-2">
                  <Label>Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(companion.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Affection Level</span>
                  <span className="font-medium">{companion.affection_level}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trust Level</span>
                  <span className="font-medium">{companion.trust_level}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Messages</span>
                  <span className="font-medium">{companion.total_messages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voice Minutes</span>
                  <span className="font-medium">{companion.total_voice_minutes.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>

            {companion.backstory && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Backstory</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{companion.backstory}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'avatar' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Avatar Customization
              </CardTitle>
              <CardDescription>
                Create and customize an avatar for {companion.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NiceAvatarCustomizer
                initialConfig={avatarConfig}
                onChange={handleAvatarChange}
                compact={false}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'personality' && (
          <Card>
            <CardHeader>
              <CardTitle>Personality Traits</CardTitle>
              <CardDescription>Adjust {companion.name}&apos;s personality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(traits).map(([trait, value]) => (
                <div key={trait} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{trait.replace(/([A-Z])/g, ' $1')}</Label>
                    <span className="text-sm text-muted-foreground">{value}%</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([v]) => handleTraitChange(trait as keyof typeof traits, v)}
                    max={100}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeTab === 'appearance' && (
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how {companion.name} appears</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium mb-2">Current Avatar</h4>
                  <div className="flex items-center gap-4">
                    {avatarConfig ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden" style={{ backgroundColor: avatarConfig.bgColor }}>
                        <NiceAvatar style={{ width: '100%', height: '100%' }} {...avatarConfig} />
                      </div>
                    ) : (
                      <Avatar className="h-20 w-20">
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                          {companion.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {avatarConfig ? 'Custom avatar configured' : 'Using default avatar'}
                      </p>
                      {avatarConfig && (
                        <p className="text-sm text-primary">Click &quot;Avatar&quot; tab to customize</p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the &quot;Avatar&quot; tab to customize your companion&apos;s appearance.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button size="lg" onClick={handleSave} disabled={isSaving} className="shadow-lg">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
