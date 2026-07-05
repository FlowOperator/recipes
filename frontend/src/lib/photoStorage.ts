import { supabase } from './supabaseClient';

const BUCKET = 'recipe-photos';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PhotoUploadResult {
  ok: boolean;
  path?: string;
  error?: string;
}

/**
 * Pure validation: checks file type and size (Property 4).
 */
export function isValidPhotoFile(file: File): { valid: boolean; reason?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, reason: 'Photo must be JPEG, PNG, or WEBP.' };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, reason: 'Photo must be 10 MB or smaller.' };
  }
  return { valid: true };
}

/**
 * Uploads a photo for a recipe, replacing any existing photo (Requirement 6.1).
 */
export async function uploadRecipePhoto(recipeId: string, file: File): Promise<PhotoUploadResult> {
  const validation = isValidPhotoFile(file);
  if (!validation.valid) {
    return { ok: false, error: validation.reason };
  }

  const path = `${recipeId}/photo`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });

  if (error) {
    return { ok: false, error: 'Upload failed. Please try again.' };
  }

  return { ok: true, path };
}

/**
 * Deletes a recipe's photo from storage (Requirement 5.7).
 */
export async function deleteRecipePhoto(recipeId: string): Promise<boolean> {
  const path = `${recipeId}/photo`;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return !error;
}

/**
 * Returns the public URL for a recipe's photo. If no photo was manually
 * uploaded, returns null and the UI will show a generated placeholder.
 */
export function getPhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(photoPath);
  return data.publicUrl;
}

/** Category-to-emoji mapping for auto-generated placeholders. Free, offline, no API. */
const CATEGORY_EMOJIS: Record<string, string> = {
  breakfast: '🥐',
  lunch: '🥗',
  dinner: '🍝',
  healthy: '🥦',
  'quick and easy': '⚡',
  'dinner party': '🍷',
  family: '👨‍👩‍👧‍👦',
  'one-pot': '🍲',
  budget: '💰',
};

/**
 * Returns an emoji based on the recipe's first filter category.
 * Used as the visual placeholder when no photo is uploaded.
 */
export function getPlaceholderEmoji(categories: string[]): string {
  for (const cat of categories) {
    if (CATEGORY_EMOJIS[cat]) return CATEGORY_EMOJIS[cat];
  }
  return '🍽️';
}
