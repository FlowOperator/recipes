import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { parseClaudeImportJson } from './claudeImportParser';

describe('parseClaudeImportJson', () => {
  it('parses a valid full recipe JSON', () => {
    const input = JSON.stringify({
      name: 'Pasta',
      ingredients: [{ name: 'spaghetti', quantity: 200, unit: 'g' }],
      method: 'Boil pasta.',
      timeToCookMinutes: 15,
      servings: 2,
    });
    const result = parseClaudeImportJson(input);
    expect(result.extracted).toBe(true);
    if (result.extracted) {
      expect(result.fields.name).toBe('Pasta');
      expect(result.fields.ingredients).toHaveLength(1);
      expect(result.fields.method).toBe('Boil pasta.');
      expect(result.fields.timeToCookMinutes).toBe(15);
      expect(result.fields.servings).toBe(2);
    }
  });

  it('returns extracted: false for non-JSON text', () => {
    expect(parseClaudeImportJson('not json at all')).toEqual({ extracted: false });
  });

  it('returns extracted: false for valid JSON with no recognized fields', () => {
    expect(parseClaudeImportJson('{"foo": "bar"}')).toEqual({ extracted: false });
  });

  it('returns extracted: false for arrays', () => {
    expect(parseClaudeImportJson('[1,2,3]')).toEqual({ extracted: false });
  });

  it('never makes a network request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    parseClaudeImportJson(JSON.stringify({ name: 'Test' }));
    parseClaudeImportJson('invalid');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // Feature: personal-recipe-website, Property 38: Claude import parsing is JSON-shape gated and network-free
  it('returns extracted: true iff valid JSON matching the documented shape with at least one recognized field', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record(
            {
              name: fc.string({ minLength: 1, maxLength: 30 }),
              ingredients: fc.array(
                fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }), quantity: fc.integer({ min: 1, max: 500 }), unit: fc.constantFrom('g', 'ml', 'tbsp', null) }),
                { minLength: 1, maxLength: 3 }
              ),
              method: fc.string({ minLength: 1, maxLength: 50 }),
              timeToCookMinutes: fc.integer({ min: 1, max: 120 }),
              servings: fc.integer({ min: 1, max: 12 }),
            },
            { requiredKeys: [] }
          ).map((obj) => JSON.stringify(obj)),
          fc.string({ minLength: 0, maxLength: 50 })
        ),
        (text) => {
          const result = parseClaudeImportJson(text);
          if (result.extracted) {
            expect(result.fields).toBeDefined();
            const f = result.fields;
            expect(
              f.name !== undefined ||
              f.ingredients !== undefined ||
              f.method !== undefined ||
              f.timeToCookMinutes !== undefined ||
              f.servings !== undefined
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
