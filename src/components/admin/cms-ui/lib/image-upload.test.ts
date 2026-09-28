import assert from 'node:assert/strict';
import test from 'node:test';
import { validateImageUpload } from './image-upload';

test('accepts supported image types up to 10 MiB', () => {
  assert.equal(validateImageUpload({ type: 'image/webp', size: 10 * 1024 * 1024 }), null);
});

test('rejects unsupported image formats', () => {
  assert.equal(validateImageUpload({ type: 'image/gif', size: 1024 }), '仅支持 JPG、PNG 或 WebP 图片');
});

test('rejects images larger than 10 MiB', () => {
  assert.equal(validateImageUpload({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }), '图片不能超过 10 MiB');
});
