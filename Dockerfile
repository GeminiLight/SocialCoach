# ModelScope Studio: build from the repository root, serve on port 7860.
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY app/package.json app/pnpm-lock.yaml app/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY app/ ./
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=7860
# ModelScope starts the process through `su`; Alpine system users otherwise
# receive /sbin/nologin and the platform exits before Node starts.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S next -G nodejs -s /bin/sh
COPY --from=build --chown=next:nodejs /app/.next/standalone ./
COPY --from=build --chown=next:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=next:nodejs /app/public ./public
COPY LICENSE ./LICENSE
USER next
EXPOSE 7860
# Keep one process: rate-limit counters live in memory.
CMD ["node", "server.js"]
