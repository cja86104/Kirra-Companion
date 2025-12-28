'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Sparkles,
  User,
  Heart,
  Brain,
  Palette,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { getClient } from '@/lib/supabase/client';

type RelationshipType = 'friend' | 'mentor' | 'romantic' | 'family' | 'custom';

interface CompanionData {
  name: string;
  relationshipType: RelationshipType;
  backstory: string;
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  communicationStyle: {
    formality: number;
    emojiUsage: number;
    verbosity: number;
    humorLevel: number;
  };
  interests: string[];
}

const STEPS = [
  { id: 'basics', title: 'Basics', icon: User },
  { id: 'relationship', title: 'Relationship', icon: Heart },
  { id: 'personality', title: 'Personality', icon: Brain },
  { id: 'style', title: 'Style', icon: Palette },
  { id: 'review', title: 'Review', icon: Check },
];

const RELATIONSHIP_TYPES: { type: RelationshipType; label: string; description: string; emoji: string }[] = [
  { type: 'friend', label: 'Best Friend', description: 'A supportive companion who shares your interests', emoji: '🤝' },
  { type: 'mentor', label: 'Mentor', description: 'A wise guide who helps you grow', emoji: '🎓' },
  { type: 'romantic', label: 'Romantic Partner', description: 'A loving companion (18+ only)', emoji: '💕' },
  { type: 'family', label: 'Family Member', description: 'A caring relative figure', emoji: '👨‍👩‍👧' },
  { type: 'custom', label: 'Custom', description: 'Define your own relationship', emoji: '✨' },
];

const INTEREST_OPTIONS = [
  'Music', 'Movies', 'Gaming', 'Reading', 'Art', 'Science', 'Technology',
  'Nature', 'Cooking', 'Travel', 'Sports', 'Fashion', 'Photography', 'Writing',
  'Philosophy', 'History', 'Animals', 'Comedy', 'Meditation', 'Fitness',
];

export default function CreateCompanionPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  const [companionData, setCompanionData] = useState<CompanionData>({
    name: '',
    relationshipType: 'friend',
    backstory: '',
    traits: {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 30,
    },
    communicationStyle: {
      formality: 30,
      emojiUsage: 50,
      verbosity: 50,
      humorLevel: 60,
    },
    interests: [],
  });

  const updateData = <K extends keyof CompanionData>(
    key: K,
    value: CompanionData[K]
  ) => {
    setCompanionData(prev => ({ ...prev, [key]: value }));
  };

  const updateTrait = (trait: keyof CompanionData['traits'], value: number) => {
    setCompanionData(prev => ({
      ...prev,
      traits: { ...prev.traits, [trait]: value },
    }));
  };

  const updateStyle = (style: keyof CompanionData['communicationStyle'], value: number) => {
    setCompanionData(prev => ({
      ...prev,
      communicationStyle: { ...prev.communicationStyle, [style]: value },
    }));
  };

  const toggleInterest = (interest: string) => {
    setCompanionData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return companionData.name.trim().length >= 2;
      case 1: return true;
      case 2: return true;
      case 3: return companionData.interests.length >= 1;
      case 4: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const createCompanion = async () => {
    setIsCreating(true);
    
    try {
      const supabase = getClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to create a companion');
        router.push('/login');
        return;
      }

      // Check subscription limits
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      const { count: companionCount } = await supabase
        .from('companions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_archived', false);

      const limits: Record<string, number> = {
        free: 1,
        basic: 3,
        pro: 10,
        ultimate: Infinity,
      };

      const limit = limits[profile?.subscription_tier || 'free'] || 1;
      
      if ((companionCount || 0) >= limit) {
        toast.error(`You've reached your companion limit. Upgrade to create more!`);
        router.push('/settings/billing');
        return;
      }

      // Create companion
      const insertData = {
        user_id: user.id,
        name: companionData.name,
        relationship_type: companionData.relationshipType,
        backstory: companionData.backstory || `${companionData.name} is a ${companionData.relationshipType} who enjoys ${companionData.interests.slice(0, 3).join(', ')}.`,
        personality_base: companionData.traits,
        interests: companionData.interests,
        affection_level: 30,
        trust_level: 20,
        current_mood: {
          primary: 'happy',
          secondary: 'curious',
          intensity: 0.7,
        },
      };
      
      console.log('Attempting to insert companion:', JSON.stringify(insertData, null, 2));
      console.log('User ID:', user.id);
      
      const { data: companion, error: companionError } = await supabase
        .from('companions')
        .insert(insertData)
        .select()
        .single();

      if (companionError) {
        console.error('Companion insert error:', JSON.stringify(companionError, null, 2));
        console.error('Error message:', companionError.message);
        console.error('Error code:', companionError.code);
        console.error('Error details:', companionError.details);
        console.error('Error hint:', companionError.hint);
        throw new Error(companionError.message || 'Failed to create companion');
      }

      // Create companion DNA
      const { error: dnaError } = await supabase
        .from('companion_dna')
        .insert({
          companion_id: companion.id,
          learning_style_matrix: {
            traits: companionData.traits,
            learning_rate: 0.5,
          },
          humor_genome: {
            style: companionData.communicationStyle.humorLevel > 50 ? 'playful' : 'subtle',
            level: companionData.communicationStyle.humorLevel,
          },
          emotional_resonance_map: {
            baseline_mood: 'content',
            mood_stability: 70,
            empathy_level: companionData.traits.agreeableness,
            expression_style: companionData.traits.extraversion > 50 ? 'expressive' : 'subtle',
          },
          interest_evolution_tree: {
            interests: companionData.interests,
            growth_potential: companionData.interests.map(i => ({ name: i, level: 50 })),
          },
          communication_dialect: {
            formality: companionData.communicationStyle.formality,
            emoji_frequency: companionData.communicationStyle.emojiUsage,
            verbosity: companionData.communicationStyle.verbosity,
            humor_style: companionData.communicationStyle.humorLevel > 50 ? 'playful' : 'subtle',
            favorite_expressions: [],
            speech_patterns: [],
          },
          memory_weighting_algorithm: {
            recency_weight: 0.3,
            importance_weight: 0.5,
            emotional_weight: 0.2,
          },
        });

      if (dnaError) {
        console.error('DNA insert error:', JSON.stringify(dnaError, null, 2));
        console.error('Error message:', dnaError.message);
        console.error('Error code:', dnaError.code);
        throw new Error(dnaError.message || 'Failed to create companion DNA');
      }

      toast.success(`${companionData.name} has been created!`);
      router.push(`/chat/${companion.id}`);
      
    } catch (error) {
      console.error('Failed to create companion:', error);
      toast.error('Failed to create companion. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">What would you like to call your companion?</Label>
              <Input
                id="name"
                placeholder="Enter a name..."
                value={companionData.name}
                onChange={(e) => updateData('name', e.target.value)}
                className="text-lg"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                {companionData.name.length}/30 characters
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              What kind of relationship would you like to have with {companionData.name || 'your companion'}?
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {RELATIONSHIP_TYPES.map((rel) => (
                <button
                  key={rel.type}
                  onClick={() => updateData('relationshipType', rel.type)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:border-primary/50',
                    companionData.relationshipType === rel.type
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{rel.emoji}</span>
                    <span className="font-medium">{rel.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{rel.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Adjust {companionData.name}&apos;s personality traits
            </p>
            
            {Object.entries(companionData.traits).map(([trait, value]) => (
              <div key={trait} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="capitalize">{trait.replace(/([A-Z])/g, ' $1')}</Label>
                  <span className="text-sm text-muted-foreground">{value}%</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([v]) => updateTrait(trait as keyof CompanionData['traits'], v)}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                How does {companionData.name} communicate?
              </p>
              
              {Object.entries(companionData.communicationStyle).map(([style, value]) => (
                <div key={style} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{style.replace(/([A-Z])/g, ' $1')}</Label>
                    <span className="text-sm text-muted-foreground">{value}%</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={([v]) => updateStyle(style as keyof CompanionData['communicationStyle'], v)}
                    max={100}
                    step={5}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <Label>What interests does {companionData.name} have? (Select at least 1)</Label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <Badge
                    key={interest}
                    variant={companionData.interests.includes(interest) ? 'default' : 'outline'}
                    className="cursor-pointer transition-all hover:bg-primary/20"
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/30 p-6">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-kirra-gradient text-2xl text-white">
                  {companionData.name[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{companionData.name}</h3>
                  <Badge variant="secondary" className="capitalize">
                    {companionData.relationshipType}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 font-medium">Personality</h4>
                  <div className="flex flex-wrap gap-2">
                    {companionData.traits.extraversion > 60 && <Badge variant="outline">Outgoing</Badge>}
                    {companionData.traits.extraversion < 40 && <Badge variant="outline">Introverted</Badge>}
                    {companionData.traits.agreeableness > 60 && <Badge variant="outline">Friendly</Badge>}
                    {companionData.traits.openness > 60 && <Badge variant="outline">Creative</Badge>}
                    {companionData.traits.conscientiousness > 60 && <Badge variant="outline">Organized</Badge>}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-medium">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {companionData.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">{interest}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-medium">Communication Style</h4>
                  <p className="text-sm text-muted-foreground">
                    {companionData.communicationStyle.formality > 50 ? 'Formal' : 'Casual'} tone,{' '}
                    {companionData.communicationStyle.emojiUsage > 50 ? 'uses emojis often' : 'minimal emoji use'},{' '}
                    {companionData.communicationStyle.humorLevel > 50 ? 'playful humor' : 'subtle humor'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container max-w-3xl py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                  index < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-1 w-12 rounded-full transition-all sm:w-20',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between text-sm">
          {STEPS.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                'hidden sm:block',
                index === currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
              )}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>
            Step {currentStep + 1} of {STEPS.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button
            variant="gradient"
            onClick={createCompanion}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create {companionData.name}
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
