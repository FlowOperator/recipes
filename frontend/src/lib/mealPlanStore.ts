/**
 * Simple meal planner stored in localStorage.
 * Maps days to recipe IDs for a rolling 7-day view.
 */

export interface MealPlanEntry {
  recipeId: string;
  recipeName: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  entries: MealPlanEntry[];
}

const STORAGE_KEY = 'recipe-site:meal-plan';

export function getMealPlan(): DayPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMealPlan(plan: DayPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function addToMealPlan(date: string, entry: MealPlanEntry): void {
  const plan = getMealPlan();
  const day = plan.find(d => d.date === date);
  if (day) {
    day.entries.push(entry);
  } else {
    plan.push({ date, entries: [entry] });
  }
  saveMealPlan(plan);
}

export function removeFromMealPlan(date: string, index: number): void {
  const plan = getMealPlan();
  const day = plan.find(d => d.date === date);
  if (day) {
    day.entries.splice(index, 1);
    if (day.entries.length === 0) {
      saveMealPlan(plan.filter(d => d.date !== date));
    } else {
      saveMealPlan(plan);
    }
  }
}
