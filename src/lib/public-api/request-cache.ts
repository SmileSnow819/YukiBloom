import { AsyncLocalStorage } from 'node:async_hooks';

type RequestCache = Map<string, Promise<unknown>>;

const publicApiRequestCache = new AsyncLocalStorage<RequestCache>();

export function withPublicApiRequestCache<T>(callback: () => T): T {
  return publicApiRequestCache.run(new Map(), callback);
}

export function getCachedPublicApiRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  const cache = publicApiRequestCache.getStore();
  if (!cache) return request();

  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const pending = request();
  cache.set(key, pending);
  return pending;
}
