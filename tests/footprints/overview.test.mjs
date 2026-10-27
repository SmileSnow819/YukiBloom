import assert from 'node:assert/strict';

const { getOverviewBounds } = await import('../../src/components/footprints/overview.ts');
const bounds = getOverviewBounds([
  { lng: 108.94, lat: 34.34 },
  { lng: 121.47, lat: 31.23 },
  { lng: 116.4, lat: 39.9 },
  { lng: 112.94, lat: 28.23 },
]);
assert(bounds[0][0] < 108.94 && bounds[0][1] > 39.9);
assert(bounds[1][0] > 121.47 && bounds[1][1] < 28.23);
assert(bounds[0][0] > 100);
const single = getOverviewBounds([{ lng: 120, lat: 30 }]);
assert(single[0][0] < 120 && single[1][0] > 120);
assert.equal(getOverviewBounds([]), undefined);
console.log('总览范围校验通过：覆盖所有地点、保留边距、单地点和空数据。');
