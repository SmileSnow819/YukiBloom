export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return [...items];
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function withSortOrder<T extends { sortOrder: number }>(items: readonly T[]): T[] {
  return items.map((item, sortOrder) => ({ ...item, sortOrder }));
}

export function sortBySortOrder<T extends { sortOrder: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getNextSortOrder<T extends { sortOrder: number }>(items: readonly T[]): number {
  return items.reduce((next, item) => Math.max(next, item.sortOrder + 1), 0);
}
