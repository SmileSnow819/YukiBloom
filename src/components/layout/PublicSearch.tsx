import { encodeSlug } from '@lib/route';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { localizedPath } from '@/i18n';

interface SearchResult {
  locale: string;
  slug: string;
  title: string;
  description: string;
  publishedAt?: string;
}

interface SearchResponse {
  items: SearchResult[];
  total: number;
}

export default function PublicSearch() {
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults([]);
      setTotal(0);
      setFailed(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({ locale, q: value });
        const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search request failed');
        const data = (await response.json()) as SearchResponse;
        setResults(data.items);
        setTotal(data.total);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setTotal(0);
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locale, query]);

  return (
    <div id="search-for-dialog" className="public-search">
      <label className="sr-only" htmlFor="public-search-input">
        {t('search.label')}
      </label>
      <input
        id="public-search-input"
        className="pagefind-ui__search-input public-search-input w-full rounded-lg border border-foreground/15 bg-background/60 px-4 py-3 text-foreground outline-none focus:border-primary"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('search.placeholder')}
        autoComplete="off"
      />
      {loading && <p className="py-5 text-muted-foreground text-sm">{t('search.searching').replace('[SEARCH_TERM]', query)}</p>}
      {failed && <p className="py-5 text-destructive text-sm">{t('search.noResults')}</p>}
      {!loading && !failed && query.trim() && results.length === 0 && (
        <p className="py-5 text-muted-foreground text-sm">{t('search.noResults')}</p>
      )}
      {results.length > 0 && (
        <div className="pagefind-ui__results mt-3 flex flex-col gap-2">
          {results.map((result) => (
            <a
              key={`${result.locale}:${result.slug}`}
              className="pagefind-ui__result rounded-lg px-3 py-3 transition-colors hover:bg-foreground/5"
              href={localizedPath(`/post/${encodeSlug(result.slug)}`, locale)}
            >
              <span className="pagefind-ui__result-link block font-medium text-primary">{result.title}</span>
              {result.description && (
                <span className="mt-1 line-clamp-2 block text-muted-foreground text-sm">{result.description}</span>
              )}
            </a>
          ))}
          {total > results.length && (
            <p className="px-3 py-2 text-muted-foreground text-xs">
              {t('search.manyResults').replace('[COUNT]', String(total))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
