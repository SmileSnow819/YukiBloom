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
