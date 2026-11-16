# syntax=docker/dockerfile:1.7
# Build from the MONOREPO ROOT:
#   docker build -f apps/web/Dockerfile -t devflow-web:dev015 .

FROM node:24-bookworm-slim AS builder
WORKDIR /workspace
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile

# Vite bakes this value into browser assets during BUILD, not runtime.
# A relative URL ensures same-origin requests through the reverse proxy.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter @devflow/web build

# NGINX Inc's unprivileged image listens on 8080 as non-root.
FROM nginx/nginx-unprivileged:alpine AS runtime
COPY --from=builder /workspace/apps/web/dist/ /usr/share/nginx/html/
COPY apps/web/nginx.local.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
