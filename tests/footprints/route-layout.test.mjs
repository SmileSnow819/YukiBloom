import assert from 'node:assert/strict';

const { layoutOverviewRoutes, getOverviewLineStyle } = await import('../../src/components/footprints/overview-routes.ts');
const cities = { a: { lng: 110, lat: 30 }, b: { lng: 110, lat: 33 }, c: { lng: 110, lat: 36 } };
const make = (from, to) => ({ from, to, fromLocation: cities[from], toLocation: cities[to] });
const routes = [make('a', 'c'), make('a', 'b'), make('b', 'c'), make('c', 'a')];
const layout = layoutOverviewRoutes(routes);
assert.equal(layout.length, 3);
const long = layout.find((r) => r.from === 'a' && r.to === 'c');
const short = layout.find((r) => r.to === 'b');
assert(Math.abs(long.overviewCurveness) > Math.abs(short.overviewCurveness));
assert(Math.abs(long.overviewCurveness) >= 0.16);
assert.equal(short.overviewCurveness, 0);
assert.equal(getOverviewLineStyle(long).curveness, getOverviewLineStyle(long, 'a').curveness);
assert.deepEqual(routes[0], make('a', 'c'));
assert.deepEqual(layoutOverviewRoutes([]), []);
const reordered = layoutOverviewRoutes([routes[2], routes[1], routes[0]]);
for (const r of layout)
  assert.equal(r.overviewCurveness, reordered.find((x) => x.from === r.from && x.to === r.to).overviewCurveness);
console.log('路线避让：长线绕开中间城市、短线平直、悬停弧度一致、稳定布局和空数据均通过');
