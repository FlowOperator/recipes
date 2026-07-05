import { supabase } from './supabaseClient';
import type { RecipeIngredient } from './recipeTypes';

export interface RecipeRecord {
  id: string;
  name: string;
  source_link: string | null;
  photo_path: string | null;
  ingredients: RecipeIngredient[];
  method: string;
  time_to_cook_minutes: number | null;
  servings: number | null;
  rating: number | null;
  cost_per_portion: number | null;
  cook_notes: string;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  dietary_labels: string[];
  key_ingredient_labels: string[];
  filter_categories: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateRecipeInput {
  name: string;
  source_link?: string | null;
  photo_path?: string | null;
  ingredients: RecipeIngredient[];
  method: string;
  time_to_cook_minutes?: number | null;
  servings?: number | null;
  filter_categories: string[];
}

/**
 * Creates a new Recipe_Record in the database (Requirement 3.2, 4.4).
 */
export async function createRecipe(input: CreateRecipeInput): Promise<{ ok: boolean; recipe?: RecipeRecord; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, error: 'Not authenticated.' };
  }

  const row = {
    owner_id: userData.user.id,
    name: input.name.trim(),
    source_link: input.source_link || null,
    photo_path: input.photo_path || null,
    ingredients: input.ingredients,
    method: input.method,
    time_to_cook_minutes: input.time_to_cook_minutes ?? null,
    servings: input.servings ?? null,
    filter_categories: input.filter_categories,
    cook_notes: '',
    dietary_labels: [],
    key_ingredient_labels: [],
  };

  const { data, error } = await supabase.from('recipes').insert(row).select().single();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, recipe: data as RecipeRecord };
}

/**
 * Fetches all recipes for the current Owner (Requirement 12.1).
 */
export async function listRecipes(): Promise<RecipeRecord[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as RecipeRecord[];
}

/**
 * Fetches a single recipe by ID (Requirement 5.1).
 */
export async function getRecipe(id: string): Promise<RecipeRecord | null> {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
  if (error) return null;
  return data as RecipeRecord;
}

/**
 * Updates fields on a recipe (Requirement 5.2).
 */
export async function updateRecipe(id: string, fields: Partial<Omit<RecipeRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('recipes').update(fields).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Deletes a recipe (Requirement 5.6).
 */
export async function deleteRecipe(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
