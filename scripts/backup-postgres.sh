#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -z "${PGDATABASE:-}" ]]; then
  echo "PGDATABASE es obligatoria." >&2
  exit 1
fi
if [[ -z "${BACKUP_DIR:-}" ]]; then
  echo "BACKUP_DIR es obligatoria y debe apuntar fuera del repositorio." >&2
  exit 1
fi

command -v pg_dump >/dev/null || { echo "No se encontró pg_dump." >&2; exit 1; }
command -v pg_restore >/dev/null || { echo "No se encontró pg_restore." >&2; exit 1; }

umask 077
mkdir -p -- "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${BACKUP_DIR%/}/trato-${PGDATABASE}-${timestamp}.dump"
partial="${target}.partial"
trap 'rm -f -- "$partial"' EXIT

pg_dump --format=custom --no-owner --no-privileges --file="$partial"
pg_restore --list "$partial" >/dev/null
mv -- "$partial" "$target"
trap - EXIT

if command -v shasum >/dev/null; then
  shasum -a 256 "$target" > "${target}.sha256"
elif command -v sha256sum >/dev/null; then
  sha256sum "$target" > "${target}.sha256"
fi

echo "Respaldo verificado: $target"
