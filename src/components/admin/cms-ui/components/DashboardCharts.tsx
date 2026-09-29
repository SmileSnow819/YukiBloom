import { EChartsCanvas } from '@admin-ui/components/EChartsCanvas';
import type { DashboardChartInput } from '@admin-ui/lib/dashboard-chart-data';
import { getDashboardChartData } from '@admin-ui/lib/dashboard-chart-data';
import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';

function StatusChart({ stats }: { stats: DashboardChartInput }) {
  const chartData = getDashboardChartData(stats).status;
  const total = stats.published + stats.draft;
  const hasMultipleStatuses = chartData.filter((item) => item.value > 0).length > 1;
  const option = useMemo<EChartsOption>(
    () => ({
      aria: { enabled: true },
      color: ['#ed6795', '#bda3ec'],
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fffaff',
        borderColor: '#f5dce6',
        textStyle: { color: '#65455b' },
        formatter: '{b}：{c} 篇（{d}%）',
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemGap: 24,
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#8b7181', fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['58%', '78%'],
          center: ['50%', '43%'],
          avoidLabelOverlap: true,
          label: { show: false },
          itemStyle: { borderColor: '#fff7fa', borderWidth: hasMultipleStatuses ? 4 : 0, borderRadius: 10 },
          emphasis: { scale: true, scaleSize: 8 },
          data: chartData,
        },
      ],
    }),
    [chartData, hasMultipleStatuses],
  );

  return (
    <section className="admin-chart-card" aria-labelledby="status-chart-title">
      <div className="admin-chart-heading">
        <h3 id="status-chart-title">文章状态</h3>
      </div>
      <div className="admin-status-chart-wrap">
        <EChartsCanvas option={option} label="已发布文章与草稿数量环形图" />
        <div className="admin-status-chart-center" aria-hidden="true">
          <strong>{total}</strong>
        </div>
        {total === 0 && <div className="admin-chart-empty">还没有文章</div>}
      </div>
    </section>
  );
}

function CategoryChart({ stats }: { stats: DashboardChartInput }) {
  const categories = getDashboardChartData(stats).categories;
  const option = useMemo<EChartsOption>(
    () => ({
      aria: { enabled: true },
      grid: { left: 8, right: 28, top: 4, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#fffaff',
        borderColor: '#f5dce6',
        textStyle: { color: '#65455b' },
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          return `${item?.name ?? ''}：${item?.value ?? 0} 篇`;
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.max(...categories.map((category) => category.count), 1),
        splitLine: { lineStyle: { color: '#f6e8ee', type: 'dashed' } },
        axisLabel: { color: '#a18c9a', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: categories.map((category) => category.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#765c6d', fontSize: 12, width: 80, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          data: categories.map((category) => category.count),
          barMaxWidth: 18,
          showBackground: true,
          backgroundStyle: { color: '#faedf2', borderRadius: 9 },
          itemStyle: {
            borderRadius: [0, 9, 9, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#f7a9c2' },
                { offset: 1, color: '#e96b99' },
              ],
            },
          },
          label: { show: true, position: 'right', color: '#8b7181', fontSize: 11 },
        },
      ],
    }),
    [categories],
  );

  return (
    <section className="admin-chart-card" aria-labelledby="category-chart-title">
      <div className="admin-chart-heading">
        <h3 id="category-chart-title">分类分布</h3>
      </div>
      {categories.length > 0 ? (
        <EChartsCanvas option={option} label="各分类文章数量横向柱状图" />
      ) : (
        <div className="admin-chart-empty admin-category-empty">还没有分类数据</div>
      )}
    </section>
  );
}

export function DashboardCharts({ stats }: { stats: DashboardChartInput }) {
  return (
    <div className="admin-chart-grid">
      <StatusChart stats={stats} />
      <CategoryChart stats={stats} />
    </div>
  );
}
