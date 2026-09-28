/**
 * Frontmatter Editor
 *
 * Sidebar panel for editing post frontmatter fields.
 * Uses react-hook-form with Zod validation.
 */

import { type FrontmatterFormData, frontmatterSchema } from '@admin-ui/lib/schemas';
import { cn } from '@admin-ui/lib/utils';
import type { BlogSchema } from '@admin-ui/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { format, isValid, parse } from 'date-fns';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useForm } from 'react-hook-form';

export interface FrontmatterEditorRef {
  getFormData: () => FrontmatterFormData;
  isDirty: () => boolean;
}

interface FrontmatterEditorProps {
  frontmatter: BlogSchema;
  onChange: (frontmatter: BlogSchema) => void;
  onCategoriesChange?: (categories: string[]) => void;
}

/**
 * Formats a Date to YYYY-MM-DD HH:mm:ss string
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Parses a date string to Date object
 */
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  // Try parsing with format pattern
  const parsed = parse(dateStr, 'yyyy-MM-dd HH:mm:ss', new Date());
  if (isValid(parsed)) return parsed;
  // Try ISO format
  const iso = new Date(dateStr);
  if (isValid(iso)) return iso;
  return undefined;
}

/**
 * Formats categories array to string
 */
function categoriesToString(categories?: string | string[] | string[][]): string {
  if (!categories) return '';
  if (typeof categories === 'string') return categories;

  // Handle nested array like [['笔记', '前端']]
  const flat = categories.flatMap((c) => (Array.isArray(c) ? c : [c]));
  return flat.join(' > ');
}

/**
 * Parses categories string to array
 */
function stringToCategories(str: string): string[] | undefined {
  if (!str.trim()) return undefined;
  return str
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Formats tags array to string
 */
function tagsToString(tags?: string[]): string {
  if (!tags || tags.length === 0) return '';
  return tags.join(', ');
}

/**
 * Parses tags string to array
 */
function stringToTags(str: string): string[] | undefined {
  if (!str.trim()) return undefined;
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Converts form data back to BlogSchema format
 */
function formDataToFrontmatter(data: FrontmatterFormData): BlogSchema {
  const result: BlogSchema = {
    title: data.title,
    draft: data.draft,
    sticky: data.sticky,
    tocNumbering: data.tocNumbering,
    excludeFromSummary: data.excludeFromSummary,
    math: data.math,
    quiz: data.quiz,
  };

  // Parse dates
  if (data.date) {
    result.date = parseDate(data.date);
  }
  if (data.updated) {
    result.updated = parseDate(data.updated);
  }

  // Parse categories
  const categories = stringToCategories(data.categories || '');
  if (categories && categories.length > 0) {
    // Store as nested array for proper YAML format
    result.categories = [categories];
  }

  // Parse tags
  const tags = stringToTags(data.tags || '');
  if (tags) {
    result.tags = tags;
  }

  // Optional string fields
  if (data.description?.trim()) result.description = data.description.trim();
  if (data.cover?.trim()) result.cover = data.cover.trim();
  if (data.link?.trim()) result.link = data.link.trim();
  if (data.subtitle?.trim()) result.subtitle = data.subtitle.trim();

  return result;
}

/**
 * Input field component
 */
function FormField({
  label,
  id,
  type = 'text',
  placeholder,
  error,
  className,
  ...props
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="font-medium text-muted-foreground text-xs">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className={cn(
          'w-full rounded border border-input bg-background px-2 py-1.5 text-sm',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          error && 'border-destructive',
        )}
        {...props}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

/**
 * Textarea field component
 */
function FormTextarea({
  label,
  id,
  placeholder,
  error,
  className,
  ...props
}: {
  label: string;
  id: string;
  placeholder?: string;
  error?: string;
  className?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="font-medium text-muted-foreground text-xs">
        {label}
      </label>
      <textarea
        id={id}
        placeholder={placeholder}
        className={cn(
          'w-full resize-none rounded border border-input bg-background px-2 py-1.5 text-sm',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          error && 'border-destructive',
        )}
        {...props}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

/**
 * Checkbox field component
 */
function FormCheckbox({
  label,
  id,
  description,
  ...props
}: {
  label: string;
  id: string;
  description?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-start gap-2">
      <input id={id} type="checkbox" className="mt-0.5 size-4 rounded border-input" {...props} />
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm">
          {label}
        </label>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
    </div>
  );
}

export const FrontmatterEditor = forwardRef<FrontmatterEditorRef, FrontmatterEditorProps>(function FrontmatterEditor(
  { frontmatter, onChange, onCategoriesChange },
  ref,
) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<FrontmatterFormData>({
    resolver: zodResolver(frontmatterSchema),
    defaultValues: {
      title: frontmatter.title || '',
      date: formatDate(frontmatter.date),
      updated: formatDate(frontmatter.updated),
      description: frontmatter.description || '',
      categories: categoriesToString(frontmatter.categories),
      tags: tagsToString(frontmatter.tags),
      cover: frontmatter.cover || '',
      link: frontmatter.link || '',
      subtitle: frontmatter.subtitle || '',
      draft: frontmatter.draft ?? true,
      sticky: frontmatter.sticky ?? false,
      tocNumbering: frontmatter.tocNumbering ?? true,
      excludeFromSummary: frontmatter.excludeFromSummary ?? false,
      math: frontmatter.math ?? false,
      quiz: frontmatter.quiz ?? false,
    },
  });

  const {
    register,
    watch,
    formState: { errors, isDirty },
  } = form;

  // Expose form methods via ref
  useImperativeHandle(ref, () => ({
    getFormData: () => form.getValues(),
    isDirty: () => isDirty,
  }));

  // Watch for changes and notify parent
  useEffect(() => {
    const subscription = watch((values) => {
      const fm = formDataToFrontmatter(values as FrontmatterFormData);
      onChange(fm);

      // Notify about categories change for new category detection
      if (onCategoriesChange) {
        const cats = stringToCategories(values.categories || '');
        onCategoriesChange(cats || []);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange, onCategoriesChange]);

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-sm">文章属性</h3>

      {/* Basic Fields */}
      <div className="space-y-3">
        <FormField label="标题" id="title" placeholder="文章标题" error={errors.title?.message} {...register('title')} />

        <div className="grid grid-cols-2 gap-2">
          <FormField
            label="发布日期"
            id="date"
            placeholder="年-月-日 时:分:秒"
            error={errors.date?.message}
            {...register('date')}
          />
          <FormField
            label="更新时间"
            id="updated"
            placeholder="年-月-日 时:分:秒"
            error={errors.updated?.message}
            {...register('updated')}
          />
        </div>

        <FormTextarea
          label="文章简介"
          id="description"
          placeholder="请输入文章简介…"
          rows={2}
          error={errors.description?.message}
          {...register('description')}
        />

        <FormField
          label="分类"
          id="categories"
          placeholder="笔记 > 前端 > React"
          error={errors.categories?.message}
          {...register('categories')}
        />

        <FormField label="标签" id="tags" placeholder="多个标签用逗号分隔" error={errors.tags?.message} {...register('tags')} />

        <FormField
          label="封面图片"
          id="cover"
          placeholder="https://example.com/image.jpg"
          error={errors.cover?.message}
          {...register('cover')}
        />

        <FormField
          label="外部链接"
          id="link"
          placeholder="https://example.com"
          error={errors.link?.message}
          {...register('link')}
        />
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
      >
        <span className="font-medium">更多设置</span>
        <Icon icon={showAdvanced ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'} className="size-5 text-muted-foreground" />
      </button>

      {/* Advanced Fields */}
      {showAdvanced && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <FormField
            label="副标题"
            id="subtitle"
            placeholder="文章副标题"
            error={errors.subtitle?.message}
            {...register('subtitle')}
          />

          <div className="space-y-2">
            <FormCheckbox label="草稿" id="draft" description="不在已发布文章中显示" {...register('draft')} />

            <FormCheckbox label="置顶" id="sticky" description="在文章列表顶部显示" {...register('sticky')} />

            <FormCheckbox label="目录编号" id="tocNumbering" description="为文章标题添加编号" {...register('tocNumbering')} />

            <FormCheckbox
              label="不参与 AI 摘要"
              id="excludeFromSummary"
              description="跳过 AI 摘要生成"
              {...register('excludeFromSummary')}
            />

            <FormCheckbox label="数学公式（KaTeX）" id="math" description="启用数学公式渲染" {...register('math')} />

            <FormCheckbox label="答题模式" id="quiz" description="启用答题交互" {...register('quiz')} />
          </div>
        </div>
      )}
    </div>
  );
});
