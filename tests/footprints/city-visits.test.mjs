import assert from 'node:assert/strict';

const { getCityVisits } = await import('../../src/components/footprints/city-visits.ts');
const routes = [
  { from: 'a', to: 'b' },
  { from: 'b', to: 'c' },
  { from: 'c', to: 'b' },
];
assert.deepEqual(getCityVisits(routes, 'b'), [0, 2]);
assert.deepEqual(getCityVisits(routes, 'a'), [0]);
assert.deepEqual(getCityVisits(routes, 'unknown'), []);
console.log('城市到访分组：重复到访、仅出发城市、未知城市均通过');
