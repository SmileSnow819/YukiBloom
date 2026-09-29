import type { PublicCategoryMapping } from '../public-api/types';

export function getManagedCategoryNames(categories: readonly string[], mappings: readonly PublicCategoryMapping[]): string[] {
  return [...new Set([...categories, ...mappings.map(({ name }) => name)])];
}

export function upsertCategoryMapping(
  mappings: readonly PublicCategoryMapping[],
  name: string,
  slug: string,
): PublicCategoryMapping[] {
  const index = mappings.findIndex((mapping) => mapping.name === name);
  if (index === -1) return [...mappings, { name, slug }];
  return mappings.map((mapping, mappingIndex) => (mappingIndex === index ? { ...mapping, slug } : mapping));
}
