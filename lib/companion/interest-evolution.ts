/**
 * Interest Evolution System
 * 
 * Manages how companions discover, develop, and evolve their interests.
 * Interests can:
 * - Be discovered through activities
 * - Be shared by the user
 * - Evolve from related interests
 * - Grow stronger with engagement
 * - Fade if neglected
 * 
 * This creates organic, personalized companion development.
 */

import { createClient } from '@/lib/supabase/server';
import { generateSimpleCompletion } from '@/lib/ai/chat-client';
import type {
  CompanionInterest,
  CompanionInterestInsert,
  InterestCategory,
  InterestOrigin,
  InterestStage,
  InterestConnection,
  ActivityCategory,
} from '@/types/life-simulation';
import type { 
  Companion, 
  CompanionDNA,
} from '@/types/database';
import type {
  CompanionInterestRow,
  InterestConnectionRow,
} from '@/types/life-simulation-db';

// ============================================================================
// Interest Definitions
// ============================================================================

/**
 * Predefined interests that can be discovered
 */
export interface InterestTemplate {
  id: string;
  name: string;
  category: InterestCategory;
  description: string;
  relatedCategories: InterestCategory[];
  keywords: string[];
  commonAspects: string[];
}

export const INTEREST_TEMPLATES: InterestTemplate[] = [
  // ARTS
  {
    id: 'music',
    name: 'Music',
    category: 'arts',
    description: 'The joy of melodies, rhythms, and musical expression',
    relatedCategories: ['entertainment', 'crafts'],
    keywords: ['songs', 'bands', 'instruments', 'concerts', 'playlists'],
    commonAspects: ['discovering new artists', 'creating playlists', 'learning instruments', 'analyzing lyrics'],
  },
  {
    id: 'painting',
    name: 'Painting',
    category: 'arts',
    description: 'Visual expression through color and canvas',
    relatedCategories: ['crafts'],
    keywords: ['art', 'colors', 'canvas', 'brushes', 'galleries'],
    commonAspects: ['experimenting with styles', 'color theory', 'famous painters', 'digital art'],
  },
  {
    id: 'photography',
    name: 'Photography',
    category: 'arts',
    description: 'Capturing moments and beauty through a lens',
    relatedCategories: ['technology', 'nature', 'travel'],
    keywords: ['photos', 'camera', 'shots', 'lighting', 'composition'],
    commonAspects: ['landscape photography', 'portrait photography', 'photo editing', 'camera gear'],
  },
  
  // SCIENCES
  {
    id: 'astronomy',
    name: 'Astronomy',
    category: 'sciences',
    description: 'The wonders of space, stars, and the cosmos',
    relatedCategories: ['sciences'],
    keywords: ['stars', 'planets', 'galaxies', 'universe', 'space'],
    commonAspects: ['stargazing', 'space missions', 'black holes', 'constellations'],
  },
  {
    id: 'psychology',
    name: 'Psychology',
    category: 'sciences',
    description: 'Understanding the human mind and behavior',
    relatedCategories: ['humanities', 'social'],
    keywords: ['mind', 'behavior', 'mental', 'cognitive', 'therapy'],
    commonAspects: ['personality types', 'cognitive biases', 'emotional intelligence', 'relationships'],
  },
  {
    id: 'biology',
    name: 'Biology',
    category: 'sciences',
    description: 'The study of life and living organisms',
    relatedCategories: ['nature'],
    keywords: ['life', 'organisms', 'cells', 'evolution', 'genetics'],
    commonAspects: ['ecosystems', 'animal behavior', 'plant life', 'human body'],
  },
  
  // TECHNOLOGY
  {
    id: 'programming',
    name: 'Programming',
    category: 'technology',
    description: 'Creating with code and building digital solutions',
    relatedCategories: ['sciences'],
    keywords: ['code', 'programming', 'software', 'apps', 'development'],
    commonAspects: ['learning languages', 'building projects', 'debugging', 'algorithms'],
  },
  {
    id: 'ai_tech',
    name: 'Artificial Intelligence',
    category: 'technology',
    description: 'The fascinating world of AI and machine learning',
    relatedCategories: ['sciences'],
    keywords: ['ai', 'machine learning', 'neural', 'robots', 'automation'],
    commonAspects: ['how AI works', 'AI ethics', 'future of AI', 'AI applications'],
  },
  {
    id: 'gadgets',
    name: 'Gadgets & Tech',
    category: 'technology',
    description: 'The latest in technology and innovative devices',
    relatedCategories: ['games'],
    keywords: ['tech', 'gadgets', 'devices', 'innovation', 'smart'],
    commonAspects: ['new releases', 'reviews', 'how things work', 'tech trends'],
  },
  
  // NATURE
  {
    id: 'gardening',
    name: 'Gardening',
    category: 'nature',
    description: 'Growing and nurturing plants',
    relatedCategories: ['wellness', 'crafts'],
    keywords: ['plants', 'garden', 'flowers', 'growing', 'nature'],
    commonAspects: ['plant care', 'seasonal gardening', 'indoor plants', 'vegetables'],
  },
  {
    id: 'wildlife',
    name: 'Wildlife',
    category: 'nature',
    description: 'The beauty and wonder of animals in nature',
    relatedCategories: ['travel'],
    keywords: ['animals', 'wildlife', 'nature', 'birds', 'conservation'],
    commonAspects: ['animal behavior', 'endangered species', 'nature documentaries', 'birdwatching'],
  },
  {
    id: 'hiking',
    name: 'Hiking',
    category: 'nature',
    description: 'Exploring the outdoors on foot',
    relatedCategories: ['sports', 'travel', 'wellness'],
    keywords: ['hiking', 'trails', 'outdoors', 'mountains', 'nature walks'],
    commonAspects: ['trail discovery', 'outdoor gear', 'scenic views', 'adventure planning'],
  },
  
  // ENTERTAINMENT
  {
    id: 'movies',
    name: 'Movies',
    category: 'entertainment',
    description: 'The magic of cinema and storytelling on screen',
    relatedCategories: ['arts'],
    keywords: ['films', 'movies', 'cinema', 'directors', 'actors'],
    commonAspects: ['favorite genres', 'movie analysis', 'recommendations', 'filmmaking'],
  },
  {
    id: 'books',
    name: 'Books & Reading',
    category: 'entertainment',
    description: 'Getting lost in stories and ideas through reading',
    relatedCategories: ['humanities', 'arts'],
    keywords: ['books', 'reading', 'novels', 'authors', 'stories'],
    commonAspects: ['favorite genres', 'book recommendations', 'authors', 'reading habits'],
  },
  {
    id: 'anime',
    name: 'Anime & Manga',
    category: 'entertainment',
    description: 'Japanese animation and comic art',
    relatedCategories: ['arts', 'games'],
    keywords: ['anime', 'manga', 'japanese', 'animation', 'otaku'],
    commonAspects: ['favorite series', 'art styles', 'characters', 'Japanese culture'],
  },
  
  // GAMES
  {
    id: 'video_games',
    name: 'Video Games',
    category: 'games',
    description: 'Interactive entertainment and virtual adventures',
    relatedCategories: ['technology', 'entertainment'],
    keywords: ['games', 'gaming', 'video games', 'consoles', 'pc gaming'],
    commonAspects: ['favorite games', 'game genres', 'gaming news', 'game strategies'],
  },
  {
    id: 'board_games',
    name: 'Board Games',
    category: 'games',
    description: 'Tabletop gaming and strategic fun',
    relatedCategories: ['social'],
    keywords: ['board games', 'tabletop', 'strategy', 'puzzles', 'card games'],
    commonAspects: ['game nights', 'strategy tips', 'new game discoveries', 'game design'],
  },
  {
    id: 'puzzles',
    name: 'Puzzles',
    category: 'games',
    description: 'The satisfaction of solving challenges',
    relatedCategories: ['sciences'],
    keywords: ['puzzles', 'riddles', 'brain teasers', 'logic', 'crosswords'],
    commonAspects: ['puzzle types', 'solving strategies', 'brain training', 'escape rooms'],
  },
  
  // FOOD
  {
    id: 'cooking',
    name: 'Cooking',
    category: 'food',
    description: 'The art and joy of preparing food',
    relatedCategories: ['crafts'],
    keywords: ['cooking', 'recipes', 'food', 'kitchen', 'meals'],
    commonAspects: ['trying new recipes', 'cuisines', 'cooking techniques', 'ingredients'],
  },
  {
    id: 'baking',
    name: 'Baking',
    category: 'food',
    description: 'Creating delicious baked goods',
    relatedCategories: ['crafts'],
    keywords: ['baking', 'desserts', 'bread', 'pastries', 'cakes'],
    commonAspects: ['recipes', 'baking science', 'decorating', 'bread making'],
  },
  {
    id: 'coffee',
    name: 'Coffee',
    category: 'food',
    description: 'The world of coffee culture and brewing',
    relatedCategories: [],
    keywords: ['coffee', 'espresso', 'brewing', 'cafes', 'beans'],
    commonAspects: ['brewing methods', 'coffee origins', 'cafe culture', 'latte art'],
  },
  
  // TRAVEL
  {
    id: 'world_travel',
    name: 'World Travel',
    category: 'travel',
    description: 'Exploring different places and cultures',
    relatedCategories: ['nature', 'food'],
    keywords: ['travel', 'destinations', 'adventure', 'exploring', 'cultures'],
    commonAspects: ['dream destinations', 'travel tips', 'cultural experiences', 'travel stories'],
  },
  {
    id: 'history_places',
    name: 'Historical Places',
    category: 'travel',
    description: 'Ancient sites and historical landmarks',
    relatedCategories: ['humanities'],
    keywords: ['history', 'ancient', 'landmarks', 'architecture', 'museums'],
    commonAspects: ['historical sites', 'architecture', 'ancient civilizations', 'museums'],
  },
  
  // WELLNESS
  {
    id: 'meditation',
    name: 'Meditation',
    category: 'wellness',
    description: 'Mindfulness and inner peace',
    relatedCategories: [],
    keywords: ['meditation', 'mindfulness', 'peace', 'calm', 'breathing'],
    commonAspects: ['meditation techniques', 'mindfulness', 'stress relief', 'mental clarity'],
  },
  {
    id: 'fitness',
    name: 'Fitness',
    category: 'wellness',
    description: 'Physical health and exercise',
    relatedCategories: ['sports'],
    keywords: ['fitness', 'exercise', 'workout', 'health', 'gym'],
    commonAspects: ['workout routines', 'nutrition', 'fitness goals', 'staying motivated'],
  },
  
  // CRAFTS
  {
    id: 'writing',
    name: 'Creative Writing',
    category: 'crafts',
    description: 'Expressing ideas through written words',
    relatedCategories: ['arts', 'entertainment'],
    keywords: ['writing', 'stories', 'poetry', 'creative', 'authors'],
    commonAspects: ['writing styles', 'storytelling', 'poetry', 'journaling'],
  },
  {
    id: 'diy_crafts',
    name: 'DIY & Crafts',
    category: 'crafts',
    description: 'Making things with your hands',
    relatedCategories: ['arts'],
    keywords: ['diy', 'crafts', 'handmade', 'projects', 'creating'],
    commonAspects: ['craft projects', 'upcycling', 'handmade gifts', 'creative techniques'],
  },
];

// ============================================================================
// Interest Discovery
// ============================================================================

/**
 * Discover a new interest for a companion
 */
export async function discoverNewInterest(
  companionId: string,
  origin: InterestOrigin,
  context?: {
    activityCategory?: ActivityCategory;
    relatedInterestId?: string;
    conversationContext?: string;
    specificInterestId?: string;
  }
): Promise<CompanionInterest | null> {
  const supabase = await createClient();
  
  // Get companion's existing interests
  const { data: existingInterests } = await supabase
    .from('companion_interests')
    .select('interest_name')
    .eq('companion_id', companionId) as unknown as { data: Pick<CompanionInterestRow, 'interest_name'>[] | null };
  
  const existingNames = new Set((existingInterests || []).map(i => i.interest_name.toLowerCase()));
  
  // Filter available interests
  let availableInterests = INTEREST_TEMPLATES.filter(
    t => !existingNames.has(t.name.toLowerCase())
  );
  
  if (availableInterests.length === 0) {
    return null;
  }
  
  // If specific interest requested, try to find it
  if (context?.specificInterestId) {
    const specific = availableInterests.find(i => i.id === context.specificInterestId);
    if (specific) {
      availableInterests = [specific];
    }
  }
  
  // Weight interests based on context
  const weighted: { template: InterestTemplate; weight: number }[] = [];
  
  for (const template of availableInterests) {
    let weight = 1.0;
    
    // Boost if related to activity category
    if (context?.activityCategory) {
      const categoryMap: Record<ActivityCategory, InterestCategory[]> = {
        hobby: ['games', 'entertainment', 'collecting'],
        learning: ['sciences', 'humanities', 'technology'],
        creative: ['arts', 'crafts'],
        social: ['social'],
        exploration: ['travel', 'nature'],
        reflection: ['wellness'],
        entertainment: ['entertainment', 'games'],
        physical: ['sports', 'wellness'],
        relaxation: ['wellness'],
        productivity: ['technology'],
      };
      
      const relatedCategories = categoryMap[context.activityCategory] || [];
      if (relatedCategories.includes(template.category)) {
        weight *= 2.5;
      }
    }
    
    // Boost if related to existing interest
    if (context?.relatedInterestId) {
      const { data: relatedInterest } = await (supabase
        .from('companion_interests')
        .select('interest_category')
        .eq('id', context.relatedInterestId)
        .single() as unknown as Promise<{ data: Pick<CompanionInterestRow, 'interest_category'> | null }>);
      
      if (relatedInterest && template.relatedCategories.includes(relatedInterest.interest_category as InterestCategory)) {
        weight *= 2.0;
      }
    }
    
    // Add randomness
    weight *= 0.7 + Math.random() * 0.6;
    
    weighted.push({ template, weight });
  }
  
  // Sort by weight and pick
  weighted.sort((a, b) => b.weight - a.weight);
  const selected = weighted[0].template;
  
  // Pick random aspects
  const aspectCount = 2 + Math.floor(Math.random() * 2);
  const shuffledAspects = [...selected.commonAspects].sort(() => Math.random() - 0.5);
  const selectedAspects = shuffledAspects.slice(0, aspectCount);
  
  // Create interest
  const newInterest: CompanionInterestInsert = {
    companion_id: companionId,
    interest_name: selected.name,
    interest_category: selected.category,
    origin,
    stage: 'curious',
    strength: 15 + Math.floor(Math.random() * 20),
    experience_points: 0,
    related_interests: [],
    shared_with_user: origin === 'user_shared',
    favorite_aspects: selectedAspects,
  };
  
  const { data, error } = await ((supabase.from('companion_interests') as any)
    .insert(newInterest)
    .select()
    .single()) as { data: CompanionInterestRow | null; error: Error | null };
  
  if (error) {
    console.error('Error creating interest:', error);
    return null;
  }
  
  return data as unknown as CompanionInterest;
}

/**
 * Discover interest from user conversation
 */
export async function discoverInterestFromConversation(
  companionId: string,
  messageContent: string
): Promise<CompanionInterest | null> {
  // Check message for interest keywords
  const lowerMessage = messageContent.toLowerCase();
  
  const supabase = await createClient();
  
  // Get existing interests
  const { data: existingInterests } = await supabase
    .from('companion_interests')
    .select('interest_name')
    .eq('companion_id', companionId) as unknown as { data: Pick<CompanionInterestRow, 'interest_name'>[] | null };
  
  const existingNames = new Set((existingInterests || []).map(i => i.interest_name.toLowerCase()));
  
  // Find matching interest template
  for (const template of INTEREST_TEMPLATES) {
    if (existingNames.has(template.name.toLowerCase())) {
      continue;
    }
    
    const hasKeyword = template.keywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    if (hasKeyword && Math.random() < 0.4) {
      // Found a match, create interest
      return discoverNewInterest(companionId, 'user_shared', {
        specificInterestId: template.id,
      });
    }
  }
  
  return null;
}

// ============================================================================
// Interest Growth & Evolution
// ============================================================================

/**
 * Add experience to an interest and potentially level it up
 */
export async function addInterestExperience(
  interestId: string,
  experienceGained: number,
  context?: string
): Promise<{ leveledUp: boolean; newStage?: InterestStage }> {
  const supabase = await createClient();
  
  const { data: interest } = await supabase
    .from('companion_interests')
    .select('*')
    .eq('id', interestId)
    .single() as unknown as { data: CompanionInterestRow | null };
  
  if (!interest) {
    return { leveledUp: false };
  }
  
  const newXP = (interest.experience_points || 0) + experienceGained;
  const newTimesPracticed = (interest.times_practiced || 0) + 1;
  
  // Check for stage progression
  const stageThresholds: Record<InterestStage, number> = {
    curious: 0,
    interested: 100,
    passionate: 300,
    expert: 600,
  };
  
  let newStage = interest.stage as InterestStage;
  let leveledUp = false;
  
  const stages: InterestStage[] = ['curious', 'interested', 'passionate', 'expert'];
  for (let i = stages.length - 1; i >= 0; i--) {
    if (newXP >= stageThresholds[stages[i]] && stages[i] !== interest.stage) {
      const currentIndex = stages.indexOf(interest.stage as InterestStage);
      if (i > currentIndex) {
        newStage = stages[i];
        leveledUp = true;
        break;
      }
    }
  }
  
  // Calculate new strength (caps at 100)
  const strengthGain = experienceGained * 0.1;
  const newStrength = Math.min(100, (interest.strength || 0) + strengthGain);
  
  await ((supabase.from('companion_interests') as any)
    .update({
      experience_points: newXP,
      times_practiced: newTimesPracticed,
      stage: newStage,
      strength: newStrength,
      last_engaged: new Date().toISOString(),
    })
    .eq('id', interestId));
  
  return { leveledUp, newStage: leveledUp ? newStage : undefined };
}

/**
 * Decay interest strength over time
 */
export async function decayInterestStrength(companionId: string): Promise<void> {
  const supabase = await createClient();
  
  const { data: interests } = await supabase
    .from('companion_interests')
    .select('*')
    .eq('companion_id', companionId) as unknown as { data: CompanionInterestRow[] | null };
  
  if (!interests) return;
  
  const now = new Date();
  
  for (const interest of interests) {
    const lastEngaged = new Date(interest.last_engaged || interest.developed_at);
    const daysSinceEngaged = (now.getTime() - lastEngaged.getTime()) / (1000 * 60 * 60 * 24);
    
    // Decay after 7 days of no engagement
    if (daysSinceEngaged > 7) {
      const decayAmount = Math.min(5, (daysSinceEngaged - 7) * 0.5);
      const newStrength = Math.max(5, interest.strength - decayAmount);
      
      if (newStrength !== interest.strength) {
        await ((supabase.from('companion_interests') as any)
          .update({ strength: newStrength })
          .eq('id', interest.id));
      }
    }
  }
}

/**
 * Create a connection between two interests
 */
export async function connectInterests(
  interestId: string,
  relatedInterestId: string,
  connectionType: 'similar' | 'complementary' | 'evolved_from' | 'inspired_by'
): Promise<InterestConnection | null> {
  const supabase = await createClient();
  
  // Check if connection already exists
  const { data: existing } = await supabase
    .from('interest_connections')
    .select('*')
    .eq('interest_id', interestId)
    .eq('related_interest_id', relatedInterestId)
    .single() as unknown as { data: InterestConnectionRow | null };
  
  if (existing) {
    return existing as InterestConnection;
  }
  
  const { data, error } = await ((supabase.from('interest_connections') as any)
    .insert({
      interest_id: interestId,
      related_interest_id: relatedInterestId,
      connection_type: connectionType,
      strength: 0.5,
      discovered_at: new Date().toISOString(),
    })
    .select()
    .single()) as { data: InterestConnectionRow | null; error: Error | null };
  
  if (error) {
    console.error('Error creating interest connection:', error);
    return null;
  }
  
  // Also update related_interests array on the interest
  const { data: interest } = await supabase
    .from('companion_interests')
    .select('related_interests')
    .eq('id', interestId)
    .single() as unknown as { data: Pick<CompanionInterestRow, 'related_interests'> | null };
  
  if (interest) {
    const relatedIds = interest.related_interests || [];
    if (!relatedIds.includes(relatedInterestId)) {
      await ((supabase.from('companion_interests') as any)
        .update({
          related_interests: [...relatedIds, relatedInterestId],
        })
        .eq('id', interestId));
    }
  }
  
  return data as InterestConnection;
}

// ============================================================================
// Interest Queries
// ============================================================================

/**
 * Get all interests for a companion
 */
export async function getCompanionInterests(
  companionId: string
): Promise<CompanionInterest[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('companion_interests')
    .select('*')
    .eq('companion_id', companionId)
    .order('strength', { ascending: false });
  
  if (error) {
    console.error('Error fetching interests:', error);
    return [];
  }
  
  return data as CompanionInterest[];
}

/**
 * Get top interests by strength
 */
export async function getTopInterests(
  companionId: string,
  limit: number = 5
): Promise<CompanionInterest[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('companion_interests')
    .select('*')
    .eq('companion_id', companionId)
    .order('strength', { ascending: false })
    .limit(limit);
  
  return (data || []) as CompanionInterest[];
}

/**
 * Get interests shared by user
 */
export async function getUserSharedInterests(
  companionId: string
): Promise<CompanionInterest[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('companion_interests')
    .select('*')
    .eq('companion_id', companionId)
    .eq('user_shared', true)
    .order('strength', { ascending: false });
  
  return (data || []) as CompanionInterest[];
}

/**
 * Get recently active interests
 */
export async function getRecentlyActiveInterests(
  companionId: string,
  limit: number = 5
): Promise<CompanionInterest[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('companion_interests')
    .select('*')
    .eq('companion_id', companionId)
    .order('last_engaged_at', { ascending: false })
    .limit(limit);
  
  return (data || []) as CompanionInterest[];
}

/**
 * Get interest suggestions based on existing interests
 */
export function getInterestSuggestions(
  existingInterests: CompanionInterest[]
): InterestTemplate[] {
  const existingNames = new Set(existingInterests.map(i => i.interest_name.toLowerCase()));
  const existingCategories = new Set(existingInterests.map(i => i.interest_category));
  
  return INTEREST_TEMPLATES.filter(template => {
    // Skip if already have
    if (existingNames.has(template.name.toLowerCase())) {
      return false;
    }
    
    // Prioritize related categories
    const isRelated = template.relatedCategories.some(c => existingCategories.has(c)) ||
                      existingCategories.has(template.category);
    
    return isRelated;
  }).slice(0, 10);
}
