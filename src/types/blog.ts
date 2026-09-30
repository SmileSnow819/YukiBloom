/** Article data shape used by the public API adapter and presentation components. */
export interface BlogSchema {
  title: string;
  description?: string;
  link?: string;
  date: Date;
  updated?: Date;
  cover?: string;
  tags?: string[];
  subtitle?: string;
  catalog?: boolean;
  categories?: string[] | string[][];
  sticky?: boolean;
  draft?: boolean;
  tocNumbering?: boolean;
  /** Enable KaTeX math rendering for this post */
  math?: boolean;
  /** Enable quiz interaction for this post */
  quiz?: boolean;
  /** Password for encrypting the entire post content */
  password?: string;
}

/**
 * Compatibility shape for components that can still render legacy post data.
 */
export interface BlogPost {
  collection: 'blog';
  id: string;
  slug: string;
  body: string;
  data: BlogSchema;
  rendered?: { html: string };
}

/**
 * 最小文章引用 - 用于导航（3 字段）
 */
export interface PostRef {
  slug: string;
  link?: string;
  title: string;
}

/**
 * 带分类的文章引用 - 用于列表展示（4 字段）
 */
export interface PostRefWithCategory extends PostRef {
  categoryName?: string;
}

/**
 * 文章卡片数据 - 用于卡片展示
 */
export interface PostCardData {
  slug: string;
  link?: string;
  title: string;
  description?: string;
  date: Date;
  cover?: string;
  tags?: string[];
  categories?: string[] | string[][];
  draft?: boolean;
  wordCount?: number; // API 列表不包含正文时不可用
  readingTime?: string; // API 列表不包含正文时不可用
  postLocale?: string; // 文章的原始语言代码（用于 fallback 标记）
}
