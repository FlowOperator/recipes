import { signIn } from '../lib/auth';

/**
 * Renders the sign-in form into the given container. Calls onSuccess()
 * once the Owner has successfully authenticated (Requirement 18.2).
 */
export function renderSignIn(container: HTMLElement, onSuccess: () => void): void {
  container.innerHTML = `
    <section class="signin">
      <h1>Nick's Picks</h1>
      <p class="signin-subtitle">Sign in to view your recipes</p>
      <form id="signin-form" novalidate>
        <label for="signin-email">Email</label>
        <input id="signin-email" name="email" type="email" autocomplete="username" required />

        <label for="signin-password">Password</label>
        <input id="signin-password" name="password" type="password" autocomplete="current-password" required />

        <button type="submit" class="btn-primary">Sign in</button>
        <p id="signin-error" class="signin-error" role="alert" aria-live="polite"></p>
      </form>
    </section>
  `;

  const form = container.querySelector<HTMLFormElement>('#signin-form')!;
  const errorEl = container.querySelector<HTMLParagraphElement>('#signin-error')!;
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    submitButton.disabled = true;
    submitButton.textContent = 'Signing in...';

    const result = await signIn(email, password);

    submitButton.disabled = false;
    submitButton.textContent = 'Sign in';

    if (!result.ok) {
      // Requirement 18.3: invalid credentials shown inline, no session created.
      errorEl.textContent = result.errorMessage ?? 'Sign in failed.';
      return;
    }

    onSuccess();
  });
}
