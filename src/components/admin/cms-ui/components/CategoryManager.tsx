import { Button } from '@admin-ui/components/ui/button';
import { generateCategorySlug } from '@admin-ui/lib/category';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getManagedCategoryNames, upsertCategoryMapping } from '@/lib/admin/category-settings';
import { moveItem } from '@/lib/admin/ordered-list';
import { type AdminSiteContent, getAdminSiteContent, saveAdminSiteContent } from '@/lib/admin/site-content';
import type { PublicFeaturedCategory } from '@/lib/public-api/types';

const emptyFeaturedCategory = (): PublicFeaturedCategory => ({
  label: '',
  description: '',
  image: '',
  link: '',
  enabled: true,
});

export function CategoryManager({ categories }: { categories: string[] }) {
  const [content, setContent] = useState<AdminSiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const categoryNames = useMemo(
    () => (content ? getManagedCategoryNames(categories, content.categoryMappings) : categories),
    [categories, content],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setContent(await getAdminSiteContent());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取站点分类配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function updateMapping(name: string, slug: string) {
    setContent((current) =>
      current ? { ...current, categoryMappings: upsertCategoryMapping(current.categoryMappings, name, slug) } : current,
    );
  }

  function updateFeatured(index: number, changes: Partial<PublicFeaturedCategory>) {
    setContent((current) =>
      current
        ? {
            ...current,
            featuredCategories: current.featuredCategories.map((category, categoryIndex) =>
              categoryIndex === index ? { ...category, ...changes } : category,
            ),
          }
        : current,
    );
  }

  async function save() {
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
      toast.success('分类配置已保存');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存分类配置失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ManagerMessage>正在读取分类配置…</ManagerMessage>;
  if (error) return <ManagerError message={error} onRetry={reload} />;
  if (!content) return null;

  return (
    <section className="space-y-8" aria-label="分类配置管理">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">分类配置</h3>
          <p className="text-muted-foreground text-sm">分类名来自文章；这里维护分类链接标识和首页精选分类。</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存分类配置'}
        </Button>
      </div>

      <section className="space-y-4">
        <div className="border-border border-b pb-2">
          <h4 className="font-semibold">
            分类链接映射 <span className="font-normal text-muted-foreground">({categoryNames.length})</span>
          </h4>
          <p className="mt-1 text-muted-foreground text-sm">新分类请先在文章编辑器中使用，之后会出现在这里。</p>
        </div>
        {categoryNames.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">还没有文章分类</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {categoryNames.map((name) => {
              const mapping = content.categoryMappings.find((entry) => entry.name === name);
              const slug = mapping?.slug || generateCategorySlug(name);
              return (
                <div
                  key={name}
                  className="grid gap-2 border-border border-b p-4 last:border-b-0 sm:grid-cols-[minmax(120px,1fr)_minmax(180px,2fr)] sm:items-center"
                >
                  <label className="font-medium text-sm" htmlFor={`category-${name}`}>
                    {name}
                  </label>
                  <input
                    id={`category-${name}`}
                    value={slug}
                    onChange={(event) => updateMapping(name, event.target.value)}
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b pb-2">
          <div>
            <h4 className="font-semibold">
              首页精选分类 <span className="font-normal text-muted-foreground">({content.featuredCategories.length})</span>
            </h4>
            <p className="mt-1 text-muted-foreground text-sm">这些卡片展示在首页精选分类区域。</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setContent({ ...content, featuredCategories: [...content.featuredCategories, emptyFeaturedCategory()] })
            }
          >
            新增精选分类
          </Button>
        </div>
        {content.featuredCategories.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">暂无精选分类</div>
        )}
        <div className="grid gap-4 xl:grid-cols-2">
          {content.featuredCategories.map((category, index) => (
            <article key={`${category.label}-${index}`} className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h5 className="font-medium">{category.label || `精选分类 ${index + 1}`}</h5>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={index === 0}
                    onClick={() =>
                      setContent({ ...content, featuredCategories: moveItem(content.featuredCategories, index, index - 1) })
                    }
                  >
                    上移
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={index === content.featuredCategories.length - 1}
                    onClick={() =>
                      setContent({ ...content, featuredCategories: moveItem(content.featuredCategories, index, index + 1) })
                    }
                  >
                    下移
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setContent({
                        ...content,
                        featuredCategories: content.featuredCategories.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                  >
                    删除
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="显示名称"
                  value={category.label}
                  onChange={(label) => updateFeatured(index, { label })}
                  required
                />
                <Field
                  label="分类链接"
                  value={category.link}
                  onChange={(link) => updateFeatured(index, { link })}
                  placeholder="/categories/front-end"
                  required
                />
                <Field
                  label="图片 URL"
                  value={category.image}
                  onChange={(image) => updateFeatured(index, { image })}
                  placeholder="/img/categories/front-end.jpg"
                />
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={category.enabled}
                    onChange={(event) => updateFeatured(index, { enabled: event.target.checked })}
                  />
                  在首页展示
                </label>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">简介</span>
                <textarea
                  value={category.description}
                  onChange={(event) => updateFeatured(index, { description: event.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                />
              </label>
              {category.image && (
                <img
                  src={category.image}
                  alt=""
                  className="h-32 w-full rounded-lg border border-border object-cover"
                  loading="lazy"
                />
              )}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
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
