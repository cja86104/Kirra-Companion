'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface MemorySearchProps {
  companionId: string;
  onResultSelect?: (memoryId: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  importance_score: number;
  similarity?: number;
  category?: string;
}

export function MemorySearch({ companionId, onResultSelect }: MemorySearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await fetch(`/api/companion/${companionId}/memories/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      toast.error('Failed to search memories');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [companionId, query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Search memories semantically..."
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <Card className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[400px] overflow-y-auto shadow-lg">
          <CardContent className="p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No memories found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      onResultSelect?.(result.id);
                      setShowResults(false);
                    }}
                    className="w-full rounded-lg p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {result.content}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {result.similarity !== undefined && (
                          <Badge 
                            variant={result.similarity > 0.8 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {Math.round(result.similarity * 100)}% match
                          </Badge>
                        )}
                        {result.category && (
                          <Badge variant="outline" className="text-xs">
                            {result.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
