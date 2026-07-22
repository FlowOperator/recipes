import type { ExtractedRecipeFields, RecipeIngredient } from '../lib/recipeTypes';
import { validateRecipeForm, VALID_CATEGORIES, COURSES, FOOD_CATEGORIES } from '../lib/recipeValidation';
import { createRecipe, updateRecipe, getAllTags } from '../lib/recipeStore';

export interface RecipeFormCallbacks {
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Renders a tabbed recipe edit form inspired by Recipe Keeper.
 * Tabs: Overview | Ingredients | Directions | Notes | Nutrition
 */
export async function renderRecipeForm(
  container: HTMLElement,
  prefill: ExtractedRecipeFields | null,
  sourceLink: string | null,
  callbacks: RecipeFormCallbacks,
  editId?: string
): Promise<void> {
  // Fetch global custom tags
  const allExistingTags = await getAllTags();
  const customFoodTagsGlobal = [...new Set(
    allExistingTags.filter(t =>
      !VALID_CATEGORIES.includes(t) && !COURSES.includes(t) && !FOOD_CATEGORIES.includes(t)
    )
  )];

  const currentMealTypes = prefill?.mealType ?? [];
  const currentCourses = prefill?.course ?? [];
  const currentCategories = prefill?.category ?? [];

  const ingredientsText = prefill?.ingredients
    ? prefill.ingredients.map(formatIngredient).join('\n')
    : '';

  container.innerHTML = `
    <section class="edit-form-shell">
      <div class="edit-form-header">
        <button id="ef-close" type="button" class="ef-close-btn" aria-label="Close">✕</button>
        <h2>${editId ? 'Edit recipe' : prefill ? 'Review recipe' : 'Add recipe'}</h2>
        <button id="ef-save" type="button" class="ef-save-btn">Save</button>
      </div>
      <div class="edit-form-tabs">
        <button class="ef-tab active" data-tab="overview">Overview</button>
        <button class="ef-tab" data-tab="ingredients">Ingredients</button>
        <button class="ef-tab" data-tab="directions">Directions</button>
        <button class="ef-tab" data-tab="notes">Notes</button>
        <button class="ef-tab" data-tab="nutrition">Nutrition</button>
      </div>
      <form id="recipe-form" novalidate>
        <div class="ef-panel active" data-panel="overview">
          <input id="rf-name" name="name" type="text" maxlength="200" value="${escapeAttr(prefill?.name ?? '')}" placeholder="Recipe name *" class="ef-title-input" required />

          <div class="ef-row-list">
            <div class="ef-row" id="row-courses">
              <span class="ef-row-label">Courses</span>
              <span class="ef-row-value" id="courses-display">${currentCourses.join(', ') || '—'}</span>
              <span class="ef-row-chevron">›</span>
            </div>
            <div class="ef-row" id="row-categories">
              <span class="ef-row-label">Categories</span>
              <span class="ef-row-value" id="categories-display">${[...currentCategories, ...currentMealTypes].join(', ') || '—'}</span>
              <span class="ef-row-chevron">›</span>
            </div>
            <div class="ef-row">
              <span class="ef-row-label">Source</span>
              <input id="rf-source" name="sourceLink" type="url" maxlength="2048" value="${escapeAttr(sourceLink ?? prefill?.sourceLink ?? '')}" placeholder="URL" class="ef-row-input" />
            </div>
            <div class="ef-row">
              <span class="ef-row-label">Servings</span>
              <input id="rf-servings" name="servings" type="number" min="1" max="100" value="${prefill?.servings ?? ''}" placeholder="—" class="ef-row-input ef-row-short" />
            </div>
            <div class="ef-row">
              <span class="ef-row-label">Cook time</span>
              <input id="rf-time" name="timeToCookMinutes" type="number" min="1" max="1440" value="${prefill?.timeToCookMinutes ?? ''}" placeholder="mins" class="ef-row-input ef-row-short" />
            </div>
            <div class="ef-row">
              <span class="ef-row-label">Cost/portion</span>
              <input id="rf-cost" name="costPerPortion" type="number" min="0" max="9999.99" step="0.01" value="${prefill?.costPerServing ?? ''}" placeholder="£" class="ef-row-input ef-row-short" />
            </div>
          </div>
        </div>

        <div class="ef-panel" data-panel="ingredients">
          <textarea id="rf-ingredients" name="ingredients" rows="16" placeholder="One ingredient per line&#10;e.g. 200g flour&#10;2 tbsp olive oil&#10;Salt and pepper">${escapeHtml(ingredientsText)}</textarea>
        </div>

        <div class="ef-panel" data-panel="directions">
          <textarea id="rf-method" name="method" rows="16" maxlength="10000" placeholder="Write or paste the method here...">${escapeHtml(prefill?.method ?? '')}</textarea>
        </div>

        <div class="ef-panel" data-panel="notes">
          <textarea id="rf-notes" name="notes" rows="10" maxlength="5000" placeholder="Cook notes, tips, variations..."></textarea>
        </div>

        <div class="ef-panel" data-panel="nutrition">
          <p class="ef-section-label">Amount per serving</p>
          <div class="ef-row-list">
            <div class="ef-row">
              <span class="ef-row-label">Calories</span>
              <input id="rf-calories" name="caloriesPerServing" type="number" min="0" step="1" value="${prefill?.caloriesPerServing ?? ''}" placeholder="—" class="ef-row-input ef-row-short" />
            </div>
            <div class="ef-row">
              <span class="ef-row-label">Protein (g)</span>
              <input id="rf-protein" name="proteinPerServing" type="number" min="0" step="0.1" value="${prefill?.proteinPerServing ?? ''}" placeholder="—" class="ef-row-input ef-row-short" />
            </div>
          </div>
        </div>

        <!-- Hidden tag pickers (shown as modals when row is tapped) -->
        <div id="tag-picker-overlay" class="ef-overlay hidden">
          <div class="ef-picker">
            <div class="ef-picker-header">
              <button type="button" id="picker-close" class="ef-close-btn">✕</button>
              <h3 id="picker-title">Select</h3>
            </div>
            <div id="picker-chips" class="categories-grid"></div>
            <div class="add-tag-row"><input id="picker-new" type="text" placeholder="Add new..." maxlength="50" /><button type="button" id="picker-add-btn" class="add-tag-btn">+</button></div>
          </div>
        </div>

        <p id="rf-error" class="form-error" role="alert" aria-live="polite"></p>
      </form>
    </section>
  `;

  // === Tab switching ===
  const tabs = container.querySelectorAll<HTMLButtonElement>('.ef-tab');
  const panels = container.querySelectorAll<HTMLElement>('.ef-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab!;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));
    });
  });

  // === Tag picker logic ===
  const overlay = container.querySelector<HTMLElement>('#tag-picker-overlay')!;
  const pickerChips = container.querySelector<HTMLElement>('#picker-chips')!;
  const pickerTitle = container.querySelector<HTMLElement>('#picker-title')!;
  const pickerNewInput = container.querySelector<HTMLInputElement>('#picker-new')!;

  // Track selected tags in state
  const selectedCourses = new Set(currentCourses);
  const selectedCategories = new Set([...currentMealTypes, ...currentCategories]);
  // Add global custom tags to the category pool for display
  const allCategoryOptions = [...new Set([...VALID_CATEGORIES, ...FOOD_CATEGORIES, ...customFoodTagsGlobal])];

  let activePicker: 'courses' | 'categories' | null = null;

  function openPicker(type: 'courses' | 'categories') {
    activePicker = type;
    overlay.classList.remove('hidden');
    if (type === 'courses') {
      pickerTitle.textContent = 'Courses';
      renderPickerChips(COURSES, selectedCourses);
    } else {
      pickerTitle.textContent = 'Categories';
      renderPickerChips(allCategoryOptions, selectedCategories);
    }
  }

  function renderPickerChips(options: string[], selected: Set<string>) {
    pickerChips.innerHTML = options.map(opt =>
      `<label class="category-chip"><input type="checkbox" value="${opt}" ${selected.has(opt) ? 'checked' : ''} /> ${opt}</label>`
    ).join('');
    pickerChips.querySelectorAll<HTMLInputElement>('input').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selected.add(cb.value);
        else selected.delete(cb.value);
        updateRowDisplays();
      });
    });
  }

  function updateRowDisplays() {
    container.querySelector<HTMLElement>('#courses-display')!.textContent =
      [...selectedCourses].join(', ') || '—';
    container.querySelector<HTMLElement>('#categories-display')!.textContent =
      [...selectedCategories].join(', ') || '—';
  }

  container.querySelector<HTMLElement>('#row-courses')!.addEventListener('click', () => openPicker('courses'));
  container.querySelector<HTMLElement>('#row-categories')!.addEventListener('click', () => openPicker('categories'));

  container.querySelector<HTMLButtonElement>('#picker-close')!.addEventListener('click', () => {
    overlay.classList.add('hidden');
    activePicker = null;
  });

  container.querySelector<HTMLButtonElement>('#picker-add-btn')!.addEventListener('click', () => {
    const val = pickerNewInput.value.trim().toLowerCase();
    if (!val) return;
    if (activePicker === 'courses') {
      selectedCourses.add(val);
      if (!COURSES.includes(val)) COURSES.push(val); // temporarily extend for this session
      renderPickerChips(COURSES, selectedCourses);
    } else if (activePicker === 'categories') {
      selectedCategories.add(val);
      if (!allCategoryOptions.includes(val)) allCategoryOptions.push(val);
      renderPickerChips(allCategoryOptions, selectedCategories);
    }
    pickerNewInput.value = '';
    updateRowDisplays();
  });

  // === Close / Cancel ===
  container.querySelector<HTMLButtonElement>('#ef-close')!.addEventListener('click', callbacks.onCancel);

  // === Save ===
  container.querySelector<HTMLButtonElement>('#ef-save')!.addEventListener('click', async () => {
    const errorEl = container.querySelector<HTMLParagraphElement>('#rf-error')!;
    errorEl.textContent = '';

    const form = container.querySelector<HTMLFormElement>('#recipe-form')!;
    const formData = extractFormData(form, selectedCourses, selectedCategories);
    const errors = validateRecipeForm(formData);
    if (errors.length > 0) {
      errorEl.textContent = errors.map(e => e.message).join(' ');
      // Switch to overview tab to show error
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === 'overview'));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === 'overview'));
      return;
    }

    const saveBtn = container.querySelector<HTMLButtonElement>('#ef-save')!;
    saveBtn.disabled = true;
    saveBtn.textContent = '...';

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

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';

    if (!result.ok) {
      errorEl.textContent = result.error ?? 'Failed to save.';
      return;
    }

    callbacks.onSaved();
  });
}

function extractFormData(form: HTMLFormElement, courses: Set<string>, categories: Set<string>) {
  const name = (form.elements.namedItem('name') as HTMLInputElement).value;
  const sourceLink = (form.elements.namedItem('sourceLink') as HTMLInputElement).value;
  const ingredientsRaw = (form.elements.namedItem('ingredients') as HTMLTextAreaElement).value;
  const method = (form.elements.namedItem('method') as HTMLTextAreaElement).value;
  const timeRaw = (form.elements.namedItem('timeToCookMinutes') as HTMLInputElement).value;
  const servingsRaw = (form.elements.namedItem('servings') as HTMLInputElement).value;
  const caloriesRaw = (form.elements.namedItem('caloriesPerServing') as HTMLInputElement).value;
  const proteinRaw = (form.elements.namedItem('proteinPerServing') as HTMLInputElement).value;
  const costRaw = (form.elements.namedItem('costPerPortion') as HTMLInputElement).value;

  // Combine courses + categories into filter_categories for storage
  const filterCategories = [...courses, ...categories];

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
    filterCategories,
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
