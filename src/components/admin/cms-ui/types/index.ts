/**
 * CMS Type Definitions
 */

/**
 * Blog post frontmatter schema
 */
export interface BlogSchema {
  title: string;
  date?: Date;
  updated?: Date;
  description?: string;
  categories?: string | string[] | string[][];
  tags?: string[];
  cover?: string;
  link?: string;
  subtitle?: string;
  draft?: boolean;
  sticky?: boolean;
  tocNumbering?: boolean;
  excludeFromSummary?: boolean;
  math?: boolean;
  quiz?: boolean;
}

/**
 * Result from reading a post
 */
export interface ReadPostResult {
  frontmatter: BlogSchema;
  content: string;
}

/**
 * Post list item for dashboard display
 */
export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  date: string;
  updated?: string;
  coverMediaId?: string;
  coverUrl?: string;
  categories: string[];
  tags: string[];
  draft: boolean;
  sticky: boolean;
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  total: number;
  published: number;
  draft: number;
  categoryStats: { name: string; count: number }[];
  tagStats: { name: string; count: number }[];
  recentPosts: PostListItem[];
}

/**
 * Response from list posts API
 */
export interface ListPostsResponse {
  posts: PostListItem[];
  total: number;
  stats: DashboardStats;
  categories: string[];
  tags: string[];
}

/**
 * Parameters for listing posts
 */
export interface ListPostsParams {
  category?: string;
  tag?: string;
  status?: 'all' | 'draft' | 'published';
  search?: string;
  sort?: 'date' | 'title' | 'updated';
  order?: 'asc' | 'desc';
}

/**
 * Parameters for creating a post
 */
export interface CreatePostParams {
  title: string;
  coverMediaId: string;
  categories?: string[];
  tags?: string[];
  draft?: boolean;
  categoryMappings?: Record<string, string>;
}

/**
 * Response from create post API
 */
export interface CreatePostResponse {
  success: boolean;
  postId: string;
  message?: string;
}

/**
 * Response from toggle draft API
 */
export interface ToggleDraftResponse {
  success: boolean;
  draft: boolean;
}

/**
 * Response from toggle sticky API
 */
export interface ToggleStickyResponse {
  success: boolean;
  sticky: boolean;
}
