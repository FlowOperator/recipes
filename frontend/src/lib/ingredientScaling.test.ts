import { describe, it, expect } from 'vitest';
import { scaleIngredient, scaleIngredients, formatQuantity } from './ingredientScaling';
import type { RecipeIngredient } from './recipeTypes';

const ing = (name: string, quantity: number | null, unit: string | null = null): RecipeIngredient => ({
  name,
  quantity,
  unit,
});

describe('scaleIngredient', () => {
  it('scales a plainly-measured ingredient by the ratio', () => {
    expect(scaleIngredient(ing('flour', 100, 'g'), 2).quantity).toBe(200);
    expect(scaleIngredient(ing('milk', 500, 'ml'), 0.5).quantity).toBe(250);
  });

  it('scales measured water and oil (regression: previously blanket-skipped)', () => {
    expect(scaleIngredient(ing('water', 500, 'ml'), 2).quantity).toBe(1000);
    expect(scaleIngredient(ing('olive oil', 2, 'tbsp'), 3).quantity).toBe(6);
  });

  it('does not scale ingredients with no quantity (to taste)', () => {
    const r = scaleIngredient(ing('salt', null), 4);
    expect(r.quantity).toBeNull();
  });

  it('does not scale inherently non-numeric units', () => {
    expect(scaleIngredient(ing('cinnamon', 1, 'pinch'), 4).quantity).toBe(1);
    expect(scaleIngredient(ing('vanilla', 1, 'splash'), 4).quantity).toBe(1);
    expect(scaleIngredient(ing('chilli', 1, 'dash'), 4).quantity).toBe(1);
  });

  it('does not scale "to taste" style phrases in the name', () => {
    expect(scaleIngredient(ing('oil for frying', 2, 'tbsp'), 4).quantity).toBe(2);
    expect(scaleIngredient(ing('flour for dusting', 1, 'tbsp'), 4).quantity).toBe(1);
    expect(scaleIngredient(ing('salt to taste', 1, 'tsp'), 4).quantity).toBe(1);
  });

  it('returns the ingredient unchanged when ratio is 1', () => {
    const original = ing('sugar', 50, 'g');
    expect(scaleIngredient(original, 1)).toBe(original);
  });

  it('rounds to whole numbers for large quantities and 1dp for small', () => {
    expect(scaleIngredient(ing('rice', 12, 'g'), 1.5).quantity).toBe(18);
    expect(scaleIngredient(ing('yeast', 1, 'tsp'), 1.5).quantity).toBe(1.5);
  });

  it('never collapses a quantity to 0 from rounding', () => {
    // 0.2 * 0.1 = 0.02 which rounds to 0 — guard keeps the original
    const r = scaleIngredient(ing('baking soda', 0.2, 'tsp'), 0.1);
    expect(r.quantity).toBe(0.2);
  });
});

describe('scaleIngredients', () => {
  it('scales the whole list from base servings to desired servings', () => {
    const list = [ing('flour', 200, 'g'), ing('water', 300, 'ml'), ing('salt', null)];
    const scaled = scaleIngredients(list, 2, 4);
    expect(scaled[0].quantity).toBe(400);
    expect(scaled[1].quantity).toBe(600);
    expect(scaled[2].quantity).toBeNull();
  });

  it('returns originals when base equals desired', () => {
    const list = [ing('flour', 200, 'g')];
    expect(scaleIngredients(list, 2, 2)).toBe(list);
  });

  it('returns originals for non-positive servings', () => {
    const list = [ing('flour', 200, 'g')];
    expect(scaleIngredients(list, 0, 4)).toBe(list);
    expect(scaleIngredients(list, 2, 0)).toBe(list);
  });

  it('does not mutate the input list', () => {
    const list = [ing('flour', 200, 'g')];
    scaleIngredients(list, 2, 4);
    expect(list[0].quantity).toBe(200);
  });
});

describe('formatQuantity', () => {
  it('formats whole numbers without decimals', () => {
    expect(formatQuantity(2)).toBe('2');
  });

  it('formats common fractions with symbols', () => {
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(0.25)).toBe('¼');
    expect(formatQuantity(1.5)).toBe('1½');
  });

  it('returns empty string for null', () => {
    expect(formatQuantity(null)).toBe('');
  });
});
