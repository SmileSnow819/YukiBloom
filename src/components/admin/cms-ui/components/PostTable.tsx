/**
 * Post Table Component
 *
 * Displays a sortable table of blog posts with actions.
 */

import { ImagePreviewDialog } from '@admin-ui/components/ImagePreviewDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@admin-ui/components/ui/alert-dialog';
import type { SortField, SortOrder } from '@admin-ui/hooks';
import { useDialogValue } from '@admin-ui/hooks/useDialogValue';
import { cn } from '@admin-ui/lib/utils';
import type { PostListItem } from '@admin-ui/types';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';

interface SortableHeaderProps {
  label: string;
  field: SortField;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

function SortableHeader({ label, field, sortField, sortOrder, onSort }: SortableHeaderProps) {
  const isActive = field === sortField;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn('flex items-center gap-1 font-medium text-xs uppercase tracking-wide', isActive && 'text-primary')}
    >
      {label}
      <Icon
        icon={isActive ? (sortOrder === 'asc' ? 'ri:arrow-up-s-fill' : 'ri:arrow-down-s-fill') : 'ri:arrow-up-down-line'}
        className={cn('size-4', !isActive && 'opacity-50')}
      />
    </button>
  );
}

interface PostTableProps {
  posts: PostListItem[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onToggleDraft: (postId: string) => void;
  onDelete: (postId: string) => void;
  onToggleSticky?: (postId: string) => void;
  onEditMetadata?: (postId: string) => void;
  onEditContent?: (postId: string) => void;
}

interface PostActionProps {
  label: string;
  title: string;
  icon: string;
  onClick: () => void;
  destructive?: boolean;
  emphasized?: boolean;
  tone?: 'success' | 'warning';
}

function PostAction({ label, title, icon, onClick, destructive = false, emphasized = false, tone }: PostActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-12 cursor-pointer flex-col items-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] leading-none transition-colors hover:bg-accent hover:text-foreground',
        destructive && 'hover:bg-destructive/10 hover:text-destructive',
        tone === 'success' &&
          'text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300',
        tone === 'warning' &&
          'text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300',
        !tone && (emphasized ? 'text-orange-500' : 'text-muted-foreground'),
      )}
      title={title}
      aria-label={title}
    >
      <Icon icon={icon} className="size-4" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export function PostTable({
  posts,
  sortField,
  sortOrder,
  onSort,
  onToggleDraft,
  onDelete,
  onToggleSticky,
  onEditMetadata,
  onEditContent,
}: PostTableProps) {
  const {
    value: pendingStatusChange,
    open: statusDialogOpen,
    setDialogValue: setPendingStatusChange,
  } = useDialogValue<PostListItem>();

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border border-dashed p-8 text-center">
        <Icon icon="ri:file-list-3-line" className="size-12 text-muted-foreground" />
        <p className="mt-2 font-medium text-muted-foreground">没有找到文章</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-border border-b bg-muted/50">
              <tr>
                <th className="w-24 px-4 py-3 text-left">
                  <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">封面</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="标题" field="title" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
                </th>
                <th className="hidden px-4 py-3 text-left md:table-cell">
                  <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">分类</span>
                </th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">
                  <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">标签</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortableHeader label="日期" field="date" sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">状态</span>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">操作</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => (
                <tr key={post.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {post.coverUrl ? (
                      <ImagePreviewDialog
                        src={post.coverUrl}
                        alt={`${post.title}封面`}
                        thumbnailClassName="aspect-video w-20"
                      />
                    ) : (
                      <div
                        className="grid aspect-video w-20 place-items-center rounded-md border border-border border-dashed bg-muted/40 text-muted-foreground"
                        title={post.coverMediaId ? '封面图片暂不可用' : '未设置封面'}
                      >
                        <Icon icon="ri:image-line" className="size-5" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {post.sticky && (
                        <span title="已置顶">
                          <Icon icon="ri:pushpin-fill" className="size-4 shrink-0 text-orange-500" />
                        </span>
                      )}
                      <span className="line-clamp-1 font-medium text-sm">{post.title}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-muted-foreground text-sm">{post.categories.join(' > ') || '-'}</span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                          +{post.tags.length - 3}
                        </span>
                      )}
                      {post.tags.length === 0 && <span className="text-muted-foreground text-xs">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground text-sm">{format(new Date(post.date), 'yyyy-MM-dd')}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex w-max shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs',
                        post.draft ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500',
                      )}
                    >
                      {post.draft ? '草稿' : '已发布'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex flex-nowrap items-start justify-end gap-1">
                      {onEditMetadata && (
                        <PostAction
                          label="信息"
                          title="编辑标题、封面、分类、标签和日期"
                          icon="ri:file-edit-line"
                          onClick={() => onEditMetadata(post.id)}
                        />
                      )}
                      {onEditContent && (
                        <PostAction
                          label="内容"
                          title="编辑文章正文"
                          icon="ri:article-line"
                          onClick={() => onEditContent(post.id)}
                        />
                      )}
                      {onToggleSticky && (
                        <PostAction
                          label={post.sticky ? '已置顶' : '置顶'}
                          title={post.sticky ? '取消置顶' : '置顶文章'}
                          icon={post.sticky ? 'ri:pushpin-fill' : 'ri:pushpin-line'}
                          onClick={() => onToggleSticky(post.id)}
                          emphasized={post.sticky}
                        />
                      )}
                      <PostAction
                        label={post.draft ? '发布' : '转草稿'}
                        title={post.draft ? '发布文章' : '设为草稿'}
                        icon={post.draft ? 'ri:check-line' : 'ri:draft-line'}
                        onClick={() => setPendingStatusChange(post)}
                        tone={post.draft ? 'success' : 'warning'}
                      />
                      <PostAction
                        label="删除"
                        title="删除文章"
                        icon="ri:delete-bin-line"
                        onClick={() => onDelete(post.id)}
                        destructive
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AlertDialog open={statusDialogOpen} onOpenChange={(open) => !open && setPendingStatusChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingStatusChange?.draft ? '确认发布文章？' : '确认转为草稿？'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange?.draft
                ? `发布「${pendingStatusChange.title}」后，访客可以在网站上查看这篇文章。`
                : `将「${pendingStatusChange?.title}」转为草稿后，访客将无法在网站上查看这篇文章。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingStatusChange && onToggleDraft(pendingStatusChange.id)}>
              {pendingStatusChange?.draft ? '确认发布' : '确认转草稿'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
