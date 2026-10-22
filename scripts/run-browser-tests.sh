#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -z "${TEST_DATABASE_URL:-}" ]]; then
  echo "TEST_DATABASE_URL es obligatoria." >&2
  exit 1
fi

database_path="${TEST_DATABASE_URL%%\?*}"
database_name="${database_path##*/}"
if [[ ! "$database_name" =~ (^|_)(test|e2e)(_|$) ]]; then
  echo "La base de navegador debe incluir test o e2e en su nombre." >&2
  exit 1
fi

export NODE_ENV=test
export DATABASE_URL="$TEST_DATABASE_URL"

npm run build
npm run db:deploy
npm run db:seed
npm run test:browser:prepare --workspace @trato/api
npm run test:e2e --workspace @trato/web
