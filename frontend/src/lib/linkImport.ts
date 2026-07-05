import { supabase } from './supabaseClient';
import { isWellFormedUrl } from './urlValidation';
import type { ExtractedRecipeFields } from './recipeTypes';

const WORKER_URL = import.meta.env.VITE_INGESTION_WORKER_URL;

export type LinkImportResult =
  | { status: 'invalid_url' }
  | { status: 'no_markup' }
  | { status: 'fetch_failed' }
  | { status: 'extracted'; fields: ExtractedRecipeFields };

/**
 * Requirement 1: submits a URL to the Link_Parser and maps the response to
 * a result the UI can act on. Client-side URL validation happens first, so
 * malformed URLs never reach the Worker (Requirement 1.1).
 */
export async function importRecipeFromLink(url: string): Promise<LinkImportResult> {
  if (!isWellFormedUrl(url)) {
    return { status: 'invalid_url' };
  }

  if (!WORKER_URL) {
    throw new Error('VITE_INGESTION_WORKER_URL is not configured.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { status: 'fetch_failed' };
  }

  try {
    const response = await fetch(`${WORKER_URL}/parse-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      return { status: 'fetch_failed' };
    }

    const body: { extracted: boolean; fields?: ExtractedRecipeFields } = await response.json();
    if (!body.extracted) {
      return { status: 'no_markup' };
    }

    return { status: 'extracted', fields: body.fields ?? {} };
  } catch {
    return { status: 'fetch_failed' };
  }
}
