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
OFFSITE_LOG_FILE=""
OFFSITE_ERROR_TAIL=""
RCLONE_CONFIG_PATH=""
CURRENT_STEP="init"

DOCKER_COMPOSE=(docker-compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE")
BACKUP_FAILED=0

log() {
  printf '[backup] %s\n' "$*"
}

load_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    # Preserve explicitly provided values (e.g. from root crontab entry) so the env file
    # doesn't accidentally override them.
    local pre_backup_rclone_remote="${BACKUP_RCLONE_REMOTE-}"
    local pre_backup_rclone_config="${BACKUP_RCLONE_CONFIG-}"
    local raw
    while IFS= read -r raw || [[ -n "$raw" ]]; do
      local line="${raw#"${raw%%[![:space:]]*}"}"
      [[ -z "$line" || "${line:0:1}" == "#" ]] && continue
      if [[ ! "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
        log "skipping invalid env line in $ENV_FILE: $line"
        continue
      fi

      local key="${line%%=*}"
      local value="${line#*=}"
      if [[ "$value" =~ ^\".*\"$ ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
      fi
      export "$key=$value"
    done < "$ENV_FILE"

    if [[ -n "${pre_backup_rclone_remote:-}" ]]; then
      BACKUP_RCLONE_REMOTE="$pre_backup_rclone_remote"
    fi
    if [[ -n "${pre_backup_rclone_config:-}" ]]; then
      BACKUP_RCLONE_CONFIG="$pre_backup_rclone_config"
    fi
  fi
}

send_telegram_message() {
  local message="$1"
  local token="${BACKUP_TELEGRAM_BOT_TOKEN:-${TELEGRAM_BOT_TOKEN:-}}"
  local chat_id="${BACKUP_TELEGRAM_CHAT_ID:-${TELEGRAM_ADMIN_CHAT_ID:-}}"

  if [[ -z "$token" || -z "$chat_id" ]]; then
    log "telegram alert skipped; bot token or chat id not set"
    return
  fi

  if ! command -v curl >/dev/null 2>&1; then
    log "telegram alert skipped; curl not installed"
    return
  fi

  curl -fsS -X POST "https://api.telegram.org/bot${token}/sendMessage" \
    --data-urlencode "chat_id=$chat_id" \
    --data-urlencode "text=$message" \
    --data-urlencode "disable_web_page_preview=true" \
    >/dev/null || log "failed to send telegram alert"
}

notify_success() {
  local message
  message=$(
    cat <<EOF
Darital backup success
Host: $(hostname)
Time: $TIMESTAMP
Local: $RUN_DIR
Off-site: ${BACKUP_RCLONE_REMOTE:-not configured}
EOF
  )
  send_telegram_message "$message"
}

notify_failure() {
  local exit_code="${1:-1}"
  local message
  local rclone_config_msg="default"
  if [[ -n "${RCLONE_CONFIG_PATH:-}" ]]; then
    rclone_config_msg="$RCLONE_CONFIG_PATH"
  fi
  message=$(
    cat <<EOF
Darital backup failed
Host: $(hostname)
User: $(whoami)
Home: ${HOME:-unknown}
Time: $TIMESTAMP
Step: ${CURRENT_STEP:-unknown}
Exit code: $exit_code
Local dir: $RUN_DIR
Off-site: ${BACKUP_RCLONE_REMOTE:-not configured}
Rclone config: $rclone_config_msg
${OFFSITE_ERROR_TAIL:+Rclone log tail:\n$OFFSITE_ERROR_TAIL}
EOF
  )
  send_telegram_message "$message"
}

handle_exit() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    BACKUP_FAILED=1
    notify_failure "$exit_code"
  fi
  exit "$exit_code"
}

trap handle_exit EXIT

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    printf '[backup] missing file: %s\n' "$path" >&2
    exit 1
  fi
}

create_directories() {
  CURRENT_STEP="create_directories"
  mkdir -p "$RUN_DIR/db" "$RUN_DIR/files" "$RUN_DIR/configs" "$RUN_DIR/logs"
}

backup_database() {
  CURRENT_STEP="backup_database"
  log "creating PostgreSQL dump"
  "${DOCKER_COMPOSE[@]}" exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
    > "$RUN_DIR/db/darital.dump"
  sha256sum "$RUN_DIR/db/darital.dump" > "$RUN_DIR/db/darital.dump.sha256"
}

backup_minio_files() {
  CURRENT_STEP="backup_minio_files"
  log "copying MinIO data"
  docker cp darital-minio:/data "$RUN_DIR/files/minio-data"
  tar -C "$RUN_DIR/files" -czf "$RUN_DIR/files/minio-data.tar.gz" minio-data
  rm -rf "$RUN_DIR/files/minio-data"
  sha256sum "$RUN_DIR/files/minio-data.tar.gz" > "$RUN_DIR/files/minio-data.tar.gz.sha256"
}

backup_configs() {
  CURRENT_STEP="backup_configs"
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
  CURRENT_STEP="write_manifest"
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
  CURRENT_STEP="offsite_sync"
  if [[ -z "${BACKUP_RCLONE_REMOTE:-}" ]]; then
    log "BACKUP_RCLONE_REMOTE not set; skipping off-site sync"
    return
  fi

  if ! command -v rclone >/dev/null 2>&1; then
    log "rclone not installed; skipping off-site sync"
    return
  fi

  log "syncing backup to off-site remote"
  OFFSITE_LOG_FILE="$RUN_DIR/logs/rclone-copy.log"

  RCLONE_CONFIG_PATH="${BACKUP_RCLONE_CONFIG:-${RCLONE_CONFIG:-}}"
  local rclone_args=(
    copy
    "$RUN_DIR"
    "${BACKUP_RCLONE_REMOTE%/}/$TIMESTAMP"
    --create-empty-src-dirs
    --log-file "$OFFSITE_LOG_FILE"
    --log-level INFO
  )
  if [[ -n "${RCLONE_CONFIG_PATH:-}" ]]; then
    rclone_args+=(--config "$RCLONE_CONFIG_PATH")
  fi

  local attempt
  for attempt in 1 2 3; do
    log "rclone copy attempt $attempt/3"
    if rclone "${rclone_args[@]}"; then
      return
    fi
    sleep $((attempt * 5))
  done

  if [[ -f "$OFFSITE_LOG_FILE" ]]; then
    OFFSITE_ERROR_TAIL="$(tail -n 25 "$OFFSITE_LOG_FILE" 2>/dev/null || true)"
  fi
  exit 1
}

prune_old_backups() {
  CURRENT_STEP="prune_old_backups"
  log "pruning local backups older than $RETENTION_DAYS days"
  find "$BACKUP_BASE_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
}

main() {
  load_env_file
  create_directories
  backup_database
  backup_minio_files
  backup_configs
  write_manifest
  offsite_sync
  prune_old_backups
  CURRENT_STEP="completed"
  log "backup completed: $RUN_DIR"
  if [[ $BACKUP_FAILED -eq 0 ]]; then
    notify_success
  fi
}

main "$@"
