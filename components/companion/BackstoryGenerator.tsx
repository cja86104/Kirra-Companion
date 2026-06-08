'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Edit3, Check, X, PenLine } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Maximum length of the seed prompt the user can type in seed mode. Mirrors
 * SeedSchema.seed.max in app/api/companion/generate-from-seed/route.ts —
 * if you change one, change both.
 */
const SEED_PROMPT_MAX_LENGTH = 500;

interface BackstoryGeneratorProps {
  name: string;
  relationshipType: string;
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  interests: string[];
  backstory: string;
  onBackstoryChange: (backstory: string) => void;
  disabled?: boolean;
  /**
   * Selects the initial UI in this component:
   *   'generate' — show the two-card AI-Generate / Write-Your-Own picker
   *   'custom'   — jump straight into the write-your-own textarea
   *   'seed'     — show the seed-prompt textarea and call the higher-quality
   *                /api/companion/generate-from-seed endpoint (Path 3 in the
   *                creation flow). The wizard sets this when the user picked
   *                the "Describe them in one line" tile on the picker.
   */
  initialMode?: 'generate' | 'custom' | 'seed';
}

/**
 * Narrow the JSON shape we read from /api/companion/generate-from-seed.
 * The endpoint returns extra fields (name, personality_base, interests,
 * opening_line) — we ignore them on this code path because the wizard
 * has already collected those values from the user.
 */
interface SeedApiResponse {
  backstory: string;
}

function isSeedApiResponse(value: unknown): value is SeedApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'backstory' in value &&
    typeof (value as { backstory: unknown }).backstory === 'string' &&
    (value as { backstory: string }).backstory.trim().length > 0
  );
}

export function BackstoryGenerator({
  name,
  relationshipType,
  traits,
  interests,
  backstory,
  onBackstoryChange,
  disabled = false,
  initialMode,
}: BackstoryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isWritingCustom, setIsWritingCustom] = useState(initialMode === 'custom');
  const [editedBackstory, setEditedBackstory] = useState(backstory);
  const [generationCount, setGenerationCount] = useState(0);

  // Seed-mode state. `seedPrompt` is the user's couple-of-sentences input;
  // `lastSeedPromptUsed` is the value that was actually sent to the API so
  // that the Regenerate button can re-run the seed pipeline (instead of the
  // generic generate-backstory pipeline) without making the user retype.
  const [seedPrompt, setSeedPrompt] = useState('');
  const [lastSeedPromptUsed, setLastSeedPromptUsed] = useState<string | null>(null);

  const generateBackstory = async () => {
    if (!name || interests.length === 0) {
      toast.error('Please add a name and at least one interest first');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/companion/generate-backstory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          relationshipType,
          traits,
          interests,
          previousBackstory: generationCount > 0 ? backstory : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate backstory');
      }

      const data = await response.json();
      onBackstoryChange(data.backstory);
      setEditedBackstory(data.backstory);
      setGenerationCount(prev => prev + 1);
      toast.success('Backstory generated!');
    } catch (error) {
      console.error('Backstory generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate backstory');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Seed-mode generator. Hits the high-quality
   * /api/companion/generate-from-seed endpoint and uses only the
   * `backstory` field from the response (the endpoint also returns
   * AI-generated name / personality / interests / opening_line, but the
   * wizard has already collected those from the user, so we ignore them).
   *
   * `lastSeedPromptUsed` is stored so that the Regenerate button on the
   * post-generation UI knows to re-fire this seed pipeline instead of the
   * generic generate-backstory pipeline.
   */
  const generateFromSeed = async () => {
    const trimmed = seedPrompt.trim();
    if (trimmed.length === 0) {
      toast.error('Add a few sentences describing this companion first');
      return;
    }
    if (trimmed.length > SEED_PROMPT_MAX_LENGTH) {
      toast.error(`Seed prompt must be ${SEED_PROMPT_MAX_LENGTH} characters or fewer`);
      return;
    }
    if (!name) {
      toast.error('Please add a name on the Basics step first');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/companion/generate-from-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: trimmed,
          relationshipType,
          name,
        }),
      });

      if (!response.ok) {
        let serverMessage: string | null = null;
        try {
          const errBody: unknown = await response.json();
          if (
            typeof errBody === 'object' &&
            errBody !== null &&
            'error' in errBody &&
            typeof (errBody as { error: unknown }).error === 'string'
          ) {
            serverMessage = (errBody as { error: string }).error;
          }
        } catch {
          // Body wasn't JSON. Leave serverMessage null and fall through to
          // the generic toast below.
        }
        throw new Error(serverMessage ?? 'Failed to generate backstory');
      }

      const parsed: unknown = await response.json();
      if (!isSeedApiResponse(parsed)) {
        throw new Error('Backstory generator returned an unexpected response.');
      }

      onBackstoryChange(parsed.backstory);
      setEditedBackstory(parsed.backstory);
      setGenerationCount((prev) => prev + 1);
      setLastSeedPromptUsed(trimmed);
      toast.success('Backstory generated!');
    } catch (error) {
      console.error('Seed-backstory generation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate backstory'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Regenerate dispatcher. Picks the right pipeline based on how the
   * current backstory was produced. If the user generated this backstory
   * from a seed prompt, we re-fire the seed pipeline with the saved
   * prompt; otherwise we run the standard trait-based regeneration.
   */
  const regenerateBackstory = async () => {
    if (lastSeedPromptUsed !== null) {
      await generateFromSeed();
      return;
    }
    await generateBackstory();
  };

  /**
   * Reset state so the user can enter a new seed prompt from scratch.
   * Clears the current backstory and the saved prompt; the seed-mode
   * empty-state UI will render again.
   */
  const restartSeed = () => {
    setSeedPrompt('');
    setLastSeedPromptUsed(null);
    onBackstoryChange('');
    setEditedBackstory('');
  };

  const startEditing = () => {
    setEditedBackstory(backstory);
    setIsEditing(true);
    setIsWritingCustom(false);
  };

  const startWritingCustom = () => {
    setEditedBackstory('');
    setIsWritingCustom(true);
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (editedBackstory.trim().length < 20) {
      toast.error('Backstory should be at least 20 characters');
      return;
    }
    onBackstoryChange(editedBackstory.trim());
    setIsEditing(false);
    setIsWritingCustom(false);
    toast.success('Backstory saved!');
  };

  const cancelEdit = () => {
    setEditedBackstory(backstory);
    setIsEditing(false);
    setIsWritingCustom(false);
  };

  const getTraitDescription = () => {
    const traitDescriptions: string[] = [];

    if (traits.extraversion > 70) traitDescriptions.push('outgoing');
    else if (traits.extraversion < 30) traitDescriptions.push('introspective');

    if (traits.agreeableness > 70) traitDescriptions.push('warm-hearted');
    if (traits.openness > 70) traitDescriptions.push('creative');
    if (traits.conscientiousness > 70) traitDescriptions.push('dedicated');

    if (traits.neuroticism < 30) traitDescriptions.push('calm');
    else if (traits.neuroticism > 70) traitDescriptions.push('sensitive');

    return traitDescriptions.slice(0, 3).join(', ') || 'balanced';
  };

  // Writing custom or editing existing
  if (isEditing || isWritingCustom) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{isWritingCustom ? 'Write Your Own Backstory' : 'Edit Backstory'}</Label>
        </div>
        <div className="space-y-3">
          <textarea
            value={editedBackstory}
            onChange={(e) => setEditedBackstory(e.target.value)}
            placeholder={`Write a detailed backstory for ${name || 'your companion'}...

Include things like:
• Their background and history
• Personality quirks and traits
• What makes them unique
• How they communicate
• Their desires and motivations
• Any secrets or vulnerabilities

The more detail you add, the more personalized your companion will be!`}
            className={cn(
              'w-full min-h-[300px] p-4 rounded-lg border bg-background resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'placeholder:text-muted-foreground text-sm leading-relaxed'
            )}
            disabled={disabled}
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {editedBackstory.length}/5000 characters
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelEdit}
                disabled={disabled}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveEdit}
                disabled={disabled || editedBackstory.trim().length < 20}
              >
                <Check className="w-4 h-4 mr-1" />
                Save Backstory
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Seed mode: show the seed-prompt textarea instead of the two-card
  // picker. Once a backstory has been generated this branch is skipped
  // and the post-backstory display (further below) takes over.
  if (!backstory && initialMode === 'seed') {
    const remaining = SEED_PROMPT_MAX_LENGTH - seedPrompt.length;
    const overLimit = remaining < 0;

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="seed-prompt">Describe them in a couple of sentences</Label>
          <p className="text-xs text-muted-foreground">
            We&apos;ll generate the full backstory from this. Be specific —
            opinions, contradictions, a concrete detail. The richer the
            seed, the richer the character.
          </p>
        </div>

        <textarea
          id="seed-prompt"
          value={seedPrompt}
          onChange={(e) => setSeedPrompt(e.target.value)}
          placeholder={
            `e.g. ${
              relationshipType === 'romantic'
                ? 'a poet who writes letters by hand and lives near the coast'
                : relationshipType === 'mentor'
                  ? "a writer who's been published for thirty years, now teaches"
                  : relationshipType === 'family'
                    ? 'my older sister who teaches high school history'
                    : relationshipType === 'custom'
                      ? "the voice in my head when I'm trying to be honest with myself"
                      : 'the friend who always tells me the truth, even when it stings'
            }`
          }
          className={cn(
            'w-full min-h-[120px] p-4 rounded-lg border bg-background resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'placeholder:text-muted-foreground text-sm leading-relaxed',
            overLimit && 'border-destructive focus:ring-destructive/20 focus:border-destructive'
          )}
          disabled={disabled || isGenerating}
          maxLength={SEED_PROMPT_MAX_LENGTH + 50 /* let user paste-then-trim */}
        />

        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-xs',
              overLimit ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {seedPrompt.length}/{SEED_PROMPT_MAX_LENGTH} characters
          </span>
          <Button
            type="button"
            onClick={generateFromSeed}
            disabled={
              disabled ||
              isGenerating ||
              seedPrompt.trim().length === 0 ||
              overLimit ||
              !name
            }
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate backstory
              </>
            )}
          </Button>
        </div>

        {!name && (
          <p className="text-xs text-muted-foreground">
            Go back and enter a name on the Basics step first.
          </p>
        )}
      </div>
    );
  }

  // No backstory yet - show both options
  if (!backstory) {
    return (
      <div className="space-y-4">
        <Label>Backstory</Label>

        <div className="grid gap-4 md:grid-cols-2">
          {/* AI Generate Option */}
          <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => !disabled && !isGenerating && name && interests.length > 0 && generateBackstory()}>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">AI Generate</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a backstory based on {name || 'your companion'}&apos;s {getTraitDescription()} personality
              </p>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  generateBackstory();
                }}
                disabled={disabled || isGenerating || !name || interests.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Crafting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
              {(!name || interests.length === 0) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Complete name and interests first
                </p>
              )}
            </CardContent>
          </Card>

          {/* Write Your Own Option */}
          <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => !disabled && startWritingCustom()}>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-kirra-amber/10 flex items-center justify-center mb-3">
                <PenLine className="w-6 h-6 text-kirra-amber" />
              </div>
              <h3 className="font-medium mb-1">Write Your Own</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a custom backstory with exactly the details you want
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  startWritingCustom();
                }}
                disabled={disabled}
              >
                <PenLine className="w-4 h-4 mr-2" />
                Write Custom
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          A detailed backstory helps your companion respond more authentically to you
        </p>
      </div>
    );
  }

  // Has backstory - show it with edit options
  const wasSeedGenerated = lastSeedPromptUsed !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Backstory</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={startEditing}
            disabled={disabled || isGenerating}
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={regenerateBackstory}
            disabled={disabled || isGenerating}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isGenerating && 'animate-spin')} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Seed-mode summary: show the prompt that produced this backstory
          and let the user start over with a new prompt. Only renders when
          this backstory was generated from a seed prompt. */}
      {wasSeedGenerated && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                Generated from your prompt
              </p>
              <p className="mt-1 text-xs text-foreground/80 italic break-words">
                &ldquo;{lastSeedPromptUsed}&rdquo;
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={restartSeed}
              disabled={disabled || isGenerating}
              className="shrink-0"
            >
              Use a different prompt
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="py-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {backstory}
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This backstory shapes {name}&apos;s personality and responses.
        Edit anytime to refine their character.
      </p>
    </div>
  );
}
000 characters
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelEdit}
                disabled={disabled}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveEdit}
                disabled={disabled || editedBackstory.trim().length < 20}
              >
                <Check className="w-4 h-4 mr-1" />
                Save Backstory
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Seed mode: show the seed-prompt textarea instead of the two-card
  // picker. Once a backstory has been generated this branch is skipped
  // and the post-backstory display (further below) takes over.
  if (!backstory && initialMode === 'seed') {
    const remaining = SEED_PROMPT_MAX_LENGTH - seedPrompt.length;
    const overLimit = remaining < 0;

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="seed-prompt">Describe them in a couple of sentences</Label>
          <p className="text-xs text-muted-foreground">
            We&apos;ll generate the full backstory from this. Be specific —
            opinions, contradictions, a concrete detail. The richer the
            seed, the richer the character.
          </p>
        </div>

        <textarea
          id="seed-prompt"
          value={seedPrompt}
          onChange={(e) => setSeedPrompt(e.target.value)}
          placeholder={
            relationshipType === 'romantic'
              ? 'e.g. a poet who writes letters by hand and lives near the coast'
              : relationshipType === 'mentor'
                ? "e.g. a writer who's been published for thirty years, now teaches"
                : relationshipType === 'family'
                  ? 'e.g. my older sister who teaches high school history'
                  : relationshipType === 'custom'
                    ? "e.g. the voice in my head when I'm trying to be honest with myself"
                    : 'e.g. the friend who always tells me the truth, even when it stings'
          }
          className={cn(
            'w-full min-h-[120px] p-4 rounded-lg border bg-background resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'placeholder:text-muted-foreground text-sm leading-relaxed',
            overLimit && 'border-destructive focus:ring-destructive/20 focus:border-destructive'
          )}
          disabled={disabled || isGenerating}
          maxLength={SEED_PROMPT_MAX_LENGTH + 50}
        />

        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-xs',
              overLimit ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {seedPrompt.length}/{SEED_PROMPT_MAX_LENGTH} characters
          </span>
          <Button
            type="button"
            onClick={generateFromSeed}
            disabled={
              disabled ||
              isGenerating ||
              seedPrompt.trim().length === 0 ||
              overLimit ||
              !name
            }
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate backstory
              </>
            )}
          </Button>
        </div>

        {!name && (
          <p className="text-xs text-muted-foreground">
            Go back and enter a name on the Basics step first.
          </p>
        )}
      </div>
    );
  }

  // No backstory yet - show both options (Path 1 / Path 2 picker)
  if (!backstory) {
    return (
      <div className="space-y-4">
        <Label>Backstory</Label>

        <div className="grid gap-4 md:grid-cols-2">
          {/* AI Generate Option */}
          <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => !disabled && !isGenerating && name && interests.length > 0 && generateBackstory()}>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">AI Generate</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a backstory based on {name || 'your companion'}&apos;s {getTraitDescription()} personality
              </p>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  generateBackstory();
                }}
                disabled={disabled || isGenerating || !name || interests.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Crafting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
              {(!name || interests.length === 0) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Complete name and interests first
                </p>
              )}
            </CardContent>
          </Card>

          {/* Write Your Own Option */}
          <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => !disabled && startWritingCustom()}>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-kirra-amber/10 flex items-center justify-center mb-3">
                <PenLine className="w-6 h-6 text-kirra-amber" />
              </div>
              <h3 className="font-medium mb-1">Write Your Own</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a custom backstory with exactly the details you want
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  startWritingCustom();
                }}
                disabled={disabled}
              >
                <PenLine className="w-4 h-4 mr-2" />
                Write Custom
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          A detailed backstory helps your companion respond more authentically to you
        </p>
      </div>
    );
  }

  // Has backstory - show it with edit options
  const wasSeedGenerated = lastSeedPromptUsed !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Backstory</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={startEditing}
            disabled={disabled || isGenerating}
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={regenerateBackstory}
            disabled={disabled || isGenerating}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isGenerating && 'animate-spin')} />
            Regenerate
          </Button>
        </div>
      </div>

      {wasSeedGenerated && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                Generated from your prompt
              </p>
              <p className="mt-1 text-xs text-foreground/80 italic break-words">
                &ldquo;{lastSeedPromptUsed}&rdquo;
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={restartSeed}
              disabled={disabled || isGenerating}
              className="shrink-0"
            >
              Use a different prompt
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="py-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {backstory}
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This backstory shapes {name}&apos;s personality and responses.
        Edit anytime to refine their character.
      </p>
    </div>
  );
}
              Use a different prompt
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="py-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {backstory}
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        This backstory shapes {name}&apos;s personality and responses.
        Edit anytime to refine their character.
      </p>
    </div>
  );
}
    </div>
  );
}
