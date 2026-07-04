import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  extractRecipeFromHtml,
  mapSchemaOrgRecipeToFields,
  extractRecipeJsonLd,
} from '../src/recipeExtractor';

const FULL_MARKUP_HTML = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Chocolate Cake",
  "recipeIngredient": ["200g flour", "2 eggs", "100g sugar"],
  "recipeInstructions": ["Mix dry ingredients.", "Add eggs and mix.", "Bake at 180C for 30 minutes."],
  "totalTime": "PT45M",
  "recipeYield": "8 servings"
}
</script>
</head><body></body></html>
`;

const PARTIAL_MARKUP_HTML = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Simple Soup",
  "recipeIngredient": ["1 onion", "2 carrots"]
}
</script>
</head><body></body></html>
`;

const NO_MARKUP_HTML = `<html><head><title>Just a page</title></head><body><p>No recipe here.</p></body></html>`;

describe('extractRecipeFromHtml', () => {
  it('extracts all fields from full schema.org markup', () => {
    const result = extractRecipeFromHtml(FULL_MARKUP_HTML);
    expect(result.extracted).toBe(true);
    expect(result.fields?.name).toBe('Chocolate Cake');
    expect(result.fields?.ingredients).toHaveLength(3);
    expect(result.fields?.method).toContain('Mix dry ingredients.');
    expect(result.fields?.timeToCookMinutes).toBe(45);
    expect(result.fields?.servings).toBe(8);
  });

  it('extracts only present fields from partial schema.org markup, leaving others absent', () => {
    const result = extractRecipeFromHtml(PARTIAL_MARKUP_HTML);
    expect(result.extracted).toBe(true);
    expect(result.fields?.name).toBe('Simple Soup');
    expect(result.fields?.ingredients).toHaveLength(2);
    expect(result.fields?.method).toBeUndefined();
    expect(result.fields?.timeToCookMinutes).toBeUndefined();
    expect(result.fields?.servings).toBeUndefined();
  });

  it('returns extracted: false when no schema.org Recipe markup is present', () => {
    const result = extractRecipeFromHtml(NO_MARKUP_HTML);
    expect(result.extracted).toBe(false);
    expect(result.fields).toBeUndefined();
  });

  it('returns extracted: false for malformed JSON-LD blocks', () => {
    const html = `<script type="application/ld+json">{ not valid json </script>`;
    const result = extractRecipeFromHtml(html);
    expect(result.extracted).toBe(false);
  });
});

describe('extractRecipeJsonLd', () => {
  it('finds a Recipe node nested inside an @graph array', () => {
    const html = `
      <script type="application/ld+json">
      { "@graph": [
        { "@type": "WebPage", "name": "irrelevant" },
        { "@type": "Recipe", "name": "Graph Recipe", "recipeIngredient": ["1 thing"] }
      ]}
      </script>
    `;
    const node = extractRecipeJsonLd(html);
    expect(node?.name).toBe('Graph Recipe');
  });
});

// Feature: personal-recipe-website, Property 3: Extraction pre-fill only sets returned fields (Link_Parser half)
describe('mapSchemaOrgRecipeToFields property: only present fields are set', () => {
  it('for any arbitrary subset of recipe properties present, the mapped result contains exactly the corresponding subset of fields', () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            name: fc.string({ minLength: 1, maxLength: 50 }),
            recipeIngredient: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
            recipeInstructions: fc.string({ minLength: 1, maxLength: 100 }),
            totalTime: fc.constantFrom('PT10M', 'PT30M', 'PT1H15M'),
            recipeYield: fc.integer({ min: 1, max: 12 }),
          },
          { requiredKeys: [] }
        ),
        (partialRecipe) => {
          const fields = mapSchemaOrgRecipeToFields(partialRecipe as Record<string, unknown>);

          expect(fields.name !== undefined).toBe(
            typeof partialRecipe.name === 'string' && partialRecipe.name.trim().length > 0
          );
          expect(fields.ingredients !== undefined).toBe(
            Array.isArray(partialRecipe.recipeIngredient) && partialRecipe.recipeIngredient.length > 0
          );
          expect(fields.method !== undefined).toBe(
            typeof partialRecipe.recipeInstructions === 'string' &&
              partialRecipe.recipeInstructions.trim().length > 0
          );
          expect(fields.timeToCookMinutes !== undefined).toBe(partialRecipe.totalTime !== undefined);
          expect(fields.servings !== undefined).toBe(partialRecipe.recipeYield !== undefined);
        }
      ),
      { numRuns: 100 }
    );
  });
});
