import rss from '@astrojs/rss';
import { siteConfig } from '@constants/site-config';
import type { APIContext } from 'astro';
import { defaultLocale } from '@/i18n';
import { getPublicRssItems } from '@/lib/public-api';

export const prerender = false;

export async function GET(context: APIContext) {
  const { site } = context;
  if (!site) throw new Error('Missing site metadata');

  const response = await rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || 'No description',
    site,
    trailingSlash: false,
    stylesheet: '/rss/feed.xsl',
    items: await getPublicRssItems(defaultLocale, site),
  });
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/xml; charset=utf-8');
  return new Response(response.body, { status: response.status, headers });
}
