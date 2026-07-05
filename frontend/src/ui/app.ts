import { signOut } from '../lib/auth';
import { renderAddViaLink } from './addViaLink';
import type { ExtractedRecipeFields } from '../lib/recipeTypes';

/**
 * Authenticated app shell. Recipe browsing, editing, ratings, shopping
 * list, etc. will be built out in later tasks (10, 12, 14, etc). For now
 * this wires up the "add via link" flow (Task 6) so it's reachable and
 * verifiable end-to-end, plus sign-out (Requirement 18.4).
 */
export function renderApp(container: HTMLElement, onSignOut: () => void): void {
  container.innerHTML = `
    <section class="app-shell">
      <header class="app-header">
        <h1>Recipe Site</h1>
        <button id="signout-button" type="button">Sign out</button>
      </header>
      <main id="app-main"></main>
    </section>
  `;

  container.querySelector<HTMLButtonElement>('#signout-button')!.addEventListener('click', async () => {
    await signOut();
    onSignOut();
  });

  const main = container.querySelector<HTMLElement>('#app-main')!;

  renderAddViaLink(main, {
    onExtracted: (fields: ExtractedRecipeFields, sourceLink: string) => {
      // Task 9 (Recipe_Under_Review + manual entry) will render the
      // review/confirm form here. For now, show what was extracted so the
      // link-import flow is visibly working end-to-end.
      main.innerHTML = `
        <h2>Extracted recipe (review coming in a later step)</h2>
        <pre>${JSON.stringify({ ...fields, sourceLink }, null, 2)}</pre>
      `;
    },
    onManualEntry: () => {
      main.innerHTML = `<p>Manual entry form coming in a later step.</p>`;
    },
  });
}
