import { signOut } from '../lib/auth';

/**
 * Placeholder authenticated app shell. Recipe browsing, add-recipe flows,
 * shopping list, etc. will be built out in later tasks. For now this just
 * proves the auth gate works end-to-end and provides a sign-out action
 * (Requirement 18.4).
 */
export function renderApp(container: HTMLElement, onSignOut: () => void): void {
  container.innerHTML = `
    <section class="app-shell">
      <header class="app-header">
        <h1>Recipe Site</h1>
        <button id="signout-button" type="button">Sign out</button>
      </header>
      <main>
        <p>You're signed in. Recipe browsing and management will appear here.</p>
      </main>
    </section>
  `;

  container.querySelector<HTMLButtonElement>('#signout-button')!.addEventListener('click', async () => {
    await signOut();
    onSignOut();
  });
}
