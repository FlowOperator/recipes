import type { RecipeIngredient } from './recipeTypes';

/**
 * Ingredients that should never be scaled — they're "to taste" or fixed regardless
 * of serving size. Matched case-insensitively against the ingredient name.
 */
const UNSCALABLE_KEYWORDS = [
  'salt', 'pepper', 'seasoning', 'to taste', 'as needed',
  'oil for frying', 'cooking spray', 'water', 'ice',
  'pinch', 'drizzle', 'splash', 'garnish',
];

/**
 * Returns true if an ingredient should NOT be scaled (it's "to taste" or a
 * fixed amount regardless of servings).
 */
function isUnscalable(ingredient: RecipeIngredient): boolean {
  // No quantity means it's already "to taste" style
  if (ingredient.quantity == null) return true;

  const nameLower = ingredient.name.toLowerCase();
  const unitLower = (ingredient.unit ?? '').toLowerCase();

  // Check if name or unit contains unscalable keywords
  for (const keyword of UNSCALABLE_KEYWORDS) {
    if (nameLower.includes(keyword) || unitLower.includes(keyword)) {
      return true;
    }
  }

  // "salt and pepper" as a combined ingredient
  if (nameLower.includes('salt') && nameLower.includes('pepper')) return true;

  // Unit-based detection: "pinch", "to taste", etc.
  if (unitLower === 'pinch' || unitLower === 'pinches') return true;

  return false;
}

/**
 * Scales an ingredient's quantity based on serving ratio.
 * Returns a new ingredient with the adjusted quantity, or the original if unscalable.
 */
export function scaleIngredient(
  ingredient: RecipeIngredient,
  ratio: number
): RecipeIngredient {
  if (isUnscalable(ingredient) || ratio === 1) {
    return ingredient;
  }

  const scaled = ingredient.quantity! * ratio;
  // Round to sensible precision (1 decimal for small numbers, whole for large)
  const rounded = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;

  return {
    ...ingredient,
    quantity: rounded === 0 ? ingredient.quantity : rounded,
  };
}

/**
 * Scales all ingredients for a recipe based on desired servings vs base servings.
 * Returns a new array — does not mutate the originals.
 */
export function scaleIngredients(
  ingredients: RecipeIngredient[],
  baseServings: number,
  desiredServings: number
): RecipeIngredient[] {
  if (baseServings <= 0 || desiredServings <= 0 || baseServings === desiredServings) {
    return ingredients;
  }
  const ratio = desiredServings / baseServings;
  return ingredients.map(ing => scaleIngredient(ing, ratio));
}

/**
 * Formats a quantity for display — avoids ugly decimals.
 * E.g. 1.0 → "1", 1.5 → "1.5", 0.333 → "⅓"
 */
export function formatQuantity(qty: number | null): string {
  if (qty == null) return '';

  // Common fractions for nicer display
  const fractions: [number, string][] = [
    [0.25, '¼'], [0.33, '⅓'], [0.5, '½'],
    [0.67, '⅔'], [0.75, '¾'],
  ];

  // Check if it's a whole number
  if (Number.isInteger(qty)) return String(qty);

  // Check for whole + fraction (e.g. 1.5 = 1½)
  const whole = Math.floor(qty);
  const frac = qty - whole;

  for (const [val, symbol] of fractions) {
    if (Math.abs(frac - val) < 0.05) {
      return whole > 0 ? `${whole}${symbol}` : symbol;
    }
  }

  // Fallback: 1 decimal place
  return qty.toFixed(1).replace(/\.0$/, '');
}
