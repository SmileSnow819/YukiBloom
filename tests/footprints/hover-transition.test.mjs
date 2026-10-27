import assert from 'node:assert/strict';

const { interpolateRouteAppearance } = await import('../../src/components/footprints/overview-routes.ts');
const normal = { width: 1.8, opacity: 0.62, arrowOpacity: 1 };
const faded = { width: 1.8, opacity: 0.08, arrowOpacity: 0 };
const bold = { width: 3, opacity: 0.95, arrowOpacity: 1 };
assert.deepEqual(interpolateRouteAppearance(normal, faded, 0), normal);
assert.deepEqual(interpolateRouteAppearance(normal, faded, 1), faded);
const middle = interpolateRouteAppearance(normal, faded, 0.5);
assert(middle.arrowOpacity > 0 && middle.arrowOpacity < 1);
const thickening = interpolateRouteAppearance(normal, bold, 0.5);
assert(thickening.width > normal.width && thickening.width < bold.width);
assert.deepEqual(interpolateRouteAppearance(middle, normal, 0), middle);
assert.deepEqual(interpolateRouteAppearance(normal, bold, 2), bold);
console.log('悬停过渡：箭头渐隐、线条渐粗、中断连续性和最终状态校验通过');
