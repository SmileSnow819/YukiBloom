import type { PublicSiteContent } from '../public-api/types';
import { adminRequest } from './api';

export type AdminSiteContent = PublicSiteContent;

export function getAdminSiteContent(): Promise<AdminSiteContent> {
  return adminRequest<AdminSiteContent>('/site-content');
}

export function saveAdminSiteContent(content: AdminSiteContent): Promise<AdminSiteContent> {
  return adminRequest<AdminSiteContent>('/site-content', { method: 'PUT', body: content });
}
