/**
 * CMS App
 *
 * Main entry point for the standalone CMS application.
 */

import { CategoryManager } from '@admin-ui/components/CategoryManager';
import { CreatePostDialog } from '@admin-ui/components/CreatePostDialog';
import { DashboardCharts } from '@admin-ui/components/DashboardCharts';
import { DeleteConfirmDialog } from '@admin-ui/components/DeleteConfirmDialog';
import { ErrorFallback } from '@admin-ui/components/ErrorFallback';
import { FootprintsManager } from '@admin-ui/components/FootprintsManager';
import { PostEditor } from '@admin-ui/components/PostEditor';
import { PostMetadataDialog } from '@admin-ui/components/PostMetadataDialog';
import { PostTable } from '@admin-ui/components/PostTable';
import { RecentUpdates } from '@admin-ui/components/RecentUpdates';
import { TimelineManager } from '@admin-ui/components/TimelineManager';
import { Button } from '@admin-ui/components/ui/button';
import { type StatusFilter, useDashboardState } from '@admin-ui/hooks';
import { cn } from '@admin-ui/lib/utils';
import { Icon } from '@iconify/react';
import { type ReactNode, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster, toast } from 'sonner';
import logoUrl from '@/assets/logo/logo.png?url';
import { adminRequest, setCsrfToken } from '@/lib/admin/api';
import '@admin-ui/styles/admin-layout.css';
import '@admin-ui/styles/globals.css';

function AppContent() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  useEffect(() => {
    adminRequest('/session')
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);
  async function login(event: { preventDefault: () => void }) {
    event.preventDefault();
    setLoginError('');
    try {
      const result = await adminRequest<{ csrfToken: string }>('/login', { method: 'POST', body: credentials });
      setCsrfToken(result.csrfToken);
      setAuthenticated(true);
      toast.success('登录成功');
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : '登录失败');
    }
  }
  async function logout() {
    try {
      await adminRequest('/logout', { method: 'POST' });
      setCsrfToken('');
      setAuthenticated(false);
      toast.success('已退出登录');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '退出登录失败，请重试');
    }
  }
  if (checking) return <div className="grid min-h-screen place-items-center text-muted-foreground">正在检查登录状态…</div>;
  if (!authenticated)
    return (
      <div className="admin-login-page grid min-h-screen">
        <form onSubmit={login} className="admin-login-card space-y-5">
          <img src={logoUrl} alt="YukiBloom" className="mx-auto h-auto w-48 object-contain" />
          <label className="block space-y-1.5 text-sm">
            用户名
            <input
              required
              autoComplete="username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            密码
            <input
              required
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5"
            />
          </label>
          {loginError && <p className="text-destructive text-sm">{loginError}</p>}
          <Button className="w-full">登录</Button>
        </form>
      </div>
    );
  if (authenticated) return <CMSDashboard onLogout={logout} />;
}

function CMSDashboard({ onLogout }: { onLogout: () => void }) {
  const [pageActions, setPageActions] = useState<ReactNode>(null);
  const [metadataPostId, setMetadataPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const {
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
  } = useDashboardState();
  const tabLabels = {
    overview: '总览',
    posts: '文章管理',
    timeline: '实习经历',
    footprints: '足迹管理',
    categories: '分类配置',
  } as const;

  // Show editor if editing
  if (editingPostId) {
    return <PostEditor postId={editingPostId} onClose={handleEditorClose} onSaved={handleEditorSaved} />;
  }

  return (
    <>
      <div className="admin-shell min-h-screen">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <img src={logoUrl} alt="YukiBloom" className="admin-brand-logo" />
          </div>
          <nav className="admin-nav" aria-label="后台导航">
            <p className="admin-nav-caption">工作区</p>
            {(['overview', 'posts', 'timeline', 'footprints', 'categories'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className={cn('admin-nav-link', activeTab === tab && 'is-active')}
              >
                <Icon
                  icon={
                    {
                      overview: 'ri:dashboard-line',
                      posts: 'ri:article-line',
                      timeline: 'ri:briefcase-line',
                      footprints: 'ri:map-pin-line',
                      categories: 'ri:folder-settings-line',
                    }[tab]
                  }
                  className="size-5 shrink-0"
                />
                <span>{tabLabels[tab]}</span>
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <Button variant="ghost" size="sm" onClick={onLogout} className="w-full justify-start gap-2">
              <Icon icon="ri:logout-box-r-line" className="size-4" />
              退出登录
            </Button>
          </div>
        </aside>

        <section className="admin-workspace">
          <header className="admin-topbar">
            <div className="admin-page-heading">
              <p className="text-muted-foreground text-xs">YukiBloom / 工作区</p>
              <h2 className="font-semibold text-lg">{tabLabels[activeTab]}</h2>
            </div>
            <div className="flex items-center gap-2">
              {(activeTab === 'overview' || activeTab === 'posts') && (
                <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                  <Icon
                    icon={isLoading ? 'ri:loader-4-line' : 'ri:refresh-line'}
                    className={cn('mr-1.5 size-4', isLoading && 'animate-spin')}
                  />
                  刷新
                </Button>
              )}
              {activeTab === 'posts' && (
                <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                  <Icon icon="ri:add-line" className="mr-1.5 size-4" />
                  新建文章
                </Button>
              )}
              {(activeTab === 'timeline' || activeTab === 'footprints' || activeTab === 'categories') && pageActions}
            </div>
          </header>

          <main className="admin-content flex-1 bg-background">
            <div className="mx-auto max-w-7xl p-6">
              {activeTab === 'timeline' ? (
                <TimelineManager onToolbarChange={setPageActions} />
              ) : activeTab === 'footprints' ? (
                <FootprintsManager onToolbarChange={setPageActions} />
              ) : activeTab === 'categories' ? (
                <CategoryManager categories={data?.categories || []} onToolbarChange={setPageActions} />
              ) : isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Icon icon="ri:loader-4-line" className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4">
                  <Icon icon="ri:error-warning-line" className="size-12 text-destructive" />
                  <p className="text-destructive">{error}</p>
                  <Button variant="outline" onClick={fetchData}>
                    重试
                  </Button>
                </div>
              ) : data ? (
                <>
                  {activeTab === 'overview' && (
                    <div className="admin-overview">
                      <RecentUpdates posts={data.stats.recentPosts} />
                      <DashboardCharts stats={data.stats} />
                    </div>
                  )}

                  {activeTab === 'posts' && (
                    <div className="space-y-4">
                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                          <Icon
                            icon="ri:search-line"
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                          />
                          <input
                            type="text"
                            placeholder="搜索文章…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div className="relative">
                          <Icon
                            icon="ri:folder-line"
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                          />
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="appearance-none rounded-lg border border-input bg-background py-2 pr-8 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">全部分类</option>
                            {data.categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <Icon
                            icon="ri:arrow-down-s-line"
                            className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
                          />
                        </div>
                        <div className="relative">
                          <Icon
                            icon="ri:filter-line"
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                          />
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as StatusFilter)}
                            className="appearance-none rounded-lg border border-input bg-background py-2 pr-8 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="all">全部状态</option>
                            <option value="published">已发布</option>
                            <option value="draft">草稿</option>
                          </select>
                          <Icon
                            icon="ri:arrow-down-s-line"
                            className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
                          />
                        </div>
                      </div>

                      {/* Results Count */}
                      <p className="text-muted-foreground text-sm">
                        共 {data.stats.total} 篇文章，当前显示 {data.posts.length} 篇
                      </p>

                      {/* Table */}
                      <PostTable
                        posts={data.posts}
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        onToggleDraft={handleToggleDraft}
                        onDelete={setPostToDelete}
                        onToggleSticky={handleToggleSticky}
                        onEditMetadata={setMetadataPostId}
                        onEditContent={handleEditPost}
                      />
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </main>
        </section>
      </div>

      {/* 新建文章弹窗 */}
      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        existingCategories={data?.categories || []}
        onSuccess={handleCreatePostSuccess}
      />
      {metadataPostId && (
        <PostMetadataDialog
          key={metadataPostId}
          postId={metadataPostId}
          onOpenChange={(open) => !open && setMetadataPostId(null)}
          onSaved={fetchData}
        />
      )}
      <DeleteConfirmDialog
        open={postToDelete !== null}
        title="确认删除文章？"
        description={`确定删除文章“${data?.posts.find((post) => post.id === postToDelete)?.title ?? '这篇文章'}”吗？此操作无法撤销。`}
        onOpenChange={(open) => !open && setPostToDelete(null)}
        onConfirm={() => {
          if (postToDelete) void handleDeletePost(postToDelete);
          setPostToDelete(null);
        }}
      />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Toaster className="admin-toaster" position="top-center" richColors />
      <AppContent />
    </ErrorBoundary>
  );
}
