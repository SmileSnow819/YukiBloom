export interface DashboardChartInput {
  published: number;
  draft: number;
  categoryStats: { name: string; count: number }[];
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
