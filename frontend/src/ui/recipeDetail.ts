import type { RecipeRecord } from '../lib/recipeStore';
import { updateRecipe, deleteRecipe } from '../lib/recipeStore';
import { getPhotoUrl } from '../lib/photoStorage';
import { renderAddToShoppingList } from './addToShoppingList';

export interface RecipeDetailCallbacks {
  onBack: () => void;
  onDeleted: () => void;
}

export function renderRecipeDetail(container: HTMLElement, recipe: RecipeRecord, callbacks: RecipeDetailCallbacks): void {
  const photoUrl = getPhotoUrl(recipe.photo_path);
  const photoHtml = photoUrl
    ? `<img src="${photoUrl}" alt="${esc(recipe.name)}" class="detail-photo" />`
    : `<div class="detail-photo placeholder">🍽️</div>`;

  const stars = renderStars(recipe.rating);
  const ratio = computeRatio(recipe.calories_per_serving, recipe.protein_per_serving);

  container.innerHTML = `
    <section class="recipe-detail">
      <button id="detail-back" type="button" class="secondary-action">← Back</button>
      ${photoHtml}
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
        <div class="detail-edit-row">
          <label>Serving size</label>
          <input id="edit-serving-size" type="text" maxlength="50" value="${esc(recipe.serving_size ?? '')}" placeholder="e.g. 1 bowl" />
        </div>
        <div class="detail-edit-row">
          <label>Calories</label>
          <input id="edit-calories" type="number" min="0" step="1" value="${recipe.calories_per_serving ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Total Fat (g)</label>
          <input id="edit-fat" type="number" min="0" step="0.1" value="${recipe.total_fat ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Saturated Fat (g)</label>
          <input id="edit-sat-fat" type="number" min="0" step="0.1" value="${recipe.saturated_fat ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Cholesterol (mg)</label>
          <input id="edit-cholesterol" type="number" min="0" step="1" value="${recipe.cholesterol ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Sodium (mg)</label>
          <input id="edit-sodium" type="number" min="0" step="1" value="${recipe.sodium ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Carbohydrates (g)</label>
          <input id="edit-carbs" type="number" min="0" step="0.1" value="${recipe.total_carbohydrate ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Dietary Fiber (g)</label>
          <input id="edit-fiber" type="number" min="0" step="0.1" value="${recipe.dietary_fiber ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Sugars (g)</label>
          <input id="edit-sugars" type="number" min="0" step="0.1" value="${recipe.sugars ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Protein (g)</label>
          <input id="edit-protein" type="number" min="0" step="0.1" value="${recipe.protein_per_serving ?? ''}" />
        </div>
        <div class="detail-edit-row">
          <label>Cost/portion (£)</label>
          <input id="edit-cost" type="number" min="0" max="9999.99" step="0.01" value="${recipe.cost_per_portion ?? ''}" />
        </div>
        <button id="save-nutrition" type="button">Save nutrition & cost</button>
        <p id="nutrition-status" class="form-error" role="alert"></p>
        <span class="ratio-display">Protein/cal ratio: ${ratio}</span>
      </div>

      <div class="detail-categories">${recipe.filter_categories.map(c => `<span class="tag">${c}</span>`).join('')}</div>

      <h3>Ingredients</h3>
      <ul class="detail-ingredients">
        ${recipe.ingredients.map(i => `<li>${formatIngredient(i)}</li>`).join('')}
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

  // Add to shopping list
  container.querySelector<HTMLButtonElement>('#add-to-sl')!.addEventListener('click', () => {
    renderAddToShoppingList(container, recipe, () => {
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

function computeRatio(cal: number | null, protein: number | null): string {
  if (cal == null || protein == null || cal <= 0) return 'N/A';
  return (protein / cal).toFixed(3);
}

function formatIngredient(i: { name: string; quantity: number | null; unit: string | null }): string {
  const parts: string[] = [];
  if (i.quantity != null) parts.push(String(i.quantity));
  if (i.unit) parts.push(i.unit);
  parts.push(i.name);
  return parts.join(' ');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
