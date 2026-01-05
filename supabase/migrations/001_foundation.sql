-- ============================================================================
-- MIGRATION 1: FOUNDATION
-- Extensions, enum types, and utility functions
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'ultimate');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
CREATE TYPE age_tier AS ENUM ('blocked', 'minor', 'adult');
CREATE TYPE relationship_type AS ENUM ('friend', 'mentor', 'romantic', 'family', 'custom');
CREATE TYPE message_role AS ENUM ('user', 'companion', 'system');
CREATE TYPE content_type AS ENUM ('text', 'image', 'audio', 'file');
CREATE TYPE crisis_type AS ENUM ('self_harm', 'harm_to_others', 'abuse', 'none');
CREATE TYPE crisis_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE event_significance AS ENUM ('trivial', 'minor', 'moderate', 'major', 'milestone');
CREATE TYPE achievement_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE memory_access_type AS ENUM ('retrieval', 'update', 'reinforcement');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_age(dob DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN DATE_PART('year', AGE(CURRENT_DATE, dob));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_age_tier(dob DATE)
RETURNS age_tier AS $$
DECLARE
  user_age INTEGER;
BEGIN
  user_age := calculate_age(dob);
  IF user_age < 13 THEN
    RETURN 'blocked';
  ELSIF user_age < 18 THEN
    RETURN 'minor';
  ELSE
    RETURN 'adult';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
