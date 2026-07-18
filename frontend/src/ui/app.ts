import { signOut } from '../lib/auth';
import { renderAddViaLink } from './addViaLink';
import { renderAddViaClaude } from './addViaClaude';
import { renderRecipeForm } from './recipeForm';
import { renderRecipeDetail } from './recipeDetail';
import { renderShoppingListView } from './shoppingListView';
import { listRecipes, getRecipe, type RecipeRecord } from '../lib/recipeStore';
import { getPhotoUrl, getPlaceholderEmoji } from '../lib/photoStorage';
import { getPexelsImageUrl } from '../lib/pexelsImages';
import { filterByCategories, searchByIngredient } from '../lib/recipeFilters';
import { VALID_CATEGORIES, COURSES, FOOD_CATEGORIES } from '../lib/recipeValidation';
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

  function showEditForm(recipe: RecipeRecord) {
    // Split filter_categories back into the three groups for the form checkboxes
    const allTags = recipe.filter_categories || [];
    const mealTypes = allTags.filter(t => VALID_CATEGORIES.includes(t));
    const courses = allTags.filter(t => COURSES.includes(t));
    const foodCats = allTags.filter(t => FOOD_CATEGORIES.includes(t));
    // Any custom tags that don't match built-in lists go to mealType (they'll render as custom chips)
    const customTags = allTags.filter(t => !VALID_CATEGORIES.includes(t) && !COURSES.includes(t) && !FOOD_CATEGORIES.includes(t));

    const prefill = {
      name: recipe.name,
      sourceLink: recipe.source_link ?? undefined,
      ingredients: recipe.ingredients,
      method: recipe.method,
      timeToCookMinutes: recipe.time_to_cook_minutes ?? undefined,
      servings: recipe.servings ?? undefined,
      caloriesPerServing: recipe.calories_per_serving ?? undefined,
      proteinPerServing: recipe.protein_per_serving ?? undefined,
      costPerServing: recipe.cost_per_portion ?? undefined,
      mealType: [...mealTypes, ...customTags],
      course: courses,
      category: foodCats,
    };
    renderRecipeForm(main, prefill, recipe.source_link, {
      onSaved: () => showBrowse(),
      onCancel: () => showBrowse(),
    }, recipe.id);
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
        <div class="sort-row">
          <button id="sort-protein" type="button" class="sort-btn">Sort: Protein/cal ↓</button>
          <button id="sort-stars" type="button" class="sort-btn">Sort: Rating ↓</button>
          <select id="filter-stars" class="sort-btn">
            <option value="">All ratings</option>
            <option value="5">★★★★★</option>
            <option value="4">★★★★+</option>
            <option value="3">★★★+</option>
          </select>
        </div>
        <details class="filter-panel">
          <summary>Filter by category</summary>
          <div class="filter-chips">${filterHtml}</div>
        </details>
      </div>
      <div id="recipe-list" class="recipe-grid">${recipes.map(renderRecipeCard).join('')}</div>
      <div class="shopping-section">
      </div>
    `;

    let filteredRecipes = recipes;

    let sortByProtein = false;
    let sortByStars = false;

    function applyFilters() {
      const selectedCats = Array.from(main.querySelectorAll<HTMLInputElement>('.filter-chips input:checked')).map(cb => cb.value);
      const searchTerm = (main.querySelector<HTMLInputElement>('#ingredient-search')!).value;
      const minStars = (main.querySelector<HTMLSelectElement>('#filter-stars')!).value;

      filteredRecipes = filterByCategories(recipes, selectedCats);
      if (searchTerm.trim().length > 0) {
        filteredRecipes = searchByIngredient(filteredRecipes, searchTerm);
      }
      if (minStars) {
        const min = Number(minStars);
        filteredRecipes = filteredRecipes.filter(r => (r.rating ?? 0) >= min);
      }
      if (sortByProtein) {
        filteredRecipes = [...filteredRecipes].sort((a, b) => {
          const ratioA = (a.calories_per_serving && a.calories_per_serving > 0 && a.protein_per_serving != null)
            ? a.protein_per_serving / a.calories_per_serving : 0;
          const ratioB = (b.calories_per_serving && b.calories_per_serving > 0 && b.protein_per_serving != null)
            ? b.protein_per_serving / b.calories_per_serving : 0;
          return ratioB - ratioA;
        });
      }
      if (sortByStars) {
        filteredRecipes = [...filteredRecipes].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
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
    main.querySelector<HTMLButtonElement>('#sort-protein')!.addEventListener('click', () => {
      sortByProtein = !sortByProtein;
      sortByStars = false;
      const btn = main.querySelector<HTMLButtonElement>('#sort-protein')!;
      const btn2 = main.querySelector<HTMLButtonElement>('#sort-stars')!;
      btn.classList.toggle('sort-active', sortByProtein);
      btn2.classList.remove('sort-active');
      btn.textContent = sortByProtein ? 'Sort: Protein/cal ↓ ✓' : 'Sort: Protein/cal ↓';
      btn2.textContent = 'Sort: Rating ↓';
      applyFilters();
    });

    main.querySelector<HTMLButtonElement>('#sort-stars')!.addEventListener('click', () => {
      sortByStars = !sortByStars;
      sortByProtein = false;
      const btn = main.querySelector<HTMLButtonElement>('#sort-stars')!;
      const btn2 = main.querySelector<HTMLButtonElement>('#sort-protein')!;
      btn.classList.toggle('sort-active', sortByStars);
      btn2.classList.remove('sort-active');
      btn.textContent = sortByStars ? 'Sort: Rating ↓ ✓' : 'Sort: Rating ↓';
      btn2.textContent = 'Sort: Protein/cal ↓';
      applyFilters();
    });

    main.querySelector<HTMLSelectElement>('#filter-stars')!.addEventListener('change', applyFilters);

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
              onEdit: (r) => showEditForm(r),
            });
          }
        });
      });

      // Lazy-load Pexels images for cards without uploaded photos
      el.querySelectorAll<HTMLElement>('.card-photo.placeholder').forEach(async (placeholder) => {
        const name = placeholder.dataset.recipeName;
        if (!name) return;
        const url = await getPexelsImageUrl(name);
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = name;
          img.className = 'card-photo';
          img.loading = 'lazy';
          placeholder.replaceWith(img);
        }
      });
    }

    attachCardListeners(main.querySelector<HTMLElement>('#recipe-list')!);
  }

  container.querySelector<HTMLButtonElement>('#nav-browse')!.addEventListener('click', () => showBrowse());
  container.querySelector<HTMLButtonElement>('#nav-link')!.addEventListener('click', showLinkView);
  container.querySelector<HTMLButtonElement>('#nav-claude')!.addEventListener('click', showClaudeView);
  container.querySelector<HTMLButtonElement>('#nav-manual')!.addEventListener('click', showManualView);
  container.querySelector<HTMLButtonElement>('#nav-shop')!.addEventListener('click', async () => {
    setActiveNav('nav-shop');
    renderShoppingListView(main);
  });

  // Default view
  showBrowse();
}

function buildNutritionBadge(recipe: RecipeRecord): string {
  if (recipe.calories_per_serving == null && recipe.protein_per_serving == null) return '';

  const parts: string[] = [];
  if (recipe.calories_per_serving != null) parts.push(`${recipe.calories_per_serving} kcal`);
  if (recipe.protein_per_serving != null) parts.push(`${recipe.protein_per_serving}g protein`);
  if (recipe.calories_per_serving && recipe.calories_per_serving > 0 && recipe.protein_per_serving != null) {
    const ratio = (recipe.protein_per_serving / recipe.calories_per_serving * 1000).toFixed(0);
    parts.push(`${ratio}g/1000kcal`);
  }

  return `<div class="card-nutrition">${parts.map(p => `<span>${p}</span>`).join('')}</div>`;
}

function renderRecipeCard(recipe: RecipeRecord): string {
  const photoUrl = getPhotoUrl(recipe.photo_path);
  const emoji = getPlaceholderEmoji(recipe.filter_categories);
  const photoHtml = photoUrl
    ? `<img src="${photoUrl}" alt="${escapeAttr(recipe.name)}" class="card-photo" loading="lazy" />`
    : `<div class="card-photo placeholder" data-recipe-name="${escapeAttr(recipe.name)}">${emoji}</div>`;

  const stars = recipe.rating
    ? '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating)
    : '<span class="unrated">Not rated</span>';

  const nutritionHtml = buildNutritionBadge(recipe);

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
        ${nutritionHtml}
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
