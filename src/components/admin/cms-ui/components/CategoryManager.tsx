import { ImageCropDialog } from '@admin-ui/components/ImageCropDialog';
import { ImagePreviewDialog } from '@admin-ui/components/ImagePreviewDialog';
import { ImageUploadField } from '@admin-ui/components/ImageUploadField';
import { ManagerTable } from '@admin-ui/components/ManagerTable';
import { Button } from '@admin-ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@admin-ui/components/ui/dialog';
import { useDialogValue } from '@admin-ui/hooks/useDialogValue';
import { generateCategorySlug } from '@admin-ui/lib/category';
import { validateImageUpload } from '@admin-ui/lib/image-upload';
import { Icon } from '@iconify/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadAdminMedia } from '@/lib/admin/api';
import { getManagedCategoryNames } from '@/lib/admin/category-settings';
import { moveItem, withSortOrder } from '@/lib/admin/ordered-list';
import { type AdminSiteContent, getAdminSiteContent, saveAdminSiteContent } from '@/lib/admin/site-content';
import type { PublicCategory } from '@/lib/public-api/types';

type CategoryEditor = {
  originalName: string | null;
  originalSlug: string | null;
  name: string;
  slug: string;
  showOnHome: boolean;
  image: string;
  description: string;
  order: number;
};

type ManagedCategory = PublicCategory;

export function CategoryManager({
  categories,
  onToolbarChange,
}: {
  categories: string[];
  onToolbarChange: (actions: ReactNode | null) => void;
}) {
  const [content, setContent] = useState<AdminSiteContent | null>(null);
  const {
    value: editor,
    open: editorOpen,
    setDialogValue: setEditor,
    updateDialogValue: updateEditor,
  } = useDialogValue<CategoryEditor>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { value: cropFile, open: cropOpen, setDialogValue: setCropFile } = useDialogValue<File>();
  const [isImageUploading, setIsImageUploading] = useState(false);
  const savedContentRef = useRef<AdminSiteContent | null>(null);
  const categoryNames = useMemo(
    () =>
      content
        ? getManagedCategoryNames([...content.categories.map((item) => item.name), ...categories], content.categories)
        : categories,
    [categories, content],
  );
  const managedCategories = useMemo<ManagedCategory[]>(
    () =>
      content
        ? categoryNames.map((name) => {
            return (
              content.categories.find((item) => item.name === name) ?? {
                name,
                slug: generateCategorySlug(name),
                image: '',
                description: '',
                showOnHome: false,
                sortOrder: content.categories.length + categoryNames.indexOf(name),
              }
            );
          })
        : [],
    [categoryNames, content],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const savedContent = await getAdminSiteContent();
      savedContentRef.current = savedContent;
      setContent(savedContent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取站点分类配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function persistContent(nextContent: AdminSiteContent, successMessage: string, failureMessage: string) {
    if (saving) return false;
    const nextCategoryNames = getManagedCategoryNames(
      [...nextContent.categories.map((item) => item.name), ...categories],
      nextContent.categories,
    );
    const incompleteCategory = nextCategoryNames.find((name) => {
      const category = nextContent.categories.find((entry) => entry.name === name);
      const slug = (category?.slug || generateCategorySlug(name)).trim();
      return !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    });
    if (incompleteCategory) {
      toast.error(`分类“${incompleteCategory}”无法生成链接标识，请手动填写。`);
      return false;
    }
    const normalizedCategories = nextCategoryNames.map((name) => {
      const category = nextContent.categories.find((entry) => entry.name === name);
      return (
        category ?? {
          name,
          slug: generateCategorySlug(name),
          image: '',
          description: '',
          showOnHome: false,
          sortOrder: nextContent.categories.length + nextCategoryNames.indexOf(name),
        }
      );
    });
    normalizedCategories.forEach((category, index) => {
      category.sortOrder = index;
    });
    const duplicateSlug = normalizedCategories.find(
      (mapping, index) =>
        normalizedCategories.findIndex((candidate) => candidate.slug.toLowerCase() === mapping.slug.toLowerCase()) !== index,
    );
    if (duplicateSlug) {
      toast.error(`链接标识“${duplicateSlug.slug}”已被其他分类使用。`);
      return false;
    }
    setSaving(true);
    try {
      const { data: savedContent, message } = await saveAdminSiteContent({
        ...nextContent,
        categories: normalizedCategories,
      });
      savedContentRef.current = savedContent;
      setContent(savedContent);
      toast.success(message || successMessage);
      return true;
    } catch (cause) {
      setContent(savedContentRef.current);
      toast.error(cause instanceof Error ? cause.message : failureMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function applyEditor() {
    if (!content || !editor) return;
    const name = editor.name.trim();
    const slug = editor.slug.trim().toLowerCase();
    if (!name || !slug) {
      toast.error('请填写分类名称和链接标识。');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      toast.error('链接标识只能包含小写英文字母、数字和连字符。');
      return;
    }
    const originalName = editor.originalName;
    if (!originalName && categoryNames.includes(name)) {
      toast.error(`分类“${name}”已存在。`);
      return;
    }
    const category = content.categories.find((item) => item.name === (originalName ?? name));
    const originalSlug = editor.originalSlug ?? category?.slug ?? slug;
    const slugTaken = content.categories.some(
      (item) => item.name !== (originalName ?? name) && item.slug.toLowerCase() === slug,
    );
    if (slugTaken) {
      toast.error(`链接标识“${slug}”已被其他分类使用。`);
      return;
    }

    if (editor.showOnHome && !editor.image.trim()) {
      toast.error('首页展示的分类需要上传封面图片。');
      return;
    }
    if (editor.showOnHome) {
      const currentHomeOrder = content.categories.filter(
        (item) => item.showOnHome && item.name !== (originalName ?? name),
      ).length;
      const maxOrder = currentHomeOrder + 1;
      if (!Number.isInteger(editor.order) || editor.order < 1 || editor.order > maxOrder) {
        toast.error(`首页显示顺序必须是 1 到 ${maxOrder} 之间的整数。`);
        return;
      }
    }

    const updatedCategory: PublicCategory = {
      name,
      slug,
      image: editor.image.trim(),
      description: editor.description.trim(),
      showOnHome: editor.showOnHome,
      sortOrder: 0,
    };
    const remainingHomeCategories = content.categories.filter(
      (item) => item.showOnHome && item.name !== (originalName ?? name),
    );
    const remainingOtherCategories = content.categories.filter(
      (item) => !item.showOnHome && item.name !== (originalName ?? name),
    );
    if (editor.showOnHome) {
      remainingHomeCategories.splice(editor.order - 1, 0, updatedCategory);
    } else {
      remainingOtherCategories.push(updatedCategory);
    }
    const nextCategories = [...remainingHomeCategories, ...remainingOtherCategories].map((item, index) => ({
      ...item,
      sortOrder: index,
    }));
    const translations =
      originalSlug === slug
        ? content.translations
        : content.translations.map((item) =>
            item.entityType === 'categories' && item.entityKey === originalSlug ? { ...item, entityKey: slug } : item,
          );
    const success = await persistContent(
      { ...content, categories: nextCategories, translations },
      originalName ? '分类已更新' : '分类已新增',
      originalName ? '保存分类修改失败，请重试' : '新增分类失败，请重试',
    );
    if (!success) return;
    setEditor(null);
  }

  async function reorderCategories(fromIndex: number, toIndex: number) {
    if (!content || saving || fromIndex === toIndex) return;
    await persistContent(
      { ...content, categories: withSortOrder(moveItem(managedCategories, fromIndex, toIndex)) },
      '分类顺序已更新',
      '更新分类顺序失败，请重试',
    );
  }

  function editCategory(category: ManagedCategory) {
    const featureIndex =
      content?.categories.filter((item) => item.showOnHome).findIndex((item) => item.slug === category.slug) ?? -1;
    setEditor({
      originalName: category.name,
      originalSlug: category.slug,
      name: category.name,
      slug: category.slug,
      showOnHome: category.showOnHome,
      image: category.image,
      description: category.description,
      order: featureIndex >= 0 ? featureIndex + 1 : (content?.categories.filter((item) => item.showOnHome).length ?? 0) + 1,
    });
  }

  function handleImageSelection(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 JPG、PNG 或 WebP 图片');
      return;
    }
    setCropFile(file);
  }

  async function uploadFeaturedImage(file: File) {
    const validationError = validateImageUpload(file);
    if (validationError) {
      toast.error(`裁剪后的图片无法上传：${validationError}`);
      return;
    }
    setIsImageUploading(true);
    try {
      const media = await uploadAdminMedia(file);
      updateEditor((current) => (current ? { ...current, image: media.url } : current));
      toast.success('封面已上传，确认分类后立即生效');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '分类封面上传失败');
    } finally {
      setIsImageUploading(false);
    }
  }

  useEffect(() => {
    if (!content) {
      onToolbarChange(null);
      return;
    }

    onToolbarChange(
      <div className="flex items-center gap-2">
        {saving && (
          <span className="mr-2 flex items-center gap-1 text-muted-foreground text-sm">
            <Icon icon="ri:loader-4-line" className="size-4 animate-spin" /> 正在保存…
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() =>
            setEditor({
              originalName: null,
              originalSlug: null,
              name: '',
              slug: '',
              showOnHome: false,
              image: '',
              description: '',
              order: content.categories.filter((item) => item.showOnHome).length + 1,
            })
          }
        >
          <Icon icon="ri:add-line" className="mr-1 size-4" />
          新增分类
        </Button>
      </div>,
    );
    return () => onToolbarChange(null);
  }, [content, onToolbarChange, saving, setEditor]);

  if (loading) return <ManagerMessage>正在读取分类配置…</ManagerMessage>;
  if (error) return <ManagerError message={error} onRetry={reload} />;
  if (!content) return null;
  const editorFeaturedIndex = editor
    ? content.categories.filter((item) => item.showOnHome).findIndex((item) => item.slug === editor.originalSlug)
    : -1;

  return (
    <section className="space-y-3" aria-label="分类管理">
      <ManagerTable
        items={managedCategories}
        getKey={(item) => item.name}
        emptyMessage="暂无分类，请先新增分类"
        onReorder={reorderCategories}
        reorderDisabled={saving || editorOpen || isImageUploading}
        columns={[
          {
            label: '分类名称 / 链接标识',
            render: (item) => (
              <>
                <span className="font-medium">{item.name}</span>
                <span className="mt-1 block font-mono text-muted-foreground text-xs">{item.slug}</span>
              </>
            ),
          },
          {
            label: '首页展示',
            render: (item) => (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-xs ${
                  item.showOnHome
                    ? 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {item.showOnHome ? '展示中' : '未展示'}
              </span>
            ),
          },
          {
            label: '封面',
            render: (item) =>
              item.image ? (
                <ImagePreviewDialog src={item.image} alt={`${item.name}封面`} thumbnailClassName="aspect-video w-24" />
              ) : (
                <span className="text-muted-foreground">未设置</span>
              ),
          },
          {
            label: '首页顺序',
            render: (item) => {
              const order = content.categories
                .filter((category) => category.showOnHome)
                .findIndex((category) => category.slug === item.slug);
              return <span className="text-muted-foreground">{item.showOnHome && order >= 0 ? order + 1 : '—'}</span>;
            },
          },
        ]}
        onEdit={editCategory}
      />

      <Dialog open={editorOpen} onOpenChange={(open) => !open && !isImageUploading && !saving && setEditor(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor?.originalName ? '编辑分类' : '新增分类'}</DialogTitle>
            <DialogDescription>分类会同时用于文章归档和首页分类卡片。确认后立即保存并生效。</DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <Field
                label="分类名称"
                value={editor.name}
                disabled={Boolean(editor.originalName)}
                onChange={(name) =>
                  setEditor({
                    ...editor,
                    name,
                    slug: generateCategorySlug(name),
                  })
                }
              />
              <Field
                label="链接标识"
                value={editor.slug}
                onChange={(slug) => setEditor({ ...editor, slug })}
                placeholder="front-end"
              />
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={editor.showOnHome}
                  onChange={(event) => setEditor({ ...editor, showOnHome: event.target.checked })}
                />
                在首页展示
              </label>
              {editor.showOnHome && (
                <>
                  <NumberField
                    label="首页顺序（越小越靠前）"
                    value={editor.order}
                    min={1}
                    max={content.categories.filter((item) => item.showOnHome).length + (editorFeaturedIndex >= 0 ? 0 : 1)}
                    onChange={(order) => setEditor({ ...editor, order })}
                  />
                  <div className="space-y-2 sm:col-span-2">
                    <Field label="封面 URL" value={editor.image} onChange={(image) => setEditor({ ...editor, image })} />
                    <ImageUploadField
                      label="首页封面"
                      imageUrl={editor.image}
                      alt={`${editor.name || '分类'}封面预览`}
                      required
                      uploading={isImageUploading}
                      onFileSelect={handleImageSelection}
                    />
                  </div>
                  <TextArea
                    label="描述"
                    value={editor.description}
                    onChange={(description) => setEditor({ ...editor, description })}
                  />
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)} disabled={isImageUploading || saving}>
              取消
            </Button>
            <Button onClick={() => void applyEditor()} disabled={isImageUploading || saving}>
              {saving ? '保存中…' : editor?.originalName ? '保存修改' : '新增分类'}
            </Button>
          </DialogFooter>
        </DialogContent>
        {cropFile && (
          <ImageCropDialog
            file={cropFile}
            open={cropOpen}
            onOpenChange={(open) => !open && setCropFile(null)}
            onCrop={(file) => {
              setCropFile(null);
              void uploadFeaturedImage(file);
            }}
          />
        )}
      </Dialog>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 disabled:opacity-50"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5 text-sm sm:col-span-2">
      <span className="font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full rounded-lg border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function ManagerMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex h-64 items-center justify-center text-muted-foreground">{children}</div>;
}

function ManagerError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex h-64 flex-col items-center justify-center gap-4">
      <p className="text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}
