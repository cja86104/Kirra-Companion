-- ============================================================================
-- GENERATED SCENES TABLE
-- Stores AI-generated scene images based on conversation context
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.generated_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relations
    companion_id UUID NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Scene Data
    prompt TEXT NOT NULL,                    -- The prompt sent to Fal.ai
    image_url TEXT NOT NULL,                 -- Supabase storage URL
    theme TEXT,                              -- Extracted theme (e.g., "winter cabin")
    entities JSONB DEFAULT '[]'::jsonb,      -- Key entities ["snow", "fireplace", "cocoa"]
    scene_description TEXT,                  -- Full scene description from DeepSeek
    
    -- Audio/Animation
    audio_track TEXT,                        -- Matched audio file name
    animation_type TEXT,                     -- CSS animation type
    
    -- Metadata
    generation_time_ms INTEGER,              -- How long generation took
    model_used TEXT DEFAULT 'fal-ai/flux/dev',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_generated_scenes_companion 
    ON public.generated_scenes(companion_id);
CREATE INDEX IF NOT EXISTS idx_generated_scenes_user 
    ON public.generated_scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_scenes_created 
    ON public.generated_scenes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_scenes_conversation 
    ON public.generated_scenes(conversation_id);

-- RLS Policies
ALTER TABLE public.generated_scenes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own generated scenes
CREATE POLICY "Users can view own scenes"
    ON public.generated_scenes FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own scenes
CREATE POLICY "Users can create own scenes"
    ON public.generated_scenes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scenes
CREATE POLICY "Users can delete own scenes"
    ON public.generated_scenes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- SCENE GENERATION TRACKING
-- Tracks when scenes were last generated per companion to enforce 5-min cooldown
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scene_generation_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    companion_id UUID NOT NULL REFERENCES public.companions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_generation_at TIMESTAMPTZ DEFAULT NOW(),
    last_theme TEXT,
    generation_count INTEGER DEFAULT 1,
    
    UNIQUE(companion_id, user_id)
);

ALTER TABLE public.scene_generation_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tracker"
    ON public.scene_generation_tracker FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET FOR GENERATED SCENES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'generated-scenes',
    'generated-scenes',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload scenes"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'generated-scenes' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Anyone can view scenes"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'generated-scenes');

CREATE POLICY "Users can delete own scenes"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'generated-scenes'
        AND auth.role() = 'authenticated'
    );

-- ============================================================================
-- CLEANUP FUNCTION - Remove expired scenes (run daily via cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_scenes()
RETURNS void AS $$
BEGIN
    DELETE FROM public.generated_scenes
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
