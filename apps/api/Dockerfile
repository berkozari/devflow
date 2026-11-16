# syntax=docker/dockerfile:1.7
# Build from the MONOREPO ROOT:
#   docker build -f apps/api/Dockerfile -t devflow-api:dev015 .

FROM node:24-bookworm-slim AS builder
WORKDIR /workspace

# Node 24 includes Corepack. The root packageManager field pins pnpm.
RUN corepack enable

# The Docker build context is the monorepo root; .dockerignore excludes secrets.
COPY . .
RUN pnpm install --frozen-lockfile

# Prisma 7 emits TypeScript into apps/api/src/generated/prisma.
# This dummy URL is ONLY for Prisma configuration evaluation at build time.
# prisma generate must not connect to a real database.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build_only \
    pnpm --dir apps/api exec prisma generate
RUN pnpm --filter @devflow/api build

# Produce a portable, production-dependency-only package from the workspace.
RUN pnpm --filter @devflow/api --prod deploy /opt/devflow-api

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Avoid root permissions at runtime.
COPY --from=builder --chown=node:node /opt/devflow-api/ ./
# Force-copy dist: pnpm deploy may exclude ignored build output.
COPY --from=builder --chown=node:node /workspace/apps/api/dist/ ./dist/

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
