import type { PublicFootprints } from '../public-api/types';
import { type AdminApiResult, adminRequestWithMessage } from './api';
import { publicAdminContentRequest } from './public-request';

export type FootprintsContent = PublicFootprints;

export function getAdminFootprints(): Promise<FootprintsContent> {
  return publicAdminContentRequest<FootprintsContent>('/footprints');
}

export function saveAdminFootprints(footprints: FootprintsContent): Promise<AdminApiResult<FootprintsContent>> {
  return adminRequestWithMessage<FootprintsContent>('/footprints', { method: 'PUT', body: footprints });
}
