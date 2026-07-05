/**
 * Pure functions for extracting schema.org/Recipe data from fetched HTML.
 * No I/O here so this can be exhaustively unit/property tested without
 * mocking network calls.
 */

export interface ExtractedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface ExtractedRecipeFields {
  name?: string;
  ingredients?: ExtractedIngredient[];
  method?: string;
  timeToCookMinutes?: number;
  servings?: number;
  caloriesPerServing?: number;
  proteinPerServing?: number;
}

export interface ExtractionResult {
  extracted: boolean;
  fields?: ExtractedRecipeFields;
}

/**
 * Parses a naive ingredient line like "200g flour" or "2 eggs" into a
 * structured shape. This is intentionally simple: schema.org recipeIngredient
 * entries are freeform strings, so we store the raw name if we can't
 * confidently split out a quantity/unit.
 */
function parseIngredientLine(line: string): ExtractedIngredient {
  const trimmed = line.trim();
  const match = trimmed.match(/^([\d.\/]+)\s*([a-zA-Z]*)\s+(.+)$/);
  if (match) {
    const [, quantityRaw, unit, name] = match;
    const quantity = parseQuantity(quantityRaw);
    return {
      name: name.trim(),
      quantity,
      unit: unit ? unit.trim() : null,
    };
  }
  return { name: trimmed, quantity: null, unit: null };
}

function parseQuantity(raw: string): number | null {
  if (raw.includes('/')) {
    const [num, denom] = raw.split('/').map(Number);
    if (!Number.isNaN(num) && !Number.isNaN(denom) && denom !== 0) {
      return num / denom;
    }
    return null;
  }
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

/** Parses an ISO 8601 duration (e.g. "PT30M", "PT1H15M") into total minutes. */
function parseIsoDurationToMinutes(iso: string): number | undefined {
  const match = iso.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!match) return undefined;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

/** Parses a nutrition value like "450 calories" or "32g" into a number. */
function parseNutritionValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/[\d.]+/);
    if (match) return Number(match[0]);
  }
  return undefined;
}

function parseYield(yieldValue: unknown): number | undefined {
  if (typeof yieldValue === 'number') return yieldValue;
  if (typeof yieldValue === 'string') {
    const match = yieldValue.match(/\d+/);
    if (match) return Number(match[0]);
  }
  if (Array.isArray(yieldValue) && yieldValue.length > 0) {
    return parseYield(yieldValue[0]);
  }
  return undefined;
}

function normalizeInstructions(instructions: unknown): string | undefined {
  if (typeof instructions === 'string') {
    return instructions.trim() || undefined;
  }
  if (Array.isArray(instructions)) {
    const steps = instructions
      .map((step) => {
        if (typeof step === 'string') return step;
        if (step && typeof step === 'object' && 'text' in step) {
          return String((step as { text: unknown }).text ?? '');
        }
        return '';
      })
      .filter((s) => s.trim().length > 0);
    return steps.length > 0 ? steps.join('\n') : undefined;
  }
  return undefined;
}

/**
 * Maps a parsed schema.org Recipe JSON-LD object to our extraction shape.
 * Only fields actually present and non-empty in the source object are
 * included in the result (Requirement 1.3-1.4).
 */
export function mapSchemaOrgRecipeToFields(recipe: Record<string, unknown>): ExtractedRecipeFields {
  const fields: ExtractedRecipeFields = {};

  if (typeof recipe.name === 'string' && recipe.name.trim()) {
    fields.name = recipe.name.trim();
  }

  const rawIngredients = recipe.recipeIngredient;
  if (Array.isArray(rawIngredients) && rawIngredients.length > 0) {
    const ingredients = rawIngredients
      .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
      .map(parseIngredientLine);
    if (ingredients.length > 0) {
      fields.ingredients = ingredients;
    }
  }

  const method = normalizeInstructions(recipe.recipeInstructions);
  if (method) {
    fields.method = method;
  }

  if (typeof recipe.totalTime === 'string') {
    const minutes = parseIsoDurationToMinutes(recipe.totalTime);
    if (minutes !== undefined) {
      fields.timeToCookMinutes = minutes;
    }
  }

  const servings = parseYield(recipe.recipeYield);
  if (servings !== undefined) {
    fields.servings = servings;
  }

  // Extract nutrition if available (schema.org NutritionInformation)
  const nutrition = recipe.nutrition as Record<string, unknown> | undefined;
  if (nutrition && typeof nutrition === 'object') {
    const calories = parseNutritionValue(nutrition.calories);
    if (calories !== undefined) fields.caloriesPerServing = calories;
    const protein = parseNutritionValue(nutrition.proteinContent);
    if (protein !== undefined) fields.proteinPerServing = protein;
  }

  return fields;
}

/**
 * Extracts the first schema.org Recipe object found in a page's JSON-LD
 * <script type="application/ld+json"> blocks. Returns null if none found
 * or none parse as a Recipe.
 */
export function extractRecipeJsonLd(html: string): Record<string, unknown> | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonText = match[1].trim();
    if (!jsonText) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      continue;
    }

    const candidate = findRecipeNode(parsed);
    if (candidate) return candidate;
  }

  return null;
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const type = obj['@type'];
    const isRecipe =
      type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
    if (isRecipe) return obj;

    // schema.org JSON-LD sometimes nests under @graph
    if (Array.isArray(obj['@graph'])) {
      const found = findRecipeNode(obj['@graph']);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Top-level entry point: given fetched HTML, returns the extraction result
 * per Requirement 1.3-1.5.
 */
export function extractRecipeFromHtml(html: string): ExtractionResult {
  const recipeNode = extractRecipeJsonLd(html);
  if (!recipeNode) {
    return { extracted: false };
  }

  const fields = mapSchemaOrgRecipeToFields(recipeNode);
  return { extracted: true, fields };
}
