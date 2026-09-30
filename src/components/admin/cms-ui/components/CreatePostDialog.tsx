/**
 * Create Post Dialog
 *
 * Dialog for creating new blog posts with title, categories, tags, and draft status.
 */

import { ImageUploadField } from '@admin-ui/components/ImageUploadField';
import { Button } from '@admin-ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@admin-ui/components/ui/dialog';
import { useAvailableCategories } from '@admin-ui/hooks/useAvailableCategories';
import { useDialogValue } from '@admin-ui/hooks/useDialogValue';
import { createPost, uploadPostCover } from '@admin-ui/lib/api';
import { validateImageUpload } from '@admin-ui/lib/image-upload';
import { type CreatePostFormData, createPostSchema } from '@admin-ui/lib/schemas';
import { cn } from '@admin-ui/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ImageCropDialog } from './ImageCropDialog';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCategories: string[];
  onSuccess: (postId: string) => void;
}

export function CreatePostDialog({ open, onOpenChange, existingCategories, onSuccess }: CreatePostDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { value: cropFile, open: cropOpen, setDialogValue: setCropFile } = useDialogValue<File>();
  const [coverUrl, setCoverUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const availableCategories = useAvailableCategories(open, existingCategories);

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
    onOpenChange(false);
  }, [reset, onOpenChange, setCropFile]);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }, []);

  const handleCoverChange = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 JPG、PNG 或 WebP 图片');
      return;
    }
    setCropFile(file);
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
          <div className="space-y-1">
            <ImageUploadField
              label="封面"
              imageUrl={coverUrl}
              alt="文章封面预览"
              emptyText="请点击或拖拽上传文章封面"
              required
              uploading={isUploading}
              onFileSelect={handleCoverChange}
            />
            {errors.coverMediaId && <p className="text-destructive text-xs">{errors.coverMediaId.message}</p>}
          </div>

          {/* 分类 */}
          <div className="space-y-2">
            <span className="font-medium text-sm">分类</span>

            {/* Selected categories display */}
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  aria-pressed={selectedCategories.includes(cat)}
                  className={cn(
                    'cursor-pointer rounded-full px-3 py-1 text-sm transition-colors',
                    selectedCategories.includes(cat) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
                  )}
                >
                  {cat}
                </button>
              ))}
              {availableCategories.length === 0 && (
                <span className="text-muted-foreground text-sm">暂无分类，请先到分类管理中新增。</span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">分类请先在“分类管理”中新增，再回到这里选择。</p>
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
        <ImageCropDialog
          file={cropFile}
          open={cropOpen}
          onOpenChange={(isOpen) => !isOpen && setCropFile(null)}
          onCrop={uploadCroppedCover}
        />
      )}
    </Dialog>
  );
}
