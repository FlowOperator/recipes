/**
 * Persistent shopping list stored in localStorage so it survives between
 * sessions and works offline. Items track which recipe(s) they came from
 * and whether they've been checked off.
 */

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  sourceRecipes: string[]; // recipe names this item came from
}

const STORAGE_KEY = 'recipe-site:shopping-list';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getShoppingList(): ShoppingListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShoppingList(items: ShoppingListItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Adds selected ingredients from a recipe to the shopping list.
 * If an ingredient with the same name already exists, merges by summing
 * quantities (when units match) and appending the recipe source name.
 */
export function addIngredientsToShoppingList(
  ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>,
  recipeName: string,
  pantryExclusions: string[] = ['salt', 'pepper', 'oil']
): void {
  const list = getShoppingList();
  const exclusionSet = new Set(pantryExclusions.map(e => e.trim().toLowerCase()));

  for (const ing of ingredients) {
    const normalizedName = ing.name.trim().toLowerCase();

    // Skip pantry exclusions
    if (exclusionSet.has(normalizedName)) continue;

    // Check if already in list
    const existing = list.find(item => item.name.trim().toLowerCase() === normalizedName);

    if (existing) {
      // Merge: add source recipe if not already listed
      if (!existing.sourceRecipes.includes(recipeName)) {
        existing.sourceRecipes.push(recipeName);
      }
      // Sum quantities if same unit
      if (ing.quantity != null && existing.quantity != null && existing.unit === ing.unit) {
        existing.quantity += ing.quantity;
      }
    } else {
      list.push({
        id: generateId(),
        name: ing.name.trim(),
        quantity: ing.quantity,
        unit: ing.unit,
        checked: false,
        sourceRecipes: [recipeName],
      });
    }
  }

  saveShoppingList(list);
}

export function toggleItemChecked(itemId: string): void {
  const list = getShoppingList();
  const item = list.find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    saveShoppingList(list);
  }
}

export function removeItem(itemId: string): void {
  const list = getShoppingList().filter(i => i.id !== itemId);
  saveShoppingList(list);
}

export function clearCheckedItems(): void {
  const list = getShoppingList().filter(i => !i.checked);
  saveShoppingList(list);
}

export function clearAllItems(): void {
  saveShoppingList([]);
}
