-- Migration 015: Extend proactive_messages with full feature columns
-- Adds status, priority, content fields, related entity refs, timestamps, and context snapshot.
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING patterns).

ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS generated_content TEXT;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS related_life_event_id UUID REFERENCES life_events(id) ON DELETE SET NULL;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS related_interest_id UUID REFERENCES companion_interests(id) ON DELETE SET NULL;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS related_activity_id UUID REFERENCES companion_activities(id) ON DELETE SET NULL;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS context_snapshot JSONB;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE proactive_messages ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_proactive_messages_status ON proactive_messages(status);
CREATE INDEX IF NOT EXISTS idx_proactive_messages_priority ON proactive_messages(priority);
CREATE INDEX IF NOT EXISTS idx_proactive_messages_sent_at ON proactive_messages(sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proactive_messages_related_life_event ON proactive_messages(related_life_event_id) WHERE related_life_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proactive_messages_related_interest ON proactive_messages(related_interest_id) WHERE related_interest_id IS NOT NULL;
