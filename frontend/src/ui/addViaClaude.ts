import { parseClaudeImportJson, CLAUDE_PROMPT_TEMPLATE } from '../lib/claudeImportParser';
import type { ExtractedRecipeFields } from '../lib/recipeTypes';

export interface AddViaClaudeCallbacks {
  onExtracted: (fields: ExtractedRecipeFields) => void;
  onManualEntry: () => void;
}

export function renderAddViaClaude(container: HTMLElement, callbacks: AddViaClaudeCallbacks): void {
  container.innerHTML = `
    <section class="add-via-claude">
      <h2>Add recipe from Claude AI</h2>
      <p>Paste a screenshot or description into your Claude AI chat with this prompt, then paste the JSON response below.</p>
      <details>
        <summary>Copy this prompt into Claude AI</summary>
        <pre id="claude-prompt">${escapeHtml(CLAUDE_PROMPT_TEMPLATE)}</pre>
        <button id="copy-prompt" type="button">Copy prompt</button>
      </details>
      <form id="claude-form" novalidate>
        <label for="claude-json">Paste Claude's JSON response here</label>
        <textarea id="claude-json" name="json" rows="10" placeholder='{"name": "...", "ingredients": [...], ...}'></textarea>
        <button type="submit">Import recipe</button>
        <p id="claude-error" class="signin-error" role="alert" aria-live="polite"></p>
      </form>
      <button id="skip-to-manual-claude" type="button" class="secondary-action">Enter recipe manually instead</button>
    </section>
  `;

  container.querySelector<HTMLButtonElement>('#copy-prompt')!.addEventListener('click', () => {
    void navigator.clipboard.writeText(CLAUDE_PROMPT_TEMPLATE);
  });

  const form = container.querySelector<HTMLFormElement>('#claude-form')!;
  const errorEl = container.querySelector<HTMLParagraphElement>('#claude-error')!;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const json = (form.elements.namedItem('json') as HTMLTextAreaElement).value.trim();
    if (!json) {
      errorEl.textContent = 'Please paste the JSON response from Claude AI.';
      return;
    }

    const result = parseClaudeImportJson(json);
    if (!result.extracted) {
      errorEl.textContent = 'Could not parse that text. Make sure you pasted the full JSON response from Claude.';
      return;
    }

    callbacks.onExtracted(result.fields);
  });

  container.querySelector<HTMLButtonElement>('#skip-to-manual-claude')!.addEventListener('click', () => {
    callbacks.onManualEntry();
  });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
