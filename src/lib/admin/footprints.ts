import type { PublicFootprints } from '../public-api/types';
import { adminRequest } from './api';
import { publicAdminContentRequest } from './public-request';

export type FootprintsContent = PublicFootprints;

export function getAdminFootprints(): Promise<FootprintsContent> {
  return publicAdminContentRequest<FootprintsContent>('/footprints');
}

export function saveAdminFootprints(footprints: FootprintsContent): Promise<FootprintsContent> {
  return adminRequest<FootprintsContent>('/footprints', { method: 'PUT', body: footprints });
}
