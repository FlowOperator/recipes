import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Ingestion_Worker routing', () => {
  it('returns 404 for unknown routes', async () => {
    const request = new IncomingRequest('http://example.com/unknown');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it('rejects /parse-link requests with no Authorization header', async () => {
    const request = new IncomingRequest('http://example.com/parse-link', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it('responds to CORS preflight requests', async () => {
    const request = new IncomingRequest('http://example.com/parse-link', { method: 'OPTIONS' });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
