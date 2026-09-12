export interface PostImageDocumentOptions {
  article: HTMLElement;
  coverUrl?: string;
  date?: string;
  description: string;
  qrCodeUrl: string;
  siteName: string;
  title: string;
  url: string;
}

const POSTER_WIDTH = '1080px';

function setStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  Object.assign(element.style, styles);
  return element;
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  text: string,
  styles?: Partial<CSSStyleDeclaration>,
) {
  const element = document.createElement(tagName);
  element.textContent = text;
  return styles ? setStyles(element, styles) : element;
}

function cloneArticleForPoster(article: HTMLElement) {
  const clone = article.cloneNode(true) as HTMLElement;

  clone.removeAttribute('data-pagefind-body');
  clone.setAttribute('data-post-image-body', '');
  clone.querySelectorAll('button, script, iframe, video, audio').forEach((element) => {
    element.remove();
  });
  clone.querySelectorAll('img').forEach((image) => {
    image.loading = 'eager';
  });

  return setStyles(clone, {
    color: '#24292f',
    fontSize: '30px',
    lineHeight: '1.9',
    margin: '0',
    maxWidth: 'none',
    padding: '0 72px',
  });
}

export function createPostImageDocument({
  article,
  coverUrl,
  date,
  description,
  qrCodeUrl,
  siteName,
  title,
  url,
}: PostImageDocumentOptions) {
  const poster = setStyles(document.createElement('section'), {
    background: '#ffffff',
    boxSizing: 'border-box',
    color: '#24292f',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    width: POSTER_WIDTH,
  });
  poster.setAttribute('data-post-image-document', '');

  const header = setStyles(document.createElement('header'), {
    background: 'linear-gradient(135deg, #fff1f5 0%, #fff8ed 100%)',
    boxSizing: 'border-box',
    padding: '64px 72px 56px',
  });

  if (coverUrl) {
    const cover = document.createElement('img');
    cover.alt = '';
    cover.loading = 'eager';
    cover.src = coverUrl;
    cover.setAttribute('data-post-image-cover', '');
    setStyles(cover, {
      borderRadius: '24px',
      display: 'block',
      height: '420px',
      marginBottom: '44px',
      objectFit: 'cover',
      width: '100%',
    });
    header.append(cover);
  }

  header.append(
    createTextElement('p', siteName, {
      color: '#c55b82',
      fontSize: '25px',
      fontWeight: '700',
      letterSpacing: '0.08em',
      margin: '0 0 20px',
      textTransform: 'uppercase',
    }),
  );

  const titleElement = createTextElement('h1', title, {
    fontSize: '56px',
    letterSpacing: '-0.03em',
    lineHeight: '1.25',
    margin: '0',
  });
  titleElement.setAttribute('data-post-image-title', '');
  header.append(titleElement);

  if (date) {
    header.append(
      createTextElement('time', date, {
        color: '#6b7280',
        display: 'block',
        fontSize: '24px',
        marginTop: '24px',
      }),
    );
  }

  const summary = createTextElement('p', description, {
    color: '#4b5563',
    fontSize: '29px',
    lineHeight: '1.7',
    margin: '32px 0 0',
  });
  summary.setAttribute('data-post-image-summary', '');
  header.append(summary);

  const body = cloneArticleForPoster(article);
  setStyles(body, { paddingTop: '60px' });

  const footer = setStyles(document.createElement('footer'), {
    alignItems: 'center',
    background: '#fff8ed',
    boxSizing: 'border-box',
    display: 'flex',
    gap: '32px',
    marginTop: '72px',
    padding: '48px 72px',
  });
  const urlElement = createTextElement('span', url, {
    color: '#4b5563',
    fontSize: '22px',
    lineHeight: '1.5',
    overflowWrap: 'anywhere',
  });
  urlElement.setAttribute('data-post-image-url', '');

  const qrCode = document.createElement('img');
  qrCode.alt = `扫码阅读：${title}`;
  qrCode.src = qrCodeUrl;
  qrCode.setAttribute('data-post-image-qr', '');
  setStyles(qrCode, {
    background: '#ffffff',
    borderRadius: '12px',
    height: '152px',
    marginLeft: 'auto',
    padding: '10px',
    width: '152px',
  });

  footer.append(urlElement, qrCode);
  poster.append(header, body, footer);

  return poster;
}
