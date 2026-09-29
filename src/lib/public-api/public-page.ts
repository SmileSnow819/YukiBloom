import { defaultLocale } from '@/i18n/config';
import { getPublicPage, PublicApiNotFoundError } from './api';
import type { PublicPage } from './types';

export async function getLocalizedPublicPage(slug: string, locale: string): Promise<PublicPage | undefined> {
  try {
    return await getPublicPage(slug, locale);
  } catch (error) {
    if (!(error instanceof PublicApiNotFoundError) || locale === defaultLocale) throw error;
  }

  try {
    return await getPublicPage(slug, defaultLocale);
  } catch (error) {
    if (error instanceof PublicApiNotFoundError) return undefined;
    throw error;
  }
}
