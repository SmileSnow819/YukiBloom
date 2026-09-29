import { encodeSlug } from '@lib/route';
import { defaultLocale, localeList, localizedPath } from '@/i18n';
import { getPublicSiteContent } from './api';
import { getLocalizedPublicPage } from './public-page';
import { getPublicCategoryLinks, getPublicTaxonomy } from './public-taxonomy';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function createPublicSitemap(site: URL): Promise<string> {
  const siteContent = await getPublicSiteContent();
  const entries = new Map<string, string | undefined>();
  const add = (path: string, lastmod?: string) => {
    entries.set(new URL(path, site).href, lastmod);
  };
  const basePaths = [
    '/',
    '/about',
    '/music',
    '/friends',
    '/categories',
    '/tags',
    '/archives',
    '/timeline',
    '/footprints',
    '/rss.xml',
  ];

  for (const locale of localeList) {
    const prefix = locale === defaultLocale ? '' : `/${locale}`;
    for (const path of basePaths) add(localizedPath(path, locale));
    const { categories, posts } = await getPublicTaxonomy(locale);

    for (const post of posts) {
      if (post.locale !== locale) continue;
      add(localizedPath(`/post/${encodeSlug(post.slug)}`, locale), post.updatedAt ?? post.date.toISOString());
    }

    for (const category of getPublicCategoryLinks(categories)) {
      add(`${prefix}/categories/${category}`);
    }
    for (const tag of new Set(posts.flatMap((post) => post.tags))) {
      add(`${prefix}/tags/${encodeSlug(tag.replace(/\//g, '-'))}`);
    }
    for (const series of siteContent.featuredSeries.filter((item) => item.enabled)) {
      add(`${prefix}/${encodeURIComponent(series.slug)}`);
    }

    for (const slug of ['about', 'music']) {
      const page = await getLocalizedPublicPage(slug, locale);
      if (page) add(localizedPath(`/${slug}`, locale), page.updatedAt);
    }
  }

  const urls = [...entries.entries()]
    .map(
      ([loc, lastmod]) =>
        `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${escapeXml(new Date(lastmod).toISOString())}</lastmod>` : ''}</url>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
