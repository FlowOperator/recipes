export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

/**
 * Fields that can be pre-filled by Link_Parser or Claude_Import_Parser.
 * Only fields actually extracted are present (Requirement 1.3-1.4, 2.3).
 */
export interface ExtractedRecipeFields {
  name?: string;
  sourceLink?: string;
  ingredients?: RecipeIngredient[];
  method?: string;
  timeToCookMinutes?: number;
  servings?: number;
  caloriesPerServing?: number;
  proteinPerServing?: number;
  costPerServing?: number;
  mealType?: string[];
  course?: string[];
  category?: string[];
}
