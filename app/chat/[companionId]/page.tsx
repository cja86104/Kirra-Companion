import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, getCompanion, getConversationMessages, createClient } from '@/lib/supabase/server';
import { ChatWindow } from '@/components/chat/ChatWindow';

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
  
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('companion_id', companionId)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        companion_id: companionId,
        user_id: user.id,
        title: `Chat with ${companion.name}`,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create conversation:', error);
      throw new Error('Failed to create conversation');
    }

    conversation = newConversation;
  }

  // Get messages
  const messages = await getConversationMessages(conversation.id, 100);

  return (
    <ChatWindow
      companion={companion}
      conversation={conversation}
      initialMessages={messages}
      userId={user.id}
    />
  );
}
