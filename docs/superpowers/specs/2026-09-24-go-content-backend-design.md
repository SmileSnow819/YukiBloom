# Go content backend design

## Goal and scope

Turn YukiBloom into a blog whose owner can upload Markdown files or write in an online editor, upload images, and publish posts that appear immediately. The production source of truth for posts, footprints, and internship experiences is PostgreSQL. Site appearance settings and non-content assets may remain in frontend configuration. The Astro frontend reads published content from the Go API at request time. Existing post URLs and exact rendering are not migration requirements, but the import must retain titles, body text, dates, taxonomy, draft state, and usable image references.

Deliver in two increments:

1. Posts, images, owner login, admin editor, public post pages, lists, taxonomy, RSS, and search.
2. Footprint locations, stays, routes, and internship timeline entries, with admin editing and live public pages.

No public registration, comments replacement, multi-author permissions, or distributed storage in the first release.

## Existing system

- Astro 5 currently builds posts from 55 Markdown files in `src/content/blog`. Content helpers, page routes, RSS, and Pagefind consume that build-time collection.
- `cms/` already has a local article list and editor. Its Hono server edits repository files and restricts API access to localhost. Reuse its UI where practical, replacing its file API with the Go API; do not expose the current Hono server as the production admin backend.
- `config/footprints.yaml` and `config/timeline.yaml` supply the two personal-history views at build time.
- Docker currently builds a static site served by Nginx. On-demand Astro routes require an Astro Node runtime, so production Compose and Nginx routing must change.
- The working tree already contains an unrelated edit to `config/site.yaml`; leave it untouched.

## Architecture

Nginx is the only public entry point. It routes page requests to an Astro Node service, `/api/v1/*` to a Gin service, `/admin/*` to the built admin UI, and `/uploads/*` to controlled media files. Gin and Astro communicate over the private Compose network. PostgreSQL is reachable only from Gin. Astro obtains published records through the public Go API, including for server-rendered page requests. Internal service URLs stay server-side.

Use a single Go module in `backend/`, organized by feature rather than a generic framework: configuration and database bootstrap, auth, posts, media, footprints, and timeline. Each feature owns request validation, data access, and HTTP handlers. Start with explicit SQL through `pgx`; use versioned SQL migrations. Avoid an ORM and a broad repository abstraction so the project teaches SQL and HTTP directly.

Keep a small set of Astro pages static where they contain no live data. Convert post detail, home/list/pagination, archives, categories, tags, and RSS to on-demand rendering. Convert footprint and internship pages in increment 2. Extract the site's Markdown plugin configuration into a shared runtime renderer, then use it for database Markdown in Astro. Audit the existing custom syntax and test representative articles. Do not model a database article as an Astro build-time `CollectionEntry` indefinitely; introduce a clear post view model and adapt components that depend on collection internals.

## Content and storage

PostgreSQL is the sole production content store. A post has an immutable ID, locale, unique slug per locale, title, description, Markdown body, status (`draft` or `published`), publication and update timestamps, optional cover media ID, ordered categories, tags, and validated extra frontmatter fields needed by the current site. Keep structured, query-critical fields in columns; JSONB can hold low-frequency presentation options. Published endpoints exclude drafts; scheduled publication is outside the first release, so pressing Publish makes a valid post visible immediately regardless of its display date. Slug conflicts return a clear validation error. Edits use an update version or timestamp check so concurrent saves cannot silently overwrite one another.

The import command reads current Markdown and YAML files before their corresponding frontend reads are removed. It has dry-run and apply modes, reports invalid records and duplicate slugs, and is safe to rerun without duplicates. The application must not read imported content from the repository in production. After each increment is verified, remove its old frontend content files and file-based loaders. Database migrations and import code remain in `backend/`; the deployment does not depend on original content files after import.

Images are stored as files in a persistent server volume, with metadata in PostgreSQL. The upload endpoint verifies actual image type, size, and dimensions; assigns a generated filename; and serves only safe raster formats in the first release. The admin can select a cover and insert an uploaded image URL into Markdown. Existing images referenced by posts or footprints are copied into the media volume during migration, with references rewritten before their frontend copies are removed. Unrelated site decoration images can stay in `public/`. Backups must include both PostgreSQL and the media volume. Do not store image binaries in PostgreSQL.

## API and admin flows

Public read API, under `/api/v1`, returns published posts with pagination and filters, a post by locale and slug, a search endpoint, and the phase-2 footprint and timeline views. Responses have stable JSON shapes, explicit HTTP status codes, and bounded page sizes. Search uses PostgreSQL queries with a simple initial strategy that works for Chinese titles and body text; at this site's size, correctness matters more than a search cluster. Replace Pagefind for live posts because its static index is generated at build time.

Admin API supports login/logout/session, Markdown upload and parsing preview, post create/read/update/publish/unpublish, image upload/list, and later footprint/timeline CRUD and ordering. Both Markdown upload and editor save pass through the same validation and persistence code. Importing a Markdown file creates a draft by default; publishing is a separate deliberate action. Upload failures never create a published partial post. A successful publish transaction makes the public API record visible immediately.

Reuse the current CMS's editor and article table where this reduces work, but host a production build under `/admin`. Add image selection/upload and import controls. The admin shows save, validation, conflict, and publish states clearly. The production UI calls Gin only; the current local Hono filesystem server is retired after migration.

## Authentication and operational behavior

One owner account is provisioned by a setup command or deployment secret; there is no public signup. Store a strong password hash, use an HTTP-only, Secure, SameSite cookie session, protect state-changing requests against CSRF, and rate-limit login. Require HTTPS at the public edge. Check authorization on every admin endpoint, including uploads. Never put service secrets into Astro client bundles.

Deploy the first release on the owner's Tencent Cloud Linux server (CVM or Lighthouse, depending on the actual instance type) as one Docker Compose stack: Nginx, Astro Node, Gin, and PostgreSQL, plus persistent database and media volumes. Expose only HTTP/HTTPS through the cloud firewall; keep PostgreSQL private and restrict administrative server access. Terminate HTTPS at the public edge. Add health checks, startup configuration validation, structured Go logs, and a documented backup/restore command. Store PostgreSQL dumps and media backups outside the instance, for example in a private Tencent Cloud COS bucket; a server-disk snapshot can supplement this but is not the only backup. Migrations run as an explicit deploy step before serving the new version. If Gin is unavailable, Astro returns a clear server error rather than stale or misleading published content.

## Verification and release sequence

Implement increment 1 as vertical slices: database and health endpoint; owner auth; post CRUD; Markdown upload and migration; media; Astro post rendering and lists; search and RSS; production admin; Compose deployment. Verify each slice with focused Go handler/database tests and Astro rendering checks. A release check creates a draft, uploads an image, publishes the post, and confirms that the page, list, RSS, and search show it without rebuilding. Verify unpublished posts are invisible publicly. Compare representative imported articles with their source Markdown, especially custom blocks, code, math, and image paths.

Increment 2 imports YAML into typed PostgreSQL tables. Footprint locations are referenced by stays and routes, and deletion is rejected while referenced unless the owner explicitly removes those references. Internship entries have start/end dates and explicit display order. The admin edits these records; the two public pages read them on demand. Verify an admin edit appears after refresh without a rebuild, then remove the YAML readers and files from the frontend.

Roll out with a database/media backup and an import report. Since preserving old article URLs is optional, redirecting an old slug is a convenience, not a release gate. The release gate is complete content in PostgreSQL, working live publication, safe admin access, and no production dependency on frontend content files.
