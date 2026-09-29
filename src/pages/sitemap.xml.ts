import type { APIRoute } from 'astro';
import { createPublicSitemap } from '@/lib/public-api';

export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('Missing site metadata');
  return new Response(await createPublicSitemap(site), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
