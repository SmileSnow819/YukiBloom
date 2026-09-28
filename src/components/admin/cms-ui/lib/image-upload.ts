const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateImageUpload(file: Pick<Blob, 'type' | 'size'>): string | null {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) return '仅支持 JPG、PNG 或 WebP 图片';
  if (file.size > MAX_IMAGE_SIZE) return '图片不能超过 10 MiB';
  return null;
}
