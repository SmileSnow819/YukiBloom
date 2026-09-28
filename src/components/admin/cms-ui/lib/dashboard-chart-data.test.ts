import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDashboardChartData } from './dashboard-chart-data';

test('dashboard chart data sorts the most used categories and preserves post status totals', () => {
  const result = getDashboardChartData({
    published: 8,
    draft: 2,
    categoryStats: [
      { name: '随笔', count: 2 },
      { name: '前端', count: 7 },
      { name: '读书', count: 4 },
    ],
  });

  assert.deepEqual(result.status, [
    { name: '已发布', value: 8 },
    { name: '草稿', value: 2 },
  ]);
  assert.deepEqual(result.categories, [
    { name: '前端', count: 7 },
    { name: '读书', count: 4 },
    { name: '随笔', count: 2 },
  ]);
});

test('dashboard chart data safely represents an empty blog', () => {
  assert.deepEqual(getDashboardChartData({ published: 0, draft: 0, categoryStats: [] }), {
    status: [
      { name: '已发布', value: 0 },
      { name: '草稿', value: 0 },
    ],
    categories: [],
  });
});
