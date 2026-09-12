// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createPostImageDocument } from './post-image-document';

describe('createPostImageDocument', () => {
  it('builds a standalone poster with post metadata, full article content, and a QR destination', () => {
    const article = document.createElement('article');
    article.innerHTML = '<h2>正文标题</h2><p>完整正文内容</p><pre><code>const answer = 42;</code></pre>';

    const poster = createPostImageDocument({
      article,
      coverUrl: 'https://example.com/cover.png',
      date: '2026-09-13',
      description: '这是文章摘要。',
      qrCodeUrl: 'data:image/png;base64,qr-code',
      siteName: 'YukiBloom',
      title: '一篇测试文章',
      url: 'https://yuki.example/post/test',
    });

    expect(poster.querySelector('[data-post-image-title]')?.textContent).toBe('一篇测试文章');
    expect(poster.querySelector('[data-post-image-summary]')?.textContent).toBe('这是文章摘要。');
    expect(poster.querySelector('[data-post-image-cover]')?.getAttribute('src')).toBe('https://example.com/cover.png');
    expect(poster.querySelector('[data-post-image-body]')?.textContent).toContain('完整正文内容');
    expect(poster.querySelector('[data-post-image-body] code')?.textContent).toBe('const answer = 42;');
    expect(poster.querySelector('[data-post-image-url]')?.textContent).toBe('https://yuki.example/post/test');
    expect(poster.querySelector('[data-post-image-qr]')?.getAttribute('src')).toBe('data:image/png;base64,qr-code');
  });
});
