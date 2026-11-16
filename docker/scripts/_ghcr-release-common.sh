#!/usr/bin/env bash
# Shared helpers for local GHCR deployment. Bash 3.2-compatible for macOS.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
LOCAL_ENV="$REPO_ROOT/docker/env/local-production.env"
BASE_COMPOSE="$REPO_ROOT/docker/compose.prod-local.yaml"
GHCR_COMPOSE="$REPO_ROOT/docker/compose.ghcr-local.yaml"
RELEASE_DIR="$REPO_ROOT/docker/releases"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

validate_repo_sha() {
  [[ $# -eq 2 ]] || fail 'Expected <owner/repo> <40-character git SHA>'
  # Image naming in docker-images.yml is lowercased GitHub repository + -{component}.
  GITHUB_REPO="$(printf '%s' "$1" | LC_ALL=C tr '[:upper:]' '[:lower:]')"
  COMMIT_SHA="$2"
  [[ "$GITHUB_REPO" =~ ^[a-z0-9][a-z0-9_.-]*/[a-z0-9][a-z0-9_.-]*$ ]] || fail 'Invalid owner/repository. Example: owner/devflow'
  [[ "$COMMIT_SHA" =~ ^[a-f0-9]{40}$ ]] || fail 'Use full 40-character lowercase commit SHA (from successful main workflow).'
  export DEVFLOW_API_IMAGE="ghcr.io/${GITHUB_REPO}-api:sha-${COMMIT_SHA}"
  export DEVFLOW_WEB_IMAGE="ghcr.io/${GITHUB_REPO}-web:sha-${COMMIT_SHA}"
  export DEVFLOW_MIGRATE_IMAGE="ghcr.io/${GITHUB_REPO}-migrate:sha-${COMMIT_SHA}"
}

preflight_release() {
  command -v docker >/dev/null || fail 'Docker CLI not found.'
  command -v curl >/dev/null || fail 'curl not found.'
  [[ -f "$LOCAL_ENV" ]] || fail "Local production env missing: $LOCAL_ENV"
  [[ -f "$BASE_COMPOSE" && -f "$GHCR_COMPOSE" ]] || fail 'Required Compose files missing.'
  docker info >/dev/null 2>&1 || fail 'Docker daemon is unavailable.'
  docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'
}

release_compose() {
  docker compose --env-file "$LOCAL_ENV" -f "$BASE_COMPOSE" -f "$GHCR_COMPOSE" "$@"
}

check_services() {
  # Ensures this is an update to the existing local-prod project, not a fresh
  # project migration accidentally run against a different database.
  local postgres_id redis_id
  postgres_id="$(release_compose ps -q postgres)"
  redis_id="$(release_compose ps -q redis)"
  [[ -n "$postgres_id" && -n "$redis_id" ]] || fail 'Start existing local-production Postgres and Redis first.'
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$postgres_id")" == healthy ]] || fail 'Local-production PostgreSQL is not healthy.'
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$redis_id")" == healthy ]] || fail 'Local-production Redis is not healthy.'
}

check_http() {
  curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8080/api/v1/health/live >/dev/null || fail 'Liveness failed.'
  curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8080/api/v1/health/ready >/dev/null || fail 'Readiness failed.'
  curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8080/ >/dev/null || fail 'Frontend HTTP check failed.'
}

save_release() {
  # Release state contains only public repository path and commit SHA, no secrets.
  local tmp
  umask 077
  mkdir -p "$RELEASE_DIR"
  chmod 700 "$RELEASE_DIR"
  if [[ -f "$RELEASE_DIR/current" ]]; then
    cp "$RELEASE_DIR/current" "$RELEASE_DIR/previous"
  fi
  tmp="$(mktemp "$RELEASE_DIR/.current.XXXXXXXX")"
  printf '%s %s\n' "$GITHUB_REPO" "$COMMIT_SHA" > "$tmp"
  mv "$tmp" "$RELEASE_DIR/current"
}
