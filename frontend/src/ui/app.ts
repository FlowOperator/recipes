import { signOut } from '../lib/auth';
import { renderAddViaLink } from './addViaLink';
import { renderAddViaClaude } from './addViaClaude';
import { renderRecipeForm } from './recipeForm';
import { renderRecipeDetail } from './recipeDetail';
import { listRecipes, getRecipe, type RecipeRecord } from '../lib/recipeStore';
import { getPhotoUrl, getPlaceholderEmoji } from '../lib/photoStorage';
import { filterByCategories, searchByIngredient } from '../lib/recipeFilters';
import { mergeIngredients, applyPantryExclusion, formatShoppingListForExport, type ShoppingListItem } from '../lib/shoppingList';
import { VALID_CATEGORIES } from '../lib/recipeValidation';
import type { ExtractedRecipeFields } from '../lib/recipeTypes';

export function renderApp(container: HTMLElement, onSignOut: () => void): void {
  container.innerHTML = `
    <section class="app-shell">
      <header class="app-header">
        <h1>🍽️ Recipes</h1>
        <button id="signout-button" type="button">Sign out</button>
      </header>
      <main id="app-main"></main>
      <nav class="bottom-nav">
        <button id="nav-browse" type="button" class="nav-active"><span class="nav-icon">📖</span>Recipes</button>
        <button id="nav-link" type="button"><span class="nav-icon">🔗</span>Link</button>
        <button id="nav-claude" type="button"><span class="nav-icon">🤖</span>AI</button>
        <button id="nav-manual" type="button"><span class="nav-icon">✏️</span>Add</button>
        <button id="nav-shop" type="button"><span class="nav-icon">🛒</span>Shop</button>
      </nav>
    </section>
  `;

  container.querySelector<HTMLButtonElement>('#signout-button')!.addEventListener('click', async () => {
    await signOut();
    onSignOut();
  });

  const main = container.querySelector<HTMLElement>('#app-main')!;
  const navButtons = container.querySelectorAll<HTMLButtonElement>('.bottom-nav button');

  function setActiveNav(activeId: string) {
    navButtons.forEach((btn) => btn.classList.toggle('nav-active', btn.id === activeId));
  }

  function showRecipeForm(prefill: ExtractedRecipeFields | null, sourceLink: string | null) {
    renderRecipeForm(main, prefill, sourceLink, {
      onSaved: () => showBrowse(),
      onCancel: () => showBrowse(),
    });
  }

  function showLinkView() {
    setActiveNav('nav-link');
    renderAddViaLink(main, {
      onExtracted: (fields, sourceLink) => showRecipeForm(fields, sourceLink),
      onManualEntry: () => showRecipeForm(null, null),
    });
  }

  function showClaudeView() {
    setActiveNav('nav-claude');
    renderAddViaClaude(main, {
      onExtracted: (fields) => showRecipeForm(fields, null),
      onManualEntry: () => showRecipeForm(null, null),
    });
  }

  function showManualView() {
    setActiveNav('nav-manual');
    showRecipeForm(null, null);
  }

  async function showBrowse() {
    setActiveNav('nav-browse');
    main.innerHTML = '<p>Loading recipes...</p>';
    const recipes = await listRecipes();

    if (recipes.length === 0) {
      main.innerHTML = '<p class="empty-state">No recipes yet. Add your first one using the buttons above.</p>';
      return;
    }

    const filterHtml = VALID_CATEGORIES.map(c =>
      `<label class="filter-chip"><input type="checkbox" value="${c}" /> ${c}</label>`
    ).join('');

    main.innerHTML = `
      <div class="browse-controls">
        <div class="search-row">
          <input id="ingredient-search" type="text" placeholder="Search by ingredient..." maxlength="100" />
        </div>
        <details class="filter-panel">
          <summary>Filter by category</summary>
          <div class="filter-chips">${filterHtml}</div>
        </details>
      </div>
      <div id="recipe-list" class="recipe-grid">${recipes.map(renderRecipeCard).join('')}</div>
      <div class="shopping-section">
        <button id="build-list-btn" type="button">Build shopping list from selected</button>
      </div>
    `;

    let filteredRecipes = recipes;

    function applyFilters() {
      const selectedCats = Array.from(main.querySelectorAll<HTMLInputElement>('.filter-chips input:checked')).map(cb => cb.value);
      const searchTerm = (main.querySelector<HTMLInputElement>('#ingredient-search')!).value;

      filteredRecipes = filterByCategories(recipes, selectedCats);
      if (searchTerm.trim().length > 0) {
        filteredRecipes = searchByIngredient(filteredRecipes, searchTerm);
      }

      const listEl = main.querySelector<HTMLElement>('#recipe-list')!;
      if (filteredRecipes.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No matching recipes found.</p>';
      } else {
        listEl.innerHTML = filteredRecipes.map(renderRecipeCard).join('');
        attachCardListeners(listEl);
      }
    }

    main.querySelectorAll('.filter-chips input').forEach(cb => cb.addEventListener('change', applyFilters));
    main.querySelector<HTMLInputElement>('#ingredient-search')!.addEventListener('input', applyFilters);

    function attachCardListeners(el: HTMLElement) {
      el.querySelectorAll<HTMLElement>('.recipe-card').forEach((card) => {
        card.addEventListener('click', async () => {
          const id = card.dataset.id;
          if (!id) return;
          const recipe = await getRecipe(id);
          if (recipe) {
            renderRecipeDetail(main, recipe, {
              onBack: () => showBrowse(),
              onDeleted: () => showBrowse(),
            });
          }
        });
      });
    }

    attachCardListeners(main.querySelector<HTMLElement>('#recipe-list')!);

    // Shopping list builder
    main.querySelector<HTMLButtonElement>('#build-list-btn')!.addEventListener('click', () => {
      showShoppingList(filteredRecipes);
    });
  }

  function showShoppingList(recipes: RecipeRecord[]) {
    if (recipes.length === 0) {
      main.innerHTML = '<p>Select at least one recipe first (use filters on browse page).</p><button id="sl-back" type="button">Back</button>';
      main.querySelector<HTMLButtonElement>('#sl-back')!.addEventListener('click', () => showBrowse());
      return;
    }

    const pantryDefaults = ['salt', 'pepper', 'oil'];
    const merged = mergeIngredients(recipes.map(r => r.ingredients));
    let items = applyPantryExclusion(merged, pantryDefaults);

    function renderList() {
      const listHtml = items.map((item, i) => `
        <li>${formatItemDisplay(item)} <button class="remove-item" data-index="${i}">✕</button></li>
      `).join('');

      main.innerHTML = `
        <section class="shopping-list-view">
          <button id="sl-back" type="button" class="secondary-action">← Back to recipes</button>
          <h2>Shopping List (${items.length} items)</h2>
          <ul class="sl-items">${listHtml}</ul>
          <div class="sl-add">
            <input id="sl-add-input" type="text" placeholder="Add an item..." maxlength="200" />
            <button id="sl-add-btn" type="button">Add</button>
          </div>
          <button id="sl-export" type="button">Copy to clipboard</button>
          <p id="sl-status" role="alert"></p>
        </section>
      `;

      main.querySelector<HTMLButtonElement>('#sl-back')!.addEventListener('click', () => showBrowse());

      main.querySelectorAll<HTMLButtonElement>('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => {
          items.splice(Number(btn.dataset.index), 1);
          renderList();
        });
      });

      main.querySelector<HTMLButtonElement>('#sl-add-btn')!.addEventListener('click', () => {
        const input = main.querySelector<HTMLInputElement>('#sl-add-input')!;
        const val = input.value.trim();
        if (val && val.length <= 200) {
          items.push({ name: val, quantity: null, unit: null, source: 'manual' });
          renderList();
        }
      });

      main.querySelector<HTMLButtonElement>('#sl-export')!.addEventListener('click', async () => {
        const statusEl = main.querySelector<HTMLParagraphElement>('#sl-status')!;
        if (items.length === 0) {
          statusEl.textContent = 'Nothing to export.';
          return;
        }
        const text = formatShoppingListForExport(items);
        try {
          await navigator.clipboard.writeText(text);
          statusEl.textContent = 'Copied to clipboard!';
        } catch {
          statusEl.textContent = 'Export failed. Try again.';
        }
      });
    }

    renderList();
  }

  container.querySelector<HTMLButtonElement>('#nav-browse')!.addEventListener('click', () => showBrowse());
  container.querySelector<HTMLButtonElement>('#nav-link')!.addEventListener('click', showLinkView);
  container.querySelector<HTMLButtonElement>('#nav-claude')!.addEventListener('click', showClaudeView);
  container.querySelector<HTMLButtonElement>('#nav-manual')!.addEventListener('click', showManualView);
  container.querySelector<HTMLButtonElement>('#nav-shop')!.addEventListener('click', async () => {
    setActiveNav('nav-shop');
    const recipes = await listRecipes();
    showShoppingList(recipes);
  });

  // Default view
  showBrowse();
}

function formatItemDisplay(item: ShoppingListItem): string {
  if (item.quantity != null && item.unit) return `${item.quantity} ${item.unit} ${item.name}`;
  if (item.quantity != null) return `${item.quantity} ${item.name}`;
  return item.name;
}

function renderRecipeCard(recipe: RecipeRecord): string {
  const photoUrl = getPhotoUrl(recipe.photo_path);
  const emoji = getPlaceholderEmoji(recipe.filter_categories);
  const photoHtml = photoUrl
    ? `<img src="${photoUrl}" alt="${escapeAttr(recipe.name)}" class="card-photo" loading="lazy" />`
    : `<div class="card-photo placeholder">${emoji}</div>`;

  const stars = recipe.rating
    ? '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating)
    : '<span class="unrated">Not rated</span>';

  return `
    <article class="recipe-card" data-id="${recipe.id}" role="button" tabindex="0">
      ${photoHtml}
      <div class="card-body">
        <h3>${escapeHtml(recipe.name)}</h3>
        <div class="card-meta">
          <span class="card-rating">${stars}</span>
          ${recipe.time_to_cook_minutes ? `<span>${recipe.time_to_cook_minutes} min</span>` : ''}
          ${recipe.servings ? `<span>${recipe.servings} servings</span>` : ''}
        </div>
        <div class="card-categories">${recipe.filter_categories.map((c) => `<span class="tag">${c}</span>`).join('')}</div>
      </div>
    </article>
  `;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
