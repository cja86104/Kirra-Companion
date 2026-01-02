import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database, Profile, Companion, CompanionDNA, Message, Memory, MemoryCategoryRow, LifeEvent } from '@/types/database';
import type { CookieOptions } from '@supabase/ssr';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Create a Supabase client for use in Server Components
 * This reads cookies from the request headers
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Get current user from server
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get current session from server
 */
export async function getCurrentSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }
  
  return session;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return profile as Profile | null;
}

/**
 * Check if user is authenticated (for middleware/guards)
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Get user's companions
 */
export async function getUserCompanions(): Promise<Companion[]> {
  const user = await getCurrentUser();
  
  if (!user) {
    return [];
  }
  
  const supabase = await createClient();
  const { data: companions, error } = await supabase
    .from('companions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('last_interaction', { ascending: false });
  
  if (error) {
    console.error('Error fetching companions:', error);
    return [];
  }
  
  return (companions as Companion[]) || [];
}

/**
 * Companion with DNA joined type
 */
export interface CompanionWithDNA extends Companion {
  companion_dna: CompanionDNA[] | null;
}

/**
 * Get a specific companion
 */
export async function getCompanion(companionId: string): Promise<CompanionWithDNA | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const supabase = await createClient();
  const { data: companion, error } = await supabase
    .from('companions')
    .select(`
      *,
      companion_dna (*)
    `)
    .eq('id', companionId)
    .eq('user_id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching companion:', error);
    return null;
  }
  
  return companion as CompanionWithDNA | null;
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit = 50
): Promise<Message[]> {
  const supabase = await createClient();
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  
  return (messages as Message[]) || [];
}

/**
 * Memory with category joined type
 */
export interface MemoryWithCategory extends Memory {
  memory_categories: Pick<MemoryCategoryRow, 'name' | 'icon' | 'color'> | null;
}

/**
 * Get memories for a companion
 */
export async function getCompanionMemories(
  companionId: string,
  limit = 50
): Promise<MemoryWithCategory[]> {
  const supabase = await createClient();
  const { data: memories, error } = await supabase
    .from('memories')
    .select(`
      *,
      memory_categories (
        name,
        icon,
        color
      )
    `)
    .eq('companion_id', companionId)
    .order('importance_score', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
  
  return (memories as MemoryWithCategory[]) || [];
}

/**
 * Get life events for a companion
 */
export async function getCompanionLifeEvents(
  companionId: string,
  limit = 20
): Promise<LifeEvent[]> {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from('life_events')
    .select('*')
    .eq('companion_id', companionId)
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching life events:', error);
    return [];
  }
  
  return (events as LifeEvent[]) || [];
}

/**
 * Subscription status response type
 */
export interface SubscriptionStatusResponse {
  tier: Profile['subscription_tier'];
  status: Profile['subscription_status'];
  periodEnd?: string | null;
  canSendMessage: boolean;
}

/**
 * Check subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const profile = await getUserProfile();
  
  if (!profile) {
    return {
      tier: 'free',
      status: 'active',
      canSendMessage: false,
    };
  }
  
  return {
    tier: profile.subscription_tier,
    status: profile.subscription_status,
    periodEnd: profile.subscription_period_end,
    canSendMessage: profile.subscription_status === 'active',
  };
}
