import { useEffect, useState } from 'react';
import logoUrl from '../../assets/logo/logo.png?url';
import { adminRequest, getCsrfToken, type Media, type Page, type Paged, type Post, setCsrfToken } from '../../lib/admin/api';
import WaveSvg from '../ui/cover/wave';
import './admin.css';

type Section = 'overview' | 'posts' | 'pages' | 'media' | 'site-content' | 'footprints' | 'timeline';
const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: '总览', icon: '◫' },
  { id: 'posts', label: '文章', icon: '▤' },
  { id: 'pages', label: '独立页面', icon: '▧' },
  { id: 'media', label: '图片库', icon: '▨' },
  { id: 'site-content', label: '站点内容', icon: '◈' },
  { id: 'footprints', label: '足迹', icon: '⌁' },
  { id: 'timeline', label: '实习经历', icon: '◷' },
];
const date = (value?: string) => (value ? new Date(value).toLocaleDateString('zh-CN') : '—');
const split = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const emptyPost = (): Post => ({
  id: '',
  locale: 'zh-CN',
  slug: '',
  title: '',
  description: '',
  bodyMarkdown: '',
  status: 'draft',
  updatedAt: '',
  version: 0,
  categories: [],
  tags: [],
});
const emptyPage = (): Page => ({
  id: '',
  locale: 'zh-CN',
  slug: '',
  title: '',
  description: '',
  bodyMarkdown: '',
  status: 'draft',
  updatedAt: '',
  version: 0,
});

export default function AdminApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [section, setSection] = useState<Section>('overview');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<Paged<Post>>({ items: [], page: 1, limit: 20, total: 0 });
  const [pages, setPages] = useState<Page[]>([]);
  const [media, setMedia] = useState<Paged<Media>>({ items: [], page: 1, limit: 20, total: 0 });
  const [editor, setEditor] = useState<Post | Page | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [json, setJson] = useState('');
  const [jsonVersion, setJsonVersion] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ post: { title: string; slug: string }; coverPath: string } | null>(null);
  const [importCoverId, setImportCoverId] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    adminRequest('/session')
      .then(() => setAuthenticated(Boolean(getCsrfToken())))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Section changes are the only intended reload trigger.
  useEffect(() => {
    if (!authenticated) return;
    void load(section);
  }, [authenticated, section]);

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
    } catch (cause) {
      const issue = cause as { status?: number; message?: string };
      setError(
        issue.status === 409 ? `${issue.message || '版本冲突'}。请刷新后重试，避免覆盖新内容。` : issue.message || '操作失败',
      );
      if (issue.status === 401 || issue.status === 403) {
        setAuthenticated(false);
        setCsrfToken('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function load(target: Section, page = 1) {
    await run(() => fetchSection(target, page));
  }

  async function fetchSection(target: Section, page = 1) {
    if (target === 'overview' || target === 'posts') {
      setPosts(await adminRequest<Paged<Post>>(`/posts?page=${page}&limit=20`));
      if (target === 'overview') setPages((await adminRequest<{ items: Page[] }>('/pages')).items);
    } else if (target === 'pages') {
      setPages((await adminRequest<{ items: Page[] }>('/pages')).items);
    } else if (target === 'media') {
      setMedia(await adminRequest<Paged<Media>>(`/media?page=${page}&limit=20`));
    } else {
      const path = target === 'site-content' ? '/site-content' : `/${target}`;
      const data = await adminRequest<Record<string, unknown>>(path);
      setJson(JSON.stringify(data, null, 2));
      setJsonVersion(typeof data.version === 'number' ? data.version : null);
    }
  }

  async function login(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const data = await adminRequest<{ csrfToken: string }>('/login', { method: 'POST', body: credentials });
      setCsrfToken(data.csrfToken);
      setAuthenticated(true);
      setCredentials({ username: '', password: '' });
    });
  }

  async function logout() {
    await run(async () => {
      await adminRequest('/logout', { method: 'POST' });
      setCsrfToken('');
      setAuthenticated(false);
    });
  }

  async function openPost(id: string) {
    if (!id) {
      setEditor(emptyPost());
      setPreview('');
      return;
    }
    await run(async () => {
      setEditor(await adminRequest<Post>(`/posts/${id}`));
      setPreview('');
    });
  }

  async function openPage(id: string) {
    if (!id) {
      setEditor(emptyPage());
      setPreview('');
      return;
    }
    await run(async () => {
      setEditor(await adminRequest<Page>(`/pages/${id}`));
      setPreview('');
    });
  }

  async function saveEditor() {
    if (!editor) return;
    const kind = section === 'pages' ? 'pages' : 'posts';
    const path = editor.id ? `/${kind}/${editor.id}` : `/${kind}`;
    const body =
      kind === 'posts'
        ? {
            title: editor.title,
            slug: editor.slug,
            locale: editor.locale,
            description: editor.description,
            bodyMarkdown: editor.bodyMarkdown,
            version: editor.version,
            categories: 'categories' in editor ? editor.categories : [],
            tags: 'tags' in editor ? editor.tags : [],
            extra: 'extra' in editor ? editor.extra || {} : {},
            coverMediaId: 'coverMediaId' in editor ? editor.coverMediaId || null : null,
            displayDate: 'displayDate' in editor ? editor.displayDate || null : null,
          }
        : {
            title: editor.title,
            slug: editor.slug,
            locale: editor.locale,
            description: editor.description,
            bodyMarkdown: editor.bodyMarkdown,
            version: editor.version,
          };
    await run(
      async () => {
        const saved = await adminRequest<Post | Page>(path, { method: editor.id ? 'PATCH' : 'POST', body });
        setEditor(saved);
        await fetchSection(section);
      },
      editor.status === 'published' ? '修改已保存，公开内容已更新' : '草稿已保存',
    );
  }

  async function changePublication(item: Post | Page) {
    const kind = section === 'pages' ? 'pages' : 'posts';
    const action = item.status === 'published' ? 'unpublish' : 'publish';
    if (action === 'unpublish' && !window.confirm(`撤回「${item.title}」吗？公开页面将不再显示。`)) return;
    await run(
      async () => {
        const saved = await adminRequest<Post | Page>(`/${kind}/${item.id}/${action}`, { method: 'POST' });
        if (editor?.id === item.id) setEditor(saved);
        await fetchSection(section);
      },
      action === 'publish' ? '已发布' : '已撤回',
    );
  }

  async function deletePost(item: Post) {
    if (!window.confirm(`永久删除文章「${item.title}」吗？此操作无法撤销。`)) return;
    await run(async () => {
      await adminRequest(`/posts/${item.id}`, { method: 'DELETE' });
      setEditor(null);
      await fetchSection('posts');
    }, '文章已删除');
  }

  async function deletePage(item: Page) {
    if (!window.confirm(`永久删除页面「${item.title}」吗？此操作无法撤销。`)) return;
    await run(async () => {
      await adminRequest(`/pages/${item.id}`, { method: 'DELETE' });
      setEditor(null);
      await fetchSection('pages');
    }, '页面已删除');
  }

  async function upload(path: string, file: File, extra?: Record<string, string>) {
    const body = new FormData();
    body.set('file', file);
    for (const [key, value] of Object.entries(extra || {})) body.set(key, value);
    return adminRequest(path, { method: 'POST', body });
  }

  async function previewMarkdown() {
    if (!importFile) return;
    await run(async () => {
      setImportPreview(
        (await upload('/posts/markdown/preview', importFile, { locale: 'zh-CN' })) as {
          post: { title: string; slug: string };
          coverPath: string;
        },
      );
    });
  }

  async function importMarkdown() {
    if (!importFile) return;
    if (importPreview?.coverPath && !importCoverId.trim()) {
      setError('此 Markdown 声明了封面，请先上传图片并填写封面图片 ID。');
      return;
    }
    await run(async () => {
      const saved = (await upload('/posts/markdown', importFile, {
        locale: 'zh-CN',
        ...(importCoverId ? { coverMediaId: importCoverId.trim() } : {}),
      })) as Post;
      setImportFile(null);
      setImportPreview(null);
      setImportCoverId('');
      setEditor(saved);
      await fetchSection('posts');
    }, 'Markdown 已导入为草稿');
  }

  async function uploadMedia(file: File) {
    await run(async () => {
      await upload('/media', file);
      await fetchSection('media');
    }, '图片已上传');
  }

  async function deleteMedia(item: Media) {
    if (!window.confirm('删除这张未引用的图片吗？此操作无法撤销。')) return;
    await run(async () => {
      await adminRequest(`/media/${item.id}`, { method: 'DELETE' });
      await fetchSection('media');
    }, '图片已删除');
  }

  async function saveJson() {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(json);
      if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    } catch {
      setError('JSON 格式无效，请检查内容。');
      return;
    }
    if (jsonVersion !== null && body.version !== jsonVersion) {
      setError('版本号已被修改。请恢复当前版本号后保存。');
      return;
    }
    await run(async () => {
      const path = section === 'site-content' ? '/site-content' : `/${section}`;
      const saved = await adminRequest<Record<string, unknown>>(path, { method: 'PUT', body });
      setJson(JSON.stringify(saved, null, 2));
      setJsonVersion(typeof saved.version === 'number' ? saved.version : null);
    }, '内容已保存');
  }

  if (checking) return <div className="admin-loading">正在检查登录状态…</div>;
  if (!authenticated)
    return (
      <main className="admin-login-wrap">
        <form className="admin-login" onSubmit={login}>
          <img className="admin-login-logo" src={logoUrl} alt="YukiBloom" />
          <div className="admin-eyebrow">YUKIBLOOM · CONTENT STUDIO</div>
          <h1>欢迎回来</h1>
          <p>登录后继续管理你的网站内容。</p>
          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          <label>
            用户名
            <input
              required
              autoComplete="username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            />
          </label>
          <label>
            密码
            <input
              required
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />
          </label>
          <button type="submit" className="admin-button primary" disabled={busy}>
            登录管理后台 <span>→</span>
          </button>
          <a href="/">← 返回网站</a>
        </form>
      </main>
    );

  const visiblePosts = posts.items.filter(
    (post) =>
      (filter === 'all' || post.status === filter) && `${post.title} ${post.slug}`.toLowerCase().includes(search.toLowerCase()),
  );
  const published = posts.items.filter((post) => post.status === 'published').length;
  const editingPage = section === 'pages';

  return (
    <div className="admin-shell">
      <header className="admin-site-header">
        <div className="admin-site-header-inner">
          <a className="admin-brand" href="/">
            <img src={logoUrl} alt="YukiBloom" />
          </a>
          <nav aria-label="管理导航">
            {sections.map((item) => (
              <button
                type="button"
                key={item.id}
                className={section === item.id ? 'active' : ''}
                onClick={() => {
                  setEditor(null);
                  setError('');
                  setNotice('');
                  setSection(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="admin-header-actions">
            <a href="/" target="_blank" rel="noreferrer">
              查看网站 ↗
            </a>
            <button type="button" onClick={logout}>
              退出
            </button>
          </div>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-topbar">
          <div className="admin-hero-inner">
            <span className="admin-hero-kicker">YUKIBLOOM · CONTENT STUDIO</span>
            <h1>{sections.find((item) => item.id === section)?.label}</h1>
            <p>让每一篇文字，都有自己的位置。</p>
          </div>
          <WaveSvg />
        </div>
        <div className="admin-content">
          <div className="admin-breadcrumb">
            <span>首页</span>
            <span>/</span>
            <strong>{sections.find((item) => item.id === section)?.label}</strong>
            <button type="button" onClick={() => void load(section)}>
              ↻ 刷新数据
            </button>
          </div>
          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          {notice && <output className="admin-notice">{notice}</output>}
          {section === 'overview' && (
            <>
              <div className="admin-heading">
                <div>
                  <div className="admin-eyebrow">DASHBOARD / 总览</div>
                  <h1>
                    早上好，欢迎回来 <span>✿</span>
                  </h1>
                  <p>这里是网站内容的概览。</p>
                </div>
                <button
                  type="button"
                  className="admin-button primary"
                  onClick={() => {
                    setSection('posts');
                    setEditor(emptyPost());
                  }}
                >
                  ＋ 新建文章
                </button>
              </div>
              <div className="admin-stats">
                <div>
                  <span>文章总数</span>
                  <strong>{posts.total}</strong>
                  <small>所有文章与草稿</small>
                </div>
                <div>
                  <span>当前页已发布</span>
                  <strong>{published}</strong>
                  <small>已对外展示</small>
                </div>
                <div>
                  <span>当前页草稿</span>
                  <strong>{posts.items.length - published}</strong>
                  <small>待完善的内容</small>
                </div>
                <div>
                  <span>独立页面</span>
                  <strong>{pages.length}</strong>
                  <small>网站固定内容</small>
                </div>
              </div>
              <div className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <h2>最近更新</h2>
                    <p>继续编辑最近处理的文章</p>
                  </div>
                  <button type="button" className="admin-link" onClick={() => setSection('posts')}>
                    查看全部 →
                  </button>
                </div>
                {posts.items.slice(0, 6).map((post) => (
                  <button
                    type="button"
                    className="admin-recent"
                    key={post.id}
                    onClick={() => {
                      setSection('posts');
                      void openPost(post.id);
                    }}
                  >
                    <span className="admin-recent-icon">▤</span>
                    <span>
                      <strong>{post.title}</strong>
                      <small>{post.slug}</small>
                    </span>
                    <em>{date(post.updatedAt)}</em>
                  </button>
                ))}
              </div>
            </>
          )}
          {(section === 'posts' || section === 'pages') && (
            <>
              <div className="admin-heading">
                <div>
                  <div className="admin-eyebrow">CONTENT / {editingPage ? 'PAGES' : 'POSTS'}</div>
                  <h1>{editor ? (editor.id ? '编辑内容' : '创建草稿') : editingPage ? '独立页面' : '文章管理'}</h1>
                  <p>
                    {editor
                      ? editor.status === 'published'
                        ? '保存后将立即更新公开内容。'
                        : '保存草稿后可单独发布。'
                      : editingPage
                        ? '维护网站的独立页面。'
                        : '管理文章、草稿与发布状态。'}
                  </p>
                </div>
                <div className="admin-actions">
                  {editor && (
                    <button type="button" className="admin-button" onClick={() => setEditor(null)}>
                      ← 返回列表
                    </button>
                  )}
                  {!editor && (
                    <button
                      type="button"
                      className="admin-button primary"
                      onClick={() => (editingPage ? void openPage('') : void openPost(''))}
                    >
                      ＋ {editingPage ? '新建页面' : '新建文章'}
                    </button>
                  )}
                </div>
              </div>
              {editor ? (
                <div className="admin-editor">
                  <div className="admin-panel admin-form">
                    <div className="admin-form-grid">
                      <label>
                        标题
                        <input value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} />
                      </label>
                      <label>
                        链接标识
                        <input
                          value={editor.slug}
                          onChange={(e) => setEditor({ ...editor, slug: e.target.value })}
                          placeholder="my-post"
                        />
                      </label>
                      <label>
                        语言
                        <input value={editor.locale} onChange={(e) => setEditor({ ...editor, locale: e.target.value })} />
                      </label>
                      <label>
                        摘要
                        <input
                          value={editor.description}
                          onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                        />
                      </label>
                      {'categories' in editor && (
                        <>
                          <label>
                            分类（逗号分隔）
                            <input
                              value={editor.categories?.join(', ') || ''}
                              onChange={(e) => setEditor({ ...editor, categories: split(e.target.value) } as Post)}
                            />
                          </label>
                          <label>
                            标签（逗号分隔）
                            <input
                              value={editor.tags?.join(', ') || ''}
                              onChange={(e) => setEditor({ ...editor, tags: split(e.target.value) } as Post)}
                            />
                          </label>
                          <label>
                            封面图片 ID
                            <input
                              value={editor.coverMediaId || ''}
                              onChange={(e) => setEditor({ ...editor, coverMediaId: e.target.value || null } as Post)}
                            />
                          </label>
                          <label>
                            展示日期
                            <input
                              type="date"
                              value={editor.displayDate?.slice(0, 10) || ''}
                              onChange={(e) =>
                                setEditor({
                                  ...editor,
                                  displayDate: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
                                } as Post)
                              }
                            />
                          </label>
                        </>
                      )}
                    </div>
                    <label>
                      Markdown 正文
                      <textarea
                        className="admin-markdown"
                        value={editor.bodyMarkdown}
                        onChange={(e) => setEditor({ ...editor, bodyMarkdown: e.target.value })}
                        placeholder="开始写作…"
                      />
                    </label>
                    <div className="admin-editor-footer">
                      <span>
                        版本 {editor.version} · {editor.status === 'published' ? '已发布' : '草稿'}
                      </span>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-button"
                          onClick={() => setPreview(preview ? '' : editor.bodyMarkdown)}
                        >
                          {preview ? '关闭预览' : '预览原文'}
                        </button>
                        <button type="button" className="admin-button primary" disabled={busy} onClick={saveEditor}>
                          {editor.status === 'published' ? '保存修改' : '保存草稿'}
                        </button>
                        {editor.id && (
                          <button
                            type="button"
                            className="admin-button"
                            disabled={busy}
                            onClick={() => changePublication(editor)}
                          >
                            {editor.status === 'published' ? '撤回' : '发布'}
                          </button>
                        )}
                        {editor.id && (
                          <button
                            type="button"
                            className="admin-button danger"
                            onClick={() => (editingPage ? deletePage(editor as Page) : deletePost(editor as Post))}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                    {preview && <pre className="admin-preview">{preview}</pre>}
                  </div>
                </div>
              ) : (
                <>
                  {!editingPage && (
                    <div className="admin-toolbar">
                      <input
                        aria-label="搜索文章"
                        placeholder="搜索标题或链接标识…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <select aria-label="筛选状态" value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">全部状态</option>
                        <option value="published">已发布</option>
                        <option value="draft">草稿</option>
                      </select>
                      <label className="admin-file-label">
                        ↑ 导入 Markdown
                        <input
                          type="file"
                          accept=".md,.markdown,text/markdown"
                          onChange={(e) => {
                            setImportFile(e.target.files?.[0] || null);
                            setImportPreview(null);
                          }}
                        />
                      </label>
                      {importFile && (
                        <button type="button" className="admin-button" onClick={previewMarkdown}>
                          预览 {importFile.name}
                        </button>
                      )}
                      {importPreview && (
                        <button type="button" className="admin-button primary" onClick={importMarkdown}>
                          保存为草稿
                        </button>
                      )}
                    </div>
                  )}
                  {importPreview && (
                    <div className="admin-import-preview">
                      <strong>{importPreview.post.title}</strong>
                      <span>/{importPreview.post.slug}</span>
                      {importPreview.coverPath && (
                        <label>
                          封面文件：{importPreview.coverPath} · 上传后填写图片 ID
                          <input
                            value={importCoverId}
                            onChange={(e) => setImportCoverId(e.target.value)}
                            placeholder="图片 UUID"
                          />
                        </label>
                      )}
                    </div>
                  )}
                  <div className="admin-panel admin-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>标题</th>
                          <th>链接标识</th>
                          <th>状态</th>
                          <th>更新日期</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(editingPage ? pages : visiblePosts).map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.title}</strong>
                              <small>{item.locale}</small>
                            </td>
                            <td>{item.slug}</td>
                            <td>
                              <span className={`admin-badge ${item.status === 'published' ? 'published' : ''}`}>
                                {item.status === 'published' ? '已发布' : '草稿'}
                              </span>
                            </td>
                            <td>{date(item.updatedAt)}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-link"
                                onClick={() => (editingPage ? void openPage(item.id) : void openPost(item.id))}
                              >
                                编辑
                              </button>
                              <button type="button" className="admin-link" onClick={() => changePublication(item)}>
                                {item.status === 'published' ? '撤回' : '发布'}
                              </button>
                              <button
                                type="button"
                                className="admin-link danger"
                                onClick={() => (editingPage ? deletePage(item as Page) : deletePost(item as Post))}
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(editingPage ? pages : visiblePosts).length === 0 && <div className="admin-empty">还没有内容</div>}
                  </div>
                  {!editingPage && (
                    <div className="admin-pagination">
                      <span>
                        共 {posts.total} 篇 · 第 {posts.page} 页
                      </span>
                      <div>
                        <button type="button" disabled={posts.page <= 1} onClick={() => void load('posts', posts.page - 1)}>
                          上一页
                        </button>
                        <button
                          type="button"
                          disabled={posts.page * posts.limit >= posts.total}
                          onClick={() => void load('posts', posts.page + 1)}
                        >
                          下一页
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {section === 'media' && (
            <>
              <div className="admin-heading">
                <div>
                  <div className="admin-eyebrow">ASSETS / MEDIA</div>
                  <h1>图片库</h1>
                  <p>上传图片，管理文章和页面使用的素材。</p>
                </div>
                <label className="admin-button primary admin-file-label">
                  ↑ 上传图片
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadMedia(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="admin-media-grid">
                {media.items.map((item) => (
                  <div className="admin-media-card" key={item.id}>
                    <img src={item.url} alt="已上传素材" loading="lazy" />
                    <div>
                      <small>
                        {item.width} × {item.height} · {Math.round(item.sizeBytes / 1024)} KB
                      </small>
                      <button
                        type="button"
                        className="admin-link"
                        onClick={() => navigator.clipboard.writeText(item.url).then(() => setNotice('图片地址已复制'))}
                      >
                        复制地址
                      </button>
                      <button type="button" className="admin-link danger" onClick={() => deleteMedia(item)}>
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {media.items.length === 0 && <div className="admin-panel admin-empty">还没有图片</div>}
              <div className="admin-pagination">
                <span>
                  共 {media.total} 张 · 第 {media.page} 页
                </span>
                <div>
                  <button type="button" disabled={media.page <= 1} onClick={() => void load('media', media.page - 1)}>
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={media.page * media.limit >= media.total}
                    onClick={() => void load('media', media.page + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </>
          )}
          {['site-content', 'footprints', 'timeline'].includes(section) && (
            <>
              <div className="admin-heading">
                <div>
                  <div className="admin-eyebrow">DATA / {section.toUpperCase()}</div>
                  <h1>{sections.find((item) => item.id === section)?.label}</h1>
                  <p>编辑完整数据后保存。当前版本 {jsonVersion ?? '—'}，保存时会检查并发修改。</p>
                </div>
                <button type="button" className="admin-button primary" disabled={busy} onClick={saveJson}>
                  保存内容
                </button>
              </div>
              <div className="admin-panel admin-json-panel">
                <div className="admin-json-heading">
                  <span>JSON 数据</span>
                  <button type="button" className="admin-link" onClick={() => void load(section)}>
                    重新载入
                  </button>
                </div>
                <textarea aria-label="内容 JSON" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
