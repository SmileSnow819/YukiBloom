import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type Vditor from 'vditor';

export interface UploadedMarkdownImage {
  name: string;
  url: string;
}

export interface EditorHeading {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export interface VditorMarkdownEditorHandle {
  getValue(): string;
  focus(): void;
  insertValue(value: string): void;
  updateSelection(value: string): void;
  getSelection(): string;
  scrollToHeading(headingId: string): void;
}

interface VditorMarkdownEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  onHeadingsChange: (headings: EditorHeading[]) => void;
  onUpload: (files: File[]) => Promise<UploadedMarkdownImage[] | string>;
  onSelectionChange: (value: string) => void;
}

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

function readEditorHeadings(editor: Vditor): EditorHeading[] {
  const internalEditor = editor.vditor;
  const outlineHtml = internalEditor.outline.render(internalEditor);
  if (!outlineHtml) return [];

  const contentElement =
    internalEditor.preview?.element.style.display === 'block'
      ? internalEditor.preview.previewElement
      : internalEditor[editor.getCurrentMode()]?.element;
  if (!contentElement) return [];

  const outline = document.createElement('div');
  outline.innerHTML = outlineHtml;

  return Array.from(outline.querySelectorAll<HTMLElement>('[data-target-id]')).flatMap((item) => {
    const id = item.dataset.targetId;
    const heading = Array.from(contentElement.querySelectorAll<HTMLElement>(HEADING_SELECTOR)).find(
      (element) => element.id === id,
    );
    if (!id || !heading) return [];

    const level = Number(heading.tagName.slice(1));
    const text = item.textContent?.trim();
    if (!text || level < 1 || level > 3) return [];

    return [{ id, text, level: level as 1 | 2 | 3 }];
  });
}

export const VditorMarkdownEditor = forwardRef<VditorMarkdownEditorHandle, VditorMarkdownEditorProps>(
  function VditorMarkdownEditor({ initialValue, onChange, onHeadingsChange, onUpload, onSelectionChange }, forwardedRef) {
    const hostRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<Vditor | null>(null);
    const initialValueRef = useRef(initialValue);
    const onChangeRef = useRef(onChange);
    const onHeadingsChangeRef = useRef(onHeadingsChange);
    const onUploadRef = useRef(onUpload);
    const onSelectionChangeRef = useRef(onSelectionChange);

    onChangeRef.current = onChange;
    onHeadingsChangeRef.current = onHeadingsChange;
    onUploadRef.current = onUpload;
    onSelectionChangeRef.current = onSelectionChange;

    useImperativeHandle(
      forwardedRef,
      () => ({
        getValue: () => editorRef.current?.getValue() ?? initialValueRef.current,
        focus: () => editorRef.current?.focus(),
        insertValue: (value) => editorRef.current?.insertValue(value),
        updateSelection: (value) => editorRef.current?.updateValue(value),
        getSelection: () => editorRef.current?.getSelection() ?? '',
        scrollToHeading: (headingId) => {
          const editor = editorRef.current;
          if (!editor) return;

          const mode = editor.getCurrentMode();
          const contentElement =
            mode === 'sv'
              ? editor.vditor.preview?.previewElement
              : mode === 'wysiwyg'
                ? editor.vditor.wysiwyg?.element
                : editor.vditor.ir?.element;
          const heading = Array.from(contentElement?.querySelectorAll<HTMLElement>(HEADING_SELECTOR) ?? []).find(
            (element) => element.id === headingId,
          );
          heading?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      let editor: Vditor | null = null;

      function updateHeadings() {
        if (editor) onHeadingsChangeRef.current(readEditorHeadings(editor));
      }

      async function initialize() {
        const [{ default: VditorConstructor }] = await Promise.all([import('vditor'), import('vditor/dist/index.css')]);
        if (cancelled || !hostRef.current) return;

        editor = new VditorConstructor(hostRef.current, {
          after: () => window.requestAnimationFrame(updateHeadings),
          cache: { enable: false },
          height: 'calc(100vh - 140px)',
          lang: 'zh_CN',
          minHeight: 480,
          mode: 'ir',
          placeholder: '开始写作，或直接粘贴 Markdown…',
          value: initialValueRef.current,
          upload: {
            accept: 'image/jpeg,image/png,image/webp',
            handler: async (files) => {
              const result = await onUploadRef.current(files);
              if (typeof result === 'string') return result;

              for (const image of result) {
                editor?.insertValue(`![${image.name}](${image.url})`);
              }
              if (editor) onChangeRef.current(editor.getValue());
              return '';
            },
          },
          input: (value) => {
            onChangeRef.current(value);
            updateHeadings();
          },
          select: (value) => onSelectionChangeRef.current(value),
          unSelect: () => onSelectionChangeRef.current(''),
        });
        editorRef.current = editor;
      }

      void initialize().catch((error: unknown) => {
        if (!cancelled) {
          console.error('Failed to initialize Vditor:', error);
        }
      });

      return () => {
        cancelled = true;
        editor?.destroy();
        if (editorRef.current === editor) editorRef.current = null;
      };
    }, []);

    return <div ref={hostRef} className="post-vditor h-full min-h-[480px] w-full" />;
  },
);
