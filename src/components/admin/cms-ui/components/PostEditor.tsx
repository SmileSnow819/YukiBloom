/**
 * Post Editor
 *
 * Full-screen editor for blog posts with BlockNote editor and frontmatter panel.
 * Supports Cmd+S save, new category detection, and unsaved changes warning.
 */

import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import { EditorTOC } from '@admin-ui/components/EditorTOC';
import { MarkdownPreview } from '@admin-ui/components/MarkdownPreview';
import { Button } from '@admin-ui/components/ui/button';
import { useEditorHeadings } from '@admin-ui/hooks';
import { readPost, writePostContent } from '@admin-ui/lib/api';
import { validateImageUpload } from '@admin-ui/lib/image-upload';
import { cn } from '@admin-ui/lib/utils';
import type { BlogSchema } from '@admin-ui/types';
import { Icon } from '@iconify/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { toast } from 'sonner';
import { adminRequest } from '@/lib/admin/api';

// Supported languages for code blocks
const CODE_BLOCK_LANGUAGES = {
  typescript: { name: 'TypeScript', aliases: ['ts'] },
  javascript: { name: 'JavaScript', aliases: ['js'] },
  tsx: { name: 'TSX' },
  jsx: { name: 'JSX' },
  html: { name: 'HTML' },
  css: { name: 'CSS' },
  json: { name: 'JSON' },
  yaml: { name: 'YAML', aliases: ['yml'] },
  markdown: { name: 'Markdown', aliases: ['md'] },
  bash: { name: 'Bash', aliases: ['sh', 'shell'] },
  python: { name: 'Python', aliases: ['py'] },
  go: { name: 'Go' },
  rust: { name: 'Rust', aliases: ['rs'] },
  sql: { name: 'SQL' },
  c: { name: 'C' },
  cpp: { name: 'C++', aliases: ['c++'] },
  java: { name: 'Java' },
  php: { name: 'PHP' },
  ruby: { name: 'Ruby', aliases: ['rb'] },
  swift: { name: 'Swift' },
  kotlin: { name: 'Kotlin', aliases: ['kt'] },
  text: { name: 'Plain Text' },
};

// Create schema with built-in code block using predefined languages
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs, // Keep all default blocks (paragraph, heading, list, etc.)
    codeBlock: createCodeBlockSpec({
      indentLineWithTab: true,
      defaultLanguage: 'text',
      supportedLanguages: CODE_BLOCK_LANGUAGES,
    }),
  },
});

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

/**
 * Converts BlockNote blocks to markdown
 */
async function blocksToMarkdown(editor: ReturnType<typeof useCreateBlockNote>): Promise<string> {
  return await editor.blocksToMarkdownLossy(editor.document);
}

/**
 * Converts markdown to BlockNote blocks
 */
async function markdownToBlocks(editor: ReturnType<typeof useCreateBlockNote>, markdown: string): Promise<void> {
  const blocks = await editor.tryParseMarkdownToBlocks(markdown);
  editor.replaceBlocks(editor.document, blocks);
}

type SidebarTab = 'toc' | 'preview';

const SIDEBAR_WIDTH_KEY = 'cms-sidebar-width';
const SIDEBAR_DEFAULT_WIDTH = 320;

export function PostEditor({ postId, onClose, onSaved }: PostEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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

  // Frontmatter state
  const [frontmatter, setFrontmatter] = useState<BlogSchema>({ title: '' });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageInsertAnchorRef = useRef<string | null>(null);

  // Preview state
  const [previewContent, setPreviewContent] = useState('');

  // BlockNote editor with code block language support
  const editor = useCreateBlockNote({ schema, dictionary: zh });
  const initialContentLoaded = useRef(false);

  // Extract headings for TOC
  const headings = useEditorHeadings(editor);

  // Load post data
  useEffect(() => {
    async function loadPost() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await readPost(postId);
        setFrontmatter(data.frontmatter);

        // Load content into editor
        if (editor) {
          if (data.content) await markdownToBlocks(editor, data.content);
          initialContentLoaded.current = true;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载文章失败');
      } finally {
        setIsLoading(false);
      }
    }

    loadPost();
  }, [postId, editor]);

  // Track content changes
  useEffect(() => {
    if (!editor) return;

    const unsubscribe = editor.onChange(() => {
      // Only mark as changed after initial content is loaded
      if (initialContentLoaded.current) {
        setHasUnsavedChanges(true);
      }
    });

    return unsubscribe;
  }, [editor]);

  const performSave = useCallback(async () => {
    if (!editor) return;

    setIsSaving(true);
    try {
      const content = await blocksToMarkdown(editor);
      await writePostContent(postId, content);

      setHasUnsavedChanges(false);
      toast.success('正文已保存');
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存文章失败');
    } finally {
      setIsSaving(false);
    }
  }, [editor, postId, onSaved]);

  const handleSave = useCallback(async () => await performSave(), [performSave]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;
      const validationError = validateImageUpload(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setIsUploadingImage(true);
      const body = new FormData();
      body.set('file', file);
      try {
        const media = await adminRequest<{ url: string }>('/media', { method: 'POST', body });
        const anchor = imageInsertAnchorRef.current || editor.getTextCursorPosition().block.id;
        const [imageBlock] = editor.insertBlocks(
          [{ type: 'image', props: { url: media.url, name: file.name } }],
          anchor,
          'after',
        );
        editor.setTextCursorPosition(imageBlock.id, 'end');
        setHasUnsavedChanges(true);
        toast.success('图片已上传并插入文章');
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : '图片上传失败');
      } finally {
        setIsUploadingImage(false);
        imageInsertAnchorRef.current = null;
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    },
    [editor],
  );

  const openImagePicker = useCallback(() => {
    if (!editor) return;
    imageInsertAnchorRef.current = editor.getTextCursorPosition().block.id;
    imageInputRef.current?.click();
  }, [editor]);

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
      const confirmed = window.confirm('正文尚未保存，确定关闭吗？');
      if (!confirmed) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Get post preview URL (points to Astro dev server)
  const getPreviewUrl = () => {
    // Use frontmatter.link if available, otherwise extract filename from postId
    const slug =
      frontmatter.link ||
      postId
        .replace(/\.mdx?$/, '')
        .split('/')
        .pop();
    return `${window.location.origin}/post/${slug}`;
  };

  // Handle TOC navigation
  const handleTOCNavigate = useCallback(
    (blockId: string) => {
      if (!editor) return;

      // Set cursor position and focus
      editor.setTextCursorPosition(blockId);
      editor.focus();

      // Scroll block into view after cursor position is set
      // BlockNote renders blocks with data-id attribute
      requestAnimationFrame(() => {
        const blockElement = document.querySelector(`[data-id="${blockId}"]`);
        if (blockElement) {
          blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    [editor],
  );

  // Handle sidebar tab change
  const handleTabChange = useCallback(
    async (tab: SidebarTab) => {
      if (tab === 'preview' && editor) {
        // Convert blocks to markdown when switching to preview
        const md = await blocksToMarkdown(editor);
        setPreviewContent(md);
      }
      setSidebarTab(tab);
    },
    [editor],
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
      {/* Header */}
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
              if (file) void handleImageUpload(file);
            }}
          />
          <Button variant="outline" onClick={openImagePicker} disabled={isUploadingImage}>
            <Icon
              icon={isUploadingImage ? 'ri:loader-4-line' : 'ri:image-add-line'}
              className={cn('mr-1.5 size-4', isUploadingImage && 'animate-spin')}
            />
            {isUploadingImage ? '上传中…' : '插入图片'}
          </Button>

          {/* Preview link */}
          <a
            href={getPreviewUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon icon="ri:external-link-line" className="size-4" />
            预览
          </a>

          {/* Toggle sidebar */}
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

          {/* Save button */}
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

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl p-6">
            <ErrorBoundary FallbackComponent={EditorErrorFallback}>
              <BlockNoteView editor={editor} theme="light" />
            </ErrorBoundary>
          </div>
        </main>

        {/* Resize Handle */}
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

        {/* Sidebar */}
        {showSidebar && (
          <aside style={{ width: sidebarWidth }} className="flex shrink-0 flex-col border-border border-l bg-card">
            {/* Tab buttons */}
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

            {/* Tab content */}
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
    </div>
  );
}
