import { importRecipeFromLink } from '../lib/linkImport';
import type { ExtractedRecipeFields } from '../lib/recipeTypes';

export interface AddViaLinkCallbacks {
  /** Called with extracted fields (full or partial) to pre-fill the Recipe_Form as a Recipe_Under_Review. */
  onExtracted: (fields: ExtractedRecipeFields, sourceLink: string) => void;
  /** Called when the Owner wants to skip straight to manual entry. */
  onManualEntry: () => void;
}

export function renderAddViaLink(container: HTMLElement, callbacks: AddViaLinkCallbacks): void {
  container.innerHTML = `
    <section class="add-via-link">
      <h2>Add recipe from a link</h2>
      <form id="link-form" novalidate>
        <label for="recipe-url">Recipe URL</label>
        <input id="recipe-url" name="url" type="url" placeholder="https://example.com/recipe" required />
        <button type="submit">Fetch recipe</button>
        <p id="link-error" class="signin-error" role="alert" aria-live="polite"></p>
      </form>
      <button id="skip-to-manual" type="button" class="secondary-action">Enter recipe manually instead</button>
    </section>
  `;

  const form = container.querySelector<HTMLFormElement>('#link-form')!;
  const errorEl = container.querySelector<HTMLParagraphElement>('#link-error')!;
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const url = (form.elements.namedItem('url') as HTMLInputElement).value.trim();

    submitButton.disabled = true;
    submitButton.textContent = 'Fetching...';

    const result = await importRecipeFromLink(url);

    submitButton.disabled = false;
    submitButton.textContent = 'Fetch recipe';

    switch (result.status) {
      case 'invalid_url':
        errorEl.textContent = 'Please enter a valid URL (starting with http:// or https://).';
        return;
      case 'no_markup':
        errorEl.textContent = 'Automatic extraction failed for this page. You can enter the recipe manually.';
        return;
      case 'fetch_failed':
        errorEl.textContent = 'Could not retrieve the recipe page. Please check the link and try again.';
        return;
      case 'extracted':
        callbacks.onExtracted(result.fields, url);
        return;
    }
  });

  container.querySelector<HTMLButtonElement>('#skip-to-manual')!.addEventListener('click', () => {
    callbacks.onManualEntry();
  });
}
