#!/usr/bin/env bash
# Create an encrypted, quiesced backup of the production JSON + media volume and
# upload it to OCI Object Storage using instance-principal authentication.
# This script intentionally refuses to run until the operator acknowledges the
# downtime/data-safety conditions. It never deletes or replaces the live volume.
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ "${MANA_VIVAHA_BACKUP_APPROVED:-}" == "YES" ]] || \
  fail "Set MANA_VIVAHA_BACKUP_APPROVED=YES after reviewing PRODUCTION-DEPLOY.md and scheduling the maintenance window."
[[ -f .env.production ]] || fail "Missing .env.production."
command -v docker >/dev/null 2>&1 || fail "Docker is required."
command -v age >/dev/null 2>&1 || fail "age is required for client-side encryption."
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required."
command -v jq >/dev/null 2>&1 || fail "jq is required to resolve the Compose volume safely."
command -v oci >/dev/null 2>&1 || fail "OCI CLI is required; configure instance-principal auth on the VM."
[[ -n "${AGE_RECIPIENT:-}" ]] || fail "AGE_RECIPIENT must be an owner-controlled public age key."
[[ -n "${OCI_NAMESPACE:-}" ]] || fail "OCI_NAMESPACE is required."
[[ -n "${OCI_BUCKET:-}" ]] || fail "OCI_BUCKET is required."
[[ -n "${OCI_REGION:-}" ]] || fail "OCI_REGION is required."

COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml)
CONFIGURED_VOLUME="$("${COMPOSE[@]}" config --format json | jq -r '.volumes.appdata.name // empty')"
VOLUME="${MANA_VIVAHA_VOLUME_NAME:-${CONFIGURED_VOLUME:-mana-vivaha-appdata}}"
docker volume inspect "$VOLUME" >/dev/null 2>&1 || fail "Configured Docker volume '$VOLUME' does not exist; refusing to archive an unknown volume."
BACKUP_ROOT="${MANA_VIVAHA_BACKUP_ROOT:-/var/backups/mana-vivaha}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="${BACKUP_ROOT}/mana-vivaha-${STAMP}.tar.gz.age"
MANIFEST="${ARCHIVE}.sha256"
OBJECT_PREFIX="${OCI_OBJECT_PREFIX:-mana-vivaha/volume}"
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

running=0
if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx backend; then
  running=1
fi
restart_backend() {
  if [[ "$running" == 1 ]]; then
    "${COMPOSE[@]}" start backend >/dev/null || printf 'WARNING: backend restart failed; investigate before reopening traffic.\n' >&2
  fi
}
trap restart_backend EXIT

# JSON snapshots are not a transactional database. Quiesce the sole writer so
# the archive contains a mutually consistent state + media manifest.
if [[ "$running" == 1 ]]; then
  "${COMPOSE[@]}" stop --timeout 45 backend
fi

printf 'Creating encrypted backup of volume %s at %s\n' "$VOLUME" "$ARCHIVE"
docker run --rm --user 0 \
  -v "${VOLUME}:/source:ro" \
  -v "${BACKUP_ROOT}:/out" \
  alpine:3.20 \
  sh -c 'tar -C /source -czf - .' \
  | age --encrypt --armor --recipient "$AGE_RECIPIENT" > "$ARCHIVE"

printf '%s  %s\n' "$(sha256sum "$ARCHIVE" | awk '{print $1}')" "$(basename "$ARCHIVE")" > "$MANIFEST"
oci os object put \
  --auth instance_principal \
  --region "$OCI_REGION" \
  --namespace-name "$OCI_NAMESPACE" \
  --bucket-name "$OCI_BUCKET" \
  --name "${OBJECT_PREFIX}/$(basename "$ARCHIVE")" \
  --file "$ARCHIVE" \
  --force
oci os object put \
  --auth instance_principal \
  --region "$OCI_REGION" \
  --namespace-name "$OCI_NAMESPACE" \
  --bucket-name "$OCI_BUCKET" \
  --name "${OBJECT_PREFIX}/$(basename "$MANIFEST")" \
  --file "$MANIFEST" \
  --force

printf 'Backup uploaded. Local archive: %s\nManifest: %s\n' "$ARCHIVE" "$MANIFEST"
printf 'Retain per the bucket lifecycle policy; test restore before deleting this local copy.\n'
