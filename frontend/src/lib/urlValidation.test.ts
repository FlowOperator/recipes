import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isWellFormedUrl } from './urlValidation';

describe('isWellFormedUrl', () => {
  it('accepts well-formed http(s) URLs', () => {
    expect(isWellFormedUrl('https://example.com/recipe')).toBe(true);
    expect(isWellFormedUrl('http://example.com')).toBe(true);
  });

  it('rejects strings with no scheme, no host, or non-http(s) schemes', () => {
    expect(isWellFormedUrl('not a url')).toBe(false);
    expect(isWellFormedUrl('example.com')).toBe(false);
    expect(isWellFormedUrl('ftp://example.com')).toBe(false);
    expect(isWellFormedUrl('')).toBe(false);
    expect(isWellFormedUrl('   ')).toBe(false);
  });

  // Feature: personal-recipe-website, Property 1: URL well-formedness gating
  it('accepts if and only if it has a recognized http(s) scheme and non-empty host', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.string({ minLength: 0, maxLength: 30 })
        ),
        (candidate) => {
          const result = isWellFormedUrl(candidate);
          let expected: boolean;
          try {
            const parsed = new URL(candidate);
            expected = (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
          } catch {
            expected = false;
          }
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
