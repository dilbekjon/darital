#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/darital.dump" >&2
  exit 1
fi

DUMP_FILE="$1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ENV="${DARITAL_ENV:-production}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-darital-${APP_ENV}}"
COMPOSE_FILES=(-f "$ROOT_DIR/docker-compose.prod.yml")
if [[ "$APP_ENV" == "staging" && -f "$ROOT_DIR/docker-compose.staging.yml" ]]; then
  COMPOSE_FILES+=(-f "$ROOT_DIR/docker-compose.staging.yml")
fi
if [[ -f "$ROOT_DIR/docker-compose.vps.yml" ]]; then
  COMPOSE_FILES+=(-f "$ROOT_DIR/docker-compose.vps.yml")
fi
if [[ "$APP_ENV" == "staging" ]]; then
  DEFAULT_ENV_FILE="$ROOT_DIR/env.staging"
else
  DEFAULT_ENV_FILE="$ROOT_DIR/env.production"
fi
ENV_FILE="${BACKUP_ENV_FILE:-$DEFAULT_ENV_FILE}"
DOCKER_COMPOSE=(docker compose -p "$COMPOSE_PROJECT_NAME" "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE")

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  exit 1
fi

echo "This will replace the current PostgreSQL database with: $DUMP_FILE"
read -r -p "Type RESTORE to continue: " confirm
if [[ "$confirm" != "RESTORE" ]]; then
  echo "Restore cancelled"
  exit 1
fi

"${DOCKER_COMPOSE[@]}" exec -T postgres sh -lc '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"
  psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB\";"
'

cat "$DUMP_FILE" | "${DOCKER_COMPOSE[@]}" exec -T postgres sh -lc '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges
'

echo "Database restore completed"
