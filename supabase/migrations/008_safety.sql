-- ============================================================================
-- MIGRATION 8: SAFETY TABLES
-- Crisis logs, behavioral detection, audit logs
-- ============================================================================

-- Helper function for admin check
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  );
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- CRISIS LOGS TABLE
-- ============================================================================

CREATE TABLE crisis_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  companion_id UUID REFERENCES companions(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_excerpt TEXT NOT NULL,
  crisis_type crisis_type NOT NULL,
  severity crisis_severity NOT NULL,
  keywords_matched TEXT[] NOT NULL DEFAULT '{}',
  response_provided TEXT NOT NULL,
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crisis_logs_user_id ON crisis_logs(user_id);
CREATE INDEX idx_crisis_logs_crisis_type ON crisis_logs(crisis_type);
CREATE INDEX idx_crisis_logs_severity ON crisis_logs(severity);
CREATE INDEX idx_crisis_logs_created_at ON crisis_logs(created_at DESC);
CREATE INDEX idx_crisis_logs_unreviewed ON crisis_logs(reviewed) WHERE reviewed = FALSE;

ALTER TABLE crisis_logs ENABLE ROW LEVEL SECURITY;

-- Users CANNOT view their own crisis logs (safety/privacy)
-- Only admins can view
CREATE POLICY "Only admins can view crisis logs"
  ON crisis_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role can insert crisis logs"
  ON crisis_logs FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Only admins can update crisis logs"
  ON crisis_logs FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- BEHAVIORAL DETECTION LOGS TABLE
-- ============================================================================

CREATE TABLE behavioral_detection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_excerpt TEXT NOT NULL,
  triggers TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  detected_age INTEGER,
  resulted_in_flag BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_behavioral_detection_user_id ON behavioral_detection_logs(user_id);
CREATE INDEX idx_behavioral_detection_confidence ON behavioral_detection_logs(confidence DESC);
CREATE INDEX idx_behavioral_detection_resulted_flag ON behavioral_detection_logs(resulted_in_flag) WHERE resulted_in_flag = TRUE;
CREATE INDEX idx_behavioral_detection_created_at ON behavioral_detection_logs(created_at DESC);

ALTER TABLE behavioral_detection_logs ENABLE ROW LEVEL SECURITY;

-- Users CANNOT view their own detection logs
CREATE POLICY "Only admins can view behavioral detection logs"
  ON behavioral_detection_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role can insert behavioral detection logs"
  ON behavioral_detection_logs FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Only admins can update behavioral detection logs"
  ON behavioral_detection_logs FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION flag_user_as_minor(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    is_minor_flagged = TRUE,
    minor_flagged_at = NOW(),
    minor_flag_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION should_treat_as_minor(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_age_tier age_tier;
  user_flagged BOOLEAN;
BEGIN
  SELECT age_tier, is_minor_flagged 
  INTO user_age_tier, user_flagged
  FROM profiles 
  WHERE id = p_user_id;
  
  RETURN user_age_tier IN ('minor', 'blocked') OR user_flagged;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
