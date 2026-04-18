import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, getCompanion, getConversationMessages, createClient } from '@/lib/supabase/server';
import { ChatWindow } from '@/components/chat/ChatWindow';
import type { Conversation, CompanionWithDNA, ConversationInsert } from '@/types/database';

interface ChatPageProps {
  params: Promise<{ companionId: string }>;
}

export default async function ChatWithCompanionPage({ params }: ChatPageProps) {
  const { companionId } = await params;
  
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const companion = await getCompanion(companionId);
  
  if (!companion) {
    notFound();
  }

  // Get or create conversation
  const supabase = await createClient();
  
  const { data: conversationData } = await supabase
    .from('conversations')
    .select('*')
    .eq('companion_id', companionId)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  let conversation = conversationData as Conversation | null;

  if (!conversation) {
    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        companion_id: companionId,
        user_id: user.id,
        title: `Chat with ${companion.name}`,
      } satisfies ConversationInsert)
      .select()
      .single();

    if (error || !newConversation) {
      console.error('Failed to create conversation:', error);
      throw new Error('Failed to create conversation');
    }

    conversation = newConversation as Conversation;
  }

  // Get messages - conversation is guaranteed to exist at this point
  const messages = await getConversationMessages(conversation.id, 100);

  return (
    <ChatWindow
      companion={companion as CompanionWithDNA}
      conversation={conversation}
      initialMessages={messages}
      userId={user.id}
    />
  );
}
