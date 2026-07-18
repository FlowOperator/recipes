import type { ExtractedRecipeFields, RecipeIngredient } from '../lib/recipeTypes';
import { validateRecipeForm, VALID_CATEGORIES, COURSES, FOOD_CATEGORIES } from '../lib/recipeValidation';
import { createRecipe, updateRecipe } from '../lib/recipeStore';

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
  callbacks: RecipeFormCallbacks,
  editId?: string
): void {
  const categoriesHtml = VALID_CATEGORIES.map(
    (cat) => `<label class="category-chip"><input type="checkbox" name="categories" value="${cat}" ${prefill?.mealType?.includes(cat) ? 'checked' : ''} /> ${cat}</label>`
  ).join('');

  const coursesHtml = COURSES.map(
    (c) => `<label class="category-chip"><input type="checkbox" name="courses" value="${c}" ${prefill?.course?.includes(c) ? 'checked' : ''} /> ${c}</label>`
  ).join('');

  const foodCatsHtml = FOOD_CATEGORIES.map(
    (c) => `<label class="category-chip"><input type="checkbox" name="foodcats" value="${c}" ${prefill?.category?.includes(c) ? 'checked' : ''} /> ${c}</label>`
  ).join('');

  const ingredientsText = prefill?.ingredients
    ? prefill.ingredients.map(formatIngredient).join('\n')
    : '';

  container.innerHTML = `
    <section class="recipe-form">
      <h2>${editId ? 'Edit recipe' : prefill ? 'Review and save recipe' : 'Add recipe manually'}</h2>
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

        <div class="form-row">
          <div>
            <label for="rf-calories">Calories per serving</label>
            <input id="rf-calories" name="caloriesPerServing" type="number" min="0" step="1" value="${prefill?.caloriesPerServing ?? ''}" />
          </div>
          <div>
            <label for="rf-protein">Protein per serving (g)</label>
            <input id="rf-protein" name="proteinPerServing" type="number" min="0" step="0.1" value="${prefill?.proteinPerServing ?? ''}" />
          </div>
        </div>

        <div class="form-row">
          <div>
            <label for="rf-cost">Cost per portion (£)</label>
            <input id="rf-cost" name="costPerPortion" type="number" min="0" max="9999.99" step="0.01" value="${prefill?.costPerServing ?? ''}" />
          </div>
          <div></div>
        </div>

        <fieldset class="categories-fieldset">
          <legend>Meal type * (select at least one)</legend>
          <div class="categories-grid" id="mealtype-grid">${categoriesHtml}</div>
          <div class="add-tag-row"><input id="add-mealtype" type="text" placeholder="Add new..." maxlength="50" /><button type="button" class="add-tag-btn" data-target="mealtype">+</button></div>
        </fieldset>

        <fieldset class="categories-fieldset">
          <legend>Course</legend>
          <div class="categories-grid" id="course-grid">${coursesHtml}</div>
          <div class="add-tag-row"><input id="add-course" type="text" placeholder="Add new..." maxlength="50" /><button type="button" class="add-tag-btn" data-target="course">+</button></div>
        </fieldset>

        <fieldset class="categories-fieldset">
          <legend>Category</legend>
          <div class="categories-grid" id="foodcat-grid">${foodCatsHtml}</div>
          <div class="add-tag-row"><input id="add-foodcat" type="text" placeholder="Add new..." maxlength="50" /><button type="button" class="add-tag-btn" data-target="foodcat">+</button></div>
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

  // Handle "Add new" buttons for custom tags
  container.querySelectorAll<HTMLButtonElement>('.add-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target!;
      const inputId = target === 'mealtype' ? 'add-mealtype' : target === 'course' ? 'add-course' : 'add-foodcat';
      const gridId = target === 'mealtype' ? 'mealtype-grid' : target === 'course' ? 'course-grid' : 'foodcat-grid';
      const inputName = target === 'mealtype' ? 'categories' : target === 'course' ? 'courses' : 'foodcats';

      const input = container.querySelector<HTMLInputElement>(`#${inputId}`)!;
      const value = input.value.trim().toLowerCase();
      if (!value) return;

      const grid = container.querySelector<HTMLElement>(`#${gridId}`)!;
      const chip = document.createElement('label');
      chip.className = 'category-chip';
      chip.innerHTML = `<input type="checkbox" name="${inputName}" value="${value}" checked /> ${value}`;
      grid.appendChild(chip);
      input.value = '';
    });
  });

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

    const result = editId
      ? await updateRecipe(editId, {
          name: formData.name.trim(),
          source_link: formData.sourceLink || null,
          ingredients: formData.ingredients,
          method: formData.method,
          time_to_cook_minutes: formData.timeToCookMinutes,
          servings: formData.servings,
          filter_categories: formData.filterCategories,
          calories_per_serving: formData.caloriesPerServing,
          protein_per_serving: formData.proteinPerServing,
          cost_per_portion: formData.costPerPortion,
        })
      : await createRecipe({
          name: formData.name.trim(),
          source_link: formData.sourceLink || null,
          ingredients: formData.ingredients,
          method: formData.method,
          time_to_cook_minutes: formData.timeToCookMinutes,
          servings: formData.servings,
          filter_categories: formData.filterCategories,
          calories_per_serving: formData.caloriesPerServing,
          protein_per_serving: formData.proteinPerServing,
          cost_per_portion: formData.costPerPortion,
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
  const caloriesRaw = (form.elements.namedItem('caloriesPerServing') as HTMLInputElement).value;
  const proteinRaw = (form.elements.namedItem('proteinPerServing') as HTMLInputElement).value;
  const costRaw = (form.elements.namedItem('costPerPortion') as HTMLInputElement).value;

  const categories = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="categories"]:checked'))
    .map((cb) => cb.value);
  const courses = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="courses"]:checked'))
    .map((cb) => cb.value);
  const foodCats = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="foodcats"]:checked'))
    .map((cb) => cb.value);

  // Combine all tags into filter_categories for storage
  const allCategories = [...categories, ...courses, ...foodCats];

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
    caloriesPerServing: caloriesRaw ? Number(caloriesRaw) : null,
    proteinPerServing: proteinRaw ? Number(proteinRaw) : null,
    costPerPortion: costRaw ? Number(costRaw) : null,
    filterCategories: allCategories,
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
