import { format, isValid, parseISO } from 'date-fns';
import type { Post, PostInput } from '@/lib/admin/api';

export interface PostMetadataValues {
  title: string;
  description: string;
  date: string;
  categories: string;
  tags: string;
  coverMediaId: string | null;
}

function splitList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function splitCategories(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[>,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function formatDateInput(value: string | undefined, now: Date): string {
  if (value) {
    const parsed = parseISO(value);
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  }
  return format(now, 'yyyy-MM-dd');
}

export function getPostMetadataDefaults(post: Post, now = new Date()): PostMetadataValues {
  return {
    title: post.title,
    description: post.description || '',
    date: formatDateInput(post.displayDate, now),
    categories: (post.categories || []).join(' > '),
    tags: (post.tags || []).join(', '),
    coverMediaId: post.coverMediaId || null,
  };
}

function toDisplayDate(date: string): string {
  return new Date(`${date}T12:00:00`).toISOString();
}

export function buildPostMetadataUpdate(post: Post, values: PostMetadataValues): PostInput {
  return {
    locale: post.locale,
    slug: post.slug,
    title: values.title.trim(),
    description: values.description.trim(),
    bodyMarkdown: post.bodyMarkdown,
    displayDate: values.date ? toDisplayDate(values.date) : post.displayDate,
    categories: splitCategories(values.categories),
    tags: splitList(values.tags),
    extra: post.extra || {},
    coverMediaId: values.coverMediaId,
    version: post.version,
  };
}

export function buildPostContentUpdate(post: Post, bodyMarkdown: string): PostInput {
  return {
    locale: post.locale,
    slug: post.slug,
    title: post.title,
    description: post.description,
    bodyMarkdown,
    displayDate: post.displayDate,
    categories: post.categories,
    tags: post.tags,
    extra: post.extra || {},
    coverMediaId: post.coverMediaId,
    version: post.version,
  };
}
