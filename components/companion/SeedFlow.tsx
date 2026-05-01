'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { RelationshipType } from '@/types/companion';

// =============================================================================
// Public types
// =============================================================================

export interface SeedFlowProps {
  isMinor: boolean;
  isCreating: boolean;
  onCancel: () => void;
  onCreate: (result: SeedFlowResult) => Promise<void>;
}

export interface SeedFlowResult {
  seed: string;
  relationshipType: RelationshipType;
  backstory: string;
  name: string;
  personality_base: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    curiosity: number;
  };
  interests: string[];
  quirks: string[];
  opening_line: string;
  affection_level: number;
  trust_level: number;
}

// =============================================================================
// Internal constants
// =============================================================================

type SeedStep = 'relationship' | 'seed' | 'loading' | 'confirmation';

// Card-shape relationship list. Duplicated from app/companion/create/page.tsx:65
// (the canonical source today). Less file churn than extracting to a shared
// module given that 2D.3 already rewrites the create page; if a third consumer
// shows up later, promote this to lib/companion/relationship-types.ts and
// import from both. Keep both copies in sync until then.
const RELATIONSHIP_CARDS: { type: RelationshipType; label: string; description: string; emoji: string }[] = [
  { type: 'friend',   label: 'Best Friend',      description: 'A supportive companion who shares your interests', emoji: '🤝' },
  { type: 'mentor',   label: 'Mentor',           description: 'A wise guide who helps you grow', emoji: '🎓' },
  { type: 'romantic', label: 'Romantic Partner', description: 'A loving companion (18+ only)', emoji: '💕' },
  { type: 'family',   label: 'Family Member',    description: 'A caring relative figure', emoji: '👨‍👩‍👧' },
  { type: 'custom',   label: 'Custom',           description: 'Define your own relationship', emoji: '✨' },
];

const ADULT_ONLY_TYPES: ReadonlySet<RelationshipType> = new Set<RelationshipType>(['romantic', 'custom']);

const EXAMPLE_SEEDS: Record<RelationshipType, readonly string[]> = {
  romantic: [
    'a poet who writes letters by hand and lives near the coast',
    'someone fierce and tender in equal measure, a private soul',
    'a woman who runs an indie record store and has strong opinions',
    'my partner of three years, the steady one, a chef',
  ],
  friend: [
    'the friend who always tells me the truth, even when it stings',
    'someone who DJs underground sets and reads voraciously',
    'a teacher by day, weirdly into roller derby on weekends',
    'the one I can text at 2am about absolutely anything',
  ],
  family: [
    'my older sister who teaches high school history',
    "a cousin who's basically a sibling, runs a small farm",
    'my aunt — sharp, funny, has a story for everything',
    'a grandfather figure who builds furniture in his shed',
  ],
  mentor: [
    "a writer who's been published for thirty years, now teaches",
    'someone who built a company, sold it, lost it, started again',
    'a former coach, direct, has earned every bit of his patience',
    "a therapist's therapist — wise, careful, will challenge me",
  ],
  custom: [
    'a stranger I keep running into in dreams',
    "the voice in my head when I'm trying to be honest with myself",
    'a fictional figure from an old book, somehow real now',
    'a confidant who only exists when I need her',
  ],
};

const SEED_MAX_LENGTH = 500;

// =============================================================================
// API response narrowing — zero `as` casts
// =============================================================================

type ApiResponse = {
  backstory: string;
  name: string;
  personality_base: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    curiosity: number;
  };
  interests: string[];
  quirks: string[];
  opening_line: string;
  affection_level: number;
  trust_level: number;
};

type ApiError =
  | { error: 'rate_limit'; resetsAt?: string }
  | { error: 'unauthorized' }
  | { error: 'bad_request' }
  | { error: 'server' }
  | { error: 'network' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isPersonalityBase(value: unknown): value is ApiResponse['personality_base'] {
  if (!isRecord(value)) return false;
  return (
    typeof value.openness === 'number' &&
    typeof value.conscientiousness === 'number' &&
    typeof value.extraversion === 'number' &&
    typeof value.agreeableness === 'number' &&
    typeof value.neuroticism === 'number' &&
    typeof value.curiosity === 'number'
  );
}

function isApiResponse(value: unknown): value is ApiResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.backstory === 'string' &&
    typeof value.name === 'string' &&
    isPersonalityBase(value.personality_base) &&
    isStringArray(value.interests) &&
    isStringArray(value.quirks) &&
    typeof value.opening_line === 'string' &&
    typeof value.affection_level === 'number' &&
    typeof value.trust_level === 'number'
  );
}

function rateLimitMessage(resetsAt: string | undefined): string {
  const fallback = "You've hit the rate limit. Please try again later.";
  if (!resetsAt) return fallback;
  const time = new Date(resetsAt);
  const ms = time.getTime();
  if (Number.isNaN(ms)) return fallback;
  const diffMs = ms - Date.now();
  if (diffMs <= 0) return "You've hit the rate limit. Please try again now.";
  const diffMinutes = Math.ceil(diffMs / 60000);
  if (diffMinutes < 60) {
    return `You've hit the rate limit. Please try again in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}.`;
  }
  const diffHours = Math.ceil(diffMinutes / 60);
  return `You've hit the rate limit. Please try again in ${diffHours} hour${diffHours === 1 ? '' : 's'}.`;
}

// =============================================================================
// Component
// =============================================================================

export function SeedFlow({ isMinor, isCreating, onCancel, onCreate }: SeedFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<SeedStep>('relationship');
  const [relationshipType, setRelationshipType] = useState<RelationshipType | null>(null);
  const [seed, setSeed] = useState('');
  const [generated, setGenerated] = useState<SeedFlowResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ---------------------------------------------------------------------------
  // API call — pure, no state mutation
  // ---------------------------------------------------------------------------
  async function callGenerate(
    seedValue: string,
    rt: RelationshipType,
  ): Promise<SeedFlowResult | ApiError> {
    try {
      const response = await fetch('/api/companion/generate-from-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: seedValue, relationshipType: rt }),
      });

      if (response.status === 401) {
        return { error: 'unauthorized' };
      }

      if (response.status === 429) {
        const body: unknown = await response.json().catch((err: unknown) => {
          console.error('Failed to parse rate-limit response body:', err);
          return {};
        });
        let resetsAt: string | undefined;
        if (isRecord(body) && typeof body.resetsAt === 'string') {
          resetsAt = body.resetsAt;
        }
        return { error: 'rate_limit', resetsAt };
      }

      if (response.status === 400) {
        return { error: 'bad_request' };
      }

      if (response.status === 502) {
        return { error: 'server' };
      }

      if (!response.ok) {
        console.error('Seed-flow API non-ok response:', response.status);
        return { error: 'server' };
      }

      const json: unknown = await response.json();
      if (!isApiResponse(json)) {
        console.error('Seed-flow API returned unexpected shape:', json);
        return { error: 'server' };
      }

      return {
        seed: seedValue,
        relationshipType: rt,
        backstory: json.backstory,
        name: json.name,
        personality_base: json.personality_base,
        interests: json.interests,
        quirks: json.quirks,
        opening_line: json.opening_line,
        affection_level: json.affection_level,
        trust_level: json.trust_level,
      };
    } catch (error) {
      console.error('Seed-flow API call failed:', error);
      return { error: 'network' };
    }
  }

  // ---------------------------------------------------------------------------
  // Error handling — toasts, navigation, banner state
  // ---------------------------------------------------------------------------
  function handleApiError(result: ApiError, returnStep: 'seed' | 'confirmation') {
    if (result.error === 'unauthorized') {
      toast.error('Please sign in');
      router.push('/login');
      return;
    }

    let message: string;
    if (result.error === 'rate_limit') {
      message = rateLimitMessage(result.resetsAt);
    } else if (result.error === 'server') {
      message = 'Generation failed. Try again or rephrase your seed.';
    } else if (result.error === 'bad_request') {
      message = 'Could not process that seed. Try rephrasing or shortening it.';
    } else {
      message = 'Network error. Check your connection and try again.';
    }

    setGenerationError(message);
    toast.error(message);

    if (returnStep === 'seed') {
      setStep('seed');
    }
    // returnStep === 'confirmation' means stay where the caller is (no navigation).
  }

  // ---------------------------------------------------------------------------
  // Step handlers
  // ---------------------------------------------------------------------------
  async function handleGenerate() {
    if (relationshipType === null) return;
    const trimmed = seed.trim();
    if (trimmed.length < 1) return;

    setGenerationError(null);
    setStep('loading');

    const result = await callGenerate(seed, relationshipType);

    if ('error' in result) {
      handleApiError(result, 'seed');
      return;
    }

    setGenerated(result);
    setStep('confirmation');
  }

  async function handleRegenerate() {
    if (relationshipType === null) return;

    setIsRegenerating(true);
    setGenerationError(null);

    const result = await callGenerate(seed, relationshipType);

    setIsRegenerating(false);

    if ('error' in result) {
      handleApiError(result, 'confirmation');
      return;
    }

    setGenerated(result);
  }

  function handleSeedChange(value: string) {
    setSeed(value);
    if (generationError !== null) {
      setGenerationError(null);
    }
  }

  function handleExampleClick(example: string) {
    setSeed(example);
    if (generationError !== null) {
      setGenerationError(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Renderers
  // ---------------------------------------------------------------------------
  function renderRelationshipStep() {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-base">How do they fit into your life?</Label>
          <p className="text-sm text-muted-foreground">
            Pick the kind of relationship. The seed you write next is read inside this frame.
          </p>
        </div>

        {isMinor && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-600 dark:text-blue-400">
            💙 Some relationship types are only available for users 18+
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {RELATIONSHIP_CARDS.map((rel) => {
            const adultOnly = ADULT_ONLY_TYPES.has(rel.type);
            const disabled = isMinor && adultOnly;
            return (
              <button
                key={rel.type}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setRelationshipType(rel.type);
                  setStep('seed');
                }}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-all',
                  disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:border-primary/50',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{rel.emoji}</span>
                  <span className="font-medium">{rel.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{rel.description}</p>
                {disabled && (
                  <p className="text-xs italic text-muted-foreground">
                    Available for verified adults only
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex">
          <Button type="button" variant="outline" onClick={onCancel}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Choose a different path
          </Button>
        </div>
      </div>
    );
  }

  function renderSeedStep() {
    if (relationshipType === null) return null;
    const currentCard = RELATIONSHIP_CARDS.find((c) => c.type === relationshipType);
    if (!currentCard) return null;

    const examples = EXAMPLE_SEEDS[relationshipType];
    const canSubmit = seed.trim().length >= 1;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            <span className="mr-1">{currentCard.emoji}</span>
            {currentCard.label}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep('relationship')}
          >
            <Edit3 className="mr-1 h-3 w-3" />
            Change
          </Button>
        </div>

        {generationError !== null && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label>Describe them in one line.</Label>
          <textarea
            value={seed}
            onChange={(e) => handleSeedChange(e.target.value)}
            maxLength={SEED_MAX_LENGTH}
            placeholder={`e.g. "teacher by day, woman by night" or "old man who's seen things"`}
            className={cn(
              'w-full min-h-[96px] p-3 rounded-lg border bg-background resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'placeholder:text-muted-foreground text-sm leading-relaxed',
            )}
          />
          <div className="text-right text-xs text-muted-foreground">
            {seed.length}/{SEED_MAX_LENGTH}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Or try one of these:</Label>
          <div className="flex flex-col gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleExampleClick(example)}
                className={cn(
                  'rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm leading-relaxed text-muted-foreground transition-colors',
                  'hover:bg-primary/10 hover:text-foreground hover:border-primary/40',
                )}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep('relationship')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!canSubmit}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>
    );
  }

  function renderLoadingStep() {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Building your companion…</p>
      </div>
    );
  }

  function renderConfirmationStep() {
    if (generated === null || relationshipType === null) return null;
    const currentCard = RELATIONSHIP_CARDS.find((c) => c.type === relationshipType);
    if (!currentCard) return null;

    const isFallback =
      generated.name === 'Companion' &&
      generated.opening_line === 'Hey. Glad you came by.';

    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">{generated.name}</h2>
          <Badge variant="secondary">
            <span className="mr-1">{currentCard.emoji}</span>
            {currentCard.label}
          </Badge>
        </div>

        <div className="border-l-4 border-primary/50 bg-primary/5 px-4 py-3 rounded-r-lg">
          <p className="italic text-base leading-relaxed text-foreground">
            &ldquo;{generated.opening_line}&rdquo;
          </p>
        </div>

        <details className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Backstory</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {generated.backstory}
          </p>
        </details>

        {isFallback && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span className="text-amber-900 dark:text-amber-200">
              Looks like the metadata extraction didn&apos;t catch much from this seed. The character is still playable, but you might want to regenerate or rephrase your seed for a richer result.
            </span>
          </div>
        )}

        {generationError !== null && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('seed')}
            disabled={isCreating || isRegenerating}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRegenerate}
              disabled={isCreating || isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => onCreate(generated)}
              disabled={isCreating || isRegenerating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Meet them
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  switch (step) {
    case 'relationship':
      return renderRelationshipStep();
    case 'seed':
      return renderSeedStep();
    case 'loading':
      return renderLoadingStep();
    case 'confirmation':
      return renderConfirmationStep();
  }
}
