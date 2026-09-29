import { generateSlug } from '@admin-ui/lib/slug';
import type { CreatePostParams, CreatePostResponse, ListPostsParams, ListPostsResponse, ReadPostResult } from '@admin-ui/types';
import { adminRequest, type Media, type Post } from '@/lib/admin/api';
import { setCategoryMap } from './category';
import {
  buildPostContentUpdate,
  buildPostMetadataUpdate,
  getPostMetadataDefaults,
  type PostMetadataValues,
} from './post-metadata';

const categories = (post: Post) => post.categories || [];
const toListItem = (post: Post) => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  date: post.displayDate || post.updatedAt,
  updated: post.updatedAt,
  categories: categories(post),
  tags: post.tags || [],
  draft: post.status !== 'published',
  sticky: Boolean(post.extra?.sticky),
});

export async function readPost(postId: string): Promise<ReadPostResult> {
  const post = await readPostRecord(postId);
  return {
    frontmatter: {
      title: post.title,
      description: post.description,
      date: post.displayDate ? new Date(post.displayDate) : undefined,
      categories: post.categories,
      tags: post.tags,
      cover: post.coverMediaId || undefined,
      draft: post.status !== 'published',
    },
    content: post.bodyMarkdown,
  };
}

async function readPostRecord(postId: string): Promise<Post> {
  return await adminRequest<Post>(`/posts/${encodeURIComponent(postId)}`);
}

export async function readPostMetadata(postId: string): Promise<{ values: PostMetadataValues; cover: Media | null }> {
  const post = await readPostRecord(postId);
  const media = await adminRequest<{ items: Media[] }>('/media?page=1&limit=100').catch(() => ({ items: [] }));
  return {
    values: getPostMetadataDefaults(post),
    cover: media.items.find((item) => item.id === post.coverMediaId) || null,
  };
}

export async function uploadPostCover(file: File): Promise<Media> {
  const body = new FormData();
  body.set('file', file);
  return await adminRequest<Media>('/media', { method: 'POST', body });
}

export async function savePostMetadata(postId: string, values: PostMetadataValues): Promise<void> {
  const current = await readPostRecord(postId);
  await adminRequest<Post>(`/posts/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    body: buildPostMetadataUpdate(current, values),
  });
}

export async function writePostContent(postId: string, content: string): Promise<void> {
  const current = await readPostRecord(postId);
  await adminRequest<Post>(`/posts/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    body: buildPostContentUpdate(current, content),
  });
}

export async function listPosts(params?: ListPostsParams): Promise<ListPostsResponse> {
  const page = await adminRequest<{ items: Post[]; total: number }>('/posts?page=1&limit=100');
  let posts = page.items.map(toListItem);
  const search = params?.search?.toLowerCase();
  const category = params?.category;
  if (search) posts = posts.filter((post) => `${post.title} ${post.slug}`.toLowerCase().includes(search));
  if (category) posts = posts.filter((post) => post.categories.includes(category));
  if (params?.status && params.status !== 'all') posts = posts.filter((post) => (params.status === 'draft') === post.draft);
  posts.sort((a, b) => {
    const av = params?.sort === 'title' ? a.title : params?.sort === 'updated' ? a.updated || a.date : a.date;
    const bv = params?.sort === 'title' ? b.title : params?.sort === 'updated' ? b.updated || b.date : b.date;
    return av.localeCompare(bv) * (params?.order === 'asc' ? 1 : -1);
  });
  const categoryStats = [...new Set(posts.flatMap((post) => post.categories))].map((name) => ({
    name,
    count: posts.filter((post) => post.categories.includes(name)).length,
  }));
  const stats = {
    total: page.total,
    published: page.items.filter((post) => post.status === 'published').length,
    draft: page.items.filter((post) => post.status !== 'published').length,
    categoryStats,
    tagStats: [],
    recentPosts: [...posts].slice(0, 5),
  };
  return {
    posts,
    total: page.total,
    stats,
    categories: categoryStats.map((item) => item.name),
    tags: [...new Set(page.items.flatMap((post) => post.tags || []))],
  };
}

export async function createPost(params: CreatePostParams): Promise<CreatePostResponse> {
  const slug = generateSlug(params.title) || `post-${Date.now()}`;
  const post = await adminRequest<Post>('/posts', {
    method: 'POST',
    body: {
      locale: 'zh-CN',
      slug,
      title: params.title,
      description: '',
      bodyMarkdown: '',
      displayDate: new Date().toISOString(),
      categories: params.categories || [],
      tags: params.tags || [],
    },
  });
  return { success: true, postId: post.id };
}

export async function toggleDraft(postId: string) {
  const post = await adminRequest<Post>(`/posts/${encodeURIComponent(postId)}`);
  const action = post.status === 'published' ? 'unpublish' : 'publish';
  const updated = await adminRequest<Post>(`/posts/${encodeURIComponent(postId)}/${action}`, { method: 'POST' });
  return { success: true, draft: updated.status !== 'published' };
}

export async function toggleSticky(postId: string) {
  const post = await adminRequest<Post>(`/posts/${encodeURIComponent(postId)}`);
  const extra = { ...(post.extra || {}), sticky: !post.extra?.sticky };
  await adminRequest<Post>(`/posts/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    body: {
      locale: post.locale,
      slug: post.slug,
      title: post.title,
      description: post.description,
      bodyMarkdown: post.bodyMarkdown,
      displayDate: post.displayDate,
      categories: post.categories,
      tags: post.tags,
      extra,
      coverMediaId: post.coverMediaId,
      version: post.version,
    },
  });
  return { success: true, sticky: Boolean(extra.sticky) };
}

export async function deletePost(postId: string): Promise<void> {
  await adminRequest(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
}

export async function getCMSConfig() {
  setCategoryMap({});
  return { projectRoot: '', contentDir: '', categoryMap: {} };
}
