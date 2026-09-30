import type { PublicCategory } from '../public-api/types';

export function getManagedCategoryNames(categories: readonly string[], records: readonly PublicCategory[]): string[] {
  return [...new Set([...categories, ...records.map(({ name }) => name)])];
}
