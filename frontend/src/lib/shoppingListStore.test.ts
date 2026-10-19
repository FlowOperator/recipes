import { describe, it, expect, beforeEach } from 'vitest';
import {
  getShoppingList,
  addIngredientsToShoppingList,
  toggleItemChecked,
  removeItem,
  clearCheckedItems,
  clearAllItems,
} from './shoppingListStore';

beforeEach(() => {
  localStorage.clear();
});

describe('addIngredientsToShoppingList', () => {
  it('adds new ingredients with their source recipe', () => {
    addIngredientsToShoppingList([{ name: 'Flour', quantity: 200, unit: 'g' }], 'Bread');
    const list = getShoppingList();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Flour');
    expect(list[0].quantity).toBe(200);
    expect(list[0].sourceRecipes).toEqual(['Bread']);
  });

  it('sums quantities when name and unit match', () => {
    addIngredientsToShoppingList([{ name: 'flour', quantity: 200, unit: 'g' }], 'Bread');
    addIngredientsToShoppingList([{ name: 'Flour', quantity: 100, unit: 'g' }], 'Cake');
    const list = getShoppingList();
    expect(list).toHaveLength(1);
    expect(list[0].quantity).toBe(300);
    expect(list[0].sourceRecipes).toEqual(['Bread', 'Cake']);
  });

  it('keeps a separate line when the same name has a different unit (regression: no silent drop)', () => {
    addIngredientsToShoppingList([{ name: 'flour', quantity: 200, unit: 'g' }], 'Bread');
    addIngredientsToShoppingList([{ name: 'flour', quantity: 1, unit: 'cup' }], 'Cake');
    const list = getShoppingList();
    expect(list).toHaveLength(2);
    const totalQty = list.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
    expect(totalQty).toBe(201); // both quantities preserved, nothing dropped
  });

  it('keeps a separate line when one side lacks a quantity', () => {
    addIngredientsToShoppingList([{ name: 'oil', quantity: 2, unit: 'tbsp' }], 'Stir fry');
    addIngredientsToShoppingList([{ name: 'oil', quantity: null, unit: null }], 'Salad');
    // 'oil' is a default pantry exclusion — override to test the merge logic itself
    localStorage.clear();
    addIngredientsToShoppingList([{ name: 'butter', quantity: 50, unit: 'g' }], 'Cake', []);
    addIngredientsToShoppingList([{ name: 'butter', quantity: null, unit: null }], 'Toast', []);
    const list = getShoppingList();
    expect(list).toHaveLength(2);
  });

  it('merges only the source when both entries are unquantified duplicates', () => {
    addIngredientsToShoppingList([{ name: 'parsley', quantity: null, unit: null }], 'Soup', []);
    addIngredientsToShoppingList([{ name: 'parsley', quantity: null, unit: null }], 'Stew', []);
    const list = getShoppingList();
    expect(list).toHaveLength(1);
    expect(list[0].sourceRecipes).toEqual(['Soup', 'Stew']);
  });

  it('skips default pantry exclusions (salt, pepper, oil)', () => {
    addIngredientsToShoppingList(
      [
        { name: 'salt', quantity: 1, unit: 'tsp' },
        { name: 'Pepper', quantity: 1, unit: 'tsp' },
        { name: 'flour', quantity: 100, unit: 'g' },
      ],
      'Dish'
    );
    const list = getShoppingList();
    expect(list.map((i) => i.name)).toEqual(['flour']);
  });

  it('does not duplicate the source recipe name on repeated adds', () => {
    addIngredientsToShoppingList([{ name: 'eggs', quantity: 2, unit: null }], 'Omelette');
    addIngredientsToShoppingList([{ name: 'eggs', quantity: 1, unit: null }], 'Omelette');
    const list = getShoppingList();
    expect(list[0].sourceRecipes).toEqual(['Omelette']);
    expect(list[0].quantity).toBe(3);
  });
});

describe('list mutations', () => {
  it('toggles an item checked state', () => {
    addIngredientsToShoppingList([{ name: 'milk', quantity: 1, unit: 'l' }], 'Latte');
    const id = getShoppingList()[0].id;
    toggleItemChecked(id);
    expect(getShoppingList()[0].checked).toBe(true);
    toggleItemChecked(id);
    expect(getShoppingList()[0].checked).toBe(false);
  });

  it('removes a single item by id', () => {
    addIngredientsToShoppingList([{ name: 'milk', quantity: 1, unit: 'l' }], 'Latte');
    const id = getShoppingList()[0].id;
    removeItem(id);
    expect(getShoppingList()).toHaveLength(0);
  });

  it('clears only checked items', () => {
    addIngredientsToShoppingList(
      [
        { name: 'milk', quantity: 1, unit: 'l' },
        { name: 'bread', quantity: 1, unit: null },
      ],
      'Shop',
      []
    );
    const list = getShoppingList();
    toggleItemChecked(list[0].id);
    clearCheckedItems();
    const after = getShoppingList();
    expect(after).toHaveLength(1);
    expect(after[0].name).toBe('bread');
  });

  it('clears all items', () => {
    addIngredientsToShoppingList([{ name: 'milk', quantity: 1, unit: 'l' }], 'Latte');
    clearAllItems();
    expect(getShoppingList()).toHaveLength(0);
  });
});
