import type { RecipeIngredient } from './recipeTypes';

/**
 * Phrases that signal an ingredient is "to taste" / seasoning-style and should
 * not be scaled regardless of servings. These are matched as whole phrases so
 * that a genuinely-measured ingredient (e.g. "500 ml water", "2 tbsp oil") still
 * scales, while vague seasoning lines ("salt to taste", "a pinch of pepper") do not.
 */
const TO_TASTE_PHRASES = [
  'to taste', 'as needed', 'for frying', 'for greasing', 'for garnish',
  'for dusting', 'for serving', 'for drizzling',
];

/**
 * Units that are inherently non-numeric "to taste" measures and should not scale.
 */
const TO_TASTE_UNITS = ['pinch', 'pinches', 'drizzle', 'splash', 'dash', 'to taste'];

/**
 * Returns true if an ingredient should NOT be scaled.
 *
 * The rule, in order:
 *  1. No quantity at all → already "to taste", leave as-is.
 *  2. Unit is an inherently non-numeric measure (pinch, splash...) → leave as-is.
 *  3. Name/unit contains a "to taste" phrase (e.g. "oil for frying") → leave as-is.
 *
 * Note: a plain quantified ingredient like "500 ml water" or "2 tbsp oil" IS
 * scaled — only vague seasoning-style lines are skipped.
 */
function isUnscalable(ingredient: RecipeIngredient): boolean {
  // No quantity means it's already "to taste" style.
  if (ingredient.quantity == null) return true;

  const nameLower = ingredient.name.toLowerCase();
  const unitLower = (ingredient.unit ?? '').toLowerCase();

  // Inherently non-numeric units.
  if (TO_TASTE_UNITS.includes(unitLower)) return true;

  // "to taste" style phrases in the name or unit.
  for (const phrase of TO_TASTE_PHRASES) {
    if (nameLower.includes(phrase) || unitLower.includes(phrase)) {
      return true;
    }
  }

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
