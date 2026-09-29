export type AdminTab = 'overview' | 'posts' | 'timeline' | 'footprints' | 'categories';

const TAB_BY_SEGMENT: Record<string, AdminTab> = {
  overview: 'overview',
  posts: 'posts',
  timeline: 'timeline',
  footprints: 'footprints',
  categories: 'categories',
};

const SEGMENT_BY_TAB: Record<AdminTab, string> = {
  overview: '',
  posts: 'posts',
  timeline: 'timeline',
  footprints: 'footprints',
  categories: 'categories',
};

export function getAdminTab(url: URL): AdminTab {
  const match = url.pathname.match(/^\/admin(?:\/([^/]+))?\/?$/);
  const pathSegment = match?.[1];
  const legacyTab = url.searchParams.get('tab');
  return TAB_BY_SEGMENT[pathSegment || legacyTab || ''] || 'overview';
}

export function withAdminTab(url: URL, tab: AdminTab): URL {
  const nextUrl = new URL(url);
  const segment = SEGMENT_BY_TAB[tab];
  nextUrl.pathname = segment ? `/admin/${segment}` : '/admin';
  nextUrl.searchParams.delete('tab');
  if (tab !== 'posts') nextUrl.searchParams.delete('post');
  return nextUrl;
}

export function getAdminPostId(url: URL): string | null {
  const postId = url.searchParams.get('post');
  return postId?.trim() ? postId : null;
}

export function withAdminPost(url: URL, postId: string | null): URL {
  const nextUrl = new URL(url);
  if (postId) nextUrl.searchParams.set('post', postId);
  else nextUrl.searchParams.delete('post');
  return nextUrl;
}
