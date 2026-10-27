import assert from 'node:assert/strict';

const { mergeOverviewRoutes, getOverviewLineStyle } = await import('../../src/components/footprints/overview-routes.ts');
const routes = [
  { from: 'a', to: 'b', date: 'first' },
  { from: 'b', to: 'a' },
  { from: 'a', to: 'b' },
  { from: 'b', to: 'c' },
];
const merged = mergeOverviewRoutes(routes);
assert.equal(merged.length, 2);
assert.equal(merged[0].date, 'first');
assert.equal(routes.length, 4);
const normal = getOverviewLineStyle(merged[0]);
const connected = getOverviewLineStyle(merged[0], 'b');
const unrelated = getOverviewLineStyle(merged[0], 'c');
assert(connected.opacity > normal.opacity && unrelated.opacity < normal.opacity);
assert(connected.width > normal.width);
assert.equal(getOverviewLineStyle(merged[1], 'b').opacity, connected.opacity);
assert.deepEqual(mergeOverviewRoutes([]), []);
console.log('总览路线：往返合并、保留原数据、关联突出及无关淡出校验通过');
