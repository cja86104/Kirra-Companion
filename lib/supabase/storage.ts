/**
 * Supabase Storage Helper
 * 
 * Handles file uploads for chat attachments.
 * 
 * SETUP: Create bucket in Supabase Dashboard:
 * 1. Go to Storage in Supabase Dashboard
 * 2. Create bucket named "chat-attachments" 
 * 3. Set to private (we use signed URLs)
 * 4. Add RLS policy: authenticated users can upload to their own folder
 */

import { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'chat-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadChatAttachment(
  supabase: SupabaseClient,
  userId: string,
  companionId: string,
  file: File
): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File size exceeds 10MB limit' };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${companionId}/${timestamp}-${sanitizedName}`;

  try {
    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[Storage] Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL (or signed URL for private buckets)
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleAttachments(
  supabase: SupabaseClient,
  userId: string,
  companionId: string,
  files: File[]
): Promise<{ uploaded: UploadResult[]; failed: string[] }> {
  const results: UploadResult[] = [];
  const failed: string[] = [];

  for (const file of files) {
    const result = await uploadChatAttachment(supabase, userId, companionId, file);
    if (result.success) {
      results.push(result);
    } else {
      failed.push(`${file.name}: ${result.error}`);
    }
  }

  return { uploaded: results, failed };
}

/**
 * Delete a file from storage
 */
export async function deleteAttachment(
  supabase: SupabaseClient,
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('[Storage] Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    return false;
  }
}

/**
 * Get file type category
 */
export function getFileType(filename: string): 'image' | 'document' | 'other' {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'ppt', 'pptx'];
  
  if (imageExts.includes(ext)) return 'image';
  if (docExts.includes(ext)) return 'document';
  return 'other';
}
