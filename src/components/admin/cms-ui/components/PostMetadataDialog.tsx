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
import { useDialogValue } from '@admin-ui/hooks';
import { readPostMetadata, savePostMetadata, uploadPostCover } from '@admin-ui/lib/api';
import { validateImageUpload } from '@admin-ui/lib/image-upload';
import type { PostMetadataValues } from '@admin-ui/lib/post-metadata';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ImageCropDialog } from './ImageCropDialog';

interface PostMetadataDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function PostMetadataDialog({ postId, open, onOpenChange, onSaved }: PostMetadataDialogProps) {
  const [values, setValues] = useState<PostMetadataValues | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { value: cropFile, open: cropOpen, setDialogValue: setCropFile } = useDialogValue<File>();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    readPostMetadata(postId)
      .then(({ values: defaults, cover }) => {
        if (cancelled) return;
        setValues(defaults);
        setCoverUrl(cover?.url || '');
      })
      .catch((cause: unknown) => {
        if (!cancelled) toast.error(cause instanceof Error ? cause.message : '加载文章信息失败');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  function updateValue<Key extends keyof PostMetadataValues>(key: Key, value: PostMetadataValues[Key]) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleCoverChange(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 JPG、PNG 或 WebP 图片');
      return;
    }
    setCropFile(file);
  }

  async function uploadCroppedCover(file: File) {
    const validationError = validateImageUpload(file);
    if (validationError) {
      toast.error(`裁剪后的图片无法上传：${validationError}`);
      return;
    }
    setIsUploading(true);
    try {
      const media = await uploadPostCover(file);
      updateValue('coverMediaId', media.id);
      setCoverUrl(media.url);
      toast.success('封面已上传');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '封面上传失败');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    if (!values || !values.title.trim()) {
      toast.error('标题不能为空');
      return;
    }
    if (!values.date) {
      toast.error('请选择发布日期');
      return;
    }

    setIsSaving(true);
    try {
      await savePostMetadata(postId, values);
      toast.success('文章信息已保存');
      onSaved();
      onOpenChange(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存文章信息失败');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑文章信息</DialogTitle>
          <DialogDescription>修改标题、封面、分类、标签和发布日期；正文请使用“编辑内容”。</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
            <Icon icon="ri:loader-4-line" className="size-5 animate-spin" />
            正在加载文章信息…
          </div>
        ) : values ? (
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">标题</span>
              <input
                autoFocus
                value={values.title}
                onChange={(event) => updateValue('title', event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">发布日期</span>
                <input
                  type="date"
                  required
                  value={values.date}
                  onChange={(event) => updateValue('date', event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">分类</span>
                <input
                  value={values.categories}
                  onChange={(event) => updateValue('categories', event.target.value)}
                  placeholder="层级分类用 > 分隔；多个分类用逗号分隔"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                />
              </label>
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">标签</span>
              <input
                value={values.tags}
                onChange={(event) => updateValue('tags', event.target.value)}
                placeholder="多个标签用逗号分隔"
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">摘要</span>
              <textarea
                rows={3}
                value={values.description}
                onChange={(event) => updateValue('description', event.target.value)}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2"
              />
            </label>

            <div className="space-y-1">
              <ImageUploadField
                label="封面"
                imageUrl={coverUrl}
                alt="文章封面预览"
                emptyText={
                  values.coverMediaId ? `当前封面媒体 ID：${values.coverMediaId}，点击或拖拽可更换` : '点击或拖拽上传文章封面'
                }
                uploading={isUploading}
                onFileSelect={handleCoverChange}
              />
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-destructive">文章信息加载失败，请关闭后重试。</div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading || !values || isSaving || isUploading}>
            {isSaving ? '保存中…' : '保存信息'}
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
            void uploadCroppedCover(file);
          }}
        />
      )}
    </Dialog>
  );
}
