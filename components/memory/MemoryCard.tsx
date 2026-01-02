'use client';

import { useState } from 'react';
import { 
  Heart, 
  Star, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Pin,
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
import type { MemoryWithCategory } from '@/types/database';

interface MemoryCardProps {
  memory: MemoryWithCategory;
  companionId: string;
  onUpdate?: () => void;
}

export function MemoryCard({ memory, companionId, onUpdate }: MemoryCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = getClient();

  const handleTogglePin = async () => {
    try {
      const { error } = await supabase
        .from('memories')
        .update({ is_pinned: !memory.is_pinned } as never)
        .eq('id', memory.id);

      if (error) throw error;
      toast.success(memory.is_pinned ? 'Memory unpinned' : 'Memory pinned');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to update memory');
    }
  };

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
    } catch (error) {
      toast.error('Failed to delete memory');
    } finally {
      setIsDeleting(false);
    }
  };

  const importancePercent = Math.round((memory.importance_score || 0) * 100);

  return (
    <Card 
      className={cn(
        'group relative transition-all hover:shadow-md',
        memory.is_core_identity && 'ring-2 ring-glow-pink/50',
        memory.is_pinned && 'bg-yellow-500/5'
      )}
    >
      {/* Indicators */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {memory.is_core_identity && (
          <Heart className="h-4 w-4 fill-glow-pink text-glow-pink" />
        )}
        {memory.is_pinned && (
          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
        )}
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="mb-2 pr-12 font-medium leading-tight">
          {memory.title}
        </h3>

        {/* Content Preview */}
        <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
          {memory.content}
        </p>

        {/* Category & Source */}
        <div className="mb-3 flex flex-wrap gap-2">
          {memory.memory_categories && (
            <Badge variant="secondary" className="text-xs">
              {memory.memory_categories.name}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {memory.source}
          </Badge>
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
              <DropdownMenuItem onClick={handleTogglePin}>
                <Pin className="mr-2 h-4 w-4" />
                {memory.is_pinned ? 'Unpin' : 'Pin'} Memory
              </DropdownMenuItem>
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
