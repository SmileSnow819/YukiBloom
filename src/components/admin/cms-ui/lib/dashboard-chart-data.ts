import { format, subDays } from 'date-fns';

export interface DashboardChartInput {
  published: number;
  draft: number;
  categoryStats: { name: string; count: number }[];
}

export interface RecentUpdateInput {
  title: string;
  date: string;
  updated?: string;
}

export interface RecentUpdateTrendPoint {
  date: string;
  count: number;
  titles: string[];
}

export interface DashboardChartData {
  status: { name: string; value: number }[];
  categories: { name: string; count: number }[];
}

export function getDashboardChartData(
  { published, draft, categoryStats }: DashboardChartInput,
  categoryLimit = 6,
): DashboardChartData {
  return {
    status: [
      { name: '已发布', value: published },
      { name: '草稿', value: draft },
    ],
    categories: [...categoryStats].sort((left, right) => right.count - left.count).slice(0, categoryLimit),
  };
}

export function getRecentUpdateTrendData(posts: RecentUpdateInput[], dayCount = 30): RecentUpdateTrendPoint[] {
  const postsByDate = new Map<string, string[]>();
  for (const post of posts) {
    const timestamp = new Date(post.date);
    if (Number.isNaN(timestamp.getTime())) continue;
    const date = format(timestamp, 'yyyy-MM-dd');
    postsByDate.set(date, [...(postsByDate.get(date) || []), post.title]);
  }

  const latestDate = [...postsByDate.keys()].sort().at(-1);
  if (!latestDate) return [];

  const latest = new Date(`${latestDate}T00:00:00`);
  return Array.from({ length: dayCount }, (_, index) => {
    const date = format(subDays(latest, dayCount - index - 1), 'yyyy-MM-dd');
    const titles = postsByDate.get(date) || [];
    return { date, count: titles.length, titles };
  });
}
