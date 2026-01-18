-- ============================================================================
-- MIGRATION 10: CHAT ATTACHMENTS STORAGE
-- ============================================================================

-- Create storage bucket for chat attachments
-- Note: This creates the bucket via SQL. If this doesn't work in your Supabase version,
-- create the bucket manually in the Dashboard.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,  -- Public bucket (simpler, uses public URLs)
  10485760,  -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage
-- Users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view files in their folder
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Public can view all files (for sharing in chat)
CREATE POLICY "Public can view chat attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Add attachments column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Index for messages with attachments
CREATE INDEX IF NOT EXISTS idx_messages_with_attachments 
ON messages((attachments IS NOT NULL AND attachments != '[]'::jsonb));

COMMENT ON COLUMN messages.attachments IS 'Array of attachment objects: [{url, filename, type, size}]';
