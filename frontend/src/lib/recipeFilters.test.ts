import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterByCategories, filterByBudget, searchByIngredient, computeProteinPerCalorieRatio } from './recipeFilters';
import type { RecipeRecord } from './recipeStore';

const makeRecipe = (overrides: Partial<RecipeRecord> = {}): RecipeRecord => ({
  id: 'test-id',
  name: 'Test',
  source_link: null,
  photo_path: null,
  ingredients: [],
  method: '',
  time_to_cook_minutes: null,
  servings: null,
  rating: null,
  cost_per_portion: null,
  cook_notes: '',
  calories_per_serving: null,
  protein_per_serving: null,
  total_fat: null,
  saturated_fat: null,
  cholesterol: null,
  sodium: null,
  total_carbohydrate: null,
  dietary_fiber: null,
  sugars: null,
  serving_size: null,
  dietary_labels: [],
  key_ingredient_labels: [],
  filter_categories: ['dinner'],
  created_at: '',
  updated_at: '',
  ...overrides,
});

// Feature: personal-recipe-website, Property 24: Category filter selects exact matches
describe('filterByCategories', () => {
  it('empty selection returns all recipes; non-empty returns superset matches only', () => {
    fc.assert(fc.property(
      fc.array(fc.subarray(['breakfast','lunch','dinner','healthy','budget'], { minLength: 1 }), { minLength: 0, maxLength: 5 }),
      fc.subarray(['breakfast','lunch','dinner','healthy','budget'], { minLength: 0 }),
      (recipeCats, selected) => {
        const recipes = recipeCats.map((cats, i) => makeRecipe({ id: String(i), filter_categories: cats }));
        const result = filterByCategories(recipes, selected);
        if (selected.length === 0) {
          expect(result.length).toBe(recipes.length);
        } else {
          for (const r of result) {
            expect(selected.every(c => r.filter_categories.includes(c))).toBe(true);
          }
        }
      }
    ), { numRuns: 100 });
  });
});

// Feature: personal-recipe-website, Property 17: Budget filter threshold semantics
describe('filterByBudget', () => {
  it('includes recipes with effective cost <= threshold (unset treated as 0)', () => {
    fc.assert(fc.property(
      fc.array(fc.option(fc.double({ min: 0, max: 100, noNaN: true }), { nil: null }), { minLength: 1, maxLength: 10 }),
      fc.double({ min: 0, max: 100, noNaN: true }),
      (costs, threshold) => {
        const recipes = costs.map((c, i) => makeRecipe({ id: String(i), cost_per_portion: c }));
        const result = filterByBudget(recipes, threshold);
        for (const r of result) {
          expect((r.cost_per_portion ?? 0) <= threshold).toBe(true);
        }
        const expected = recipes.filter(r => (r.cost_per_portion ?? 0) <= threshold);
        expect(result.length).toBe(expected.length);
      }
    ), { numRuns: 100 });
  });
});

// Feature: personal-recipe-website, Property 25: Ingredient search matching semantics
describe('searchByIngredient', () => {
  it('returns recipes with case-insensitive substring match; empty term returns nothing', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 0, maxLength: 20 }),
      (term) => {
        const recipes = [
          makeRecipe({ id: '1', ingredients: [{ name: 'Chicken breast', quantity: 200, unit: 'g' }] }),
          makeRecipe({ id: '2', ingredients: [{ name: 'Rice', quantity: 150, unit: 'g' }] }),
        ];
        const result = searchByIngredient(recipes, term);
        const trimmed = term.trim().toLowerCase();
        if (trimmed.length === 0) {
          expect(result.length).toBe(0);
        } else {
          for (const r of result) {
            expect(r.ingredients.some(i => i.name.toLowerCase().includes(trimmed))).toBe(true);
          }
        }
      }
    ), { numRuns: 100 });
  });
});

// Feature: personal-recipe-website, Property 21: Protein-per-calorie ratio computation
describe('computeProteinPerCalorieRatio', () => {
  it('returns ratio when both set and calories > 0; null otherwise', () => {
    fc.assert(fc.property(
      fc.option(fc.double({ min: 0, max: 5000, noNaN: true }), { nil: null }),
      fc.option(fc.double({ min: 0, max: 500, noNaN: true }), { nil: null }),
      (cal, protein) => {
        const result = computeProteinPerCalorieRatio(cal, protein);
        if (cal != null && protein != null && cal > 0) {
          expect(result).toBeCloseTo(protein / cal, 10);
        } else {
          expect(result).toBeNull();
        }
      }
    ), { numRuns: 100 });
  });
});
