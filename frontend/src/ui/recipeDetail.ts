import type { RecipeRecord } from '../lib/recipeStore';
import { updateRecipe, deleteRecipe, createRecipe } from '../lib/recipeStore';
import { getPhotoUrl, uploadRecipePhoto } from '../lib/photoStorage';
import { getPexelsImageUrl } from '../lib/pexelsImages';
import { renderAddToShoppingList } from './addToShoppingList';
import { scaleIngredients, formatQuantity } from '../lib/ingredientScaling';
import { showUndoToast } from './undoToast';

export interface RecipeDetailCallbacks {
  onBack: () => void;
  onDeleted: () => void;
  onEdit: (recipe: RecipeRecord) => void;
}

export function renderRecipeDetail(container: HTMLElement, recipe: RecipeRecord, callbacks: RecipeDetailCallbacks): void {
  const photoUrl = getPhotoUrl(recipe.photo_path);
  const baseServings = recipe.servings ?? 1;
  let currentServings = baseServings;

  // Build photo HTML
  const photoHtml = photoUrl
    ? `<div class="rd-hero"><img src="${photoUrl}" alt="${esc(recipe.name)}" class="rd-hero-img" /></div>`
    : `<div class="rd-hero rd-hero-placeholder" id="detail-photo-placeholder">🍽️</div>`;

  // Pexels fallback
  if (!photoUrl) {
    getPexelsImageUrl(recipe.name).then((url) => {
      if (url) {
        const placeholder = container.querySelector('#detail-photo-placeholder');
        if (placeholder) {
          placeholder.innerHTML = `<img src="${url}" alt="${esc(recipe.name)}" class="rd-hero-img" />`;
          placeholder.classList.remove('rd-hero-placeholder');
        }
      }
    });
  }

  // Nutrition summary (compact)
  const nutritionPills = buildNutritionPills(recipe);

  container.innerHTML = `
    <section class="rd">
      ${photoHtml}
      <div class="rd-photo-actions">
        <label class="rd-upload-btn" for="photo-upload-input">📷</label>
        <input id="photo-upload-input" type="file" accept="image/jpeg,image/png,image/webp" class="hidden-file-input" />
      </div>

      <div class="rd-content">
        <button id="detail-back" type="button" class="rd-back-btn">← Back</button>

        <h1 class="rd-title">${esc(recipe.name)}</h1>

        <div class="rd-meta">
          ${recipe.time_to_cook_minutes ? `<span class="rd-meta-item">⏱ ${recipe.time_to_cook_minutes} min</span>` : ''}
          ${recipe.servings ? `<span class="rd-meta-item">🍽 ${recipe.servings} servings</span>` : ''}
          ${recipe.cost_per_portion != null ? `<span class="rd-meta-item">💰 £${recipe.cost_per_portion.toFixed(2)}</span>` : ''}
        </div>

        <div class="rd-rating">
          <span id="star-display" class="rd-stars">${renderStars(recipe.rating)}</span>
          <span class="rd-star-btns">${[1,2,3,4,5].map(n => `<button class="star-btn" data-rating="${n}">${n}</button>`).join('')}<button class="star-btn" data-rating="0">✕</button></span>
        </div>

        ${recipe.filter_categories.length > 0 ? `<div class="rd-tags">${recipe.filter_categories.map(c => `<span class="tag">${c}</span>`).join('')}</div>` : ''}
        ${nutritionPills ? `<div class="rd-nutrition-pills">${nutritionPills}</div>` : ''}
        ${recipe.source_link ? `<a href="${esc(recipe.source_link)}" target="_blank" rel="noopener" class="rd-source-link">View source ↗</a>` : ''}

        <div class="rd-action-bar">
          <button id="detail-edit" type="button">✏️ Edit</button>
          <button id="detail-duplicate" type="button">📋 Copy</button>
          <button id="detail-share" type="button">📤 Share</button>
          <button id="add-to-sl" type="button">🛒 Shop</button>
        </div>

        <div class="rd-section">
          <div class="rd-section-header">
            <h3>Ingredients</h3>
            <div class="serving-adjuster">
              <button id="servings-down" type="button" class="serving-btn">−</button>
              <span id="servings-display">${currentServings}</span>
              <button id="servings-up" type="button" class="serving-btn">+</button>
            </div>
          </div>
          <ul class="rd-ingredients" id="ingredients-list">
            ${renderIngredientsList(recipe.ingredients, baseServings, currentServings)}
          </ul>
        </div>

        <div class="rd-section">
          <h3>Method</h3>
          <div class="rd-method">${esc(recipe.method).replace(/\n/g, '<br>')}</div>
        </div>

        <div class="rd-section">
          <h3>Notes</h3>
          <textarea id="detail-notes" rows="3" maxlength="5000" placeholder="Add cook notes...">${esc(recipe.cook_notes)}</textarea>
          <button id="save-notes" type="button" class="rd-save-btn">Save notes</button>
          <p id="notes-status" class="form-error"></p>
        </div>

        <details class="rd-section rd-nutrition-section">
          <summary>Nutrition (per serving)</summary>
          <div class="nutrition-grid">
            <div class="nutrition-row"><span class="nutr-label">Serving size</span><input id="edit-serving-size" type="text" maxlength="50" value="${esc(recipe.serving_size ?? '')}" placeholder="e.g. 1 bowl" /></div>
            <div class="nutrition-row"><span class="nutr-label">Calories</span><input id="edit-calories" type="number" min="0" step="1" value="${recipe.calories_per_serving ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Protein (g)</span><input id="edit-protein" type="number" min="0" step="0.1" value="${recipe.protein_per_serving ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Total Fat (g)</span><input id="edit-fat" type="number" min="0" step="0.1" value="${recipe.total_fat ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Sat Fat (g)</span><input id="edit-sat-fat" type="number" min="0" step="0.1" value="${recipe.saturated_fat ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Cholesterol (mg)</span><input id="edit-cholesterol" type="number" min="0" step="1" value="${recipe.cholesterol ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Sodium (mg)</span><input id="edit-sodium" type="number" min="0" step="1" value="${recipe.sodium ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Carbs (g)</span><input id="edit-carbs" type="number" min="0" step="0.1" value="${recipe.total_carbohydrate ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Fiber (g)</span><input id="edit-fiber" type="number" min="0" step="0.1" value="${recipe.dietary_fiber ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Sugars (g)</span><input id="edit-sugars" type="number" min="0" step="0.1" value="${recipe.sugars ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Cost (£)</span><input id="edit-cost" type="number" min="0" max="9999.99" step="0.01" value="${recipe.cost_per_portion ?? ''}" /></div>
          </div>
          <button id="save-nutrition" type="button" class="rd-save-btn">Save nutrition</button>
          <p id="nutrition-status" class="form-error"></p>
        </details>

        <div class="rd-danger-zone">
          <button id="delete-recipe" type="button" class="danger-action">Delete recipe</button>
        </div>
        <p id="photo-status" class="form-error"></p>
      </div>
    </section>
  `;

  // === EVENT LISTENERS ===

  container.querySelector<HTMLButtonElement>('#detail-back')!.addEventListener('click', callbacks.onBack);

  container.querySelector<HTMLButtonElement>('#detail-edit')!.addEventListener('click', () => callbacks.onEdit(recipe));

  container.querySelector<HTMLButtonElement>('#detail-duplicate')!.addEventListener('click', async () => {
    const result = await createRecipe({
      name: recipe.name + ' (copy)',
      source_link: recipe.source_link,
      ingredients: recipe.ingredients,
      method: recipe.method,
      time_to_cook_minutes: recipe.time_to_cook_minutes,
      servings: recipe.servings,
      filter_categories: recipe.filter_categories,
      calories_per_serving: recipe.calories_per_serving,
      protein_per_serving: recipe.protein_per_serving,
      cost_per_portion: recipe.cost_per_portion,
    });
    if (result.ok) callbacks.onBack();
  });

  container.querySelector<HTMLButtonElement>('#detail-share')!.addEventListener('click', async () => {
    const text = formatRecipeForShare(recipe);
    if (navigator.share) {
      try { await navigator.share({ title: recipe.name, text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Recipe copied to clipboard!');
    }
  });

  // Photo upload
  container.querySelector<HTMLInputElement>('#photo-upload-input')!.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const statusEl = container.querySelector<HTMLParagraphElement>('#photo-status')!;
    statusEl.textContent = 'Uploading...';
    const result = await uploadRecipePhoto(recipe.id, file);
    if (result.ok && result.path) {
      await updateRecipe(recipe.id, { photo_path: result.path });
      recipe.photo_path = result.path;
      renderRecipeDetail(container, recipe, callbacks);
    } else {
      statusEl.textContent = result.error ?? 'Upload failed.';
    }
  });

  // Rating
  container.querySelectorAll<HTMLButtonElement>('.star-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const val = Number(btn.dataset.rating);
      const rating = val === 0 ? null : val;
      const result = await updateRecipe(recipe.id, { rating });
      if (result.ok) {
        recipe.rating = rating;
        container.querySelector<HTMLSpanElement>('#star-display')!.innerHTML = renderStars(rating);
      }
    });
  });

  // Serving adjuster
  function updateIngredientsDisplay() {
    container.querySelector<HTMLElement>('#ingredients-list')!.innerHTML = renderIngredientsList(recipe.ingredients, baseServings, currentServings);
    container.querySelector<HTMLElement>('#servings-display')!.textContent = String(currentServings);
  }

  container.querySelector<HTMLButtonElement>('#servings-down')!.addEventListener('click', () => {
    if (currentServings > 1) { currentServings--; updateIngredientsDisplay(); }
  });
  container.querySelector<HTMLButtonElement>('#servings-up')!.addEventListener('click', () => {
    if (currentServings < 99) { currentServings++; updateIngredientsDisplay(); }
  });

  // Add to shopping list
  container.querySelector<HTMLButtonElement>('#add-to-sl')!.addEventListener('click', () => {
    const scaled = scaleIngredients(recipe.ingredients, baseServings, currentServings);
    renderAddToShoppingList(container, { ...recipe, ingredients: scaled }, () => renderRecipeDetail(container, recipe, callbacks));
  });

  // Notes
  container.querySelector<HTMLButtonElement>('#save-notes')!.addEventListener('click', async () => {
    const text = container.querySelector<HTMLTextAreaElement>('#detail-notes')!.value;
    const statusEl = container.querySelector<HTMLParagraphElement>('#notes-status')!;
    const result = await updateRecipe(recipe.id, { cook_notes: text });
    statusEl.textContent = result.ok ? 'Saved!' : 'Failed.';
    if (result.ok) recipe.cook_notes = text;
  });

  // Nutrition save
  container.querySelector<HTMLButtonElement>('#save-nutrition')!.addEventListener('click', async () => {
    const val = (id: string) => {
      const el = container.querySelector<HTMLInputElement>(id)!;
      return el.value ? Number(el.value) : null;
    };
    const statusEl = container.querySelector<HTMLParagraphElement>('#nutrition-status')!;
    const result = await updateRecipe(recipe.id, {
      calories_per_serving: val('#edit-calories'),
      protein_per_serving: val('#edit-protein'),
      total_fat: val('#edit-fat'),
      saturated_fat: val('#edit-sat-fat'),
      cholesterol: val('#edit-cholesterol'),
      sodium: val('#edit-sodium'),
      total_carbohydrate: val('#edit-carbs'),
      dietary_fiber: val('#edit-fiber'),
      sugars: val('#edit-sugars'),
      cost_per_portion: val('#edit-cost'),
      serving_size: container.querySelector<HTMLInputElement>('#edit-serving-size')!.value.trim() || null,
    });
    statusEl.textContent = result.ok ? 'Saved!' : 'Failed.';
  });

  // Delete
  container.querySelector<HTMLButtonElement>('#delete-recipe')!.addEventListener('click', async () => {
    const shouldDelete = await showUndoToast('Recipe deleted');
    if (shouldDelete) {
      const result = await deleteRecipe(recipe.id);
      if (result.ok) callbacks.onDeleted();
      else alert('Deletion failed.');
    }
  });
}

// === HELPERS ===

function renderStars(rating: number | null): string {
  if (rating == null) return '<span class="unrated">Not rated</span>';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function formatIngredient(i: { name: string; quantity: number | null; unit: string | null }): string {
  const parts: string[] = [];
  if (i.quantity != null) parts.push(formatQuantity(i.quantity));
  if (i.unit) parts.push(i.unit);
  parts.push(i.name);
  return parts.join(' ');
}

function renderIngredientsList(ingredients: { name: string; quantity: number | null; unit: string | null }[], base: number, current: number): string {
  return scaleIngredients(ingredients, base, current).map(i => `<li>${formatIngredient(i)}</li>`).join('');
}

function buildNutritionPills(recipe: RecipeRecord): string {
  const parts: string[] = [];
  if (recipe.calories_per_serving != null) parts.push(`${recipe.calories_per_serving} kcal`);
  if (recipe.protein_per_serving != null) parts.push(`${recipe.protein_per_serving}g protein`);
  if (recipe.calories_per_serving && recipe.calories_per_serving > 0 && recipe.protein_per_serving != null) {
    parts.push(`${(recipe.protein_per_serving / recipe.calories_per_serving * 1000).toFixed(0)}g/1000kcal`);
  }
  if (parts.length === 0) return '';
  return parts.map(p => `<span class="tag">${p}</span>`).join('');
}

function formatRecipeForShare(recipe: RecipeRecord): string {
  const lines: string[] = [recipe.name, ''];
  if (recipe.servings) lines.push(`Servings: ${recipe.servings}`);
  if (recipe.time_to_cook_minutes) lines.push(`Time: ${recipe.time_to_cook_minutes} min`);
  lines.push('', 'Ingredients:');
  for (const ing of recipe.ingredients) {
    const p: string[] = [];
    if (ing.quantity != null) p.push(String(ing.quantity));
    if (ing.unit) p.push(ing.unit);
    p.push(ing.name);
    lines.push('• ' + p.join(' '));
  }
  lines.push('', 'Method:', recipe.method);
  if (recipe.source_link) lines.push('', `Source: ${recipe.source_link}`);
  return lines.join('\n');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
