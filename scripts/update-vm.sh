#!/usr/bin/env bash
# Safe deploy helper for an already reviewed checkout on the operator's VM.
# It never changes Git remotes/branches, backs up plaintext secrets, or restores
# application data automatically. See PRODUCTION-DEPLOY.md before using deploy.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MODE="${1:-preflight}"
EXPECTED_COMMIT="${2:-}"
COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml)

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[[ -f .env.production ]] || fail "Missing .env.production. Provision it out of band; never put secrets in Git/chat."
command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is unavailable."

case "$(git remote get-url origin 2>/dev/null || true)" in
  https://github.com/charanpendota98-prog/shubhalagnam.git|git@github.com:charanpendota98-prog/shubhalagnam.git) ;;
  *) fail "Unexpected origin remote. Verify the private repository manually; this script will not rewrite it." ;;
esac

if [[ -n "$(git status --porcelain)" ]]; then
  fail "Checkout is not clean. Review changes and deploy only a reviewed release commit."
fi

"${COMPOSE[@]}" config --quiet || fail "Compose/env validation failed. No containers were changed."

case "$MODE" in
  preflight)
    printf 'Preflight passed for commit %s. No deployment or data changes were made.\n' "$(git rev-parse --short HEAD)"
    printf 'Before deploy: verify encrypted off-host backup+restore for JSON and media, then review PRODUCTION-DEPLOY.md.\n'
    ;;
  smoke)
    for _ in $(seq 1 20); do
      if "${COMPOSE[@]}" exec -T backend python -c \
        'from urllib.request import urlopen; urlopen("http://127.0.0.1:8000/api/health", timeout=5).read()' \
        >/dev/null 2>&1 \
        && curl -fsS --max-time 10 http://127.0.0.1:3000/api/health >/dev/null \
        && curl -fsS --max-time 10 http://127.0.0.1:3000/ >/dev/null; then
        printf 'Local smoke checks passed. Confirm TLS, provider delivery, payment sandbox, and restore separately.\n'
        exit 0
      fi
      sleep 5
    done
    fail "Smoke checks did not become healthy. No automatic checkout or data restore was attempted."
    ;;
  deploy)
    [[ -n "$EXPECTED_COMMIT" ]] || fail "Usage: bash update-vm.sh deploy <reviewed-commit-sha>"
    [[ "$EXPECTED_COMMIT" == "$(git rev-parse HEAD)" ]] || fail "Expected SHA does not match the clean checked-out release."
    [[ "${MANA_VIVAHA_BACKUP_VERIFIED:-}" == "YES" ]] || \
      fail "Set MANA_VIVAHA_BACKUP_VERIFIED=YES only after a separate encrypted off-host JSON+media backup and restore test."
    printf 'Building reviewed release %s. This will recreate containers but will not change the data volume.\n' "$EXPECTED_COMMIT"
    "${COMPOSE[@]}" build --pull
    "${COMPOSE[@]}" up -d
    exec "$ROOT/scripts/update-vm.sh" smoke
    ;;
  *)
    fail "Unknown mode '$MODE'. Use preflight, smoke, or deploy <reviewed-commit-sha>."
    ;;
esac
