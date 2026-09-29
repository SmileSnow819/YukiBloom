/**
 * Recent Updates Component
 *
 * Shows daily post display dates over the most recent 30 days.
 */

import { EChartsCanvas } from '@admin-ui/components/EChartsCanvas';
import { getRecentUpdateTrendData } from '@admin-ui/lib/dashboard-chart-data';
import type { PostListItem } from '@admin-ui/types';
import { Icon } from '@iconify/react';
import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';

interface RecentUpdatesProps {
  posts: PostListItem[];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export function RecentUpdates({ posts }: RecentUpdatesProps) {
  const trend = useMemo(() => getRecentUpdateTrendData(posts), [posts]);
  const option = useMemo<EChartsOption>(
    () => ({
      aria: { enabled: true },
      grid: { left: 28, right: 24, top: 16, bottom: 28, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fffaff',
        borderColor: '#f5dce6',
        textStyle: { color: '#65455b' },
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const point = trend[item?.dataIndex ?? -1];
          if (!point) return '';
          const titles = point.titles.length
            ? point.titles.map((title) => `<br/>· ${escapeHtml(title)}`).join('')
            : '<br/>无文章更新';
          return `${point.date}：${point.count} 篇${titles}`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trend.map((point) => point.date.slice(5)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#efdce5' } },
        axisLabel: { color: '#a18c9a', fontSize: 11, interval: 4 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f6e8ee', type: 'dashed' } },
        axisLabel: { color: '#a18c9a', fontSize: 11 },
      },
      series: [
        {
          type: 'line',
          data: trend.map((point) => point.count),
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { color: '#e96b99', width: 3 },
          itemStyle: { color: '#e96b99', borderColor: '#fff7fa', borderWidth: 2 },
          areaStyle: { color: 'rgba(237, 103, 149, 0.12)' },
        },
      ],
    }),
    [trend],
  );

  return (
    <section className="admin-recent-card" aria-labelledby="recent-updates-title">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="recent-updates-title">最近更新</h2>
        <span className="text-muted-foreground text-xs">按展示日期统计，悬停查看文章标题</span>
      </div>
      {trend.length ? (
        <EChartsCanvas option={option} label="最近 30 天每日文章更新数量折线图，悬停数据点查看文章标题" />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Icon icon="ri:file-list-3-line" className="size-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground text-sm">还没有文章更新记录</p>
        </div>
      )}
    </section>
  );
}
