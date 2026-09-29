import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getManagedCategoryNames, upsertCategoryMapping } from './category-settings';

test('managed category names combine post categories and saved mappings without duplicates', () => {
  assert.deepEqual(
    getManagedCategoryNames(
      ['前端', '笔记', '前端'],
      [
        { name: '随笔', slug: 'suibi' },
        { name: '笔记', slug: 'biji' },
      ],
    ),
    ['前端', '笔记', '随笔'],
  );
});

test('upsertCategoryMapping changes one slug and preserves unrelated mappings', () => {
  const mappings = [
    { name: '前端', slug: 'old' },
    { name: '笔记', slug: 'biji' },
  ];
  assert.deepEqual(upsertCategoryMapping(mappings, '前端', 'front-end'), [
    { name: '前端', slug: 'front-end' },
    { name: '笔记', slug: 'biji' },
  ]);
  assert.deepEqual(upsertCategoryMapping(mappings, '随笔', 'suibi'), [...mappings, { name: '随笔', slug: 'suibi' }]);
});
