import fs from 'node:fs';
import path from 'node:path';
import node from '@astrojs/node';
import react from '@astrojs/react';
import yaml from '@rollup/plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
import umami from '@yeskunall/astro-umami';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mermaid from 'astro-mermaid';
import pagefind from 'astro-pagefind';
import robotsTxt from 'astro-robots-txt';
import Sonda from 'sonda/astro';
import { loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import YAML from 'yaml';
import { createMarkdownOptions } from './src/lib/markdown/markdown-options.ts';
import { normalizeUrl } from './src/lib/utils.ts';

// Load YAML config directly with Node.js (before Vite plugins are available)
// This is only used in astro.config.mjs - other files use @rollup/plugin-yaml
function loadConfigForAstro() {
  const configPath = path.join(process.cwd(), 'config', 'site.yaml');
  const content = fs.readFileSync(configPath, 'utf8');
  return YAML.parse(content);
}

const yamlConfig = loadConfigForAstro();

// Bundle analysis mode: ANALYZE=true pnpm build
// Use loadEnv to read .env file (astro.config.mjs runs before Vite loads .env)
const { ANALYZE } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const isAnalyze = ANALYZE === 'true';
// Get Umami analytics config from YAML
const umamiConfig = yamlConfig.analytics?.umami;
const umamiEnabled = umamiConfig?.enabled ?? false;
const umamiId = umamiConfig?.id;
// Normalize endpoint URL to remove trailing slashes
const umamiEndpoint = normalizeUrl(umamiConfig?.endpoint);

// Get robots.txt config from YAML
const robotsConfig = yamlConfig.seo?.robots;

// i18n configuration from YAML
const i18nYaml = yamlConfig.i18n;
const i18nDefaultLocale = i18nYaml?.defaultLocale ?? 'zh';
const i18nLocales = (i18nYaml?.locales ?? [{ code: 'zh' }]).map((l) => l.code);
const hasMultipleLocales = i18nLocales.length > 1;

/**
 * Vite plugin for conditional Three.js bundling
 * When christmas snowfall is disabled, replaces SnowfallCanvas with a noop component
 * This saves ~879KB from the bundle
 */
function conditionalSnowfall() {
  const VIRTUAL_ID = 'virtual:snowfall-canvas';
  const RESOLVED_ID = `\0${VIRTUAL_ID}`;
  const christmas = yamlConfig.christmas || { enabled: false, features: {} };
  const isEnabled = christmas.enabled && christmas.features?.snowfall;

  return {
    name: 'conditional-snowfall',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      // Redirect the alias import to virtual module when disabled
      if (!isEnabled && id === '@components/christmas/SnowfallCanvas') {
        return RESOLVED_ID;
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        // Return noop component when christmas is disabled
        return 'export function SnowfallCanvas() { return null; }';
      }
    },
  };
}

// Build shared Markdown plugin options based on content config
const contentConfig = yamlConfig.content || {};
const markdownOptions = createMarkdownOptions(contentConfig);

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  site: yamlConfig.site.url,
  compressHTML: true,
  markdown: {
    ...markdownOptions,
  },
  integrations: [
    react(),
    icon({
      include: {
        gg: ['*'],
        'fa6-regular': ['*'],
        'fa6-solid': ['*'],
        ri: ['*'],
      },
    }),
    // Umami analytics - configured via config/site.yaml
    ...(umamiEnabled && umamiId
      ? [
          umami({
            id: umamiId,
            endpointUrl: umamiEndpoint,
            hostUrl: umamiEndpoint,
          }),
        ]
      : []),
    pagefind(),
    mermaid({
      autoTheme: true,
    }),
    robotsTxt({ ...(robotsConfig || {}), sitemap: new URL('/sitemap.xml', yamlConfig.site.url).href }),
    ...(isAnalyze ? [Sonda()] : []),
  ],
  devToolbar: {
    enabled: true,
  },
  vite: {
    resolve: {
      alias: {
        '@admin-ui': path.resolve(process.cwd(), 'src/components/admin/cms-ui'),
      },
    },
    // Keep the development dependency optimizer separate from production builds.
    cacheDir: process.argv.includes('build') ? './node_modules/.vite-build' : './node_modules/.vite-dev',
    server: {
      proxy: {
        '/api/v1': { target: process.env.BACKEND_API_URL || 'http://127.0.0.1:8080', changeOrigin: true },
        '/uploads': { target: process.env.BACKEND_API_URL || 'http://127.0.0.1:8080', changeOrigin: true },
      },
    },
    build: {
      // Enable sourcemap for Sonda bundle analysis
      sourcemap: isAnalyze,
    },
    plugins: [yaml(), conditionalSnowfall(), svgr(), tailwindcss()],
    ssr: {
      noExternal: ['react-tweet'],
    },
    optimizeDeps: {
      include: ['@antv/infographic', 'echarts'],
    },
  },
  // Only enable Astro i18n routing when multiple locales are configured.
  // Single-locale sites skip this entirely — no /[lang]/ routes are generated.
  ...(hasMultipleLocales && {
    i18n: {
      defaultLocale: i18nDefaultLocale,
      locales: i18nLocales,
      routing: {
        prefixDefaultLocale: false,
        redirectToDefaultLocale: true,
      },
    },
  }),
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  trailingSlash: 'ignore',
});
