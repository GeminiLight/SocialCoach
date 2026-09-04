# syntax=docker/dockerfile:1

# ── deps ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No credentials at build time: every model setting is read at runtime.
RUN pnpm build

# ── run ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S next -G nodejs

# `standalone` deliberately omits these two; copying them is the classic
# gotcha — without it you get a running server with no CSS and no icons.
COPY --from=build --chown=next:nodejs /app/.next/standalone ./
COPY --from=build --chown=next:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=next:nodejs /app/public ./public

USER next
EXPOSE 3000
# The rate limiter keeps its counters in memory, so run exactly one instance.
CMD ["node", "server.js"]
