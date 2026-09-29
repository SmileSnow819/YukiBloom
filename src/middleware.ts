import { defineMiddleware } from 'astro:middleware';
import { withPublicApiRequestCache } from '@/lib/public-api/request-cache';

export const onRequest = defineMiddleware((_context, next) => withPublicApiRequestCache(next));
