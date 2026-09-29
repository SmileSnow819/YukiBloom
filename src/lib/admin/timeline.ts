import type { PublicTimeline } from '../public-api/types';
import { adminRequest } from './api';
import { publicAdminContentRequest } from './public-request';

export type TimelineContent = PublicTimeline;

export function getAdminTimeline(): Promise<TimelineContent> {
  return publicAdminContentRequest<TimelineContent>('/timeline');
}

export function saveAdminTimeline(timeline: TimelineContent): Promise<TimelineContent> {
  return adminRequest<TimelineContent>('/timeline', { method: 'PUT', body: timeline });
}
