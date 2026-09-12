import { useState } from 'react';
import { RiDownload2Line } from 'react-icons/ri';
import { Button } from '@/components/ui/button';
import { createPostImageDocument } from './post-image-document';

interface PostImageDownloadProps {
  coverUrl?: string;
  date?: string;
  description: string;
  siteName: string;
  title: string;
  url: string;
}

function createFilename(title: string) {
  const safeTitle = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-');

  return safeTitle || 'post-image';
}

async function waitForPosterResources(poster: HTMLElement) {
  await document.fonts?.ready;

  await Promise.all(
    Array.from(poster.querySelectorAll('img')).map(async (image) => {
      if (typeof image.decode === 'function') await image.decode().catch(() => undefined);
    }),
  );
}

function PostImageDownload({ coverUrl, date, description, siteName, title, url }: PostImageDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    const article = document.querySelector<HTMLElement>('article[data-pagefind-body]');
    if (!article) {
      setError('未找到文章内容，暂时无法生成长图。');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const [{ snapdom }, { toDataURL }] = await Promise.all([import('@zumer/snapdom'), import('qrcode')]);
      const qrCodeUrl = await toDataURL(url, {
        color: { dark: '#24292f', light: '#ffffff' },
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 300,
      });
      const poster = createPostImageDocument({ article, coverUrl, date, description, qrCodeUrl, siteName, title, url });

      Object.assign(poster.style, {
        left: '-100000px',
        position: 'fixed',
        top: '0',
        zIndex: '-1',
      });
      document.body.append(poster);

      try {
        await waitForPosterResources(poster);
        await snapdom.download(poster, {
          backgroundColor: '#ffffff',
          embedFonts: true,
          filename: createFilename(title),
          format: 'png',
          reconcile: true,
          scale: 2,
        });
      } finally {
        poster.remove();
      }
    } catch (caughtError) {
      console.error('Failed to generate post image', caughtError);
      setError('长图生成失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="not-prose mt-10 flex flex-col items-start gap-2 border-border/60 border-t pt-6">
      <Button type="button" variant="gradient-shoka" onClick={handleDownload} disabled={isGenerating}>
        <RiDownload2Line className="mr-2 size-4" aria-hidden="true" />
        {isGenerating ? '正在生成长图…' : '下载帖子长图'}
      </Button>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default PostImageDownload;
