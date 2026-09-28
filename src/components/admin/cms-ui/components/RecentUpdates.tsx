/**
 * Recent Updates Component
 *
 * Displays recently updated posts with relative time formatting.
 */

import { cn } from '@admin-ui/lib/utils';
import type { PostListItem } from '@admin-ui/types';
import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RecentUpdatesProps {
  posts: PostListItem[];
  maxDisplay?: number;
  onEdit?: (postId: string) => void;
}

export function RecentUpdates({ posts, maxDisplay = 5, onEdit }: RecentUpdatesProps) {
  const displayPosts = posts.slice(0, maxDisplay);

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhCN });
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      <h2 className="mb-4 font-semibold">最近更新</h2>
      <div className="space-y-2">
        {displayPosts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onEdit?.(post.id)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors',
              'hover:bg-muted/50',
              onEdit && 'cursor-pointer',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="line-clamp-1 text-sm">{post.title}</span>
              {post.draft && (
                <span className="shrink-0 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-orange-500 text-xs">草稿</span>
              )}
            </div>
            <span className="ml-2 shrink-0 text-muted-foreground text-xs">{formatRelativeTime(post.date)}</span>
          </button>
        ))}
        {posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icon icon="ri:file-list-3-line" className="size-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground text-sm">还没有文章</p>
          </div>
        )}
      </div>
    </div>
  );
}
