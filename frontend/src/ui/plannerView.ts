import { getMealPlan, addToMealPlan, removeFromMealPlan, type MealPlanEntry } from '../lib/mealPlanStore';
import { listRecipes, type RecipeRecord } from '../lib/recipeStore';
import { getPhotoUrl, getPlaceholderEmoji } from '../lib/photoStorage';

export interface PlannerCallbacks {
  /** Open a recipe's detail view when a planned meal is tapped. */
  onOpenRecipe?: (recipeId: string) => void;
}

const MEAL_SLOTS: MealPlanEntry['meal'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealPlanEntry['meal'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
const MEAL_ICONS: Record<MealPlanEntry['meal'], string> = {
  breakfast: '🌅',
  lunch: '🥪',
  dinner: '🍽️',
  snack: '🍎',
};

export async function renderPlannerView(container: HTMLElement, callbacks: PlannerCallbacks = {}): Promise<void> {
  const recipes = await listRecipes();
  const recipeById = new Map(recipes.map(r => [r.id, r]));
  render();

  function getWeekDates(): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  function formatDay(dateStr: string): { label: string; sub: string; isToday: boolean } {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const sub = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (diff === 0) return { label: 'Today', sub, isToday: true };
    if (diff === 1) return { label: 'Tomorrow', sub, isToday: false };
    return { label: weekday, sub, isToday: false };
  }

  function thumbFor(recipeId: string): string {
    const rec = recipeById.get(recipeId);
    if (!rec) return `<span class="pl-slot-thumb pl-slot-thumb-missing">🍽️</span>`;
    const url = getPhotoUrl(rec.photo_path);
    if (url) return `<img class="pl-slot-thumb" src="${url}" alt="" loading="lazy" />`;
    return `<span class="pl-slot-thumb pl-slot-thumb-ph">${getPlaceholderEmoji(rec.filter_categories)}</span>`;
  }

  function render() {
    const plan = getMealPlan();
    const week = getWeekDates();

    let html = `<section class="planner-view-content">
      <div class="planner-head">
        <h2>Meal Planner</h2>
        <p class="planner-subtitle">Your week at a glance</p>
      </div>
      <div class="planner-week">`;

    for (const date of week) {
      const { label, sub, isToday } = formatDay(date);
      const dayPlan = plan.find(d => d.date === date);
      const entries = dayPlan?.entries ?? [];

      // Count planned meals for the day badge.
      const count = entries.length;

      html += `
        <div class="planner-day-card ${isToday ? 'planner-today' : ''}">
          <div class="planner-day-top">
            <div class="planner-day-name">
              <span class="planner-day-label">${label}</span>
              <span class="planner-day-sub">${sub}</span>
            </div>
            ${count > 0 ? `<span class="planner-day-count">${count} meal${count > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="planner-slots">`;

      for (const meal of MEAL_SLOTS) {
        const slotEntries = entries
          .map((e, idx) => ({ e, idx }))
          .filter(({ e }) => e.meal === meal);

        html += `<div class="planner-slot">
          <div class="planner-slot-head">
            <span class="planner-slot-icon">${MEAL_ICONS[meal]}</span>
            <span class="planner-slot-label">${MEAL_LABELS[meal]}</span>
            <button class="planner-slot-add" data-date="${date}" data-meal="${meal}" type="button" aria-label="Add ${MEAL_LABELS[meal]}">+</button>
          </div>`;

        if (slotEntries.length > 0) {
          html += `<div class="planner-slot-items">`;
          for (const { e, idx } of slotEntries) {
            html += `
              <div class="planner-meal" data-recipe-id="${e.recipeId}">
                ${thumbFor(e.recipeId)}
                <span class="planner-meal-name">${escapeHtml(e.recipeName)}</span>
                <button class="planner-meal-remove" data-date="${date}" data-idx="${idx}" type="button" aria-label="Remove">✕</button>
              </div>`;
          }
          html += `</div>`;
        }

        html += `</div>`;
      }

      html += `</div></div>`;
    }

    html += `</div></section>`;

    // Recipe picker modal (searchable list)
    html += `
      <div id="planner-picker" class="ef-overlay hidden">
        <div class="ef-picker planner-picker">
          <div class="ef-picker-header">
            <button type="button" id="planner-picker-close" class="ef-close-btn">✕</button>
            <h3 id="planner-picker-title">Add a meal</h3>
          </div>
          <input id="planner-search" type="text" placeholder="Search recipes..." class="planner-picker-search" />
          <div id="planner-recipe-list" class="planner-recipe-list"></div>
        </div>
      </div>`;

    container.innerHTML = html;
    attachListeners();
  }

  function attachListeners() {
    let activeDate = '';
    let activeMeal: MealPlanEntry['meal'] = 'dinner';
    const picker = container.querySelector<HTMLElement>('#planner-picker')!;
    const searchInput = container.querySelector<HTMLInputElement>('#planner-search')!;
    const listEl = container.querySelector<HTMLElement>('#planner-recipe-list')!;
    const titleEl = container.querySelector<HTMLElement>('#planner-picker-title')!;

    function renderPickerList(filter = '') {
      const term = filter.trim().toLowerCase();
      const matches = term
        ? recipes.filter(r => r.name.toLowerCase().includes(term))
        : recipes;

      if (recipes.length === 0) {
        listEl.innerHTML = `<p class="planner-picker-empty">No recipes yet. Add some first.</p>`;
        return;
      }
      if (matches.length === 0) {
        listEl.innerHTML = `<p class="planner-picker-empty">No recipes match "${escapeHtml(filter)}".</p>`;
        return;
      }

      listEl.innerHTML = matches.map((r: RecipeRecord) => {
        const url = getPhotoUrl(r.photo_path);
        const thumb = url
          ? `<img class="pl-pick-thumb" src="${url}" alt="" loading="lazy" />`
          : `<span class="pl-pick-thumb pl-slot-thumb-ph">${getPlaceholderEmoji(r.filter_categories)}</span>`;
        return `<button class="planner-pick-row" data-id="${r.id}" data-name="${escapeAttr(r.name)}" type="button">
          ${thumb}
          <span class="planner-pick-name">${escapeHtml(r.name)}</span>
          ${r.is_favorite ? '<span class="planner-pick-fav">★</span>' : ''}
        </button>`;
      }).join('');

      listEl.querySelectorAll<HTMLButtonElement>('.planner-pick-row').forEach(row => {
        row.addEventListener('click', () => {
          addToMealPlan(activeDate, {
            recipeId: row.dataset.id!,
            recipeName: row.dataset.name!,
            meal: activeMeal,
          });
          picker.classList.add('hidden');
          render();
        });
      });
    }

    // Open picker from a slot's + button
    container.querySelectorAll<HTMLButtonElement>('.planner-slot-add').forEach(btn => {
      btn.addEventListener('click', () => {
        activeDate = btn.dataset.date!;
        activeMeal = btn.dataset.meal as MealPlanEntry['meal'];
        titleEl.textContent = `Add ${MEAL_LABELS[activeMeal]}`;
        searchInput.value = '';
        renderPickerList();
        picker.classList.remove('hidden');
        setTimeout(() => searchInput.focus(), 50);
      });
    });

    searchInput.addEventListener('input', () => renderPickerList(searchInput.value));

    // Remove a planned meal
    container.querySelectorAll<HTMLButtonElement>('.planner-meal-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromMealPlan(btn.dataset.date!, Number(btn.dataset.idx));
        render();
      });
    });

    // Tap a planned meal to open its recipe
    container.querySelectorAll<HTMLElement>('.planner-meal').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.recipeId!;
        if (callbacks.onOpenRecipe && recipeById.has(id)) {
          callbacks.onOpenRecipe(id);
        }
      });
    });

    container.querySelector<HTMLButtonElement>('#planner-picker-close')!.addEventListener('click', () => {
      picker.classList.add('hidden');
    });
    // Tap backdrop to close
    picker.addEventListener('click', (e) => {
      if (e.target === picker) picker.classList.add('hidden');
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
