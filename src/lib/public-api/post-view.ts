import { defaultLocale } from '@/i18n/config';
import type { BlogSchema, PostCardData } from '@/types/blog';
import { getAllPublicPosts } from './api';
import type { PublicPost, PublicPostSummary } from './types';

export interface PublicPostPageModel {
  id: string;
  slug: string;
  locale: string;
  body: string;
  data: BlogSchema;
  protectedContent: boolean;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function restoreCategories(post: Pick<PublicPost, 'categories' | 'extra'>): string[] | string[][] {
  const original = post.extra?.categories;
  if (isStringList(original)) return original;
  if (Array.isArray(original) && original.every(isStringList)) return original;
  return post.categories;
}

export function getPublicPostDate(post: PublicPost | PublicPostSummary): Date {
  const value = post.displayDate ?? post.publishedAt ?? post.createdAt;
  const date = value ? new Date(value) : new Date(Number.NaN);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

/** Keep a deliberate presentation boundary; never copy the API's raw `extra` into page props. */
export function toPublicPostPageModel(post: PublicPost): PublicPostPageModel {
  const updated = post.updatedAt ? new Date(post.updatedAt) : undefined;
  return {
    id: post.id,
    slug: post.slug,
    locale: post.locale,
    body: post.bodyMarkdown,
    protectedContent: typeof post.extra?.password === 'string' && post.extra.password.length > 0,
    data: {
      title: post.title,
      description: post.description,
      date: getPublicPostDate(post),
      ...(updated && !Number.isNaN(updated.getTime()) ? { updated } : {}),
      cover: post.coverUrl ?? (typeof post.extra?.cover === 'string' ? post.extra.cover : undefined),
      tags: post.tags,
      categories: restoreCategories(post),
      math: typeof post.extra?.math === 'boolean' ? post.extra.math : undefined,
      quiz: typeof post.extra?.quiz === 'boolean' ? post.extra.quiz : undefined,
      tocNumbering: typeof post.extra?.tocNumbering === 'boolean' ? post.extra.tocNumbering : undefined,
      draft: false,
    },
  };
}

/** Convert an API summary into the small shape consumed by post cards. */
export function toPublicPostCardData(post: PublicPostSummary): PostCardData {
  return {
    slug: post.slug,
    link: post.slug,
    title: post.title,
    description: post.description,
    date: getPublicPostDate(post),
    cover: post.coverUrl ?? (typeof post.extra?.cover === 'string' ? post.extra.cover : undefined),
    tags: post.tags,
    categories: restoreCategories(post),
    draft: false,
    postLocale: post.locale,
  };
}

/** Match the site's existing translation fallback: translated posts override defaults by slug. */
export async function getLocalizedPublicPosts(locale: string, q?: string): Promise<PublicPostSummary[]> {
  const localized = await getAllPublicPosts({ locale, ...(q ? { q } : {}) });
  if (locale === defaultLocale) return localized;

  const defaults = await getAllPublicPosts({ locale: defaultLocale, ...(q ? { q } : {}) });
  const translatedSlugs = new Set(localized.map((post) => post.slug));
  return [...localized, ...defaults.filter((post) => !translatedSlugs.has(post.slug))].sort(
    (a, b) => getPublicPostDate(b).getTime() - getPublicPostDate(a).getTime(),
  );
}

export function getExtraBoolean(post: PublicPostSummary, key: string): boolean {
  return post.extra?.[key] === true;
}

export function getPostCategoryNames(post: PublicPostSummary): string[] {
  const categories = restoreCategories(post);
  const first = categories[0];
  return Array.isArray(first) ? first : typeof first === 'string' ? [first] : [];
}

export function toPublicPostRefWithCategory(post: PublicPostSummary) {
  const categories = restoreCategories(post);
  const first = categories[0];
  const categoryName = Array.isArray(first) ? first.at(-1) : first;
  return { slug: post.slug, link: post.slug, title: post.title, categoryName };
}
