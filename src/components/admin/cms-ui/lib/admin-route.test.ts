import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminPostId, withAdminPost } from './admin-route';

test('reads the edited post id from the admin URL', () => {
  assert.equal(getAdminPostId(new URL('https://example.com/admin?post=post-123')), 'post-123');
});

test('removes an empty post id from the admin URL', () => {
  assert.equal(getAdminPostId(new URL('https://example.com/admin?post=')), null);
});

test('adds or removes the post query while preserving other URL state', () => {
  const current = new URL('https://example.com/admin?tab=posts#top');
  const editorUrl = withAdminPost(current, 'post 123');
  assert.equal(editorUrl.href, 'https://example.com/admin?tab=posts&post=post+123#top');
  assert.equal(withAdminPost(editorUrl, null).href, current.href);
});
