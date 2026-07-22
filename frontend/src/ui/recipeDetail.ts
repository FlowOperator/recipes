import type { RecipeRecord } from '../lib/recipeStore';
import { updateRecipe, deleteRecipe, createRecipe } from '../lib/recipeStore';
import { getPhotoUrl, uploadRecipePhoto } from '../lib/photoStorage';
import { getPexelsImageUrl } from '../lib/pexelsImages';
import { renderAddToShoppingList } from './addToShoppingList';
import { scaleIngredients, formatQuantity } from '../lib/ingredientScaling';

export interface RecipeDetailCallbacks {
  onBack: () => void;
  onDeleted: () => void;
  onEdit: (recipe: RecipeRecord) => void;
}

export function renderRecipeDetail(container: HTMLElement, recipe: RecipeRecord, callbacks: RecipeDetailCallbacks): void {
  const photoUrl = getPhotoUrl(recipe.photo_path);
  const photoHtml = photoUrl
    ? `<img src="${photoUrl}" alt="${esc(recipe.name)}" class="detail-photo" />`
    : `<div class="detail-photo placeholder" id="detail-photo-placeholder">🍽️</div>`;

  const stars = renderStars(recipe.rating);
  const baseServings = recipe.servings ?? 1;
  let currentServings = baseServings;

  // Load Pexels image asynchronously for detail view if no uploaded photo
  if (!photoUrl) {
    getPexelsImageUrl(recipe.name).then((url) => {
      if (url) {
        const placeholder = container.querySelector('#detail-photo-placeholder');
        if (placeholder) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = recipe.name;
          img.className = 'detail-photo';
          placeholder.replaceWith(img);
        }
      }
    });
  }

  container.innerHTML = `
    <section class="recipe-detail">
      <button id="detail-back" type="button" class="secondary-action">← Back</button>
      <div class="detail-action-row">
        <button id="detail-edit" type="button" class="btn-secondary">✏️ Edit</button>
        <button id="detail-duplicate" type="button" class="btn-secondary">📋 Duplicate</button>
        <button id="detail-share" type="button" class="btn-secondary">📤 Share</button>
      </div>
      ${photoHtml}
      <label class="photo-upload-btn" for="photo-upload-input">📷 ${photoUrl ? 'Change photo' : 'Add photo'}</label>
      <input id="photo-upload-input" type="file" accept="image/jpeg,image/png,image/webp" class="hidden-file-input" />
      <p id="photo-status" class="form-error"></p>
      <h2>${esc(recipe.name)}</h2>
      ${recipe.source_link ? `<a href="${esc(recipe.source_link)}" target="_blank" rel="noopener">Source</a>` : ''}

      <div class="detail-rating">
        <span>Rating:</span>
        <span id="star-display" class="stars">${stars}</span>
        <span class="star-buttons">${[1,2,3,4,5].map(n => `<button class="star-btn" data-rating="${n}">${n}★</button>`).join('')}
          <button class="star-btn" data-rating="0">Clear</button>
        </span>
      </div>

      <div class="detail-meta">
        ${recipe.time_to_cook_minutes ? `<span>⏱️ ${recipe.time_to_cook_minutes} min</span>` : ''}
        ${recipe.servings ? `<span>🍽️ ${recipe.servings} servings</span>` : ''}
        ${recipe.cost_per_portion != null ? `<span>💰 £${recipe.cost_per_portion.toFixed(2)}/portion</span>` : ''}
      </div>

      <div class="detail-nutrition">
        <h3>Nutrition (per serving)</h3>
        <div class="nutrition-grid">
            <div class="nutrition-row"><span class="nutr-label">Serving size</span><input id="edit-serving-size" type="text" maxlength="50" value="${esc(recipe.serving_size ?? '')}" placeholder="e.g. 1 bowl" /></div>
            <div class="nutrition-row"><span class="nutr-label">Calories</span><input id="edit-calories" type="number" min="0" step="1" value="${recipe.calories_per_serving ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Protein (g)</span><input id="edit-protein" type="number" min="0" step="0.1" value="${recipe.protein_per_serving ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Total Fat (g)</span><input id="edit-fat" type="number" min="0" step="0.1" value="${recipe.total_fat ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Saturated Fat (g)</span><input id="edit-sat-fat" type="number" min="0" step="0.1" value="${recipe.saturated_fat ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Cholesterol (mg)</span><input id="edit-cholesterol" type="number" min="0" step="1" value="${recipe.cholesterol ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Sodium (mg)</span><input id="edit-sodium" type="number" min="0" step="1" value="${recipe.sodium ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Carbohydrates (g)</span><input id="edit-carbs" type="number" min="0" step="0.1" value="${recipe.total_carbohydrate ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Dietary Fiber (g)</span><input id="edit-fiber" type="number" min="0" step="0.1" value="${recipe.dietary_fiber ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Sugars (g)</span><input id="edit-sugars" type="number" min="0" step="0.1" value="${recipe.sugars ?? ''}" /></div>
            <div class="nutrition-row"><span class="nutr-label">Cost/portion (£)</span><input id="edit-cost" type="number" min="0" max="9999.99" step="0.01" value="${recipe.cost_per_portion ?? ''}" /></div>
          </div>
          <button id="save-nutrition" type="button" class="btn-primary" style="margin-top:12px">Save nutrition</button>
          <p id="nutrition-status" class="form-error" role="alert"></p>
      </div>

      <div class="detail-categories">${recipe.filter_categories.map(c => `<span class="tag">${c}</span>`).join('')}</div>

      <h3>Ingredients</h3>
      <div class="serving-adjuster">
        <button id="servings-down" type="button" class="serving-btn">−</button>
        <span id="servings-display">${baseServings} servings</span>
        <button id="servings-up" type="button" class="serving-btn">+</button>
        ${recipe.servings ? `<span class="serving-base">(recipe is for ${recipe.servings})</span>` : ''}
      </div>
      <ul class="detail-ingredients" id="ingredients-list">
        ${renderIngredientsList(recipe.ingredients, baseServings, currentServings)}
      </ul>
      <button id="add-to-sl" type="button" class="btn-primary" style="margin-top:8px">🛒 Add to shopping list</button>

      <h3>Method</h3>
      <div class="detail-method">${esc(recipe.method).replace(/\n/g, '<br>')}</div>

      <h3>Cook Notes</h3>
      <textarea id="detail-notes" rows="4" maxlength="5000">${esc(recipe.cook_notes)}</textarea>
      <button id="save-notes" type="button">Save notes</button>
      <p id="notes-status" class="signin-error" role="alert"></p>

      <div class="detail-actions">
        <button id="delete-recipe" type="button" class="danger-action">Delete recipe</button>
      </div>
    </section>
  `;

  // Back
  container.querySelector<HTMLButtonElement>('#detail-back')!.addEventListener('click', callbacks.onBack);

  // Edit
  container.querySelector<HTMLButtonElement>('#detail-edit')!.addEventListener('click', () => {
    callbacks.onEdit(recipe);
  });

  // Duplicate
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
    if (result.ok) {
      callbacks.onBack();
    }
  });

  // Share / Export
  container.querySelector<HTMLButtonElement>('#detail-share')!.addEventListener('click', async () => {
    const text = formatRecipeForShare(recipe);
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.name, text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Recipe copied to clipboard!');
    }
  });

  // Photo upload
  container.querySelector<HTMLInputElement>('#photo-upload-input')!.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const statusEl = container.querySelector<HTMLParagraphElement>('#photo-status')!;
    statusEl.textContent = 'Uploading...';
    statusEl.style.color = 'var(--text-light)';
    const result = await uploadRecipePhoto(recipe.id, file);
    if (result.ok && result.path) {
      await updateRecipe(recipe.id, { photo_path: result.path });
      recipe.photo_path = result.path;
      statusEl.textContent = '';
      // Re-render to show new photo
      renderRecipeDetail(container, recipe, callbacks);
    } else {
      statusEl.textContent = result.error ?? 'Upload failed.';
      statusEl.style.color = 'var(--error)';
    }
  });

  // Rating
  container.querySelectorAll<HTMLButtonElement>('.star-btn').forEach((btn) => {
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

  // Cook notes
  container.querySelector<HTMLButtonElement>('#save-notes')!.addEventListener('click', async () => {
    const textarea = container.querySelector<HTMLTextAreaElement>('#detail-notes')!;
    const statusEl = container.querySelector<HTMLParagraphElement>('#notes-status')!;
    const result = await updateRecipe(recipe.id, { cook_notes: textarea.value });
    statusEl.textContent = result.ok ? 'Notes saved.' : 'Failed to save notes.';
    if (result.ok) recipe.cook_notes = textarea.value;
  });

  // Save nutrition & cost
  container.querySelector<HTMLButtonElement>('#save-nutrition')!.addEventListener('click', async () => {
    const val = (id: string) => {
      const el = container.querySelector<HTMLInputElement>(id)!;
      return el.value ? Number(el.value) : null;
    };
    const statusEl = container.querySelector<HTMLParagraphElement>('#nutrition-status')!;
    const servingSize = container.querySelector<HTMLInputElement>('#edit-serving-size')!.value.trim() || null;

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
      serving_size: servingSize,
    });

    if (result.ok) {
      statusEl.textContent = 'Saved!';
      statusEl.style.color = 'var(--primary)';
    } else {
      statusEl.textContent = 'Failed to save.';
    }
  });

  // Serving adjuster
  function updateIngredientsDisplay() {
    const list = container.querySelector<HTMLElement>('#ingredients-list')!;
    list.innerHTML = renderIngredientsList(recipe.ingredients, baseServings, currentServings);
    const display = container.querySelector<HTMLElement>('#servings-display')!;
    display.textContent = `${currentServings} serving${currentServings !== 1 ? 's' : ''}`;
  }

  container.querySelector<HTMLButtonElement>('#servings-down')!.addEventListener('click', () => {
    if (currentServings > 1) {
      currentServings--;
      updateIngredientsDisplay();
    }
  });

  container.querySelector<HTMLButtonElement>('#servings-up')!.addEventListener('click', () => {
    if (currentServings < 99) {
      currentServings++;
      updateIngredientsDisplay();
    }
  });

  // Add to shopping list (uses scaled quantities)
  container.querySelector<HTMLButtonElement>('#add-to-sl')!.addEventListener('click', () => {
    const scaledIngredients = scaleIngredients(recipe.ingredients, baseServings, currentServings);
    const scaledRecipe = { ...recipe, ingredients: scaledIngredients };
    renderAddToShoppingList(container, scaledRecipe, () => {
      renderRecipeDetail(container, recipe, callbacks);
    });
  });

  // Delete
  container.querySelector<HTMLButtonElement>('#delete-recipe')!.addEventListener('click', async () => {
    if (!confirm('Delete this recipe? This cannot be undone.')) return;
    const result = await deleteRecipe(recipe.id);
    if (result.ok) {
      callbacks.onDeleted();
    } else {
      alert('Deletion failed. Recipe has been left unchanged.');
    }
  });
}

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

function renderIngredientsList(
  ingredients: { name: string; quantity: number | null; unit: string | null }[],
  baseServings: number,
  currentServings: number
): string {
  const scaled = scaleIngredients(ingredients, baseServings, currentServings);
  return scaled.map(i => `<li>${formatIngredient(i)}</li>`).join('');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRecipeForShare(recipe: RecipeRecord): string {
  const lines: string[] = [];
  lines.push(recipe.name);
  lines.push('');
  if (recipe.servings) lines.push(`Servings: ${recipe.servings}`);
  if (recipe.time_to_cook_minutes) lines.push(`Time: ${recipe.time_to_cook_minutes} min`);
  lines.push('');
  lines.push('Ingredients:');
  for (const ing of recipe.ingredients) {
    const parts: string[] = [];
    if (ing.quantity != null) parts.push(String(ing.quantity));
    if (ing.unit) parts.push(ing.unit);
    parts.push(ing.name);
    lines.push('• ' + parts.join(' '));
  }
  lines.push('');
  lines.push('Method:');
  lines.push(recipe.method);
  if (recipe.source_link) {
    lines.push('');
    lines.push(`Source: ${recipe.source_link}`);
  }
  return lines.join('\n');
}
