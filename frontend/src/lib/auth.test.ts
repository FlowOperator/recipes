import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isSessionExpired } from './auth';

const IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

describe('isSessionExpired', () => {
  // Feature: personal-recipe-website, Property 37: Idle session expiry boundary
  it('is expired if and only if elapsed >= 30 days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }), // lastActivityAt (ms epoch)
        fc.integer({ min: 0, max: 60 * 24 * 60 * 60 * 1000 }), // elapsed ms, up to 60 days
        (lastActivityAt, elapsedMs) => {
          const now = lastActivityAt + elapsedMs;
          const expired = isSessionExpired(lastActivityAt, now);
          const expectedExpired = elapsedMs >= IDLE_TIMEOUT_MS;
          expect(expired).toBe(expectedExpired);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('is not expired at exactly 29 days, 23 hours, 59 minutes elapsed', () => {
    const lastActivityAt = 0;
    const now = IDLE_TIMEOUT_MS - 60_000;
    expect(isSessionExpired(lastActivityAt, now)).toBe(false);
  });

  it('is expired at exactly 30 days elapsed (boundary)', () => {
    const lastActivityAt = 0;
    const now = IDLE_TIMEOUT_MS;
    expect(isSessionExpired(lastActivityAt, now)).toBe(true);
  });
});
