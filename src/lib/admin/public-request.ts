const base = (import.meta.env.PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

export async function publicAdminContentRequest<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1${path}`, { headers: { Accept: 'application/json' }, credentials: 'omit' });
  } catch {
    throw new Error('无法连接公开内容 API，请检查服务地址与网络。');
  }
  const envelope = (await response.json().catch(() => null)) as { code?: number; data?: T; message?: string } | null;
  if (!response.ok || envelope?.code !== 0 || envelope.data === undefined) {
    throw new Error(envelope?.message || `读取公开内容失败（HTTP ${response.status}）`);
  }
  return envelope.data;
}
