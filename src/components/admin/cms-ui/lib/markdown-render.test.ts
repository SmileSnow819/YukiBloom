import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdown } from './markdown-render';

test('markdown preview uses the same light and dark Shiki themes as public posts', async () => {
  const html = await renderMarkdown('```typescript\nconst answer = 42;\n```');

  assert.match(html, /github-light/);
  assert.match(html, /github-dark/);
  assert.match(html, /--shiki-dark/);
});
