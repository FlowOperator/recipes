import type { RecipeRecord } from './recipeStore';

/**
 * Requirement 12.3-12.5: returns recipes matching ALL selected categories.
 * Empty selection returns all recipes.
 *
 * Feature: personal-recipe-website, Property 24: Category filter selects exact matches
 */
export function filterByCategories(recipes: RecipeRecord[], selectedCategories: string[]): RecipeRecord[] {
  if (selectedCategories.length === 0) return recipes;
  return recipes.filter((r) =>
    selectedCategories.every((cat) => r.filter_categories.includes(cat))
  );
}

/**
 * Requirement 8.5-8.6: includes recipes whose cost (unset treated as 0) <= threshold.
 *
 * Feature: personal-recipe-website, Property 17: Budget filter threshold semantics
 */
export function filterByBudget(recipes: RecipeRecord[], maxThreshold: number): RecipeRecord[] {
  return recipes.filter((r) => (r.cost_per_portion ?? 0) <= maxThreshold);
}

/**
 * Requirement 13.1-13.3: case-insensitive substring search against ingredient names.
 *
 * Feature: personal-recipe-website, Property 25: Ingredient search matching semantics
 */
export function searchByIngredient(recipes: RecipeRecord[], term: string): RecipeRecord[] {
  const trimmed = term.trim().toLowerCase();
  if (trimmed.length === 0) return [];
  return recipes.filter((r) =>
    r.ingredients.some((ing) => ing.name.toLowerCase().includes(trimmed))
  );
}

/**
 * Requirement 10.3-10.5: returns the ratio or null.
 *
 * Feature: personal-recipe-website, Property 21: Protein-per-calorie ratio computation
 */
export function computeProteinPerCalorieRatio(
  calories: number | null,
  protein: number | null
): number | null {
  if (calories == null || protein == null || calories <= 0) return null;
  return protein / calories;
}
