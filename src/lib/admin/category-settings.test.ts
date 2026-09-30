import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getManagedCategoryNames } from './category-settings';

test('managed category names combine post categories and saved mappings without duplicates', () => {
  assert.deepEqual(
    getManagedCategoryNames(
      ['前端', '笔记', '前端'],
      [
        { name: '随笔', slug: 'suibi', image: '', description: '', showOnHome: false, sortOrder: 0 },
        { name: '笔记', slug: 'biji', image: '', description: '', showOnHome: false, sortOrder: 1 },
      ],
    ),
    ['前端', '笔记', '随笔'],
  );
});
