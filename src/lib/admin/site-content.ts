import type { PublicSiteContent } from '../public-api/types';
import { type AdminApiResult, adminRequest, adminRequestWithMessage } from './api';

export type AdminSiteContent = PublicSiteContent;

export function getAdminSiteContent(): Promise<AdminSiteContent> {
  return adminRequest<AdminSiteContent>('/site-content');
}

export function saveAdminSiteContent(content: AdminSiteContent): Promise<AdminApiResult<AdminSiteContent>> {
  return adminRequestWithMessage<AdminSiteContent>('/site-content', { method: 'PUT', body: content });
}
