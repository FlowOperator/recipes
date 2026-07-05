import { signOut } from '../lib/auth';
import { renderAddViaLink } from './addViaLink';
import { renderAddViaClaude } from './addViaClaude';
import { renderRecipeForm } from './recipeForm';
import { listRecipes, type RecipeRecord } from '../lib/recipeStore';
import { getPhotoUrl } from '../lib/photoStorage';
import type { ExtractedRecipeFields } from '../lib/recipeTypes';

export function renderApp(container: HTMLElement, onSignOut: () => void): void {
  container.innerHTML = `
    <section class="app-shell">
      <header class="app-header">
        <h1>Recipes</h1>
        <button id="signout-button" type="button">Sign out</button>
      </header>
      <nav class="add-nav">
        <button id="nav-browse" type="button" class="nav-active">My recipes</button>
        <button id="nav-link" type="button">+ Link</button>
        <button id="nav-claude" type="button">+ Claude AI</button>
        <button id="nav-manual" type="button">+ Manual</button>
      </nav>
      <main id="app-main"></main>
    </section>
  `;

  container.querySelector<HTMLButtonElement>('#signout-button')!.addEventListener('click', async () => {
    await signOut();
    onSignOut();
  });

  const main = container.querySelector<HTMLElement>('#app-main')!;
  const navButtons = container.querySelectorAll<HTMLButtonElement>('.add-nav button');

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

    main.innerHTML = `<div class="recipe-grid">${recipes.map(renderRecipeCard).join('')}</div>`;
  }

  container.querySelector<HTMLButtonElement>('#nav-browse')!.addEventListener('click', () => showBrowse());
  container.querySelector<HTMLButtonElement>('#nav-link')!.addEventListener('click', showLinkView);
  container.querySelector<HTMLButtonElement>('#nav-claude')!.addEventListener('click', showClaudeView);
  container.querySelector<HTMLButtonElement>('#nav-manual')!.addEventListener('click', showManualView);

  // Default view
  showBrowse();
}

function renderRecipeCard(recipe: RecipeRecord): string {
  const photoUrl = getPhotoUrl(recipe.photo_path);
  const photoHtml = photoUrl
    ? `<img src="${photoUrl}" alt="${escapeAttr(recipe.name)}" class="card-photo" />`
    : `<div class="card-photo placeholder">🍽️</div>`;

  const stars = recipe.rating
    ? '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating)
    : '<span class="unrated">Not rated</span>';

  return `
    <article class="recipe-card">
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
