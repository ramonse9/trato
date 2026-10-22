#!/usr/bin/env bash
set -Eeuo pipefail

dump_file="${1:-}"
restore_database="${2:-}"

if [[ ! -f "$dump_file" ]]; then
  echo "Indica un archivo .dump existente como primer argumento." >&2
  exit 1
fi
if [[ ! "$restore_database" =~ ^[A-Za-z0-9_]*(test|e2e|restore)[A-Za-z0-9_]*$ ]]; then
  echo "La base temporal debe incluir test, e2e o restore en su nombre." >&2
  exit 1
fi

for command_name in psql createdb dropdb pg_restore; do
  command -v "$command_name" >/dev/null || {
    echo "No se encontró $command_name." >&2
    exit 1
  }
done

admin_user="${PGADMINUSER:-$(id -un)}"
admin_password="${PGADMINPASSWORD:-}"
restore_owner="${RESTORE_OWNER:-${PGUSER:-$admin_user}}"

exists="$(PGPASSWORD="$admin_password" psql --username="$admin_user" --dbname=postgres --tuples-only --no-align --command="SELECT 1 FROM pg_database WHERE datname = '$restore_database'")"
if [[ -n "$exists" ]]; then
  echo "La base temporal ya existe; no se modificó: $restore_database" >&2
  exit 1
fi

cleanup() {
  if [[ "${KEEP_RESTORE_DB:-0}" != "1" ]]; then
    PGPASSWORD="$admin_password" dropdb --username="$admin_user" --if-exists "$restore_database"
  fi
}
trap cleanup EXIT

PGPASSWORD="$admin_password" createdb \
  --username="$admin_user" \
  --owner="$restore_owner" \
  "$restore_database"
pg_restore \
  --dbname="$restore_database" \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-privileges \
  "$dump_file"

psql --dbname="$restore_database" --no-align --tuples-only --command="
  SELECT 'usuarios', count(*) FROM usuarios
  UNION ALL SELECT 'proyectos', count(*) FROM proyectos_comerciales
  UNION ALL SELECT 'registros', count(*) FROM registros_comerciales
  UNION ALL SELECT 'actividades', count(*) FROM actividades
  UNION ALL SELECT 'tareas', count(*) FROM tareas_seguimiento
  UNION ALL SELECT 'migraciones', count(*) FROM _prisma_migrations;
"

echo "Restauración comprobada correctamente en $restore_database."
