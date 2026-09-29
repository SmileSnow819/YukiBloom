/**
 * Article Date Distribution Component
 *
 * Shows article display dates in a calendar heatmap.
 */

import { EChartsCanvas } from '@admin-ui/components/EChartsCanvas';
import { getPostDateHeatmapData } from '@admin-ui/lib/dashboard-chart-data';
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
  const dates = useMemo(() => getPostDateHeatmapData(posts), [posts]);
  const firstDate = dates[0]?.date;
  const lastDate = dates.at(-1)?.date;
  const option = useMemo<EChartsOption>(
    () => ({
      aria: { enabled: true },
      calendar: {
        top: 'middle',
        left: 'center',
        cellSize: [16, 16],
        range: firstDate && lastDate ? [firstDate, lastDate] : undefined,
        orient: 'horizontal',
        dayLabel: {
          firstDay: 1,
          nameMap: ['', '一', '', '三', '', '五', ''],
          color: '#a18c9a',
          fontSize: 10,
          margin: 8,
        },
        monthLabel: {
          nameMap: Array.from({ length: 12 }, (_, index) => `${index + 1}月`),
          color: '#765c6d',
          fontSize: 11,
        },
        yearLabel: { show: false },
        itemStyle: { borderWidth: 2, borderColor: '#fffafd' },
        splitLine: { show: false },
      },
      visualMap: {
        show: false,
        type: 'piecewise',
        dimension: 1,
        orient: 'horizontal',
        right: 20,
        top: 0,
        itemWidth: 11,
        itemHeight: 11,
        itemGap: 8,
        textStyle: { color: '#8b7181', fontSize: 10 },
        pieces: [
          { value: 0, color: '#f7edf2' },
          { value: 1, color: '#f4c4d3' },
          { min: 2, max: 3, color: '#e982a2' },
          { min: 4, color: '#c94670' },
        ],
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fffaff',
        borderColor: '#f5dce6',
        textStyle: { color: '#65455b' },
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const point = dates[item?.dataIndex ?? -1];
          if (!point) return '';
          const visibleTitles = point.titles.slice(0, 8);
          const titles = visibleTitles.map((title) => `<br/>· ${escapeHtml(title)}`).join('');
          const moreTitles =
            point.titles.length > visibleTitles.length ? `<br/>还有 ${point.titles.length - visibleTitles.length} 篇` : '';
          return `${point.date}：${point.count} 篇${titles}${moreTitles}`;
        },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: dates.map((point) => [point.date, point.count]),
        },
      ],
    }),
    [dates, firstDate, lastDate],
  );

  return (
    <section className="admin-recent-card" aria-labelledby="recent-updates-title">
      <div className="mb-2">
        <h2 id="recent-updates-title">文章日期分布</h2>
      </div>
      {dates.length ? (
        <div className="overflow-x-auto">
          <EChartsCanvas option={option} label="过去一年文章日期热力图，悬停日期格查看文章标题" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Icon icon="ri:file-list-3-line" className="size-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground text-sm">还没有文章更新记录</p>
        </div>
      )}
    </section>
  );
}
