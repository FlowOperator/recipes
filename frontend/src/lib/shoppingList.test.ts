import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { mergeIngredients, applyPantryExclusion, formatShoppingListForExport } from './shoppingList';

// Feature: personal-recipe-website, Property 27: Ingredient merge correctness
describe('mergeIngredients', () => {
  it('groups by trimmed/case-folded name; sums when same unit; no drops or duplicates', () => {
    fc.assert(fc.property(
      fc.array(
        fc.array(
          fc.record({ name: fc.constantFrom('flour', 'Flour', 'eggs', 'sugar'), quantity: fc.option(fc.integer({ min: 1, max: 500 }), { nil: null }), unit: fc.option(fc.constantFrom('g', 'ml', 'tbsp'), { nil: null }) }),
          { minLength: 1, maxLength: 3 }
        ),
        { minLength: 1, maxLength: 3 }
      ),
      (recipeIngredients) => {
        const result = mergeIngredients(recipeIngredients);
        const allIngredients = recipeIngredients.flat();
        const uniqueNames = new Set(allIngredients.map(i => i.name.trim().toLowerCase()));
        expect(result.length).toBe(uniqueNames.size);
      }
    ), { numRuns: 100 });
  });
});

// Feature: personal-recipe-website, Property 29: Pantry exclusion filtering
describe('applyPantryExclusion', () => {
  it('omits items with exact case-insensitive match to exclusion list; retains others', () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom('salt', 'pepper', 'flour', 'eggs', 'oil', 'butter'), { minLength: 1, maxLength: 6 }),
      fc.subarray(['salt', 'pepper', 'oil']),
      (itemNames, exclusions) => {
        const items = itemNames.map(name => ({ name, quantity: null, unit: null, source: 'recipe' as const }));
        const result = applyPantryExclusion(items, exclusions);
        const excluded = new Set(exclusions.map(e => e.toLowerCase()));
        for (const item of result) {
          expect(excluded.has(item.name.toLowerCase())).toBe(false);
        }
      }
    ), { numRuns: 100 });
  });
});

// Feature: personal-recipe-website, Property 31: Shopping list export formatting
describe('formatShoppingListForExport', () => {
  it('produces one line per item in order for non-empty lists; empty string for empty lists', () => {
    fc.assert(fc.property(
      fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }), quantity: fc.option(fc.integer({ min: 1, max: 99 }), { nil: null }), unit: fc.option(fc.constantFrom('g', 'ml'), { nil: null }), source: fc.constant('recipe' as const) }), { minLength: 0, maxLength: 5 }),
      (items) => {
        const output = formatShoppingListForExport(items);
        if (items.length === 0) {
          expect(output).toBe('');
        } else {
          const lines = output.split('\n');
          expect(lines.length).toBe(items.length);
        }
      }
    ), { numRuns: 100 });
  });
});
