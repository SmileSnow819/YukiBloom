import type { PublicSiteContent } from './types';

export function getPublicSeriesField(
  content: PublicSiteContent,
  locale: string,
  slug: string,
  field: 'label' | 'fullName' | 'description',
): string | undefined {
  const translation = content.translations.find(
    (item) => item.locale === locale && item.entityType === 'series' && item.entityKey === slug,
  );
  return translation?.[field];
}

export function getPublicCategoryField(
  content: PublicSiteContent,
  locale: string,
  slug: string,
  field: 'label' | 'description',
): string | undefined {
  const translation = content.translations.find(
    (item) => item.locale === locale && item.entityType === 'categories' && item.entityKey === slug,
  );
  return translation?.[field];
}
