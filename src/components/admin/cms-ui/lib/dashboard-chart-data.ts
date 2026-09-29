import { eachDayOfInterval, format, startOfDay, startOfWeek, subWeeks } from 'date-fns';

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

export interface PostDateHeatmapPoint {
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

export function getPostDateHeatmapData(posts: RecentUpdateInput[]): PostDateHeatmapPoint[] {
  if (posts.length === 0) return [];

  const postsByDate = new Map<string, string[]>();
  for (const post of posts) {
    const timestamp = new Date(post.date);
    if (Number.isNaN(timestamp.getTime())) continue;
    const date = format(timestamp, 'yyyy-MM-dd');
    postsByDate.set(date, [...(postsByDate.get(date) || []), post.title]);
  }

  const today = startOfDay(new Date());
  const firstDate = startOfWeek(subWeeks(today, 51), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: firstDate, end: today }).map((day) => {
    const date = format(day, 'yyyy-MM-dd');
    const titles = postsByDate.get(date) || [];
    return { date, count: titles.length, titles };
  });
}
