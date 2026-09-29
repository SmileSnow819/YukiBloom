import type { AstroMarkdownOptions } from '@astrojs/markdown-remark';
import type { ContentConfig } from '@lib/config/types';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import { rehypeEncryptedBlock } from './rehype-encrypted-block';
import { rehypeEncryptedPost } from './rehype-encrypted-post';
import { rehypeImagePlaceholder } from './rehype-image-placeholder';
import { rehypeShokaAttrs } from './rehype-shoka-attrs';
import { remarkEncryptedDirective } from './remark-encrypted-directive';
import { remarkLinkEmbed } from './remark-link-embed';
import { remarkIns, remarkMark } from './remark-shoka-effects';
import { remarkShokaPreprocess } from './remark-shoka-preprocess';
import { remarkShokaRuby } from './remark-shoka-ruby';
import { remarkShokaSpoiler } from './remark-shoka-spoiler';
import { shokaMetaTransformer } from './shiki-meta-transformer';

/** Build the shared Astro-compatible Markdown pipeline from site content settings. */
export function createMarkdownOptions(
  contentConfig: Partial<ContentConfig> = {},
  options: { fetchOGPreview?: boolean } = {},
): AstroMarkdownOptions {
  const remarkPlugins: NonNullable<AstroMarkdownOptions['remarkPlugins']> = [];
  const rehypePlugins: NonNullable<AstroMarkdownOptions['rehypePlugins']> = [
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      {
        behavior: 'append',
        properties: {
          className: ['anchor-link'],
          ariaLabel: 'Link to this section',
        },
      },
    ],
  ];

  // remarkShokaPreprocess MUST be first: it re-parses raw text to fix GFM/remark conflicts
  // before any AST-level plugin runs.
  const needsPreprocess =
    contentConfig.enableShokaContainers !== false ||
    contentConfig.enableShokaHexoTags !== false ||
    contentConfig.enableShokaEffects !== false;
  if (needsPreprocess) {
    remarkPlugins.push([
      remarkShokaPreprocess,
      {
        enableContainers: contentConfig.enableShokaContainers !== false,
        enableHexoTags: contentConfig.enableShokaHexoTags !== false,
        enableSuperSub: contentConfig.enableShokaEffects !== false,
        enableMath: contentConfig.enableMath !== false,
        enableEncryptedBlock: contentConfig.enableEncryptedBlock ?? false,
      },
    ]);
  }

  // Math must be parsed before ruby, spoilers, and effects scan text nodes.
  if (contentConfig.enableMath !== false) remarkPlugins.push(remarkMath);
  if (contentConfig.enableShokaSpoiler !== false) remarkPlugins.push(remarkShokaSpoiler);
  if (contentConfig.enableShokaRuby !== false) remarkPlugins.push(remarkShokaRuby);
  if (contentConfig.enableShokaEffects !== false) remarkPlugins.push(remarkIns, remarkMark);

  // Directives are also registered by remarkShokaPreprocess when it reparses content.
  if (contentConfig.enableEncryptedBlock) {
    remarkPlugins.push(remarkDirective, remarkEncryptedDirective);
  }

  // Link embeds are an existing always-on content feature.
  remarkPlugins.push([
    remarkLinkEmbed,
    {
      enableTweetEmbed: contentConfig.enableTweetEmbed ?? true,
      enableOGPreview: contentConfig.enableOGPreview ?? true,
      fetchOGPreview: options.fetchOGPreview ?? true,
    },
  ]);

  if (contentConfig.enableShokaAttrs !== false) rehypePlugins.push(rehypeShokaAttrs);
  rehypePlugins.push(rehypeImagePlaceholder);
  if (contentConfig.enableMath !== false) rehypePlugins.push(rehypeKatex);
  // Encryption must run after every other rehype transformation.
  if (contentConfig.enableEncryptedBlock) {
    rehypePlugins.push(rehypeEncryptedBlock, rehypeEncryptedPost);
  }

  return {
    gfm: true,
    remarkPlugins,
    rehypePlugins,
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      transformers: contentConfig.enableCodeMeta !== false ? [shokaMetaTransformer()] : [],
    },
  };
}
