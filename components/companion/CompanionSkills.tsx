'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Code,
  ChefHat,
  Briefcase,
  Gift,
  Gamepad2,
  Palette,
  Languages,
  ClipboardList,
  Brain,
  Package,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

// ============================================================================
// TYPES
// ============================================================================

type SkillCategory = 
  | 'coding' | 'recipes' | 'domain' | 'traditions' | 'games'
  | 'creative' | 'language' | 'procedures' | 'trivia' | 'other';

type SkillProficiency = 'novice' | 'familiar' | 'competent' | 'proficient' | 'expert';

interface CompanionSkill {
  id: string;
  companion_id: string;
  skill_name: string;
  skill_category: SkillCategory;
  skill_description: string | null;
  skill_content: string;
  skill_summary: string | null;
  proficiency: SkillProficiency;
  times_used: number;
  times_reinforced: number;
  confidence_score: number;
  tags: string[];
  is_favorite: boolean;
  is_active: boolean;
  taught_at: string;
  taught_via: string;
  created_at: string;
  updated_at: string;
}

interface SkillsSummary {
  total_skills: number;
  by_category: Record<SkillCategory, number>;
  by_proficiency: Record<SkillProficiency, number>;
  most_used: CompanionSkill[];
  recently_learned: CompanionSkill[];
  favorites: CompanionSkill[];
}

interface CompanionSkillsProps {
  companionId: string;
  companionName?: string;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_INFO: Record<SkillCategory, { label: string; icon: typeof BookOpen; color: string }> = {
  coding: { label: 'Coding', icon: Code, color: 'text-blue-500' },
  recipes: { label: 'Recipes', icon: ChefHat, color: 'text-orange-500' },
  domain: { label: 'Domain', icon: Briefcase, color: 'text-purple-500' },
  traditions: { label: 'Traditions', icon: Gift, color: 'text-red-500' },
  games: { label: 'Games', icon: Gamepad2, color: 'text-green-500' },
  creative: { label: 'Creative', icon: Palette, color: 'text-pink-500' },
  language: { label: 'Language', icon: Languages, color: 'text-cyan-500' },
  procedures: { label: 'Procedures', icon: ClipboardList, color: 'text-amber-500' },
  trivia: { label: 'Trivia', icon: Brain, color: 'text-indigo-500' },
  other: { label: 'Other', icon: Package, color: 'text-gray-500' },
};

const PROFICIENCY_INFO: Record<SkillProficiency, { label: string; color: string; bgColor: string }> = {
  novice: { label: 'Learning', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  familiar: { label: 'Familiar', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  competent: { label: 'Competent', color: 'text-green-600', bgColor: 'bg-green-100' },
  proficient: { label: 'Proficient', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  expert: { label: 'Expert', color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

const CATEGORIES: SkillCategory[] = [
  'coding', 'recipes', 'domain', 'traditions', 'games',
  'creative', 'language', 'procedures', 'trivia', 'other'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// SKILL CARD COMPONENT
// ============================================================================

interface SkillCardProps {
  skill: CompanionSkill;
  onToggleFavorite: (skillId: string, isFavorite: boolean) => void;
  onDelete: (skillId: string) => void;
  onEdit: (skill: CompanionSkill) => void;
}

function SkillCard({ skill, onToggleFavorite, onDelete, onEdit }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);
  const categoryInfo = CATEGORY_INFO[skill.skill_category];
  const proficiencyInfo = PROFICIENCY_INFO[skill.proficiency];
  const CategoryIcon = categoryInfo.icon;

  return (
    <Card className={cn(
      'transition-all duration-200',
      !skill.is_active && 'opacity-50'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CategoryIcon className={cn('w-5 h-5 flex-shrink-0', categoryInfo.color)} />
            <CardTitle className="text-base truncate">{skill.skill_name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onToggleFavorite(skill.id, !skill.is_favorite)}
                  >
                    {skill.is_favorite ? (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <StarOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{skill.is_favorite ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={cn('text-xs', proficiencyInfo.color, proficiencyInfo.bgColor)}>
            {proficiencyInfo.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {categoryInfo.label}
          </Badge>
          {skill.times_used > 0 && (
            <span className="text-xs text-muted-foreground">
              Used {skill.times_used}x
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {skill.skill_summary && (
          <p className="text-sm text-muted-foreground mb-2">{skill.skill_summary}</p>
        )}
        
        {/* Expandable content */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
        >
          {expanded ? (
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

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Full content */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-xs font-medium mb-1">Full Knowledge</h4>
              <p className="text-sm whitespace-pre-wrap">{skill.skill_content}</p>
            </div>

            {/* Tags */}
            {skill.tags && skill.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {skill.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Taught: {formatDate(skill.taught_at)}</div>
              <div>Via: {skill.taught_via}</div>
              <div>Confidence: {Math.round(skill.confidence_score * 100)}%</div>
              <div>Reinforced: {skill.times_reinforced}x</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(skill)} className="flex-1">
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(skill.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TEACH SKILL MODAL
// ============================================================================

interface TeachSkillModalProps {
  companionId: string;
  companionName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkillTaught: () => void;
  editingSkill?: CompanionSkill | null;
}

function TeachSkillModal({ 
  companionId, 
  companionName, 
  open, 
  onOpenChange, 
  onSkillTaught,
  editingSkill 
}: TeachSkillModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState<SkillCategory>('other');
  const [skillDescription, setSkillDescription] = useState('');
  const [skillContent, setSkillContent] = useState('');
  const [tags, setTags] = useState('');

  // Reset form when opening/closing or editing different skill
  useEffect(() => {
    if (open) {
      if (editingSkill) {
        setSkillName(editingSkill.skill_name);
        setSkillCategory(editingSkill.skill_category);
        setSkillDescription(editingSkill.skill_description || '');
        setSkillContent(editingSkill.skill_content);
        setTags(editingSkill.tags?.join(', ') || '');
      } else {
        setSkillName('');
        setSkillCategory('other');
        setSkillDescription('');
        setSkillContent('');
        setTags('');
      }
      setError(null);
      setSuccess(false);
    }
  }, [open, editingSkill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

      if (editingSkill) {
        // Update existing skill
        const response = await fetch(`/api/companion/${companionId}/skills/${editingSkill.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skill_name: skillName,
            skill_category: skillCategory,
            skill_description: skillDescription || null,
            skill_content: skillContent,
            tags: tagArray,
            regenerate_summary: true,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update skill');
        }
      } else {
        // Create new skill
        const response = await fetch(`/api/companion/${companionId}/skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skill_name: skillName,
            skill_category: skillCategory,
            skill_description: skillDescription || undefined,
            skill_content: skillContent,
            tags: tagArray,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to teach skill');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSkillTaught();
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSkill ? 'Edit Skill' : `Teach ${companionName || 'Companion'} a New Skill`}
          </DialogTitle>
          <DialogDescription>
            {editingSkill 
              ? 'Update the skill details below.'
              : 'Share specific knowledge that your companion will remember and use.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Skill Name */}
          <div className="space-y-2">
            <Label htmlFor="skill-name">Skill Name *</Label>
            <Input
              id="skill-name"
              placeholder="e.g., Grandma's Carbonara Recipe"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(cat => {
                const info = CATEGORY_INFO[cat];
                const Icon = info.icon;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSkillCategory(cat)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                      skillCategory === cat 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', info.color)} />
                    <span className="text-xs">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="skill-desc">Brief Description</Label>
            <Input
              id="skill-desc"
              placeholder="One-line summary of this skill"
              value={skillDescription}
              onChange={(e) => setSkillDescription(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="skill-content">Full Knowledge *</Label>
            <textarea
              id="skill-content"
              className="w-full min-h-[150px] p-3 rounded-md border border-input bg-background text-sm resize-y"
              placeholder={
                skillCategory === 'recipes' 
                  ? "List ingredients, measurements, and step-by-step instructions..."
                  : skillCategory === 'coding'
                  ? "Include code snippets, explanations, and examples..."
                  : skillCategory === 'procedures'
                  ? "List each step in order with any important notes..."
                  : "Share all the details you want your companion to remember..."
              }
              value={skillContent}
              onChange={(e) => setSkillContent(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Be as detailed as possible - your companion will use this exact knowledge.
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="skill-tags">Tags (comma-separated)</Label>
            <Input
              id="skill-tags"
              placeholder="italian, pasta, family, quick"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              {editingSkill ? 'Skill updated successfully!' : 'Skill taught successfully!'}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !skillName || !skillContent}>
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {editingSkill ? 'Updating...' : 'Teaching...'}
                </>
              ) : (
                <>
                  {editingSkill ? 'Update Skill' : 'Teach Skill'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CompanionSkills({ companionId, companionName, className }: CompanionSkillsProps) {
  const [skills, setSkills] = useState<CompanionSkill[]>([]);
  const [summary, setSummary] = useState<SkillsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<SkillCategory | 'all'>('all');
  const [showTeachModal, setShowTeachModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<CompanionSkill | null>(null);

  // Fetch skills
  const fetchSkills = useCallback(async () => {
    try {
      setError(null);
      
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/companion/${companionId}/skills?${params}`);
      
      if (!response.ok) throw new Error('Failed to fetch skills');
      
      const data = await response.json();
      setSkills(data.skills || []);

      // Also fetch summary
      const summaryRes = await fetch(`/api/companion/${companionId}/skills?summary=true`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companionId, filterCategory, searchQuery]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Toggle favorite
  const handleToggleFavorite = async (skillId: string, isFavorite: boolean) => {
    try {
      await fetch(`/api/companion/${companionId}/skills/${skillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite }),
      });
      
      setSkills(prev => prev.map(s => 
        s.id === skillId ? { ...s, is_favorite: isFavorite } : s
      ));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Delete skill
  const handleDelete = async (skillId: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    
    try {
      await fetch(`/api/companion/${companionId}/skills/${skillId}`, {
        method: 'DELETE',
      });
      
      setSkills(prev => prev.filter(s => s.id !== skillId));
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  // Edit skill
  const handleEdit = (skill: CompanionSkill) => {
    setEditingSkill(skill);
    setShowTeachModal(true);
  };

  // Filtered skills
  const filteredSkills = skills.filter(skill => {
    if (filterCategory !== 'all' && skill.skill_category !== filterCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        skill.skill_name.toLowerCase().includes(query) ||
        skill.skill_content.toLowerCase().includes(query) ||
        skill.tags?.some(t => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Loading state
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Taught Skills</CardTitle>
            </div>
            <Button onClick={() => { setEditingSkill(null); setShowTeachModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Teach Skill
            </Button>
          </div>
          <CardDescription>
            {summary?.total_skills || 0} skills taught to {companionName || 'your companion'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Stats */}
          {summary && summary.total_skills > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(summary.by_category || {}).slice(0, 5).map(([cat, count]) => {
                const info = CATEGORY_INFO[cat as SkillCategory];
                if (!info || count === 0) return null;
                const Icon = info.icon;
                return (
                  <div key={cat} className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                    <Icon className={cn('w-4 h-4', info.color)} />
                    <span className="text-lg font-semibold">{count}</span>
                    <span className="text-xs text-muted-foreground">{info.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as SkillCategory | 'all')}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_INFO[cat].label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSkills} className="mt-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!error && filteredSkills.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">
              {searchQuery || filterCategory !== 'all' 
                ? 'No matching skills found'
                : 'No skills taught yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || filterCategory !== 'all'
                ? 'Try adjusting your search or filters.'
                : `Teach ${companionName || 'your companion'} recipes, code, traditions, or any knowledge you want them to remember.`}
            </p>
            {!searchQuery && filterCategory === 'all' && (
              <Button onClick={() => setShowTeachModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Teach First Skill
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skills Grid */}
      {filteredSkills.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSkills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Teach/Edit Modal */}
      <TeachSkillModal
        companionId={companionId}
        companionName={companionName}
        open={showTeachModal}
        onOpenChange={(open) => {
          setShowTeachModal(open);
          if (!open) setEditingSkill(null);
        }}
        onSkillTaught={fetchSkills}
        editingSkill={editingSkill}
      />
    </div>
  );
}

export default CompanionSkills;
