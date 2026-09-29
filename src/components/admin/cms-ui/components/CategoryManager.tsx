import { ImageCropDialog } from '@admin-ui/components/ImageCropDialog';
import { ImagePreviewDialog } from '@admin-ui/components/ImagePreviewDialog';
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
import { generateCategorySlug } from '@admin-ui/lib/category';
import { validateImageUpload } from '@admin-ui/lib/image-upload';
import { Icon } from '@iconify/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadAdminMedia } from '@/lib/admin/api';
import { getManagedCategoryNames, upsertCategoryMapping } from '@/lib/admin/category-settings';
import { type AdminSiteContent, getAdminSiteContent, saveAdminSiteContent } from '@/lib/admin/site-content';
import type { PublicFeaturedCategory } from '@/lib/public-api/types';

type CategoryEditor = { index: number | null; order: number; item: PublicFeaturedCategory };

const emptyFeaturedCategory = (): PublicFeaturedCategory => ({
  label: '',
  description: '',
  image: '',
  link: '',
  enabled: true,
});

export function CategoryManager({
  categories,
  onToolbarChange,
}: {
  categories: string[];
  onToolbarChange: (actions: ReactNode | null) => void;
}) {
  const [content, setContent] = useState<AdminSiteContent | null>(null);
  const [editor, setEditor] = useState<CategoryEditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const categoryNames = useMemo(
    () => (content ? getManagedCategoryNames(categories, content.categoryMappings) : categories),
    [categories, content],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setContent(await getAdminSiteContent());
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取站点分类配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function applyEditor() {
    if (!content || !editor) return;
    if (!editor.item.label.trim() || !editor.item.link.trim()) {
      toast.error('请填写精选分类名称和分类链接。');
      return;
    }
    const maxOrder = content.featuredCategories.length + (editor.index === null ? 1 : 0);
    if (!Number.isInteger(editor.order) || editor.order < 1 || editor.order > maxOrder) {
      toast.error(`显示位置必须是 1 到 ${maxOrder} 之间的整数。`);
      return;
    }
    const featuredCategories = [...content.featuredCategories];
    if (editor.index === null) featuredCategories.splice(editor.order - 1, 0, editor.item);
    else {
      featuredCategories.splice(editor.index, 1);
      featuredCategories.splice(editor.order - 1, 0, editor.item);
    }
    setContent({ ...content, featuredCategories });
    setDirty(true);
    setEditor(null);
  }

  function removeFeatured(index: number) {
    if (!content || !window.confirm(`确定删除精选分类“${content.featuredCategories[index].label}”吗？`)) return;
    setContent({ ...content, featuredCategories: content.featuredCategories.filter((_, itemIndex) => itemIndex !== index) });
    setDirty(true);
  }

  function handleImageSelection(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 JPG、PNG 或 WebP 图片');
      return;
    }
    setCropFile(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
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
      setEditor((current) => (current ? { ...current, item: { ...current.item, image: media.url } } : current));
      toast.success('封面已上传，应用并保存分类配置后生效');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '分类封面上传失败');
    } finally {
      setIsImageUploading(false);
    }
  }

  const save = useCallback(async () => {
    if (!content) return;
    const incompleteCategory = categoryNames.find((name) => {
      const mapping = content.categoryMappings.find((entry) => entry.name === name);
      return !(mapping?.slug || generateCategorySlug(name)).trim();
    });
    if (incompleteCategory) {
      toast.error(`分类“${incompleteCategory}”无法生成链接标识，请手动填写。`);
      return;
    }
    const incompleteFeatured = content.featuredCategories.find((category) => !category.label.trim() || !category.link.trim());
    if (incompleteFeatured) {
      toast.error('每个精选分类都需要填写名称和分类链接。');
      return;
    }
    setSaving(true);
    try {
      const categoryMappings = categoryNames.map((name) => {
        const mapping = content.categoryMappings.find((entry) => entry.name === name);
        return { name, slug: mapping?.slug || generateCategorySlug(name) };
      });
      setContent(await saveAdminSiteContent({ ...content, categoryMappings }));
      setDirty(false);
      toast.success('分类配置已保存');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存分类配置失败');
    } finally {
      setSaving(false);
    }
  }, [categoryNames, content]);

  useEffect(() => {
    if (!content) {
      onToolbarChange(null);
      return;
    }

    onToolbarChange(
      <div className="flex items-center gap-2">
        {dirty && <span className="mr-2 text-amber-600 text-sm">有未保存更改</span>}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setEditor({ index: null, order: content.featuredCategories.length + 1, item: emptyFeaturedCategory() })
          }
        >
          <Icon icon="ri:add-line" className="mr-1 size-4" />
          新增精选分类
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          <Icon icon={saving ? 'ri:loader-4-line' : 'ri:save-line'} className={`mr-1 size-4 ${saving ? 'animate-spin' : ''}`} />
          {saving ? '保存中…' : '保存'}
        </Button>
      </div>,
    );
    return () => onToolbarChange(null);
  }, [content, dirty, onToolbarChange, save, saving]);

  if (loading) return <ManagerMessage>正在读取分类配置…</ManagerMessage>;
  if (error) return <ManagerError message={error} onRetry={reload} />;
  if (!content) return null;

  return (
    <section className="space-y-8" aria-label="分类配置管理">
      <section className="space-y-3">
        <div>
          <h4 className="font-semibold">
            首页精选分类 <span className="font-normal text-muted-foreground">({content.featuredCategories.length})</span>
          </h4>
          <p className="mt-1 text-muted-foreground text-sm">这些卡片展示在首页精选分类区域。</p>
        </div>
        <ManagerTable
          items={content.featuredCategories}
          getKey={(item, index) => `${item.label}-${index}`}
          emptyMessage="暂无精选分类"
          columns={[
            { label: '显示位置', render: (_, index) => <span className="text-muted-foreground">{index + 1}</span> },
            {
              label: '封面',
              render: (item) =>
                item.image ? (
                  <ImagePreviewDialog src={item.image} alt={`${item.label}封面`} thumbnailClassName="aspect-video w-24" />
                ) : (
                  <div className="grid aspect-video w-24 place-items-center rounded-md border border-border border-dashed bg-muted/40 text-muted-foreground">
                    <Icon icon="ri:image-line" className="size-5" />
                  </div>
                ),
            },
            {
              label: '名称 / 链接',
              render: (item) => (
                <>
                  <span className="font-medium">{item.label}</span>
                  <span className="mt-1 block text-muted-foreground">{item.link}</span>
                </>
              ),
            },
            {
              label: '状态',
              render: (item) => (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-xs ${
                    item.enabled
                      ? 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  {item.enabled ? '首页展示' : '已隐藏'}
                </span>
              ),
            },
          ]}
          onEdit={(item, index) => setEditor({ index, order: index + 1, item: { ...item } })}
          onDelete={(_, index) => removeFeatured(index)}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h4 className="font-semibold">
            文章分类 <span className="font-normal text-muted-foreground">({categoryNames.length})</span>
          </h4>
          <p className="mt-1 text-muted-foreground text-sm">
            分类名称来自文章；可直接编辑链接标识。新增分类请先在文章编辑器中使用。
          </p>
        </div>
        <ManagerTable
          items={categoryNames.map((name) => ({
            name,
            slug: content.categoryMappings.find((mapping) => mapping.name === name)?.slug || generateCategorySlug(name),
          }))}
          getKey={(item) => item.name}
          emptyMessage="还没有文章分类"
          columns={[
            { label: '名称', render: (item) => <span className="font-medium">{item.name}</span> },
            {
              label: '链接标识',
              render: (item) => (
                <input
                  value={item.slug}
                  onChange={(event) => {
                    setContent({
                      ...content,
                      categoryMappings: upsertCategoryMapping(content.categoryMappings, item.name, event.target.value.trim()),
                    });
                    setDirty(true);
                  }}
                  aria-label={`${item.name} 的链接标识`}
                  className="w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              ),
            },
          ]}
        />
      </section>

      <Dialog open={editor !== null} onOpenChange={(open) => !open && !isImageUploading && setEditor(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{`${editor?.index === null ? '新增' : '编辑'}精选分类`}</DialogTitle>
            <DialogDescription>编辑完成后，点击页面右上方保存全部更改。</DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <NumberField
                label="显示位置（越小越靠前）"
                value={editor.order}
                min={1}
                max={content.featuredCategories.length + (editor.index === null ? 1 : 0)}
                onChange={(order) => setEditor({ ...editor, order })}
              />
              <Field
                label="显示名称"
                value={editor.item.label}
                onChange={(label) => setEditor({ ...editor, item: { ...editor.item, label } })}
              />
              <Field
                label="分类链接"
                value={editor.item.link}
                onChange={(link) => setEditor({ ...editor, item: { ...editor.item, link } })}
                placeholder="/categories/front-end"
              />
              <div className="space-y-2 sm:col-span-2">
                <Field
                  label="图片 URL"
                  value={editor.item.image}
                  onChange={(image) => setEditor({ ...editor, item: { ...editor.item, image } })}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => handleImageSelection(event.currentTarget.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isImageUploading}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Icon
                    icon={isImageUploading ? 'ri:loader-4-line' : 'ri:image-add-line'}
                    className={`mr-1.5 size-4 ${isImageUploading ? 'animate-spin' : ''}`}
                  />
                  {isImageUploading ? '上传中…' : editor.item.image ? '上传并更换封面' : '上传封面'}
                </Button>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={editor.item.enabled}
                  onChange={(event) => setEditor({ ...editor, item: { ...editor.item, enabled: event.target.checked } })}
                />
                在首页展示
              </label>
              <TextArea
                label="简介"
                value={editor.item.description}
                onChange={(description) => setEditor({ ...editor, item: { ...editor.item, description } })}
              />
              {editor.item.image && (
                <img
                  src={editor.item.image}
                  alt=""
                  className="aspect-video w-full rounded-lg border border-border object-cover sm:col-span-2"
                  loading="lazy"
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)} disabled={isImageUploading}>
              取消
            </Button>
            <Button onClick={applyEditor} disabled={isImageUploading}>
              应用到列表
            </Button>
          </DialogFooter>
        </DialogContent>
        {cropFile && (
          <ImageCropDialog
            file={cropFile}
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
