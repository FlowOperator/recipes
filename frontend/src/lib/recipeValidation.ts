import type { RecipeIngredient } from './recipeTypes';

export interface ValidationError {
  field: string;
  message: string;
}

export interface RecipeFormData {
  name: string;
  sourceLink: string;
  ingredients: RecipeIngredient[];
  method: string;
  timeToCookMinutes: number | null;
  servings: number | null;
  filterCategories: string[];
}

const VALID_CATEGORIES = [
  'breakfast', 'lunch', 'dinner', 'healthy', 'quick and easy',
  'dinner party', 'family', 'one-pot', 'budget',
];

/**
 * Validates recipe form data per Requirement 3.4, 3.3, 11.4.
 * Returns an empty array if valid, otherwise a list of field-specific errors.
 *
 * Feature: personal-recipe-website, Property 7: Field bounds validation
 */
export function validateRecipeForm(data: RecipeFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  const trimmedName = data.name.trim();
  if (trimmedName.length === 0) {
    errors.push({ field: 'name', message: 'Recipe name is required.' });
  } else if (trimmedName.length > 200) {
    errors.push({ field: 'name', message: 'Name must be 200 characters or less.' });
  }

  if (data.sourceLink && data.sourceLink.length > 2048) {
    errors.push({ field: 'sourceLink', message: 'Source link must be 2048 characters or less.' });
  }

  if (data.ingredients.length > 100) {
    errors.push({ field: 'ingredients', message: 'Maximum 100 ingredient lines.' });
  }
  for (let i = 0; i < data.ingredients.length; i++) {
    if (data.ingredients[i].name.length > 200) {
      errors.push({ field: 'ingredients', message: `Ingredient ${i + 1} exceeds 200 characters.` });
      break;
    }
  }

  if (data.method.length > 10000) {
    errors.push({ field: 'method', message: 'Method must be 10,000 characters or less.' });
  }

  if (data.timeToCookMinutes !== null) {
    if (!Number.isInteger(data.timeToCookMinutes) || data.timeToCookMinutes < 1 || data.timeToCookMinutes > 1440) {
      errors.push({ field: 'timeToCookMinutes', message: 'Cook time must be 1-1440 minutes.' });
    }
  }

  if (data.servings !== null) {
    if (!Number.isInteger(data.servings) || data.servings < 1 || data.servings > 100) {
      errors.push({ field: 'servings', message: 'Servings must be 1-100.' });
    }
  }

  if (data.filterCategories.length === 0) {
    errors.push({ field: 'filterCategories', message: 'At least one category is required.' });
  }
  for (const cat of data.filterCategories) {
    if (!VALID_CATEGORIES.includes(cat)) {
      errors.push({ field: 'filterCategories', message: `"${cat}" is not a valid category.` });
      break;
    }
  }

  return errors;
}

export { VALID_CATEGORIES };

export const COURSES = [
  'appetizer', 'beverage', 'breakfast', 'brunch', 'dessert',
  'main dish', 'side dish', 'snack',
];

export const FOOD_CATEGORIES = [
  'barbecue', 'beef', 'bread', 'cake', 'casserole', 'chicken',
  'chocolate', 'cookie', 'egg', 'fish', 'lamb', 'muffin',
  'noodle', 'pasta', 'pie', 'pork', 'rice', 'salad',
  'sandwich', 'sauce', 'soup', 'tart', 'vegetable', 'vegetarian',
];
