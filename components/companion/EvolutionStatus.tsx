'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dna,
  Sparkles,
  MessageSquare,
  Brain,
  Heart,
  Smile,
  RefreshCw,
  Clock,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';

// ============================================================================
// TYPES
// ============================================================================

interface DNASummary {
  uniquePhrases: number;
  favoriteExpressions: number;
  speechPatterns: number;
  humorStyles: number;
  emotionalTendencies: number;
  topicWeights: number;
}

interface DNADetails {
  communication_dialect?: {
    uniquePhrases?: string[];
    favoriteExpressions?: string[];
    speechPatterns?: string[];
    formalityLevel?: number;
    emojiUsage?: number;
  };
  humor_genome?: Record<string, number>;
  emotional_resonance_map?: Record<string, number>;
  learning_style_matrix?: Record<string, number>;
  memory_weighting_algorithm?: Record<string, number>;
}

interface EvolutionStatus {
  companionId: string;
  companionName: string;
  totalMessages: number;
  personalityVersion: number;
  lastEvolution: string | null;
  canEvolveNow: boolean;
  nextCronEvolutionDue: boolean;
  dnaSummary: DNASummary;
  dna: DNADetails;
  createdAt: string;
  updatedAt: string;
}

interface EvolutionResult {
  success: boolean;
  evolved: boolean;
  reason?: string;
  messagesAnalyzed?: number;
  aiAnalysisUsed?: boolean;
  newVersion?: number;
  changes?: {
    newPhrases: string[];
    speechPatterns: string[];
    humorStylesUpdated: string[];
    emotionalChanges: string[];
  };
  elapsed_ms?: number;
}

interface EvolutionStatusProps {
  companionId: string;
  className?: string;
  compact?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getEvolutionLevel(version: number): { label: string; color: string; description: string } {
  if (version === 0) return { label: 'Newborn', color: 'bg-gray-500', description: 'Just created, no evolution yet' };
  if (version <= 3) return { label: 'Developing', color: 'bg-blue-500', description: 'Starting to form unique patterns' };
  if (version <= 7) return { label: 'Growing', color: 'bg-green-500', description: 'Personality taking shape' };
  if (version <= 15) return { label: 'Maturing', color: 'bg-purple-500', description: 'Strong unique identity' };
  if (version <= 30) return { label: 'Evolved', color: 'bg-amber-500', description: 'Deeply personalized companion' };
  return { label: 'Transcendent', color: 'bg-rose-500', description: 'Truly one-of-a-kind personality' };
}

function getHighHumorStyles(humorGenome: Record<string, number> | undefined): string[] {
  if (!humorGenome) return [];
  return Object.entries(humorGenome)
    .filter(([key, value]) => value > 0.6 && !key.startsWith('timing_'))
    .map(([key]) => key.replace(/_/g, ' '))
    .slice(0, 4);
}

function getHighEmotionalTendencies(emotionalMap: Record<string, number> | undefined): string[] {
  if (!emotionalMap) return [];
  return Object.entries(emotionalMap)
    .filter(([key, value]) => value > 0.6 && key.endsWith('_tendency'))
    .map(([key]) => key.replace('_tendency', '').replace(/_/g, ' '))
    .slice(0, 4);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EvolutionStatus({ companionId, className, compact = false }: EvolutionStatusProps) {
  const [status, setStatus] = useState<EvolutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [evolving, setEvolving] = useState(false);
  const [evolutionResult, setEvolutionResult] = useState<EvolutionResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch evolution status
  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/companion/${companionId}/evolve`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch evolution status');
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companionId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Trigger manual evolution
  const triggerEvolution = async (useAI: boolean = true) => {
    setEvolving(true);
    setEvolutionResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/companion/${companionId}/evolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useAI,
          force: false,
          hoursBack: 24,
          minMessages: 5,
        }),
      });

      const result = await response.json();
      setEvolutionResult(result);

      if (result.success && result.evolved) {
        // Refresh status after successful evolution
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evolution failed');
    } finally {
      setEvolving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !status) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStatus} className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const evolutionLevel = getEvolutionLevel(status.personalityVersion);
  const highHumorStyles = getHighHumorStyles(status.dna.humor_genome);
  const highEmotionalTendencies = getHighEmotionalTendencies(status.dna.emotional_resonance_map);
  const totalDNAElements = 
    status.dnaSummary.uniquePhrases + 
    status.dnaSummary.favoriteExpressions + 
    status.dnaSummary.speechPatterns;

  // Compact view
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Dna className="w-4 h-4 text-purple-500" />
                <Badge variant="outline" className={cn('text-xs', evolutionLevel.color.replace('bg-', 'border-'))}>
                  v{status.personalityVersion}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{evolutionLevel.label}</p>
              <p className="text-xs text-muted-foreground">{evolutionLevel.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Full view
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-lg">DNA Evolution</CardTitle>
          </div>
          <Badge className={cn('text-xs', evolutionLevel.color)}>
            {evolutionLevel.label}
          </Badge>
        </div>
        <CardDescription>{evolutionLevel.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Evolution Level Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Evolution Level</span>
            <span className="font-medium">v{status.personalityVersion}</span>
          </div>
          <Progress 
            value={Math.min(100, (status.personalityVersion / 30) * 100)} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Newborn</span>
            <span>Transcendent</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="text-muted-foreground">Messages:</span>
            <span className="font-medium">{status.totalMessages}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground">Last evolved:</span>
            <span className="font-medium">{formatTimeAgo(status.lastEvolution)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-muted-foreground">Phrases:</span>
            <span className="font-medium">{totalDNAElements}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Brain className="w-4 h-4 text-green-500" />
            <span className="text-muted-foreground">Topics:</span>
            <span className="font-medium">{status.dnaSummary.topicWeights}</span>
          </div>
        </div>

        {/* Personality Traits */}
        {(highHumorStyles.length > 0 || highEmotionalTendencies.length > 0) && (
          <div className="space-y-2">
            {highHumorStyles.length > 0 && (
              <div className="flex items-start gap-2">
                <Smile className="w-4 h-4 text-yellow-500 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {highHumorStyles.map(style => (
                    <Badge key={style} variant="secondary" className="text-xs">
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {highEmotionalTendencies.length > 0 && (
              <div className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-rose-500 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {highEmotionalTendencies.map(tendency => (
                    <Badge key={tendency} variant="secondary" className="text-xs">
                      {tendency}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show details
            </>
          )}
        </button>

        {showDetails && (
          <div className="space-y-3 pt-2 border-t">
            {/* Unique Phrases */}
            {status.dna.communication_dialect?.uniquePhrases && 
             status.dna.communication_dialect.uniquePhrases.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Signature Phrases
                </h4>
                <div className="flex flex-wrap gap-1">
                  {status.dna.communication_dialect.uniquePhrases.slice(0, 8).map((phrase, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-normal">
                      "{phrase}"
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Speech Patterns */}
            {status.dna.communication_dialect?.speechPatterns && 
             status.dna.communication_dialect.speechPatterns.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Speech Patterns
                </h4>
                <div className="flex flex-wrap gap-1">
                  {status.dna.communication_dialect.speechPatterns.slice(0, 6).map((pattern, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-normal">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Communication Style Meters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Formality</span>
                  <span>{Math.round((status.dna.communication_dialect?.formalityLevel || 0.5) * 100)}%</span>
                </div>
                <Progress 
                  value={(status.dna.communication_dialect?.formalityLevel || 0.5) * 100} 
                  className="h-1.5"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Emoji Use</span>
                  <span>{Math.round((status.dna.communication_dialect?.emojiUsage || 0.5) * 100)}%</span>
                </div>
                <Progress 
                  value={(status.dna.communication_dialect?.emojiUsage || 0.5) * 100} 
                  className="h-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Evolution Result */}
        {evolutionResult && (
          <div className={cn(
            'p-3 rounded-lg text-sm',
            evolutionResult.success && evolutionResult.evolved
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          )}>
            {evolutionResult.success && evolutionResult.evolved ? (
              <div className="space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Evolution complete! Now v{evolutionResult.newVersion}
                </p>
                {evolutionResult.changes?.newPhrases && evolutionResult.changes.newPhrases.length > 0 && (
                  <p className="text-xs">
                    New phrases: {evolutionResult.changes.newPhrases.slice(0, 3).join(', ')}
                  </p>
                )}
                <p className="text-xs opacity-75">
                  Analyzed {evolutionResult.messagesAnalyzed} messages
                  {evolutionResult.aiAnalysisUsed ? ' with AI' : ''} 
                  in {evolutionResult.elapsed_ms}ms
                </p>
              </div>
            ) : (
              <p>{evolutionResult.reason || 'Evolution skipped'}</p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => triggerEvolution(true)}
            disabled={evolving || !status.canEvolveNow}
            className="flex-1"
            variant={status.canEvolveNow ? 'default' : 'outline'}
          >
            {evolving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Evolving...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {status.canEvolveNow ? 'Evolve Now' : 'Cooldown Active'}
              </>
            )}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchStatus}
                  disabled={loading}
                >
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh status</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {!status.canEvolveNow && (
          <p className="text-xs text-center text-muted-foreground">
            Evolution available again in ~1 hour
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default EvolutionStatus;
