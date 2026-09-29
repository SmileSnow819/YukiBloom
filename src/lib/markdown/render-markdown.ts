import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { defaultContentConfig } from '@constants/content-config';
import type { ContentConfig } from '@lib/config/types';
import { createMarkdownOptions } from './markdown-options';

export type MarkdownFrontmatter = Record<string, unknown>;

let processorPromise: ReturnType<typeof createMarkdownProcessor> | undefined;

function getProcessor(contentConfig: Partial<ContentConfig>) {
  processorPromise ??= createMarkdownProcessor(createMarkdownOptions(contentConfig, { fetchOGPreview: false }));
  return processorPromise;
}

/** Render backend-provided Markdown with the same plugins and options used by Astro's build pipeline. */
export async function renderMarkdown(markdown: string, frontmatter: MarkdownFrontmatter = {}): Promise<string> {
  const processor = await getProcessor(defaultContentConfig);
  const result = await processor.render(markdown, { frontmatter });
  return result.code;
}
