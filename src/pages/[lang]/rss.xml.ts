import rss from '@astrojs/rss';
import { siteConfig } from '@constants/site-config';
import type { APIContext } from 'astro';
import { getHtmlLang } from '@/i18n';
import { isLocaleSupported } from '@/i18n/config';
import { getPublicRssItems } from '@/lib/public-api';

export const prerender = false;

export async function GET(context: APIContext) {
  const locale = context.params.lang ?? '';
  if (!isLocaleSupported(locale)) return new Response('Not Found', { status: 404 });
  const { site } = context;
  if (!site) throw new Error('Missing site metadata');

  const response = await rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || 'No description',
    site,
    trailingSlash: false,
    customData: `<language>${getHtmlLang(locale)}</language>`,
    stylesheet: '/rss/feed.xsl',
    items: await getPublicRssItems(locale, site),
  });
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/xml; charset=utf-8');
  return new Response(response.body, { status: response.status, headers });
}
