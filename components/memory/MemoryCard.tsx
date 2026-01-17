'use client';

import { useState } from 'react';
import { 
  Heart, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Calendar,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn, formatRelativeTime } from '@/lib/utils/cn';
import { getClient } from '@/lib/supabase/client';

// Local interface matching actual database schema
interface MemoryData {
  id: string;
  companion_id: string;
  content: string;
  summary: string | null;
  memory_type: string;
  importance: number;
  emotional_weight: number;
  is_core_memory: boolean;
  is_active: boolean;
  access_count: number;
  tags: string[];
  created_at: string;
  category?: string;
}

interface MemoryCardProps {
  memory: MemoryData;
  companionId: string;
  onUpdate?: () => void;
}

export function MemoryCard({ memory, companionId, onUpdate }: MemoryCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = getClient();

  // Suppress unused parameter warning - companionId could be used for validation
  void companionId;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', memory.id);

      if (error) throw error;
      toast.success('Memory deleted');
      onUpdate?.();
    } catch {
      toast.error('Failed to delete memory');
    } finally {
      setIsDeleting(false);
    }
  };

  const importancePercent = Math.round((memory.importance || 0) * 100);

  // Display title - use summary or first part of content
  const displayTitle = memory.summary || memory.content.slice(0, 60) + (memory.content.length > 60 ? '...' : '');

  return (
    <Card 
      className={cn(
        'group relative transition-all hover:shadow-md',
        memory.is_core_memory && 'ring-2 ring-glow-pink/50'
      )}
    >
      {/* Core Memory Indicator */}
      {memory.is_core_memory && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <Heart className="h-4 w-4 fill-glow-pink text-glow-pink" />
        </div>
      )}

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="mb-2 pr-12 font-medium leading-tight">
          {displayTitle}
        </h3>

        {/* Content Preview */}
        <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
          {memory.content}
        </p>

        {/* Type & Tags */}
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {memory.memory_type}
          </Badge>
          {memory.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Importance Bar */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Importance</span>
            <span className="font-medium">{importancePercent}%</span>
          </div>
          <Progress 
            value={importancePercent} 
            size="sm"
            variant={importancePercent > 75 ? 'gradient' : 'default'}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatRelativeTime(memory.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {memory.access_count || 0}
            </span>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon-sm"
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Memory
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Memory
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
