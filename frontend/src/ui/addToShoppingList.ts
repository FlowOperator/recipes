import type { RecipeRecord } from '../lib/recipeStore';
import { addIngredientsToShoppingList } from '../lib/shoppingListStore';

/**
 * Renders a modal-like ingredient picker allowing the Owner to select
 * which ingredients to add to the shopping list (like Recipe Keeper's
 * "Add to shopping list" screen).
 */
export function renderAddToShoppingList(
  container: HTMLElement,
  recipe: RecipeRecord,
  onDone: () => void
): void {
  const ingredientItems = recipe.ingredients.map((ing, i) => {
    const display = formatIngredient(ing);
    return `
      <label class="sl-pick-item">
        <input type="checkbox" name="ing" value="${i}" checked />
        <span>${escapeHtml(display)}</span>
      </label>
    `;
  }).join('');

  container.innerHTML = `
    <section class="sl-picker">
      <div class="sl-picker-header">
        <button id="sl-pick-close" type="button">✕</button>
        <h2>Add to shopping list</h2>
      </div>
      <p class="sl-pick-subtitle">Select ingredients (${recipe.ingredients.length} selected)</p>
      <div class="sl-pick-list">${ingredientItems}</div>
      <div class="sl-pick-actions">
        <button id="sl-pick-none" type="button" class="btn-secondary">Unselect all</button>
        <button id="sl-pick-add" type="button" class="btn-primary">Add selected items</button>
      </div>
    </section>
  `;

  const checkboxes = container.querySelectorAll<HTMLInputElement>('input[name="ing"]');
  const subtitleEl = container.querySelector<HTMLParagraphElement>('.sl-pick-subtitle')!;

  function updateCount() {
    const count = Array.from(checkboxes).filter(cb => cb.checked).length;
    subtitleEl.textContent = `Select ingredients (${count} selected)`;
  }

  checkboxes.forEach(cb => cb.addEventListener('change', updateCount));

  container.querySelector<HTMLButtonElement>('#sl-pick-none')!.addEventListener('click', () => {
    checkboxes.forEach(cb => { cb.checked = !cb.checked; });
    updateCount();
  });

  container.querySelector<HTMLButtonElement>('#sl-pick-close')!.addEventListener('click', onDone);

  container.querySelector<HTMLButtonElement>('#sl-pick-add')!.addEventListener('click', () => {
    const selectedIndices = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => Number(cb.value));

    const selectedIngredients = selectedIndices.map(i => recipe.ingredients[i]);
    addIngredientsToShoppingList(selectedIngredients, recipe.name);
    onDone();
  });
}

function formatIngredient(i: { name: string; quantity: number | null; unit: string | null }): string {
  const parts: string[] = [];
  if (i.quantity != null) parts.push(String(i.quantity));
  if (i.unit) parts.push(i.unit);
  parts.push(i.name);
  return parts.join(' ');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
