/**
 * Dashboard Stats Component
 *
 * Displays summary statistics cards for posts with circular icon backgrounds.
 */

import { cn } from '@admin-ui/lib/utils';
import { Icon } from '@iconify/react';

interface DashboardStatsProps {
  total: number;
  published: number;
  draft: number;
}

export function DashboardStats({ total, published, draft }: DashboardStatsProps) {
  const stats = [
    {
      label: '文章总数',
      value: total,
      icon: 'ri:file-list-3-line',
      tone: 'rose',
    },
    {
      label: '已发布',
      value: published,
      icon: 'ri:check-line',
      tone: 'lilac',
    },
    {
      label: '草稿',
      value: draft,
      icon: 'ri:draft-line',
      tone: 'peach',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className={cn('admin-stat-card', `admin-stat-card-${stat.tone}`)}>
          <div className="flex items-center gap-4">
            <div className="admin-stat-icon">
              <Icon icon={stat.icon} className="size-6" />
            </div>
            <div>
              <p className="admin-stat-value">{stat.value}</p>
              <p className="admin-stat-label">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
