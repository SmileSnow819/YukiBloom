import assert from 'node:assert/strict';

const { getCityTooltip } = await import('../../src/components/footprints/city-tooltip.ts');
const locations = [
  { name: '苏州', impression: '第一次漫展\n好多老师～' },
  { name: '上海', impression: '' },
  { name: '北京', impression: '<img src=x onerror=alert(1)>' },
];
assert(getCityTooltip(locations, '苏州').includes('第一次漫展<br>好多老师～'));
assert.equal(getCityTooltip(locations, '苏州市'), getCityTooltip(locations, '苏州'));
assert(!getCityTooltip(locations, '上海').includes('undefined'));
assert(!getCityTooltip(locations, '北京').includes('<img'));
assert.equal(getCityTooltip(locations, '未知城市'), '');
console.log('城市印象 tooltip：城市点/市界、换行、空内容和文本转义校验通过');
