import type { APIRoute } from 'astro';
import { isLocaleSupported } from '@/i18n/config';
import { getLocalizedPublicPosts } from '@/lib/public-api';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const locale = url.searchParams.get('locale') ?? 'zh';
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!isLocaleSupported(locale)) return Response.json({ message: 'Unsupported locale' }, { status: 400 });
  if (q.length > 200) return Response.json({ message: 'Search query is too long' }, { status: 400 });
  if (!q) return Response.json({ items: [], total: 0 });

  try {
    const posts = await getLocalizedPublicPosts(locale, q);
    const items = posts.slice(0, 20).map((post) => ({
      locale: post.locale,
      slug: post.slug,
      title: post.title,
      description: post.description,
      publishedAt: post.displayDate ?? post.publishedAt ?? post.createdAt,
    }));
    return Response.json({ items, total: posts.length });
  } catch {
    return Response.json({ message: 'Search service is unavailable' }, { status: 502 });
  }
};
