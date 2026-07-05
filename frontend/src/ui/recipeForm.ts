import type { ExtractedRecipeFields, RecipeIngredient } from '../lib/recipeTypes';
import { validateRecipeForm, VALID_CATEGORIES } from '../lib/recipeValidation';
import { createRecipe } from '../lib/recipeStore';

export interface RecipeFormCallbacks {
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Renders the Recipe_Form for creating a new recipe. Can be pre-filled from
 * extraction results (link/Claude import) or left blank for manual entry.
 * Implements Requirements 3, 4, and 11.3-11.4.
 */
export function renderRecipeForm(
  container: HTMLElement,
  prefill: ExtractedRecipeFields | null,
  sourceLink: string | null,
  callbacks: RecipeFormCallbacks
): void {
  const categoriesHtml = VALID_CATEGORIES.map(
    (cat) => `<label class="category-chip"><input type="checkbox" name="categories" value="${cat}" /> ${cat}</label>`
  ).join('');

  const ingredientsText = prefill?.ingredients
    ? prefill.ingredients.map(formatIngredient).join('\n')
    : '';

  container.innerHTML = `
    <section class="recipe-form">
      <h2>${prefill ? 'Review and save recipe' : 'Add recipe manually'}</h2>
      <form id="recipe-form" novalidate>
        <label for="rf-name">Name *</label>
        <input id="rf-name" name="name" type="text" maxlength="200" value="${escapeAttr(prefill?.name ?? '')}" required />

        <label for="rf-source">Source link</label>
        <input id="rf-source" name="sourceLink" type="url" maxlength="2048" value="${escapeAttr(sourceLink ?? prefill?.sourceLink ?? '')}" />

        <label for="rf-ingredients">Ingredients (one per line, e.g. "200g flour")</label>
        <textarea id="rf-ingredients" name="ingredients" rows="8">${escapeHtml(ingredientsText)}</textarea>

        <label for="rf-method">Method</label>
        <textarea id="rf-method" name="method" rows="8" maxlength="10000">${escapeHtml(prefill?.method ?? '')}</textarea>

        <div class="form-row">
          <div>
            <label for="rf-time">Time to cook (minutes)</label>
            <input id="rf-time" name="timeToCookMinutes" type="number" min="1" max="1440" value="${prefill?.timeToCookMinutes ?? ''}" />
          </div>
          <div>
            <label for="rf-servings">Servings</label>
            <input id="rf-servings" name="servings" type="number" min="1" max="100" value="${prefill?.servings ?? ''}" />
          </div>
        </div>

        <fieldset class="categories-fieldset">
          <legend>Categories * (select at least one)</legend>
          <div class="categories-grid">${categoriesHtml}</div>
        </fieldset>

        <p id="rf-error" class="signin-error" role="alert" aria-live="polite"></p>
        <div class="form-actions">
          <button type="submit">${prefill ? 'Save recipe' : 'Add recipe'}</button>
          <button type="button" id="rf-cancel" class="secondary-action">Cancel</button>
        </div>
      </form>
    </section>
  `;

  const form = container.querySelector<HTMLFormElement>('#recipe-form')!;
  const errorEl = container.querySelector<HTMLParagraphElement>('#rf-error')!;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const formData = extractFormData(form);
    const errors = validateRecipeForm(formData);
    if (errors.length > 0) {
      errorEl.textContent = errors.map((e) => e.message).join(' ');
      return;
    }

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const result = await createRecipe({
      name: formData.name.trim(),
      source_link: formData.sourceLink || null,
      ingredients: formData.ingredients,
      method: formData.method,
      time_to_cook_minutes: formData.timeToCookMinutes,
      servings: formData.servings,
      filter_categories: formData.filterCategories,
    });

    submitBtn.disabled = false;
    submitBtn.textContent = prefill ? 'Save recipe' : 'Add recipe';

    if (!result.ok) {
      errorEl.textContent = result.error ?? 'Failed to save recipe.';
      return;
    }

    callbacks.onSaved();
  });

  container.querySelector<HTMLButtonElement>('#rf-cancel')!.addEventListener('click', callbacks.onCancel);
}

function extractFormData(form: HTMLFormElement) {
  const name = (form.elements.namedItem('name') as HTMLInputElement).value;
  const sourceLink = (form.elements.namedItem('sourceLink') as HTMLInputElement).value;
  const ingredientsRaw = (form.elements.namedItem('ingredients') as HTMLTextAreaElement).value;
  const method = (form.elements.namedItem('method') as HTMLTextAreaElement).value;
  const timeRaw = (form.elements.namedItem('timeToCookMinutes') as HTMLInputElement).value;
  const servingsRaw = (form.elements.namedItem('servings') as HTMLInputElement).value;

  const categories = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="categories"]:checked'))
    .map((cb) => cb.value);

  const ingredients: RecipeIngredient[] = ingredientsRaw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseIngredientLine);

  return {
    name,
    sourceLink,
    ingredients,
    method,
    timeToCookMinutes: timeRaw ? Number(timeRaw) : null,
    servings: servingsRaw ? Number(servingsRaw) : null,
    filterCategories: categories,
  };
}

function parseIngredientLine(line: string): RecipeIngredient {
  const match = line.match(/^([\d.\/]+)\s*([a-zA-Z]*)\s+(.+)$/);
  if (match) {
    const quantity = Number(match[1]);
    return {
      name: match[3].trim(),
      quantity: Number.isNaN(quantity) ? null : quantity,
      unit: match[2] || null,
    };
  }
  return { name: line, quantity: null, unit: null };
}

function formatIngredient(ing: RecipeIngredient): string {
  const parts: string[] = [];
  if (ing.quantity != null) parts.push(String(ing.quantity));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(' ');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
