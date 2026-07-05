import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isValidPhotoFile } from './photoStorage';

// Feature: personal-recipe-website, Property 4: File type/size validation gates photo uploads
describe('isValidPhotoFile', () => {
  it('accepts JPEG/PNG/WEBP files <= 10 MB and rejects all others', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'),
        fc.integer({ min: 0, max: 20 * 1024 * 1024 }),
        (type, size) => {
          const file = new File(['x'.repeat(Math.min(size, 100))], 'test', { type });
          Object.defineProperty(file, 'size', { value: size });
          const result = isValidPhotoFile(file);
          const shouldBeValid =
            ['image/jpeg', 'image/png', 'image/webp'].includes(type) && size <= 10 * 1024 * 1024;
          expect(result.valid).toBe(shouldBeValid);
        }
      ),
      { numRuns: 100 }
    );
  });
});
