import { renderMarkdown } from '@lib/markdown/render-markdown';
import { getSanitizeHtml, stripHtmlToText } from '@lib/sanitize';
import { localizedPath, t } from '@/i18n';
import { getPublicPost } from './api';
import { getLocalizedPublicPosts, getPostCategoryNames, getPublicPostDate } from './post-view';

export async function getPublicRssItems(locale: string, site: URL) {
  const posts = (await getLocalizedPublicPosts(locale)).slice(0, 20);
  return Promise.all(
    posts.map(async (summary) => {
      const post = await getPublicPost(summary.slug, summary.locale);
      const password = typeof post.extra?.password === 'string' ? post.extra.password : undefined;
      const rendered = password ? '' : await renderMarkdown(post.bodyMarkdown, post.extra ?? {});
      const rssNotice = t(locale, 'encrypted.post.rssNotice');
      const categoryNames = getPostCategoryNames(summary);
      const postLink = new URL(localizedPath(`/post/${summary.slug}`, locale), site).pathname;
      const categories = [...categoryNames.map((name) => `category:${name}`), ...summary.tags.map((tag) => `tag:${tag}`)];
      const description = password ? rssNotice : summary.description || stripHtmlToText(rendered);

      return {
        title: password ? `🔒 ${summary.title}` : summary.title,
        pubDate: getPublicPostDate(summary),
        description,
        link: postLink,
        content: password ? `<p>${rssNotice}</p>` : getSanitizeHtml(rendered),
        categories,
        customData: `<guid isPermaLink="false">${locale}:${summary.slug}</guid>`,
      };
    }),
  );
}
