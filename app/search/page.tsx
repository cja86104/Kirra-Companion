'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, MessageCircle, Brain, User, ArrowRight } from 'lucide-react';

import { getClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/input';

interface CompanionResult {
  id: string;
  name: string;
  relationship_type: string;
  avatar_url: string | null;
  affection_level: number;
}

interface MemoryResult {
  id: string;
  title: string;
  content: string;
  companion_id: string;
  companion_name: string;
  importance_score: number;
}

interface MessageResult {
  id: string;
  content: string;
  role: string;
  created_at: string;
  companion_id: string;
  companion_name: string;
}

interface SearchResults {
  companions: CompanionResult[];
  memories: MemoryResult[];
  messages: MessageResult[];
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<SearchResults>({
    companions: [],
    memories: [],
    messages: [],
  });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const supabase = getClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const searchTerm = `%${q.trim()}%`;

      // Search companions by name
      const { data: companions } = await supabase
        .from('companions')
        .select('id, name, relationship_type, avatar_url, affection_level')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .ilike('name', searchTerm)
        .limit(5);

      // Search memories by title or content
      const { data: memoriesData } = await supabase
        .from('memories')
        .select(`
          id,
          title,
          content,
          companion_id,
          importance_score,
          companions!inner(name, user_id)
        `)
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .limit(10);

      // Filter memories to user's companions and map
      const memories = (memoriesData || [])
        .filter((m: any) => m.companions?.user_id === user.id)
        .map((m: any) => ({
          id: m.id,
          title: m.title,
          content: m.content,
          companion_id: m.companion_id,
          companion_name: m.companions?.name || 'Unknown',
          importance_score: m.importance_score,
        }));

      // Search messages by content
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          role,
          created_at,
          companion_id,
          companions!inner(name, user_id)
        `)
        .eq('is_deleted', false)
        .ilike('content', searchTerm)
        .order('created_at', { ascending: false })
        .limit(10);

      // Filter messages to user's companions and map
      const messages = (messagesData || [])
        .filter((m: any) => m.companions?.user_id === user.id)
        .map((m: any) => ({
          id: m.id,
          content: m.content,
          role: m.role,
          created_at: m.created_at,
          companion_id: m.companion_id,
          companion_name: m.companions?.name || 'Unknown',
        }));

      setResults({
        companions: companions || [],
        memories,
        messages,
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      // Update URL without full navigation
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(value.trim())}`);
      performSearch(value);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark> : part
    );
  };

  const totalResults = results.companions.length + results.memories.length + results.messages.length;

  return (
    <div className="container max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-muted-foreground">
          Search across companions, memories, and conversations
        </p>
      </div>

      {/* Search Input */}
      <div className="w-full max-w-xl">
        <SearchInput
          placeholder="Search conversations, memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSearch={handleSearch}
          autoFocus
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <div className="space-y-8">
          {/* Summary */}
          <p className="text-sm text-muted-foreground">
            {totalResults === 0 
              ? `No results found for "${query}"`
              : `Found ${totalResults} result${totalResults === 1 ? '' : 's'} for "${query}"`
            }
          </p>

          {/* Companions */}
          {results.companions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Companions</h2>
                <Badge variant="secondary">{results.companions.length}</Badge>
              </div>
              <div className="space-y-2">
                {results.companions.map((companion) => (
                  <Link key={companion.id} href={`/chat/${companion.id}`}>
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="flex items-center gap-4 p-4">
                        <Avatar>
                          {companion.avatar_url ? (
                            <AvatarImage src={companion.avatar_url} alt={companion.name} />
                          ) : (
                            <AvatarFallback className="bg-kirra-gradient text-white">
                              {getInitials(companion.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{highlightMatch(companion.name, query)}</p>
                          <p className="text-sm text-muted-foreground">{companion.relationship_type}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Memories */}
          {results.memories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Memories</h2>
                <Badge variant="secondary">{results.memories.length}</Badge>
              </div>
              <div className="space-y-2">
                {results.memories.map((memory) => (
                  <Link key={memory.id} href={`/companion/${memory.companion_id}/memory-palace`}>
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{highlightMatch(memory.title, query)}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {highlightMatch(memory.content, query)}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {memory.companion_name}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {results.messages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Conversations</h2>
                <Badge variant="secondary">{results.messages.length}</Badge>
              </div>
              <div className="space-y-2">
                {results.messages.map((message) => (
                  <Link key={message.id} href={`/chat/${message.companion_id}`}>
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={message.role === 'user' ? 'secondary' : 'default'} className="text-xs">
                                {message.role === 'user' ? 'You' : message.companion_name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {highlightMatch(message.content, query)}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {totalResults === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No results found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Try searching with different keywords or check your spelling
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Search your Kirra world</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Find companions, memories, and past conversations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="container max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-muted-foreground">
          Search across companions, memories, and conversations
        </p>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}
