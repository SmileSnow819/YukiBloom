import { getSecret } from 'astro:env/server';
import { getCachedPublicApiRequest } from './request-cache';
import type {
  PublicFootprints,
  PublicPage,
  PublicPost,
  PublicPostPage,
  PublicPostQuery,
  PublicPostSummary,
  PublicSiteContent,
} from './types';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_POST_LIMIT = 100;

type PublicApiErrorKind = 'configuration' | 'timeout' | 'network' | 'backend' | 'response';

export class PublicApiError extends Error {
  constructor(
    message: string,
    public readonly kind: PublicApiErrorKind,
    public readonly status?: number,
    public readonly code?: number,
  ) {
    super(message);
    this.name = 'PublicApiError';
  }
}

/** A missing or unpublished public post/page; routes can convert this to an Astro 404. */
export class PublicApiNotFoundError extends PublicApiError {
  constructor(message: string, code?: number) {
    super(message, 'backend', 404, code);
    this.name = 'PublicApiNotFoundError';
  }
}

interface ApiEnvelope<T> {
  code: number;
  message?: string;
  data: T;
}

function getBaseUrl(): URL {
  if (!import.meta.env.SSR) {
    throw new PublicApiError('公开内容 API 仅可在服务端调用。', 'configuration');
  }
  const configured = getSecret('BACKEND_API_URL') ?? process.env.BACKEND_API_URL;
  if (!configured) {
    throw new PublicApiError('未配置 BACKEND_API_URL。', 'configuration');
  }
  try {
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
    return url;
  } catch {
    throw new PublicApiError('BACKEND_API_URL 必须是 HTTP(S) 地址。', 'configuration');
  }
}

async function publicRequest<T>(path: string, query?: URLSearchParams): Promise<T> {
  const url = new URL(`/api/v1${path}`, getBaseUrl());
  if (query) url.search = query.toString();

  return getCachedPublicApiRequest(url.href, async () => {
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        signal,
      });
    } catch {
      if (signal.aborted) throw new PublicApiError('公开内容 API 请求超时。', 'timeout');
      throw new PublicApiError('无法连接公开内容 API。', 'network');
    }

    let envelope: ApiEnvelope<T>;
    try {
      envelope = (await response.json()) as ApiEnvelope<T>;
    } catch (error) {
      if (signal.aborted) throw new PublicApiError('公开内容 API 请求超时。', 'timeout');
      if (error instanceof SyntaxError) throw new PublicApiError('公开内容 API 返回了无效 JSON。', 'response', response.status);
      throw new PublicApiError('无法读取公开内容 API 响应。', 'network', response.status);
    }
    const code = typeof envelope?.code === 'number' ? envelope.code : undefined;
    const message =
      typeof envelope?.message === 'string' && envelope.message ? envelope.message : `请求失败（HTTP ${response.status}）`;

    if (response.status === 404 || code === 10004) throw new PublicApiNotFoundError(message, code);
    if (response.ok && code === undefined)
      throw new PublicApiError('公开内容 API 返回了无效响应。', 'response', response.status);
    if (!response.ok || code !== 0) throw new PublicApiError(message, 'backend', response.status, code);
    if (envelope?.data === undefined || envelope.data === null) {
      throw new PublicApiError('公开内容 API 返回的数据为空。', 'response', response.status, code);
    }
    return envelope.data;
  });
}

function postQuery(query: PublicPostQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.locale !== undefined) params.set('locale', toApiLocale(query.locale));
  for (const key of ['category', 'tag', 'q'] as const) {
    if (query[key] !== undefined) params.set(key, query[key]);
  }
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(Math.min(query.limit, MAX_POST_LIMIT)));
  return params;
}

export function getPublicPosts(query: PublicPostQuery = {}): Promise<PublicPostPage> {
  return publicRequest<PublicPostPage>('/posts', postQuery(query)).then((page) => ({
    ...page,
    items: page.items.map(normalizePostLocale),
  }));
}

/** Walk every list page at the backend's maximum page size. List bodies are empty. */
export async function getAllPublicPosts(query: Omit<PublicPostQuery, 'page' | 'limit'> = {}): Promise<PublicPostSummary[]> {
  const posts: PublicPostSummary[] = [];
  for (let page = 1; ; page += 1) {
    const result = await getPublicPosts({ ...query, page, limit: MAX_POST_LIMIT });
    if (!Array.isArray(result.items) || !Number.isInteger(result.total) || result.total < 0) {
      throw new PublicApiError('公开文章分页数据无效。', 'response');
    }
    posts.push(...result.items);
    if (posts.length >= result.total) return posts;
    if (result.items.length === 0) throw new PublicApiError('公开文章分页提前结束。', 'response');
  }
}

function localeQuery(locale: string): URLSearchParams {
  return new URLSearchParams({ locale: toApiLocale(locale) });
}

/** Map the site's short Chinese locale to the backend's stored BCP 47 locale. */
function toApiLocale(locale: string): string {
  return locale.toLowerCase() === 'zh' ? 'zh-CN' : locale;
}

/** Map the backend's stored locale back to the site's locale used by routes and UI. */
function toSiteLocale(locale: string): string {
  return locale.toLowerCase() === 'zh-cn' ? 'zh' : locale;
}

function normalizePostLocale<T extends { locale: string }>(post: T): T {
  return { ...post, locale: toSiteLocale(post.locale) };
}

export function getPublicPost(slug: string, locale: string): Promise<PublicPost> {
  return publicRequest<PublicPost>(`/posts/${encodeURIComponent(slug)}`, localeQuery(locale)).then(normalizePostLocale);
}

export function getPublicPage(slug: string, locale: string): Promise<PublicPage> {
  return publicRequest<PublicPage>(`/pages/${encodeURIComponent(slug)}`, localeQuery(locale)).then(normalizePostLocale);
}

export function getPublicFootprints(): Promise<PublicFootprints> {
  return publicRequest<PublicFootprints>('/footprints');
}

export function getPublicSiteContent(): Promise<PublicSiteContent> {
  return publicRequest<PublicSiteContent>('/site-content');
}
