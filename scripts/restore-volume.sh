#!/usr/bin/env bash
# Restore one encrypted OCI volume archive into a NEW Docker volume for review.
# It never writes the live volume and never starts the application automatically.
set -Eeuo pipefail
umask 077

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ "${MANA_VIVAHA_RESTORE_APPROVED:-}" == "YES" ]] || \
  fail "Set MANA_VIVAHA_RESTORE_APPROVED=YES after reviewing the archive and rollback plan."
command -v docker >/dev/null 2>&1 || fail "Docker is required."
command -v timeout >/dev/null 2>&1 || fail "timeout is required."
command -v age >/dev/null 2>&1 || fail "age is required."
command -v oci >/dev/null 2>&1 || fail "OCI CLI is required."
[[ -n "${AGE_IDENTITY_FILE:-}" && -f "$AGE_IDENTITY_FILE" ]] || fail "AGE_IDENTITY_FILE must point to the private restore key."
[[ -n "${OCI_NAMESPACE:-}" && -n "${OCI_BUCKET:-}" && -n "${OCI_REGION:-}" ]] || fail "OCI namespace, bucket, and region are required."
[[ -n "${RESTORE_OBJECT:-}" ]] || fail "RESTORE_OBJECT must be an explicit archive object path."

LIVE_VOLUME="${MANA_VIVAHA_VOLUME_NAME:-mana-vivaha-appdata}"
RESTORE_VOLUME="${RESTORE_VOLUME:-mana-vivaha-restore-$(date -u +%Y%m%dT%H%M%SZ)}"
[[ "$RESTORE_VOLUME" != "$LIVE_VOLUME" ]] || fail "Refusing to restore over the live volume. Choose a new RESTORE_VOLUME."
WORKDIR="${RESTORE_WORKDIR:-$(mktemp -d)}"
trap 'rm -rf "$WORKDIR"' EXIT
ARCHIVE="$WORKDIR/restore.tar.gz.age"

oci os object get \
  --auth instance_principal \
  --region "$OCI_REGION" \
  --namespace-name "$OCI_NAMESPACE" \
  --bucket-name "$OCI_BUCKET" \
  --name "$RESTORE_OBJECT" \
  --file "$ARCHIVE"

if [[ -n "${RESTORE_SHA256_OBJECT:-}" ]]; then
  oci os object get \
    --auth instance_principal \
    --region "$OCI_REGION" \
    --namespace-name "$OCI_NAMESPACE" \
    --bucket-name "$OCI_BUCKET" \
    --name "$RESTORE_SHA256_OBJECT" \
    --file "$WORKDIR/archive.sha256"
  (cd "$WORKDIR" && sha256sum -c archive.sha256)
fi

docker volume create "$RESTORE_VOLUME" >/dev/null
timeout 300 age --decrypt --identity "$AGE_IDENTITY_FILE" "$ARCHIVE" \
  | docker run --rm --user 0 -i -v "${RESTORE_VOLUME}:/restore" alpine:3.20 \
      sh -c 'tar -xzf - -C /restore && chown -R 10001:10001 /restore'

docker run --rm --user 0 -v "${RESTORE_VOLUME}:/restore:ro" alpine:3.20 \
  sh -c 'test -f /restore/state/data_db.json && test -d /restore/media'
printf 'Restored archive into NEW volume %s. Review counts, checksums, privacy, and media before any owner-approved cutover.\n' "$RESTORE_VOLUME"
printf 'The live volume %s was not mounted or changed.\n' "$LIVE_VOLUME"
