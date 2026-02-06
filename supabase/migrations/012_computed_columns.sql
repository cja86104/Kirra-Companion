-- =============================================================================
-- Migration: 012_computed_columns.sql  
-- Description: Add computed/generated columns that the first migration missed
-- =============================================================================

-- Add importance column to memories (computed from importance_score)
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS importance INTEGER 
GENERATED ALWAYS AS (
    CASE 
        WHEN importance_score >= 0.8 THEN 5
        WHEN importance_score >= 0.6 THEN 4
        WHEN importance_score >= 0.4 THEN 3
        WHEN importance_score >= 0.2 THEN 2
        ELSE 1
    END
) STORED;

-- Add proficiency_level column to companion_skills (computed from proficiency enum)
ALTER TABLE companion_skills 
ADD COLUMN IF NOT EXISTS proficiency_level INTEGER
GENERATED ALWAYS AS (
    CASE proficiency
        WHEN 'novice' THEN 1
        WHEN 'familiar' THEN 2
        WHEN 'competent' THEN 3
        WHEN 'proficient' THEN 4
        WHEN 'expert' THEN 5
        ELSE 1
    END
) STORED;

-- =============================================================================
-- CREATE DAILY_ROUTINES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default',
    is_default BOOLEAN NOT NULL DEFAULT true,
    slots JSONB NOT NULL DEFAULT '[]',
    wake_time TEXT NOT NULL DEFAULT '07:00',
    sleep_time TEXT NOT NULL DEFAULT '23:00',
    energy_pattern TEXT NOT NULL DEFAULT 'balanced' CHECK (energy_pattern IN ('morning_person', 'night_owl', 'balanced')),
    social_windows JSONB NOT NULL DEFAULT '["morning", "evening"]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_routines_companion_id ON daily_routines(companion_id);

ALTER TABLE daily_routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their companions routines" ON daily_routines;
CREATE POLICY "Users can view their companions routines"
    ON daily_routines FOR SELECT
    USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their companions routines" ON daily_routines;
CREATE POLICY "Users can manage their companions routines"
    ON daily_routines FOR ALL
    USING (companion_id IN (SELECT id FROM companions WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON daily_routines TO authenticated;

-- Add is_active to memories if missing
ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add emotional_weight to memories if missing  
ALTER TABLE memories ADD COLUMN IF NOT EXISTS emotional_weight DECIMAL(3,2) DEFAULT 0.5;

-- Add tags to memories if missing
ALTER TABLE memories ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
