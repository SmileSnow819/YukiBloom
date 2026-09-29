import { categoryMap } from '@constants/category';
import { encodeSlug } from '@lib/route';
import type { Category } from '@/lib/content/types';
import { getLocalizedPublicPosts, getPostCategoryNames, getPublicPostDate } from './post-view';
import type { PublicPostSummary } from './types';

export interface PublicTimelinePost {
  slug: string;
  title: string;
  date: Date;
  categoryNames: string[];
  tags: string[];
}

function addPath(categories: Category[], path: string[]): void {
  let level = categories;
  for (const name of path) {
    let category = level.find((item) => item.name === name);
    if (!category) {
      category = { name, children: [] };
      level.push(category);
    }
    category.children ??= [];
    level = category.children;
  }
}

function getCategoryPath(post: PublicPostSummary): string[] {
  const raw = post.extra?.categories;
  const first = Array.isArray(raw) ? raw[0] : undefined;
  if (Array.isArray(first) && first.every((name) => typeof name === 'string')) return first;
  return getPostCategoryNames(post);
}

export async function getPublicTaxonomy(locale: string): Promise<{
  categories: Category[];
  countMap: Record<string, number>;
  posts: PublicTimelinePost[];
}> {
  const posts = await getLocalizedPublicPosts(locale);
  const categories: Category[] = [];
  const countMap: Record<string, number> = {};
  for (const post of posts) {
    const rawCatalog = post.extra?.catalog;
    if (rawCatalog === false) continue;
    const path = getCategoryPath(post);
    if (!path.length) continue;
    addPath(categories, path);
    for (const name of path) countMap[name] = (countMap[name] ?? 0) + 1;
  }
  return {
    categories,
    countMap,
    posts: posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      date: getPublicPostDate(post),
      categoryNames: getCategoryPath(post),
      tags: post.tags.map((tag) => tag.toLowerCase()),
    })),
  };
}

export function getPublicCategoryLinks(categories: Category[], parentLink = ''): string[] {
  const links: string[] = [];
  for (const category of categories) {
    const segment = encodeSlug(categoryMap[category.name]);
    const link = parentLink ? `${parentLink}/${segment}` : segment;
    links.push(link);
    if (category.children?.length) links.push(...getPublicCategoryLinks(category.children, link));
  }
  return links;
}

export function findPublicCategoryByLink(categories: Category[], link: string): Category | null {
  const segments = link.split('/').filter(Boolean).map(decodeURIComponent);
  const reverseMap = new Map(Object.entries(categoryMap).map(([name, slug]) => [slug, name]));
  let level = categories;
  let found: Category | undefined;
  for (const segment of segments) {
    const name = reverseMap.get(segment) ?? segment;
    found = level.find((category) => category.name === name);
    if (!found) return null;
    level = found.children ?? [];
  }
  return found ?? null;
}

export function getPublicTagCounts(posts: PublicTimelinePost[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    for (const tag of new Set(post.tags)) counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}
