/**
 * Tag-related utility functions
 */

import { encodeSlug } from '../route';

/**
 * Build tag URL path, eg. C# -> /tags/c%23
 * @param tag Tag name
 * @returns URL path like "/tags/c%23"
 */
export const buildTagPath = (tag: string) => `/tags/${encodeSlug(tag.toLowerCase().replace(/\//g, '-'))}`;
