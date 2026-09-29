# =============================================================================
# astro-koharu Dockerfile
# Multi-stage build for the Astro Node server
# =============================================================================

# =============================================================================
# Stage 1: Builder
# Combines dependency installation and build in one stage to preserve pnpm
# symlink structure (copying node_modules between stages breaks symlinks)
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

# Copy package files first (for Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies (include dev deps for build)
RUN pnpm install --frozen-lockfile --prod=false

# Copy source files
COPY . .

# Build the site, then trim dev-only packages. Ignore lifecycle scripts on the
# second install so the production image does not invoke the dev-only Husky hook;
# production native packages were already built during the first install.
RUN pnpm run build
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# =============================================================================
# Stage 2: Production (Astro Node standalone server)
# =============================================================================
FROM node:22-alpine AS production
WORKDIR /app

# Copy the server bundle and its static client assets.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production
EXPOSE 4321

# Start Astro's Node standalone server.
CMD ["node", "./dist/server/entry.mjs"]
