import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Photo upload will not work.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Storage bucket name for student photos
export const STUDENT_PHOTOS_BUCKET = 'student-photos';

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The bucket name (default: student-photos)
 * @returns The public URL of the uploaded file
 */
export async function uploadToStorage(
  file: File,
  bucket: string = STUDENT_PHOTOS_BUCKET,
  folder: string = 'students'
): Promise<string> {
  // Generate a unique filename with timestamp
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  // Upload the file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param fileUrl - The public URL of the file to delete
 * @param bucket - The bucket name (default: student-photos)
 */
export async function deleteFromStorage(
  fileUrl: string,
  bucket: string = STUDENT_PHOTOS_BUCKET
): Promise<void> {
  // Extract the file path from the URL
  const urlParts = fileUrl.split(`${bucket}/`);
  if (urlParts.length < 2) {
    throw new Error('Invalid file URL');
  }
  
  const filePath = urlParts[1];
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
