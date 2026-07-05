import type { ExtractedRecipeFields, RecipeIngredient } from './recipeTypes';

export type ClaudeImportResult =
  | { extracted: true; fields: ExtractedRecipeFields }
  | { extracted: false };

/**
 * Pure client-side parser: attempts to parse pasted text as the documented
 * recipe JSON shape. Makes no network request under any circumstances.
 *
 * Feature: personal-recipe-website, Property 38: Claude import parsing is JSON-shape gated and network-free
 * Validates: Requirements 2.2, 2.4, 2.6
 */
export function parseClaudeImportJson(pastedText: string): ClaudeImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(pastedText);
  } catch {
    return { extracted: false };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { extracted: false };
  }

  const obj = parsed as Record<string, unknown>;
  const fields: ExtractedRecipeFields = {};
  let hasAnyField = false;

  if (typeof obj.name === 'string' && obj.name.trim().length > 0) {
    fields.name = obj.name.trim();
    hasAnyField = true;
  }

  if (typeof obj.sourceLink === 'string' && obj.sourceLink.trim().length > 0) {
    fields.sourceLink = obj.sourceLink.trim();
    hasAnyField = true;
  }

  if (Array.isArray(obj.ingredients) && obj.ingredients.length > 0) {
    const ingredients = obj.ingredients
      .filter((i): i is Record<string, unknown> => i !== null && typeof i === 'object')
      .map(mapIngredient)
      .filter((i): i is RecipeIngredient => i !== null);
    if (ingredients.length > 0) {
      fields.ingredients = ingredients;
      hasAnyField = true;
    }
  }

  if (typeof obj.method === 'string' && obj.method.trim().length > 0) {
    fields.method = obj.method.trim();
    hasAnyField = true;
  }

  if (typeof obj.timeToCookMinutes === 'number' && obj.timeToCookMinutes > 0) {
    fields.timeToCookMinutes = Math.round(obj.timeToCookMinutes);
    hasAnyField = true;
  }

  if (typeof obj.servings === 'number' && obj.servings > 0) {
    fields.servings = Math.round(obj.servings);
    hasAnyField = true;
  }

  if (typeof obj.caloriesPerServing === 'number' && obj.caloriesPerServing >= 0) {
    fields.caloriesPerServing = Math.round(obj.caloriesPerServing);
    hasAnyField = true;
  }

  if (typeof obj.proteinPerServing === 'number' && obj.proteinPerServing >= 0) {
    fields.proteinPerServing = Math.round(obj.proteinPerServing * 10) / 10;
    hasAnyField = true;
  }

  if (typeof obj.costPerServing === 'number' && obj.costPerServing >= 0) {
    fields.costPerServing = Math.round(obj.costPerServing * 100) / 100;
    hasAnyField = true;
  }

  if (Array.isArray(obj.mealType) && obj.mealType.length > 0) {
    fields.mealType = obj.mealType.filter((v): v is string => typeof v === 'string');
    if (fields.mealType.length > 0) hasAnyField = true;
    else delete fields.mealType;
  }

  if (Array.isArray(obj.course) && obj.course.length > 0) {
    fields.course = obj.course.filter((v): v is string => typeof v === 'string');
    if (fields.course.length > 0) hasAnyField = true;
    else delete fields.course;
  }

  if (Array.isArray(obj.category) && obj.category.length > 0) {
    fields.category = obj.category.filter((v): v is string => typeof v === 'string');
    if (fields.category.length > 0) hasAnyField = true;
    else delete fields.category;
  }

  if (!hasAnyField) {
    return { extracted: false };
  }

  return { extracted: true, fields };
}

function mapIngredient(raw: Record<string, unknown>): RecipeIngredient | null {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  return {
    name,
    quantity: typeof raw.quantity === 'number' ? raw.quantity : null,
    unit: typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit.trim() : null,
  };
}

/**
 * The fixed prompt/schema template the Owner copies into their Claude AI
 * chat/project (Requirement 2.1). Kept here so the parser and the UI
 * template always stay in sync.
 */
export const CLAUDE_PROMPT_TEMPLATE = `Extract this recipe into the following JSON format. Return ONLY the JSON, no extra text:

{
  "name": "Recipe name",
  "sourceLink": "URL if available, otherwise omit this field",
  "ingredients": [
    { "name": "ingredient name", "quantity": 200, "unit": "g" },
    { "name": "eggs", "quantity": 2, "unit": null }
  ],
  "method": "Step 1. Do this.\\nStep 2. Do that.\\n...",
  "timeToCookMinutes": 30,
  "servings": 4,
  "caloriesPerServing": 450,
  "proteinPerServing": 32,
  "costPerServing": 2.50,
  "mealType": ["dinner", "healthy"],
  "course": ["main dish"],
  "category": ["chicken", "rice"]
}

Rules:
- quantity should be a number or null if unclear
- unit should be a string (g, ml, tbsp, tsp, cups, etc.) or null if it's just a count
- method should be all steps joined with newlines
- caloriesPerServing: your best estimate based on ingredients and portions
- proteinPerServing: grams of protein per serving, best estimate
- costPerServing: estimated cost in GBP per serving based on typical UK supermarket prices
- mealType: pick ALL that apply from: breakfast, lunch, dinner, healthy, quick and easy, dinner party, family, one-pot, budget
- course: pick ALL that apply from: appetizer, beverage, breakfast, brunch, dessert, main dish, side dish, snack
- category: pick ALL that apply from: barbecue, beef, bread, cake, casserole, chicken, chocolate, cookie, egg, fish, lamb, muffin, noodle, pasta, pie, pork, rice, salad, sandwich, sauce, soup, tart, vegetable, vegetarian
- omit any field you genuinely cannot determine from the source`;
