/**
 * Post Editor
 *
 * Full-screen editor for blog posts with a Vditor Markdown editor and frontmatter panel.
 * Supports Cmd+S save, new category detection, and unsaved changes warning.
 */

import { EditorTOC } from '@admin-ui/components/EditorTOC';
import { MarkdownPreview } from '@admin-ui/components/MarkdownPreview';
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
import { Button } from '@admin-ui/components/ui/button';
import {
  type EditorHeading,
  type UploadedMarkdownImage,
  VditorMarkdownEditor,
  type VditorMarkdownEditorHandle,
} from '@admin-ui/components/VditorMarkdownEditor';
import { readPost, writePostContent } from '@admin-ui/lib/api';
import { validateImageUpload } from '@admin-ui/lib/image-upload';
import { cn } from '@admin-ui/lib/utils';
import type { BlogSchema } from '@admin-ui/types';
import { Icon } from '@iconify/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { toast } from 'sonner';
import { adminRequest } from '@/lib/admin/api';

interface PostEditorProps {
  postId: string;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Fallback component for editor errors
 */
function EditorErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <Icon icon="ri:error-warning-line" className="size-12 text-destructive" />
      <div>
        <h3 className="font-semibold text-lg">编辑器加载失败</h3>
        <p className="mt-1 text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Button variant="outline" onClick={resetErrorBoundary}>
        重试
      </Button>
    </div>
  );
}

type SidebarTab = 'toc' | 'preview';

const SIDEBAR_WIDTH_KEY = 'cms-sidebar-width';
const SIDEBAR_DEFAULT_WIDTH = 320;

export function PostEditor({ postId, onClose, onSaved }: PostEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageMarkdown, setSelectedImageMarkdown] = useState('');
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('toc');

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? Number(saved) : SIDEBAR_DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  // Frontmatter state
  const [frontmatter, setFrontmatter] = useState<BlogSchema>({ title: '' });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectedImageMarkdownRef = useRef('');
  const editorRef = useRef<VditorMarkdownEditorHandle>(null);

  // Preview state
  const [previewContent, setPreviewContent] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [headings, setHeadings] = useState<EditorHeading[]>([]);
  const initialContentLoaded = useRef(false);

  // Load post data
  useEffect(() => {
    async function loadPost() {
      setIsLoading(true);
      setError(null);
      initialContentLoaded.current = false;
      setHasUnsavedChanges(false);

      try {
        const data = await readPost(postId);
        setFrontmatter(data.frontmatter);

        setMarkdownContent(data.content || '');
        initialContentLoaded.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载文章失败');
      } finally {
        setIsLoading(false);
      }
    }

    loadPost();
  }, [postId]);

  const performSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const content = editorRef.current?.getValue() ?? markdownContent;
      await writePostContent(postId, content);
      setMarkdownContent(content);

      setHasUnsavedChanges(false);
      toast.success('正文已保存');
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存文章失败');
    } finally {
      setIsSaving(false);
    }
  }, [markdownContent, postId, onSaved]);

  const handleSave = useCallback(async () => await performSave(), [performSave]);

  const handleImageUpload = useCallback(async (files: File[]): Promise<UploadedMarkdownImage[] | string> => {
    const validationError = files.map(validateImageUpload).find(Boolean);
    if (validationError) return validationError;
    setIsUploadingImage(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const body = new FormData();
          body.set('file', file);
          const media = await adminRequest<{ url: string }>('/media', { method: 'POST', body });
          return { name: file.name.replace(/\.[^.]+$/, ''), url: media.url };
        }),
      );
      toast.success(uploaded.length > 1 ? `已上传 ${uploaded.length} 张图片` : '图片已上传');
      return uploaded;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '图片上传失败';
      return message;
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const handleImageFiles = useCallback(
    async (files: File[], replaceSelection = false) => {
      const result = await handleImageUpload(files);
      if (typeof result === 'string') {
        toast.error(result);
        if (imageInputRef.current) imageInputRef.current.value = '';
        return;
      }

      const markdown = result.map((image) => `![${image.name}](${image.url})`).join('\n');
      if (replaceSelection && result.length === 1) editorRef.current?.updateSelection(markdown);
      else editorRef.current?.insertValue(markdown);
      setMarkdownContent(editorRef.current?.getValue() ?? markdownContent);
      setHasUnsavedChanges(true);
      if (imageInputRef.current) imageInputRef.current.value = '';
    },
    [handleImageUpload, markdownContent],
  );

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleEditorChange = useCallback((value: string) => {
    setMarkdownContent(value);
    if (initialContentLoaded.current) setHasUnsavedChanges(true);
  }, []);

  const handleSelectionChange = useCallback((value: string) => {
    const match = value.trim().match(/^!\[[^\]]*\]\([^\n)]*\)$/);
    const selected = match ? match[0] : '';
    selectedImageMarkdownRef.current = selected;
    setSelectedImageMarkdown(selected);
  }, []);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Sidebar resize handling
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Persist width to localStorage
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, sidebarWidth]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleDiscardAndClose = useCallback(() => {
    setIsDiscardDialogOpen(false);
    onClose();
  }, [onClose]);

  const getPreviewUrl = () => {
    const slug =
      frontmatter.link ||
      postId
        .replace(/\.mdx?$/, '')
        .split('/')
        .pop();
    return `${window.location.origin}/post/${slug}`;
  };

  const handleTOCNavigate = useCallback((headingId: string) => {
    editorRef.current?.scrollToHeading(headingId);
  }, []);

  // Handle sidebar tab change
  const handleTabChange = useCallback(
    async (tab: SidebarTab) => {
      if (tab === 'preview') {
        setPreviewContent(editorRef.current?.getValue() ?? markdownContent);
      }
      setSidebarTab(tab);
    },
    [markdownContent],
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="ri:loader-4-line" className="size-12 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">正在加载文章…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="ri:error-warning-line" className="size-12 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-border border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="关闭编辑器"
          >
            <Icon icon="ri:arrow-left-line" className="size-5" />
          </button>
          <div>
            <h1 className="line-clamp-1 font-medium">{frontmatter.title || '无标题文章'}</h1>
            <p className="text-muted-foreground text-xs">{postId}</p>
          </div>
          {hasUnsavedChanges && <span className="rounded bg-orange-500/10 px-2 py-0.5 text-orange-500 text-xs">未保存</span>}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void handleImageFiles([file], Boolean(selectedImageMarkdownRef.current));
            }}
          />
          <Button
            variant="outline"
            onClick={openImagePicker}
            onMouseDown={(event) => event.preventDefault()}
            disabled={isUploadingImage}
            className={
              selectedImageMarkdown
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300'
                : undefined
            }
          >
            <Icon
              icon={isUploadingImage ? 'ri:loader-4-line' : selectedImageMarkdown ? 'ri:image-line' : 'ri:image-add-line'}
              className={cn('mr-1.5 size-4', isUploadingImage && 'animate-spin')}
            />
            {isUploadingImage ? '上传中…' : selectedImageMarkdown ? '更改图片' : '插入图片'}
          </Button>

          <a
            href={getPreviewUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon icon="ri:external-link-line" className="size-4" />
            预览
          </a>

          <button
            type="button"
            onClick={() => setShowSidebar(!showSidebar)}
            className={cn(
              'rounded-lg p-2 transition-colors',
              showSidebar ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
            title="显示或隐藏目录与预览"
          >
            <Icon icon="ri:sidebar-unfold-line" className="size-5" />
          </button>

          <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
            {isSaving ? (
              <>
                <Icon icon="ri:loader-4-line" className="mr-1.5 size-4 animate-spin" />
                保存中…
              </>
            ) : (
              <>
                <Icon icon="ri:save-line" className="mr-1.5 size-4" />
                保存
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto">
          <section
            aria-label="文章编辑区，可拖拽图片上传"
            className={cn(
              'relative mx-auto min-h-full max-w-5xl p-6',
              isImageDragActive && 'rounded-lg bg-primary/5 ring-2 ring-primary',
            )}
            onDragEnter={(event) => {
              if ([...event.dataTransfer.types].includes('Files')) {
                event.preventDefault();
                setIsImageDragActive(true);
              }
            }}
            onDragOver={(event) => {
              if ([...event.dataTransfer.types].includes('Files')) event.preventDefault();
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsImageDragActive(false);
            }}
            onDropCapture={(event) => {
              const files = [...event.dataTransfer.files].filter((item) => item.type.startsWith('image/'));
              setIsImageDragActive(false);
              if (!files.length) return;
              event.preventDefault();
              event.stopPropagation();
              void handleImageFiles(files, Boolean(selectedImageMarkdownRef.current));
            }}
          >
            {isImageDragActive && (
              <div className="pointer-events-none absolute inset-6 z-10 grid place-items-center rounded-lg border-2 border-primary border-dashed bg-background/85 font-medium text-primary">
                松开放入图片
              </div>
            )}
            <ErrorBoundary FallbackComponent={EditorErrorFallback}>
              <VditorMarkdownEditor
                ref={editorRef}
                initialValue={markdownContent}
                onChange={handleEditorChange}
                onHeadingsChange={setHeadings}
                onSelectionChange={handleSelectionChange}
                onUpload={handleImageUpload}
              />
            </ErrorBoundary>
          </section>
        </main>

        {showSidebar && (
          <hr
            tabIndex={0}
            aria-orientation="vertical"
            aria-label="调整属性栏宽度"
            aria-valuenow={sidebarWidth}
            className={cn(
              'h-full w-1 shrink-0 cursor-col-resize border-none transition-colors hover:bg-primary/50',
              isResizing && 'bg-primary',
            )}
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {showSidebar && (
          <aside style={{ width: sidebarWidth }} className="flex shrink-0 flex-col border-border border-l bg-card">
            <div className="flex border-border border-b">
              <button
                type="button"
                onClick={() => handleTabChange('toc')}
                className={cn(
                  'flex-1 px-3 py-2.5 font-medium text-sm transition-colors',
                  sidebarTab === 'toc'
                    ? 'border-primary border-b-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon icon="ri:list-unordered" className="mr-1 inline-block size-4" />
                目录
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('preview')}
                className={cn(
                  'flex-1 px-3 py-2.5 font-medium text-sm transition-colors',
                  sidebarTab === 'preview'
                    ? 'border-primary border-b-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon icon="ri:eye-line" className="mr-1 inline-block size-4" />
                预览
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {sidebarTab === 'toc' && (
                <div className="p-4">
                  <EditorTOC headings={headings} onNavigate={handleTOCNavigate} />
                </div>
              )}
              {sidebarTab === 'preview' && (
                <div className="p-4">
                  <MarkdownPreview content={previewContent} />
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃未保存的正文？</AlertDialogTitle>
            <AlertDialogDescription>正文尚未保存，关闭后本次修改将丢失。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDiscardAndClose}
            >
              放弃修改并关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
