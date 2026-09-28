/**
 * Category Mapping Dialog
 *
 * Dialog for mapping new categories to URL slugs.
 * Shows when the editor detects categories not in config/site.yaml.
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
import { generateCategorySlug } from '@admin-ui/lib/category';
import { categorySlugSchema } from '@admin-ui/lib/schemas';
import { cn } from '@admin-ui/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface CategoryMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** New categories that need slug mappings */
  newCategories: Record<string, string>;
  /** Called when user confirms mappings */
  onConfirm: (mappings: Record<string, string>) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/**
 * Creates a dynamic Zod schema based on category names
 */
function createMappingSchema(categoryNames: string[]) {
  const shape: Record<string, z.ZodString> = {};
  for (const name of categoryNames) {
    shape[name] = categorySlugSchema;
  }
  return z.object(shape);
}

export function CategoryMappingDialog({ open, onOpenChange, newCategories, onConfirm, onCancel }: CategoryMappingDialogProps) {
  const categoryNames = Object.keys(newCategories);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form with dynamic schema
  const schema = createMappingSchema(categoryNames);
  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: newCategories,
  });

  // Reset form when dialog opens with new categories
  useEffect(() => {
    if (open) {
      reset(newCategories);
    }
  }, [open, newCategories, reset]);

  const handleClose = () => {
    onCancel();
    onOpenChange(false);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      onConfirm(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = (name: string) => {
    const newSlug = generateCategorySlug(name);
    setValue(name, newSlug);
  };

  if (categoryNames.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="ri:folder-add-line" className="size-5 text-primary" />
            发现新分类
          </DialogTitle>
          <DialogDescription>以下分类尚未配置链接标识，请为它们填写可用于网址的英文标识。</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {categoryNames.map((name) => (
              <div key={name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={`slug-${name}`} className="font-medium text-sm">
                    {name}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRegenerate(name)}
                    className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                    title="重新生成链接标识"
                  >
                    <Icon icon="ri:refresh-line" className="size-3.5" />
                    重新生成
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">分类 /</span>
                  <input
                    id={`slug-${name}`}
                    type="text"
                    {...register(name)}
                    placeholder="分类链接标识"
                    className={cn(
                      'flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm',
                      'focus:outline-none focus:ring-1 focus:ring-ring',
                      errors[name] && 'border-destructive',
                    )}
                  />
                </div>
                {errors[name] && <p className="text-destructive text-xs">{errors[name]?.message as string}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-muted-foreground text-xs">
              <Icon icon="ri:information-line" className="mr-1 inline size-3.5" />
              链接标识请使用小写英文字母、数字和连字符（例如：front-end）。
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icon icon="ri:loader-4-line" className="mr-1.5 size-4 animate-spin" />
                  保存中…
                </>
              ) : (
                <>
                  <Icon icon="ri:check-line" className="mr-1.5 size-4" />
                  确认分类
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
