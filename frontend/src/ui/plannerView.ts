import { getMealPlan, addToMealPlan, removeFromMealPlan, type MealPlanEntry } from '../lib/mealPlanStore';
import { listRecipes } from '../lib/recipeStore';

export async function renderPlannerView(container: HTMLElement): Promise<void> {
  const recipes = await listRecipes();
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

  function formatDay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function render() {
    const plan = getMealPlan();
    const week = getWeekDates();

    const recipeOptions = recipes.map(r =>
      `<option value="${r.id}" data-name="${escapeAttr(r.name)}">${escapeHtml(r.name)}</option>`
    ).join('');

    let html = `<section class="planner-view-content">
      <h2>Meal Planner</h2>
      <p class="planner-subtitle">Plan your week — tap + to assign recipes to a day</p>
      <div class="planner-week">`;

    for (const date of week) {
      const dayPlan = plan.find(d => d.date === date);
      const entries = dayPlan?.entries ?? [];

      html += `
        <div class="planner-day">
          <div class="planner-day-header">
            <span class="planner-day-label">${formatDay(date)}</span>
            <button class="planner-add-btn" data-date="${date}" type="button">+</button>
          </div>
          <div class="planner-entries">`;

      if (entries.length === 0) {
        html += `<span class="planner-empty">No meals planned</span>`;
      } else {
        entries.forEach((entry, idx) => {
          html += `
            <div class="planner-entry">
              <span class="planner-entry-meal">${entry.meal}</span>
              <span class="planner-entry-name">${escapeHtml(entry.recipeName)}</span>
              <button class="planner-remove-btn" data-date="${date}" data-idx="${idx}" type="button">✕</button>
            </div>`;
        });
      }

      html += `</div></div>`;
    }

    html += `</div></section>`;

    // Add recipe picker modal
    html += `
      <div id="planner-picker" class="ef-overlay hidden">
        <div class="ef-picker">
          <div class="ef-picker-header">
            <button type="button" id="planner-picker-close" class="ef-close-btn">✕</button>
            <h3>Add to plan</h3>
          </div>
          <div class="planner-picker-form">
            <label>Meal</label>
            <select id="planner-meal-select">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner" selected>Dinner</option>
              <option value="snack">Snack</option>
            </select>
            <label>Recipe</label>
            <select id="planner-recipe-select">
              <option value="">Select a recipe...</option>
              ${recipeOptions}
            </select>
            <button id="planner-confirm" type="button" class="btn-primary">Add</button>
          </div>
        </div>
      </div>`;

    container.innerHTML = html;
    attachListeners();
  }

  function attachListeners() {
    let activeDate = '';

    // Add buttons
    container.querySelectorAll<HTMLButtonElement>('.planner-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeDate = btn.dataset.date!;
        container.querySelector<HTMLElement>('#planner-picker')!.classList.remove('hidden');
      });
    });

    // Remove buttons
    container.querySelectorAll<HTMLButtonElement>('.planner-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.date!;
        const idx = Number(btn.dataset.idx);
        removeFromMealPlan(date, idx);
        render();
      });
    });

    // Picker close
    container.querySelector<HTMLButtonElement>('#planner-picker-close')!.addEventListener('click', () => {
      container.querySelector<HTMLElement>('#planner-picker')!.classList.add('hidden');
    });

    // Picker confirm
    container.querySelector<HTMLButtonElement>('#planner-confirm')!.addEventListener('click', () => {
      const meal = (container.querySelector<HTMLSelectElement>('#planner-meal-select')!).value as MealPlanEntry['meal'];
      const recipeSelect = container.querySelector<HTMLSelectElement>('#planner-recipe-select')!;
      const recipeId = recipeSelect.value;
      if (!recipeId) return;
      const recipeName = recipeSelect.options[recipeSelect.selectedIndex].dataset.name ?? recipeSelect.options[recipeSelect.selectedIndex].text;

      addToMealPlan(activeDate, { recipeId, recipeName, meal });
      container.querySelector<HTMLElement>('#planner-picker')!.classList.add('hidden');
      render();
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
