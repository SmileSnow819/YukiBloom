import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getManagedCategoryNames } from '@/lib/admin/category-settings';
import { getAdminSiteContent } from '@/lib/admin/site-content';

export function useAvailableCategories(open: boolean, categoriesInUse: string[]): string[] {
  const [categories, setCategories] = useState(categoriesInUse);
  const categoriesKey = categoriesInUse.join('\u0000');

  useEffect(() => {
    const existingCategories = categoriesKey ? categoriesKey.split('\u0000') : [];
    setCategories(existingCategories);
    if (!open) return;

    let cancelled = false;
    void getAdminSiteContent()
      .then((content) => {
        if (!cancelled) setCategories(getManagedCategoryNames(existingCategories, content.categories));
      })
      .catch((cause: unknown) => {
        if (!cancelled) toast.error(cause instanceof Error ? cause.message : '读取分类列表失败');
      });

    return () => {
      cancelled = true;
    };
  }, [open, categoriesKey]);

  return categories;
}
