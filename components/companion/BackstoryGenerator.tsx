'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Edit3, Check, X, PenLine } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

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
}

export function BackstoryGenerator({
  name,
  relationshipType,
  traits,
  interests,
  backstory,
  onBackstoryChange,
  disabled = false,
}: BackstoryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isWritingCustom, setIsWritingCustom] = useState(false);
  const [editedBackstory, setEditedBackstory] = useState(backstory);
  const [generationCount, setGenerationCount] = useState(0);

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
            onClick={generateBackstory}
            disabled={disabled || isGenerating}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isGenerating && 'animate-spin')} />
            Regenerate
          </Button>
        </div>
      </div>

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
