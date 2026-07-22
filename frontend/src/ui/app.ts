import { signOut } from '../lib/auth';
import { renderAddViaLink } from './addViaLink';
import { renderAddViaClaude } from './addViaClaude';
import { renderRecipeForm } from './recipeForm';
import { renderRecipeDetail } from './recipeDetail';
import { renderShoppingListView } from './shoppingListView';
import { listRecipes, getRecipe, type RecipeRecord } from '../lib/recipeStore';
import { getPhotoUrl, getPlaceholderEmoji } from '../lib/photoStorage';
import { getPexelsImageUrl } from '../lib/pexelsImages';
import { filterByCategories } from '../lib/recipeFilters';
import { VALID_CATEGORIES, COURSES } from '../lib/recipeValidation';
import type { ExtractedRecipeFields } from '../lib/recipeTypes';

export function renderApp(container: HTMLElement, onSignOut: () => void): void {
  container.innerHTML = `
    <section class="app-shell">
      <header class="app-header">
        <div class="app-header-brand" id="brand-home" style="cursor:pointer">
          <div class="app-header-logo">
            <svg viewBox="0 0 24 24" fill="none"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 13l8 8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
          </div>
          <h1>Nick's Picks</h1>
        </div>
        <div class="app-header-actions">
          <button id="search-toggle" type="button" class="header-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2"/><path d="M20 20l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </header>
      <main id="app-main"></main>
      <nav class="bottom-nav">
        <button id="nav-browse" type="button" class="nav-active">
          <span class="nav-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-7 9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10v9h5v-6h4v6h5v-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          Home
        </button>
        <button id="nav-shop" type="button">
          <span class="nav-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 8h16l-1.4 11a2 2 0 01-2 1.7H7.4a2 2 0 01-2-1.7L4 8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 8V6a4 4 0 018 0v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
          Shopping
        </button>
        <button id="nav-add" type="button" class="nav-add-btn">
          <span class="nav-add-circle"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg></span>
          Add
        </button>
        <button id="nav-planner" type="button">
          <span class="nav-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
          Planner
        </button>
        <button id="nav-settings" type="button">
          <span class="nav-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
          Settings
        </button>
      </nav>
    </section>
  `;

  container.querySelector<HTMLButtonElement>('#search-toggle')!.addEventListener('click', () => {
    // Focus the search input if we're on browse, otherwise go to browse
    if (!main.querySelector('#ingredient-search')) {
      showBrowse();
    }
    setTimeout(() => {
      main.querySelector<HTMLInputElement>('#ingredient-search')?.focus();
    }, 50);
  });

  container.querySelector<HTMLElement>('#brand-home')!.addEventListener('click', () => {
    showBrowse();
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

  function showAddMenu() {
    setActiveNav('nav-add');
    main.innerHTML = `
      <section class="add-menu-view" style="padding-top:12px;">
        <h2 style="font:700 26px/1.2 var(--font-heading);color:var(--text-dark);margin-bottom:6px">Add a recipe</h2>
        <p style="font:400 14px/1.4 var(--font-body);color:var(--text-mid);margin-bottom:20px">Choose how you'd like to bring it in</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <button id="add-ai" type="button" class="add-option-card">
            <span class="add-option-icon" style="background:var(--terracotta)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="#fff"/></svg>
            </span>
            <span class="add-option-text">
              <strong>AI Import</strong>
              <small>Paste a photo, video link, or description — AI fills in the details</small>
            </span>
          </button>
          <button id="add-link" type="button" class="add-option-card">
            <span class="add-option-icon" style="background:var(--olive)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
            </span>
            <span class="add-option-text">
              <strong>From a link</strong>
              <small>Paste a URL and auto-extract the recipe</small>
            </span>
          </button>
          <button id="add-manual" type="button" class="add-option-card">
            <span class="add-option-icon" style="background:var(--text-muted)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span class="add-option-text">
              <strong>Manual entry</strong>
              <small>Type it in yourself from scratch</small>
            </span>
          </button>
        </div>
      </section>
    `;

    container.querySelector<HTMLButtonElement>('#add-ai')!.addEventListener('click', showClaudeView);
    container.querySelector<HTMLButtonElement>('#add-link')!.addEventListener('click', showLinkView);
    container.querySelector<HTMLButtonElement>('#add-manual')!.addEventListener('click', showManualView);
  }

  function showLinkView() {
    setActiveNav('nav-add');
    renderAddViaLink(main, {
      onExtracted: (fields, sourceLink) => showRecipeForm(fields, sourceLink),
      onManualEntry: () => showRecipeForm(null, null),
    });
  }

  function showClaudeView() {
    setActiveNav('nav-add');
    renderAddViaClaude(main, {
      onExtracted: (fields) => showRecipeForm(fields, null),
      onManualEntry: () => showRecipeForm(null, null),
    });
  }

  function showManualView() {
    setActiveNav('nav-add');
    showRecipeForm(null, null);
  }

  function showPlannerView() {
    setActiveNav('nav-planner');
    main.innerHTML = `
      <section class="planner-view">
        <h2>Meal Planner</h2>
        <p>🚧 In development — coming soon!</p>
      </section>
    `;
  }

  function showSettingsView() {
    setActiveNav('nav-settings');
    main.innerHTML = `
      <section class="settings-view">
        <h2>Settings</h2>
        <div class="settings-item">
          <span>Account</span>
          <button id="settings-signout" type="button">Sign out</button>
        </div>
      </section>
    `;
    container.querySelector<HTMLButtonElement>('#settings-signout')!.addEventListener('click', async () => {
      await signOut();
      onSignOut();
    });
  }

  function showEditForm(recipe: RecipeRecord) {
    // Split filter_categories back into courses vs categories
    const allTags = recipe.filter_categories || [];
    const courses = allTags.filter(t => COURSES.includes(t));
    const categories = allTags.filter(t => !COURSES.includes(t));

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
      mealType: categories.filter(t => VALID_CATEGORIES.includes(t)),
      course: courses,
      category: categories.filter(t => !VALID_CATEGORIES.includes(t)),
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
      main.innerHTML = `
        <div class="empty-state-hero">
          <div class="empty-state-icon">🍳</div>
          <h2>No recipes yet</h2>
          <p>Tap the + button to add your first recipe — import from a link, use AI, or type it in manually.</p>
        </div>
      `;
      return;
    }

    // Collect all unique categories across recipes for the filter bar
    const allCats = [...new Set(recipes.flatMap(r => r.filter_categories))].sort();
    const filterChipsHtml = allCats.map(c =>
      `<button class="filter-chip-btn" data-cat="${c}">${c}</button>`
    ).join('');

    main.innerHTML = `
      <div class="browse-controls">
        <div class="search-row">
          <input id="recipe-search" type="text" placeholder="Search recipes..." maxlength="100" />
        </div>
        <div class="sort-row">
          <button id="sort-protein" type="button" class="sort-btn">Protein/cal ↓</button>
          <button id="sort-stars" type="button" class="sort-btn">Rating ↓</button>
          <select id="filter-stars" class="sort-btn">
            <option value="">All ratings</option>
            <option value="5">★★★★★</option>
            <option value="4">★★★★+</option>
            <option value="3">★★★+</option>
          </select>
        </div>
        <div class="filter-bar" id="filter-bar">${filterChipsHtml}</div>
      </div>
      <div id="recipe-list" class="recipe-grid">${recipes.map(renderRecipeCard).join('')}</div>
    `;

    let filteredRecipes = recipes;
    let sortByProtein = false;
    let sortByStars = false;
    const activeFilters = new Set<string>();

    function applyFilters() {
      const searchTerm = (main.querySelector<HTMLInputElement>('#recipe-search')!).value.trim().toLowerCase();
      const minStars = (main.querySelector<HTMLSelectElement>('#filter-stars')!).value;

      filteredRecipes = recipes;

      // Category filter
      if (activeFilters.size > 0) {
        filteredRecipes = filterByCategories(filteredRecipes, [...activeFilters]);
      }

      // Search by name and ingredient
      if (searchTerm.length > 0) {
        filteredRecipes = filteredRecipes.filter(r =>
          r.name.toLowerCase().includes(searchTerm) ||
          r.ingredients.some(ing => ing.name.toLowerCase().includes(searchTerm))
        );
      }

      // Rating filter
      if (minStars) {
        const min = Number(minStars);
        filteredRecipes = filteredRecipes.filter(r => (r.rating ?? 0) >= min);
      }

      // Sort
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

    // Filter chip toggle
    main.querySelectorAll<HTMLButtonElement>('.filter-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat!;
        if (activeFilters.has(cat)) {
          activeFilters.delete(cat);
          btn.classList.remove('active');
        } else {
          activeFilters.add(cat);
          btn.classList.add('active');
        }
        applyFilters();
      });
    });

    main.querySelector<HTMLInputElement>('#recipe-search')!.addEventListener('input', applyFilters);
    main.querySelector<HTMLButtonElement>('#sort-protein')!.addEventListener('click', () => {
      sortByProtein = !sortByProtein;
      sortByStars = false;
      const btn = main.querySelector<HTMLButtonElement>('#sort-protein')!;
      const btn2 = main.querySelector<HTMLButtonElement>('#sort-stars')!;
      btn.classList.toggle('sort-active', sortByProtein);
      btn2.classList.remove('sort-active');
      btn.textContent = sortByProtein ? 'Protein/cal ↓ ✓' : 'Protein/cal ↓';
      btn2.textContent = 'Rating ↓';
      applyFilters();
    });

    main.querySelector<HTMLButtonElement>('#sort-stars')!.addEventListener('click', () => {
      sortByStars = !sortByStars;
      sortByProtein = false;
      const btn = main.querySelector<HTMLButtonElement>('#sort-stars')!;
      const btn2 = main.querySelector<HTMLButtonElement>('#sort-protein')!;
      btn.classList.toggle('sort-active', sortByStars);
      btn2.classList.remove('sort-active');
      btn.textContent = sortByStars ? 'Rating ↓ ✓' : 'Rating ↓';
      btn2.textContent = 'Protein/cal ↓';
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
  container.querySelector<HTMLButtonElement>('#nav-add')!.addEventListener('click', showAddMenu);
  container.querySelector<HTMLButtonElement>('#nav-shop')!.addEventListener('click', async () => {
    setActiveNav('nav-shop');
    renderShoppingListView(main);
  });
  container.querySelector<HTMLButtonElement>('#nav-planner')!.addEventListener('click', showPlannerView);
  container.querySelector<HTMLButtonElement>('#nav-settings')!.addEventListener('click', showSettingsView);

  // Default view
  showBrowse();
}

function buildNutritionBadge(recipe: RecipeRecord): string {
  if (recipe.calories_per_serving == null && recipe.protein_per_serving == null) return '';

  const parts: string[] = [];
  if (recipe.calories_per_serving != null) parts.push(`${recipe.calories_per_serving} kcal`);
  if (recipe.protein_per_serving != null) parts.push(`${recipe.protein_per_serving}g protein`);

  let ratioHtml = '';
  if (recipe.calories_per_serving && recipe.calories_per_serving > 0 && recipe.protein_per_serving != null) {
    const ratio = (recipe.protein_per_serving / recipe.calories_per_serving * 1000);
    const ratioRounded = ratio.toFixed(0);
    parts.push(`${ratioRounded}g/1000kcal`);

    // Visual bar: scale 0-150g/1000kcal range, capped at 100%
    const pct = Math.min(ratio / 150 * 100, 100);
    // Colour: green for high protein, amber for mid, red-ish for low
    const hue = Math.min(ratio * 0.8, 120); // 0=red, 60=yellow, 120=green
    ratioHtml = `<div class="protein-bar"><div class="protein-bar-fill" style="width:${pct}%;background:hsl(${hue},65%,45%)"></div></div>`;
  }

  return `<div class="card-nutrition">${parts.map(p => `<span>${p}</span>`).join('')}</div>${ratioHtml}`;
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
