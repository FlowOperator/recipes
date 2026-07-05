/**
 * Pure function: returns true if and only if the given string has a
 * recognized http(s) scheme and a non-empty host.
 *
 * Feature: personal-recipe-website, Property 1: URL well-formedness gating
 */
export function isWellFormedUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
