import type { PublicTimeline } from '../public-api/types';
import { type AdminApiResult, adminRequestWithMessage } from './api';
import { publicAdminContentRequest } from './public-request';

export type TimelineContent = PublicTimeline;

export function getAdminTimeline(): Promise<TimelineContent> {
  return publicAdminContentRequest<TimelineContent>('/timeline');
}

export function saveAdminTimeline(timeline: TimelineContent): Promise<AdminApiResult<TimelineContent>> {
  return adminRequestWithMessage<TimelineContent>('/timeline', { method: 'PUT', body: timeline });
}
