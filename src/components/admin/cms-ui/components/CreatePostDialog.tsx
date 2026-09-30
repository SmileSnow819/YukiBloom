/**
 * Create Post Dialog
 *
 * Dialog for creating new blog posts with title, categories, tags, and draft status.
 */

import { Button } from '@admin-ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@admin-ui/components/ui/dialog';
import { type CustomCategory, useCustomCategories } from '@admin-ui/hooks/useCustomCategories';
import { createPost, uploadPostCover } from '@admin-ui/lib/api';
import { validateImageUpload } from '@admin-ui/lib/image-upload';
import { type CreatePostFormData, createPostSchema } from '@admin-ui/lib/schemas';
import { cn } from '@admin-ui/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ImageCropDialog } from './ImageCropDialog';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCategories: string[];
  onSuccess: (postId: string) => void;
}

/**
 * Custom category chip with editable slug
 */
function CustomCategoryChip({
  category,
  onRemove,
  onSlugChange,
}: {
  category: CustomCategory;
  onRemove: () => void;
  onSlugChange: (slug: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm">
      <span className="font-medium text-primary">{category.name}</span>
      {isEditing ? (
        <input
          type="text"
          value={category.slug}
          onChange={(e) => onSlugChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
          className="ml-1 w-24 rounded border border-border bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="ml-1 cursor-pointer text-muted-foreground text-xs hover:text-foreground"
          title="编辑链接标识"
        >
          ({category.slug})
        </button>
      )}
      <button type="button" onClick={onRemove} className="ml-1 cursor-pointer text-muted-foreground hover:text-destructive">
        <Icon icon="ri:close-line" className="size-3.5" />
      </button>
    </div>
  );
}

export function CreatePostDialog({ open, onOpenChange, existingCategories, onSuccess }: CreatePostDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const { customCategories, addCustomCategory, removeCustomCategory, updateCategorySlug, resetCustomCategories } =
    useCustomCategories();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      coverMediaId: '',
      categories: [],
      tags: '',
      draft: true,
    },
  });

  const handleClose = useCallback(() => {
    reset();
    setCoverUrl('');
    setCropFile(null);
    setSelectedCategories([]);
    setNewCategoryInput('');
    resetCustomCategories();
    onOpenChange(false);
  }, [reset, resetCustomCategories, onOpenChange]);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }, []);

  const handleAddCustomCategory = useCallback(() => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    // Add to selected and custom categories
    addCustomCategory(trimmed);
    setSelectedCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setNewCategoryInput('');
  }, [newCategoryInput, addCustomCategory]);

  const handleRemoveCustomCategory = useCallback(
    (name: string) => {
      removeCustomCategory(name);
      setSelectedCategories((prev) => prev.filter((c) => c !== name));
    },
    [removeCustomCategory],
  );

  const handleCoverChange = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 JPG、PNG 或 WebP 图片');
      return;
    }
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadCroppedCover = async (file: File) => {
    const validationError = validateImageUpload(file);
    if (validationError) {
      toast.error(`裁剪后的图片无法上传：${validationError}`);
      return;
    }
    setIsUploading(true);
    try {
      const media = await uploadPostCover(file);
      setValue('coverMediaId', media.id, { shouldDirty: true, shouldValidate: true });
      setCoverUrl(media.url);
      toast.success('封面已上传');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '封面上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: CreatePostFormData) => {
    setIsSubmitting(true);
    try {
      // Parse tags from comma-separated string
      const tags = data.tags
        ? data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      // Get custom category mappings
      const result = await createPost({
        title: data.title,
        coverMediaId: data.coverMediaId,
        categories: selectedCategories,
        tags,
      });
      handleClose();
      onSuccess(result.postId);
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error(error instanceof Error ? error.message : '创建文章失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新建文章</DialogTitle>
          <DialogDescription>填写基本信息后创建文章草稿。</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 标题 */}
          <div className="space-y-2">
            <label htmlFor="title" className="font-medium text-sm">
              标题 <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              type="text"
              {...register('title')}
              placeholder="请输入文章标题…"
              className={cn(
                'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                errors.title && 'border-destructive',
              )}
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          {/* 封面 */}
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="post-cover">
              封面 <span className="text-destructive">*</span>
            </label>
            {coverUrl ? (
              <img src={coverUrl} alt="文章封面预览" className="max-h-56 w-full rounded-lg border object-cover" />
            ) : (
              <div className="grid min-h-36 place-items-center rounded-lg border border-dashed text-muted-foreground text-sm">
                请上传文章封面
              </div>
            )}
            <input
              ref={fileInputRef}
              id="post-cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => handleCoverChange(event.currentTarget.files?.[0])}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Icon
                icon={isUploading ? 'ri:loader-4-line' : 'ri:image-add-line'}
                className={cn('mr-1.5 size-4', isUploading && 'animate-spin')}
              />
              {isUploading ? '上传中…' : coverUrl ? '更换封面' : '上传封面'}
            </Button>
            {errors.coverMediaId && <p className="text-destructive text-xs">{errors.coverMediaId.message}</p>}
          </div>

          {/* 分类 */}
          <div className="space-y-2">
            <span className="font-medium text-sm">分类</span>

            {/* Selected categories display */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-2">
                {selectedCategories.map((cat) => {
                  const customCat = customCategories.find((c) => c.name === cat);
                  if (customCat) {
                    return (
                      <CustomCategoryChip
                        key={cat}
                        category={customCat}
                        onRemove={() => handleRemoveCustomCategory(cat)}
                        onSlugChange={(slug) => updateCategorySlug(cat, slug)}
                      />
                    );
                  }
                  return (
                    <span key={cat} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                      {cat}
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="cursor-pointer text-muted-foreground hover:text-destructive"
                      >
                        <Icon icon="ri:close-line" className="size-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Existing categories */}
            <div className="flex flex-wrap gap-2">
              {existingCategories.slice(0, 12).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    'cursor-pointer rounded-full px-3 py-1 text-sm transition-colors',
                    selectedCategories.includes(cat) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Custom category input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
                placeholder="添加自定义分类…"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddCustomCategory}>
                <Icon icon="ri:add-line" className="size-4" />
              </Button>
            </div>
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <label htmlFor="tags" className="font-medium text-sm">
              标签
            </label>
            <input
              id="tags"
              type="text"
              {...register('tags')}
              placeholder="多个标签用逗号分隔"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-muted-foreground text-xs">多个标签之间请用逗号分隔</p>
          </div>

          {/* Draft checkbox */}
          <div className="flex items-center gap-2">
            <input id="draft" type="checkbox" {...register('draft')} className="size-4 rounded border-input" />
            <label htmlFor="draft" className="text-sm">
              保存为草稿
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? (
                <>
                  <Icon icon="ri:loader-4-line" className="mr-1.5 size-4 animate-spin" />
                  创建中…
                </>
              ) : (
                <>
                  <Icon icon="ri:add-line" className="mr-1.5 size-4" />
                  创建文章
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {cropFile && (
        <ImageCropDialog file={cropFile} onOpenChange={(isOpen) => !isOpen && setCropFile(null)} onCrop={uploadCroppedCover} />
      )}
    </Dialog>
  );
}
