#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="docker/env/local-production.env"
COMPOSE_FILE="docker/compose.prod-local.yaml"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE" >&2
    exit 1
fi

compose() {
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

printf '\n== DevFlow local-production services ==\n'
compose ps

bad=0
for service in postgres redis api web; do
    id="$(compose ps -q "$service")"
    if [[ -z "$id" ]]; then
        printf 'FAIL  %-10s not running\n' "$service" >&2
        bad=1
        continue
    fi

    state="$(docker inspect --format '{{.State.Status}}' "$id")"
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$id")"
    printf '%-5s %-10s state=%s health=%s\n' "$( [[ "$state" == running && "$health" == healthy ]] && echo PASS || echo FAIL )" "$service" "$state" "$health"
    if [[ "$state" != running || "$health" != healthy ]]; then
        bad=1
    fi
done

printf '\n== HTTP probes (loopback only) ==\n'
for endpoint in live ready; do
    url="http://127.0.0.1:8080/api/v1/health/$endpoint"
    code="$(curl --silent --output /dev/null --max-time 8 --write-out '%{http_code}' "$url")" || code="000"
    printf '%-5s %-10s HTTP %s\n' "$( [[ "$code" == 200 ]] && echo PASS || echo FAIL )" "$endpoint" "$code"
    if [[ "$code" != 200 ]]; then
        bad=1
    fi
done

if [[ "$bad" -ne 0 ]]; then
    printf '\nHEALTH CHECK FAILED. Inspect: docker compose --env-file %s -f %s logs --tail=80 api web postgres redis\n' "$ENV_FILE" "$COMPOSE_FILE" >&2
    exit 1
fi

printf '\nHEALTH CHECK PASSED\n'
