import {
  getShoppingList,
  toggleItemChecked,
  removeItem,
  clearCheckedItems,
  clearAllItems,
  addIngredientsToShoppingList,
  type ShoppingListItem,
} from '../lib/shoppingListStore';
import { getAisle, AISLE_ORDER } from '../lib/aisleCategories';
import { formatShoppingListForExport } from '../lib/shoppingList';

export function renderShoppingListView(container: HTMLElement): void {
  render();

  function render() {
    const items = getShoppingList();

    if (items.length === 0) {
      container.innerHTML = `
        <section class="sl-view">
          <h2>Shopping List</h2>
          <div class="sl-add">
            <input id="sl-manual-input" type="text" placeholder="Add an item..." maxlength="100" />
            <button id="sl-manual-add" type="button">+</button>
          </div>
          <div class="empty-state-hero">
            <div class="empty-state-icon">🛒</div>
            <h2>List is empty</h2>
            <p>Add items manually above, or open a recipe and tap "Add to shopping list".</p>
          </div>
        </section>
      `;
      attachManualAdd();
      return;
    }

    // Group items by aisle
    const byAisle = new Map<string, ShoppingListItem[]>();
    for (const item of items) {
      const aisle = getAisle(item.name);
      if (!byAisle.has(aisle)) byAisle.set(aisle, []);
      byAisle.get(aisle)!.push(item);
    }

    const uncheckedCount = items.filter(i => !i.checked).length;

    let html = `
      <section class="sl-view">
        <h2>Shopping List <span class="sl-count">(${uncheckedCount} remaining)</span></h2>
        <div class="sl-add">
          <input id="sl-manual-input" type="text" placeholder="Add an item..." maxlength="100" />
          <button id="sl-manual-add" type="button">+</button>
        </div>
    `;

    // Render aisles in standard supermarket order
    for (const aisle of AISLE_ORDER) {
      const aisleItems = byAisle.get(aisle);
      if (!aisleItems || aisleItems.length === 0) continue;

      html += `<div class="sl-aisle">`;
      html += `<h3 class="sl-aisle-title">${aisle}</h3>`;

      for (const item of aisleItems) {
        const checkedClass = item.checked ? 'sl-item-checked' : '';
        const checkedAttr = item.checked ? 'checked' : '';
        const display = formatItemLine(item);
        const sources = item.sourceRecipes.join(', ');

        html += `
          <div class="sl-item ${checkedClass}" data-id="${item.id}">
            <label class="sl-item-label">
              <input type="checkbox" class="sl-check" ${checkedAttr} />
              <div class="sl-item-content">
                <span class="sl-item-text">${escapeHtml(display)}</span>
                <span class="sl-item-sources">${escapeHtml(sources)}</span>
              </div>
            </label>
            <button class="sl-item-delete" title="Remove">✕</button>
          </div>
        `;
      }

      html += `</div>`;
    }

    html += `
        <div class="sl-bottom-actions">
          <button id="sl-clear-checked" type="button" class="btn-secondary">Clear done</button>
          <button id="sl-clear-all" type="button" class="danger-action">Clear all</button>
          <button id="sl-export" type="button" class="btn-primary">Copy list</button>
        </div>
        <p id="sl-status" class="form-error" role="alert"></p>
      </section>
    `;

    container.innerHTML = html;

    // Event listeners
    container.querySelectorAll<HTMLInputElement>('.sl-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.closest<HTMLElement>('.sl-item')!.dataset.id!;
        toggleItemChecked(id);
        render();
      });
    });

    container.querySelectorAll<HTMLButtonElement>('.sl-item-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest<HTMLElement>('.sl-item')!.dataset.id!;
        removeItem(id);
        render();
      });
    });

    container.querySelector<HTMLButtonElement>('#sl-clear-checked')!.addEventListener('click', () => {
      clearCheckedItems();
      render();
    });

    container.querySelector<HTMLButtonElement>('#sl-clear-all')!.addEventListener('click', () => {
      if (confirm('Clear entire shopping list?')) {
        clearAllItems();
        render();
      }
    });

    container.querySelector<HTMLButtonElement>('#sl-export')!.addEventListener('click', async () => {
      const statusEl = container.querySelector<HTMLParagraphElement>('#sl-status')!;
      const unchecked = getShoppingList().filter(i => !i.checked);
      if (unchecked.length === 0) {
        statusEl.textContent = 'Nothing to export.';
        return;
      }
      const exportItems = unchecked.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        source: 'recipe' as const,
      }));
      const text = formatShoppingListForExport(exportItems);
      try {
        await navigator.clipboard.writeText(text);
        statusEl.textContent = 'Copied to clipboard!';
        statusEl.style.color = 'var(--terracotta)';
      } catch {
        statusEl.textContent = 'Export failed.';
      }
    });

    attachManualAdd();
  }

  function attachManualAdd() {
    const input = container.querySelector<HTMLInputElement>('#sl-manual-input');
    const btn = container.querySelector<HTMLButtonElement>('#sl-manual-add');
    if (!input || !btn) return;

    const doAdd = () => {
      const val = input.value.trim();
      if (!val) return;
      addIngredientsToShoppingList([{ name: val, quantity: null, unit: null }], 'Manual');
      input.value = '';
      render();
    };

    btn.addEventListener('click', doAdd);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doAdd(); }
    });
  }
}

function formatItemLine(item: ShoppingListItem): string {
  const parts: string[] = [];
  if (item.quantity != null) parts.push(String(item.quantity));
  if (item.unit) parts.push(item.unit);
  parts.push(item.name);
  return parts.join(' ');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
