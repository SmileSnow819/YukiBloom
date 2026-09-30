export type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export interface AdminApiResult<T> {
  data: T;
  message: string;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
  ) {
    super(message);
  }
}

let csrfToken = '';

export function setCsrfToken(token: string) {
  csrfToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem('yb-admin-csrf', token);
    else localStorage.removeItem('yb-admin-csrf');
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('yb-admin-csrf');
  }
}

export function getCsrfToken() {
  if (!csrfToken && typeof localStorage !== 'undefined') csrfToken = localStorage.getItem('yb-admin-csrf') || '';
  if (!csrfToken && typeof sessionStorage !== 'undefined') {
    csrfToken = sessionStorage.getItem('yb-admin-csrf') || '';
    if (csrfToken && typeof localStorage !== 'undefined') localStorage.setItem('yb-admin-csrf', csrfToken);
    sessionStorage.removeItem('yb-admin-csrf');
  }
  return csrfToken;
}

const base = (import.meta.env?.PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

async function requestAdminResult<T>(path: string, options: ApiOptions = {}): Promise<AdminApiResult<T>> {
  const { body, ...rest } = options;
  const headers = new Headers(options.headers);
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers.set('Content-Type', 'application/json');
  if (options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase()) && getCsrfToken()) {
    headers.set('X-CSRF-Token', getCsrfToken());
  }
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/admin${path}`, {
      ...rest,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      headers,
      credentials: 'include',
    });
  } catch {
    throw new AdminApiError('无法连接 API 服务，请检查服务地址与网络。', 0);
  }
  const envelope = (await response.json().catch(() => null)) as { code?: number; data?: T; message?: string } | null;
  if (!response.ok || envelope?.code !== 0) {
    throw new AdminApiError(envelope?.message || `请求失败（HTTP ${response.status}）`, response.status, envelope?.code);
  }
  return { data: envelope.data as T, message: envelope.message || '' };
}

export async function adminRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  return (await requestAdminResult<T>(path, options)).data;
}

export async function adminRequestWithMessage<T>(path: string, options: ApiOptions = {}): Promise<AdminApiResult<T>> {
  return requestAdminResult<T>(path, options);
}

export type Post = {
  id: string;
  locale: string;
  slug: string;
  title: string;
  description: string;
  bodyMarkdown: string;
  status: string;
  displayDate?: string;
  updatedAt: string;
  version: number;
  categories: string[];
  tags: string[];
  extra?: Record<string, unknown>;
  coverMediaId?: string | null;
};
export type PostInput = Omit<Post, 'id' | 'status' | 'updatedAt'>;
export type Page = {
  id: string;
  locale: string;
  slug: string;
  title: string;
  description: string;
  bodyMarkdown: string;
  status: string;
  updatedAt: string;
  version: number;
};
export type Media = { id: string; url: string; width: number; height: number; sizeBytes: number; createdAt: string };
export type Paged<T> = { items: T[]; page: number; limit: number; total: number };

export async function uploadAdminMedia(file: File): Promise<Media> {
  const body = new FormData();
  body.set('file', file);
  return await adminRequest<Media>('/media', { method: 'POST', body });
}
