import readingTime from 'reading-time';

const readingTimeCache = new WeakMap<object, { words: number; text: string; minutes: number }>();

/** Calculate article word count and reading time without depending on the content collection. */
export function getPostReadingTime(post: { body?: string }): { words: number; text: string; minutes: number } {
  let cached = readingTimeCache.get(post);
  if (!cached) {
    const result = readingTime(post.body ?? '');
    cached = { words: result.words, text: result.text, minutes: result.minutes };
    readingTimeCache.set(post, cached);
  }
  return cached;
}
