import type { RecipeIngredient } from './recipeTypes';

export interface ShoppingListItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  source: 'recipe' | 'manual';
  quantities?: Array<{ quantity: number | null; unit: string | null }>;
}

/**
 * Requirement 14.1-14.2: merges ingredients from selected recipes.
 * Groups by trimmed/case-folded name; sums quantities when units match;
 * lists entries separately when units differ or any entry lacks quantity.
 *
 * Feature: personal-recipe-website, Property 27: Ingredient merge correctness
 */
export function mergeIngredients(recipeIngredients: RecipeIngredient[][]): ShoppingListItem[] {
  const groups = new Map<string, Array<{ quantity: number | null; unit: string | null }>>();

  for (const ingredients of recipeIngredients) {
    for (const ing of ingredients) {
      const key = ing.name.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ quantity: ing.quantity, unit: ing.unit });
    }
  }

  const items: ShoppingListItem[] = [];
  for (const [key, entries] of groups) {
    const displayName = entries.length > 0 ? key : key;
    const allSameUnit = entries.every((e) => e.unit === entries[0].unit) && entries.every((e) => e.quantity != null);

    if (allSameUnit && entries[0].quantity != null) {
      items.push({
        name: displayName,
        quantity: entries.reduce((sum, e) => sum + (e.quantity ?? 0), 0),
        unit: entries[0].unit,
        source: 'recipe',
      });
    } else {
      items.push({
        name: displayName,
        quantity: null,
        unit: null,
        source: 'recipe',
        quantities: entries,
      });
    }
  }

  return items;
}

/**
 * Requirement 15.2-15.3: omits items whose trimmed/case-folded name
 * exactly matches an exclusion entry.
 *
 * Feature: personal-recipe-website, Property 29: Pantry exclusion filtering
 */
export function applyPantryExclusion(items: ShoppingListItem[], exclusionList: string[]): ShoppingListItem[] {
  const normalized = new Set(exclusionList.map((e) => e.trim().toLowerCase()));
  return items.filter((item) => !normalized.has(item.name.trim().toLowerCase()));
}

/**
 * Requirement 16.1-16.2: formats the shopping list as one item per line for clipboard export.
 *
 * Feature: personal-recipe-website, Property 31: Shopping list export formatting
 */
export function formatShoppingListForExport(items: ShoppingListItem[]): string {
  return items
    .map((item) => {
      if (item.quantity != null && item.unit) return `${item.quantity} ${item.unit} ${item.name}`;
      if (item.quantity != null) return `${item.quantity} ${item.name}`;
      if (item.quantities && item.quantities.length > 0) {
        const parts = item.quantities
          .map((q) => [q.quantity, q.unit].filter(Boolean).join(' '))
          .join(' + ');
        return `${item.name} (${parts})`;
      }
      return item.name;
    })
    .join('\n');
}
