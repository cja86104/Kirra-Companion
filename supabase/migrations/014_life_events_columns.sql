-- Migration 014: Add missing columns to life_events
ALTER TABLE life_events ADD COLUMN IF NOT EXISTS related_activity_id UUID REFERENCES companion_activities(id) ON DELETE SET NULL;
ALTER TABLE life_events ADD COLUMN IF NOT EXISTS related_interest_id UUID REFERENCES companion_interests(id) ON DELETE SET NULL;
ALTER TABLE life_events ADD COLUMN IF NOT EXISTS user_context TEXT;

CREATE INDEX IF NOT EXISTS idx_life_events_related_activity ON life_events(related_activity_id);
CREATE INDEX IF NOT EXISTS idx_life_events_related_interest ON life_events(related_interest_id);
