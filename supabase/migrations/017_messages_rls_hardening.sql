-- ============================================================================
-- MIGRATION 017: MESSAGES RLS HARDENING
--
-- The existing "Users can create messages" policy on messages checks only
-- auth.uid() = user_id. It does not verify that the submitted
-- conversation_id belongs to the authenticated user. A compromised or
-- regressed application layer could therefore write messages into
-- conversations the caller does not own (though RLS on SELECT would still
-- hide the result from the victim's UI).
--
-- This migration replaces that policy with one that also requires the
-- conversation_id to resolve to a conversation owned by auth.uid(). The
-- app-layer check added in B.1 remains the first line of defense; this is
-- belt-and-braces at the database layer.
-- ============================================================================

DROP POLICY IF EXISTS "Users can create messages" ON messages;

CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );
