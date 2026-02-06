-- =============================================================================
-- Migration: 011_missing_schema.sql
-- Description: Add missing tables and columns identified during TypeScript audit
-- Created: 2026-02-06
-- NOTE: Run in Supabase SQL Editor. Safe to run multiple times.
-- =============================================================================

-- =============================================================================
-- 1. CREATE COMPANION_ACTIVITIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS companion_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    activity_category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    narrative TEXT NOT NULL DEFAULT '',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    outcome TEXT CHECK (outcome IN ('great', 'good', 'neutral', 'challenging', 'frustrating')),
    mood_effects_applied JSONB,
    related_interest_id UUID REFERENCES companion_interests(id) ON DELETE SET NULL,
    thinking_of_user BOOLEAN NOT NULL DEFAULT false,
    user_mention_context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_activities_companion_id 
    ON companion_activities(companion_id);
CREATE INDEX IF NOT EXISTS idx_companion_activities_started_at 
    ON companion_activities(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_companion_activities_category 
    ON companion_activities(activity_category);

ALTER TABLE companion_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their companions activities" ON companion_activities;
CREATE POLICY "Users can view their companions activities"
    ON companion_activities FOR SELECT
    USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert activities for their companions" ON companion_activities;
CREATE POLICY "Users can insert activities for their companions"
    ON companion_activities FOR INSERT
    WITH CHECK (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their companions activities" ON companion_activities;
CREATE POLICY "Users can update their companions activities"
    ON companion_activities FOR UPDATE
    USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their companions activities" ON companion_activities;
CREATE POLICY "Users can delete their companions activities"
    ON companion_activities FOR DELETE
    USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- =============================================================================
-- 2. CREATE INTEREST_CONNECTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS interest_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interest_id UUID NOT NULL REFERENCES companion_interests(id) ON DELETE CASCADE,
    related_interest_id UUID NOT NULL REFERENCES companion_interests(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('similar', 'complementary', 'evolved_from', 'inspired_by')),
    strength DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(interest_id, related_interest_id)
);

CREATE INDEX IF NOT EXISTS idx_interest_connections_interest_id 
    ON interest_connections(interest_id);
CREATE INDEX IF NOT EXISTS idx_interest_connections_related_id 
    ON interest_connections(related_interest_id);

ALTER TABLE interest_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their interest connections" ON interest_connections;
CREATE POLICY "Users can view their interest connections"
    ON interest_connections FOR SELECT
    USING (interest_id IN (
        SELECT ci.id FROM companion_interests ci
        JOIN companions c ON ci.companion_id = c.id
        WHERE c.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can manage their interest connections" ON interest_connections;
CREATE POLICY "Users can manage their interest connections"
    ON interest_connections FOR ALL
    USING (interest_id IN (
        SELECT ci.id FROM companion_interests ci
        JOIN companions c ON ci.companion_id = c.id
        WHERE c.user_id = auth.uid()
    ));

-- =============================================================================
-- 3. CREATE COMPANION_JOURNAL_ENTRIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS companion_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN (
        'daily_reflection', 'activity_note', 'thought', 'dream', 
        'gratitude', 'goal', 'memory', 'user_appreciation', 
        'creative_writing', 'observation'
    )),
    title TEXT,
    content TEXT NOT NULL,
    mood_at_time JSONB NOT NULL,
    related_event_id UUID REFERENCES life_events(id) ON DELETE SET NULL,
    related_interest_id UUID REFERENCES companion_interests(id) ON DELETE SET NULL,
    mentions_user BOOLEAN NOT NULL DEFAULT false,
    is_private BOOLEAN NOT NULL DEFAULT true,
    written_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_journal_companion_id 
    ON companion_journal_entries(companion_id);
CREATE INDEX IF NOT EXISTS idx_companion_journal_written_at 
    ON companion_journal_entries(written_at DESC);

ALTER TABLE companion_journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their companions journal entries" ON companion_journal_entries;
CREATE POLICY "Users can view their companions journal entries"
    ON companion_journal_entries FOR SELECT
    USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their companions journal entries" ON companion_journal_entries;
CREATE POLICY "Users can manage their companions journal entries"
    ON companion_journal_entries FOR ALL
    USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

-- =============================================================================
-- 4. ADD MISSING COLUMNS TO MEMORIES TABLE
-- Run these one at a time if you get errors - skip any that already exist
-- =============================================================================

ALTER TABLE memories ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'general';

-- =============================================================================
-- 5. ADD MISSING COLUMNS TO COMPANION_SKILLS TABLE
-- =============================================================================

ALTER TABLE companion_skills ADD COLUMN IF NOT EXISTS learned_from TEXT;
ALTER TABLE companion_skills ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE companion_skills ADD COLUMN IF NOT EXISTS last_used TIMESTAMPTZ;

-- Sync last_used with existing last_used_at values
UPDATE companion_skills SET last_used = last_used_at WHERE last_used IS NULL AND last_used_at IS NOT NULL;

-- =============================================================================
-- 6. CREATE COMPANION_MEMORIES VIEW
-- =============================================================================

DROP VIEW IF EXISTS companion_memories;
CREATE VIEW companion_memories AS
SELECT 
    m.*,
    c.name as companion_name,
    c.user_id
FROM memories m
JOIN companions c ON m.companion_id = c.id;

-- =============================================================================
-- 7. GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON companion_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON interest_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON companion_journal_entries TO authenticated;
GRANT SELECT ON companion_memories TO authenticated;
