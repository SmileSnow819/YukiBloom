// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PostImageDownload from './PostImageDownload';

const { download, toDataURL } = vi.hoisted(() => ({
  download: vi.fn(),
  toDataURL: vi.fn(),
}));

vi.mock('@zumer/snapdom', () => ({ snapdom: { download } }));
vi.mock('qrcode', () => ({ toDataURL }));

describe('PostImageDownload', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    download.mockReset();
    toDataURL.mockReset();
  });

  it('downloads a complete poster assembled from the rendered article', async () => {
    const article = document.createElement('article');
    article.dataset.pagefindBody = '';
    article.innerHTML = '<h2>正文标题</h2><p>完整正文内容</p>';
    document.body.append(article);
    toDataURL.mockResolvedValue('data:image/png;base64,qr-code');

    let capturedPoster: Element | undefined;
    download.mockImplementation(async (element: Element) => {
      capturedPoster = element;
    });

    render(
      <PostImageDownload
        coverUrl="https://example.com/cover.png"
        date="2026-09-13"
        description="这是文章摘要。"
        siteName="YukiBloom"
        title="一篇测试文章"
        url="https://yuki.example/post/test"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '下载帖子长图' }));

    await waitFor(() => {
      expect(capturedPoster).toBeDefined();
    });

    expect(capturedPoster?.querySelector('[data-post-image-title]')?.textContent).toBe('一篇测试文章');
    expect(capturedPoster?.querySelector('[data-post-image-body]')?.textContent).toContain('完整正文内容');
    expect(capturedPoster?.querySelector('[data-post-image-qr]')?.getAttribute('src')).toBe('data:image/png;base64,qr-code');
    expect(document.body.querySelector('[data-post-image-document]')).not.toBeInTheDocument();
  });
});
