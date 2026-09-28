import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { adminRequest, setCsrfToken } from './api';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  setCsrfToken('');
});

test('adminRequest unwraps the API envelope and sends cookie plus CSRF on writes', async () => {
  let request: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    request = init;
    return new Response(JSON.stringify({ code: 0, data: { id: 'post-1' }, message: 'ok' }), { status: 200 });
  };
  setCsrfToken('csrf-value');
  const result = await adminRequest<{ id: string }>('/posts', { method: 'POST', body: { title: 'hello' } });
  assert.deepEqual(result, { id: 'post-1' });
  assert.equal(request?.credentials, 'include');
  assert.equal(new Headers(request?.headers).get('X-CSRF-Token'), 'csrf-value');
  assert.equal(new Headers(request?.headers).get('Content-Type'), 'application/json');
});

test('adminRequest preserves backend error details and HTTP status', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 10005, message: '版本冲突' }), { status: 409 });
  await assert.rejects(
    adminRequest('/posts/1'),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 409 && error.message === '版本冲突',
  );
});
