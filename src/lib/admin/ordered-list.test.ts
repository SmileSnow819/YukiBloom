import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveItem, withSortOrder } from './ordered-list';

test('moveItem moves an item while keeping the rest of the order stable', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
});

test('moveItem ignores indexes outside the list', () => {
  assert.deepEqual(moveItem(['a', 'b'], -1, 1), ['a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 0, 2), ['a', 'b']);
});

test('withSortOrder assigns zero-based order without mutating entries', () => {
  const input = [
    { id: 'a', sortOrder: 8 },
    { id: 'b', sortOrder: 3 },
  ];
  assert.deepEqual(withSortOrder(input), [
    { id: 'a', sortOrder: 0 },
    { id: 'b', sortOrder: 1 },
  ]);
  assert.deepEqual(input, [
    { id: 'a', sortOrder: 8 },
    { id: 'b', sortOrder: 3 },
  ]);
});
