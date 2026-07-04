/**
 * Ingestion_Worker: fetches recipe URLs and extracts schema.org Recipe
 * markup (Link_Parser). See design.md for the full architecture. This
 * Worker holds no third-party secrets - it only fetches public recipe
 * pages on the Owner's behalf, working around browser CORS restrictions.
 */
import { extractRecipeFromHtml } from './recipeExtractor';
import { verifyOwnerRequest } from './verifyAuth';

const FETCH_TIMEOUT_MS = 15_000; // Requirement 1.6

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some sites block requests with no user-agent.
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeSiteBot/1.0)',
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function isWellFormedUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

async function handleParseLink(request: Request, env: Env): Promise<Response> {
  const authorized = await verifyOwnerRequest(request, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  if (!authorized) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const url = body.url;
  if (typeof url !== 'string' || !isWellFormedUrl(url)) {
    return jsonResponse({ error: 'A well-formed http(s) URL is required' }, 400);
  }

  try {
    const pageResponse = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    if (!pageResponse.ok) {
      return jsonResponse({ error: 'Could not retrieve recipe page' }, 502);
    }
    const html = await pageResponse.text();
    const result = extractRecipeFromHtml(html);
    return jsonResponse(result);
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return jsonResponse(
      { error: isAbort ? 'Timed out retrieving recipe page' : 'Could not retrieve recipe page' },
      504
    );
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/parse-link') {
      return handleParseLink(request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
