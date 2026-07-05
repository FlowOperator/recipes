import { signOut } from '../lib/auth';
import { renderAddViaLink } from './addViaLink';
import { renderAddViaClaude } from './addViaClaude';
import type { ExtractedRecipeFields } from '../lib/recipeTypes';

/**
 * Authenticated app shell. Routes between add-recipe methods, and later
 * will include recipe browsing, detail view, shopping list, etc.
 */
export function renderApp(container: HTMLElement, onSignOut: () => void): void {
  container.innerHTML = `
    <section class="app-shell">
      <header class="app-header">
        <h1>Recipe Site</h1>
        <button id="signout-button" type="button">Sign out</button>
      </header>
      <nav class="add-nav">
        <button id="nav-link" type="button" class="nav-active">From link</button>
        <button id="nav-claude" type="button">From Claude AI</button>
        <button id="nav-manual" type="button">Manual entry</button>
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

  function showExtracted(fields: ExtractedRecipeFields, sourceLink?: string) {
    // Task 9 (Recipe_Under_Review) will render the review/confirm form here.
    main.innerHTML = `
      <h2>Extracted recipe (review form coming next)</h2>
      <pre>${JSON.stringify({ ...fields, sourceLink }, null, 2)}</pre>
      <button id="back-btn" type="button">Back</button>
    `;
    main.querySelector<HTMLButtonElement>('#back-btn')!.addEventListener('click', showLinkView);
  }

  function showManual() {
    main.innerHTML = `<p>Manual entry form coming in the next step (Task 9).</p>
      <button id="back-btn" type="button">Back</button>`;
    main.querySelector<HTMLButtonElement>('#back-btn')!.addEventListener('click', showLinkView);
  }

  function showLinkView() {
    setActiveNav('nav-link');
    renderAddViaLink(main, {
      onExtracted: (fields, sourceLink) => showExtracted(fields, sourceLink),
      onManualEntry: showManual,
    });
  }

  function showClaudeView() {
    setActiveNav('nav-claude');
    renderAddViaClaude(main, {
      onExtracted: (fields) => showExtracted(fields),
      onManualEntry: showManual,
    });
  }

  container.querySelector<HTMLButtonElement>('#nav-link')!.addEventListener('click', showLinkView);
  container.querySelector<HTMLButtonElement>('#nav-claude')!.addEventListener('click', showClaudeView);
  container.querySelector<HTMLButtonElement>('#nav-manual')!.addEventListener('click', () => {
    setActiveNav('nav-manual');
    showManual();
  });

  // Default view
  showLinkView();
}
