#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILES=(-f "$ROOT_DIR/docker-compose.prod.yml")
if [[ -f "$ROOT_DIR/docker-compose.vps.yml" ]]; then
  COMPOSE_FILES+=(-f "$ROOT_DIR/docker-compose.vps.yml")
fi

ENV_FILE="${BACKUP_ENV_FILE:-$ROOT_DIR/.env.production}"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/opt/darital-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
RUN_DIR="$BACKUP_BASE_DIR/$TIMESTAMP"

DOCKER_COMPOSE=(docker-compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE")

log() {
  printf '[backup] %s\n' "$*"
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    printf '[backup] missing file: %s\n' "$path" >&2
    exit 1
  fi
}

create_directories() {
  mkdir -p "$RUN_DIR/db" "$RUN_DIR/files" "$RUN_DIR/configs" "$RUN_DIR/logs"
}

backup_database() {
  log "creating PostgreSQL dump"
  "${DOCKER_COMPOSE[@]}" exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
    > "$RUN_DIR/db/darital.dump"
  sha256sum "$RUN_DIR/db/darital.dump" > "$RUN_DIR/db/darital.dump.sha256"
}

backup_minio_files() {
  log "copying MinIO data"
  docker cp darital-minio:/data "$RUN_DIR/files/minio-data"
  tar -C "$RUN_DIR/files" -czf "$RUN_DIR/files/minio-data.tar.gz" minio-data
  rm -rf "$RUN_DIR/files/minio-data"
  sha256sum "$RUN_DIR/files/minio-data.tar.gz" > "$RUN_DIR/files/minio-data.tar.gz.sha256"
}

backup_configs() {
  log "copying configuration files"
  require_file "$ENV_FILE"
  cp "$ENV_FILE" "$RUN_DIR/configs/.env.production"
  cp "$ROOT_DIR/docker-compose.prod.yml" "$RUN_DIR/configs/docker-compose.prod.yml"
  if [[ -f "$ROOT_DIR/docker-compose.vps.yml" ]]; then
    cp "$ROOT_DIR/docker-compose.vps.yml" "$RUN_DIR/configs/docker-compose.vps.yml"
  fi
  if [[ -f /etc/nginx/sites-available/darital ]]; then
    cp /etc/nginx/sites-available/darital "$RUN_DIR/configs/nginx-darital.conf"
  fi
  if [[ -f /etc/nginx/nginx.conf ]]; then
    cp /etc/nginx/nginx.conf "$RUN_DIR/configs/nginx.conf"
  fi
  cat > "$RUN_DIR/configs/RESTORE-ORDER.txt" <<'EOF'
1. Provision a new VPS with Docker, docker-compose, and Nginx.
2. Restore configuration files from this backup directory.
3. Start postgres and minio containers.
4. Restore database from db/darital.dump using scripts/restore-db-vps.sh.
5. Restore MinIO files from files/minio-data.tar.gz.
6. Start api, admin-web, and tenant-web containers.
7. Verify /api/health and login flows.
EOF
}

write_manifest() {
  log "writing manifest"
  cat > "$RUN_DIR/manifest.txt" <<EOF
backup_timestamp=$TIMESTAMP
backup_env_file=$ENV_FILE
retention_days=$RETENTION_DAYS
host=$(hostname)
pwd=$ROOT_DIR
EOF
}

offsite_sync() {
  if [[ -z "${BACKUP_RCLONE_REMOTE:-}" ]]; then
    log "BACKUP_RCLONE_REMOTE not set; skipping off-site sync"
    return
  fi

  if ! command -v rclone >/dev/null 2>&1; then
    log "rclone not installed; skipping off-site sync"
    return
  fi

  log "syncing backup to off-site remote"
  rclone copy "$RUN_DIR" "${BACKUP_RCLONE_REMOTE%/}/$TIMESTAMP" --create-empty-src-dirs
}

prune_old_backups() {
  log "pruning local backups older than $RETENTION_DAYS days"
  find "$BACKUP_BASE_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
}

main() {
  create_directories
  backup_database
  backup_minio_files
  backup_configs
  write_manifest
  offsite_sync
  prune_old_backups
  log "backup completed: $RUN_DIR"
}

main "$@"
