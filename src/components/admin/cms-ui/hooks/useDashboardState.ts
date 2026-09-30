/**
 * Dashboard State Hook
 *
 * Manages the main dashboard state including posts data, filters, sorting, and actions.
 */

import { type AdminTab, getAdminPostId, getAdminTab, withAdminPost, withAdminTab } from '@admin-ui/lib/admin-route';
import { deletePost, listPosts, toggleDraft, toggleSticky } from '@admin-ui/lib/api';
import type { ListPostsResponse } from '@admin-ui/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export type Tab = AdminTab;
export type StatusFilter = 'all' | 'draft' | 'published';
export type SortField = 'date' | 'updated' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface UseDashboardStateResult {
  // Tab state
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Data state
  data: ListPostsResponse | null;
  isLoading: boolean;
  error: string | null;

  // Dialog state
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  editingPostId: string | null;

  // Filter state
  search: string;
  setSearch: (search: string) => void;
  category: string;
  setCategory: (category: string) => void;
  status: StatusFilter;
  setStatus: (status: StatusFilter) => void;
  sortField: SortField;
  sortOrder: SortOrder;

  // Actions
  fetchData: () => Promise<void>;
  handleSort: (field: SortField) => void;
  handleToggleDraft: (postId: string) => Promise<void>;
  handleDeletePost: (postId: string) => Promise<void>;
  handleToggleSticky: (postId: string) => Promise<void>;
  handleCreatePostSuccess: (postId: string) => void;
  handleEditPost: (postId: string) => void;
  handleEditorClose: () => void;
  handleEditorSaved: () => void;
}

export function useDashboardState(): UseDashboardStateResult {
  const [activeTab, setActiveTabState] = useState<Tab>(() =>
    typeof window === 'undefined' ? 'overview' : getAdminTab(new URL(window.location.href)),
  );
  const [data, setData] = useState<ListPostsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog/Editor state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : getAdminPostId(new URL(window.location.href)),
  );

  const setActiveTab = useCallback((tab: Tab) => {
    const currentUrl = new URL(window.location.href);
    const nextUrl = withAdminTab(currentUrl, tab);
    if (nextUrl.href !== currentUrl.href) {
      window.history.pushState({ ...window.history.state, adminTab: tab }, '', nextUrl);
    }
    setActiveTabState(tab);
    if (tab !== 'posts') setEditingPostId(null);
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const url = new URL(window.location.href);
      setActiveTabState(getAdminTab(url));
      setEditingPostId(getAdminPostId(url));
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const openPost = useCallback((postId: string) => {
    const nextUrl = withAdminPost(new URL(window.location.href), postId);
    window.history.pushState({ ...window.history.state, adminPostId: postId }, '', nextUrl);
    setEditingPostId(postId);
  }, []);

  // Config state

  // Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const params = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      status: status === 'all' ? undefined : status,
      sort: sortField,
      order: sortOrder,
    }),
    [search, category, status, sortField, sortOrder],
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listPosts(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文章失败');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    },
    [sortField],
  );

  const handleToggleDraft = useCallback(
    async (postId: string) => {
      try {
        const result = await toggleDraft(postId);
        toast.success(result.draft ? '已设为草稿' : '文章已发布');
        fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '更改文章状态失败');
      }
    },
    [fetchData],
  );

  const handleToggleSticky = useCallback(
    async (postId: string) => {
      try {
        const result = await toggleSticky(postId);
        toast.success(result.sticky ? '文章已置顶' : '已取消置顶');
        fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '更改置顶状态失败');
      }
    },
    [fetchData],
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      try {
        const message = await deletePost(postId);
        toast.success(message || '文章已删除');
        await fetchData();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '删除文章失败');
      }
    },
    [fetchData],
  );

  const handleCreatePostSuccess = useCallback(
    (postId: string) => {
      toast.success('文章创建成功');
      setIsCreateDialogOpen(false);
      openPost(postId);
      fetchData();
    },
    [fetchData, openPost],
  );

  const handleEditPost = openPost;

  const handleEditorClose = useCallback(() => {
    const nextUrl = withAdminPost(new URL(window.location.href), null);
    window.history.replaceState(window.history.state, '', nextUrl);
    setEditingPostId(null);
  }, []);

  const handleEditorSaved = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    activeTab,
    setActiveTab,
    data,
    isLoading,
    error,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingPostId,
    search,
    setSearch,
    category,
    setCategory,
    status,
    setStatus,
    sortField,
    sortOrder,
    fetchData,
    handleSort,
    handleToggleDraft,
    handleDeletePost,
    handleToggleSticky,
    handleCreatePostSuccess,
    handleEditPost,
    handleEditorClose,
    handleEditorSaved,
  };
}
