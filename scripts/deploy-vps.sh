#!/bin/bash
# Darital VPS Deployment Script
# Usage: ./scripts/deploy-vps.sh [pull|start|restart|logs|stop]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ENV="${DARITAL_ENV:-production}"
ENV_FILE="${DARITAL_ENV_FILE:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-darital-${APP_ENV}}"
IMAGE_PREFIX="${IMAGE_PREFIX:-$COMPOSE_PROJECT_NAME}"
export IMAGE_PREFIX
COMPOSE_ARGS=(-f docker-compose.prod.yml)

if [ "$APP_ENV" = "staging" ]; then
    COMPOSE_ARGS+=(-f docker-compose.staging.yml)
fi

if [ "$APP_ENV" = "production" ] && [ -f "docker-compose.vps.yml" ]; then
    COMPOSE_ARGS+=(-f docker-compose.vps.yml)
fi

if [ "$APP_ENV" = "staging" ] && [ -f "docker-compose.vps.staging.yml" ]; then
    COMPOSE_ARGS+=(-f docker-compose.vps.staging.yml)
fi

if [ -z "$ENV_FILE" ]; then
    if [ "$APP_ENV" = "staging" ]; then
        ENV_FILE="env.staging"
    else
        ENV_FILE="env.production"
    fi
fi

# Functions
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        print_error "$ENV_FILE file not found."
        exit 1
    fi
}

compose() {
    docker compose -p "$COMPOSE_PROJECT_NAME" "${COMPOSE_ARGS[@]}" --env-file "$ENV_FILE" "$@"
}

# Command handlers
cmd_pull() {
    print_header "Pulling Latest Code"
    local branch="${DARITAL_GIT_BRANCH:-main}"
    if [ "$APP_ENV" = "staging" ]; then
        branch="${DARITAL_GIT_BRANCH:-staging}"
    fi
    git pull origin "$branch"
    print_success "Code updated"
}

cmd_start() {
    print_header "Starting Services"
    check_env
    compose up -d
    print_success "Services started"
    print_info "Waiting for services to be healthy..."
    sleep 5
    compose ps
}

cmd_stop() {
    print_header "Stopping Services"
    compose down
    print_success "Services stopped"
}

cmd_restart() {
    print_header "Restarting Services"
    check_env
    compose up -d --build
    print_success "Services rebuilt and restarted"
    sleep 3
    compose ps
}

cmd_logs() {
    print_header "Viewing Logs (last 50 lines, following)"
    compose logs --tail=50 -f
}

cmd_logs_api() {
    print_header "API Logs"
    compose logs --tail=50 -f api
}

cmd_logs_web() {
    print_header "Admin Web Logs"
    compose logs --tail=50 -f admin-web
}

cmd_deploy() {
    print_header "Full Deployment (pull + restart)"
    cmd_pull
    echo ""
    cmd_restart
    echo ""
    print_success "Deployment complete!"
    compose ps
}

cmd_migrate() {
    print_header "Running Database Migrations"
    compose exec api npx prisma migrate deploy --schema=prisma/schema.prisma
    print_success "Migrations completed"
}

cmd_status() {
    print_header "Service Status"
    compose ps
    echo ""
    print_header "Docker System Info"
    docker system df
}

cmd_backup() {
    print_header "Database Backup"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    compose exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-darital}" > "$BACKUP_FILE"
    print_success "Database backed up to: $BACKUP_FILE"
}

cmd_restore() {
    if [ -z "$1" ]; then
        print_error "Backup file not specified. Usage: ./deploy-vps.sh restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        print_error "Backup file not found: $1"
        exit 1
    fi
    
    print_header "Restoring Database from: $1"
    print_info "WARNING: This will overwrite the current database!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Restore cancelled"
        exit 0
    fi
    
    compose exec -T postgres psql -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-darital}" < "$1"
    print_success "Database restored"
}

cmd_help() {
    cat << EOF
${GREEN}Darital VPS Deployment Script${NC}

Usage: ./scripts/deploy-vps.sh <command> [options]

Commands:
  ${GREEN}pull${NC}              Pull latest code from Git
  ${GREEN}start${NC}             Start all services
  ${GREEN}stop${NC}              Stop all services
  ${GREEN}restart${NC}           Restart all services
  ${GREEN}deploy${NC}            Full deployment (pull + restart)
  ${GREEN}logs${NC}              View all service logs
  ${GREEN}logs:api${NC}          View API logs only
  ${GREEN}logs:web${NC}          View Admin Web logs only
  ${GREEN}status${NC}            Show service status and Docker info
  ${GREEN}migrate${NC}           Run database migrations
  ${GREEN}backup${NC}            Backup database
  ${GREEN}restore <file>${NC}    Restore database from backup
  ${GREEN}help${NC}              Show this help message

Examples:
  ./scripts/deploy-vps.sh deploy        # Deploy new version
  ./scripts/deploy-vps.sh logs          # Watch logs
  ./scripts/deploy-vps.sh backup        # Backup database
  ./scripts/deploy-vps.sh logs:api      # Watch API logs

Environment Variables:
  - DARITAL_ENV=production|staging
  - DARITAL_ENV_FILE=env.production|env.staging
  - DARITAL_GIT_BRANCH=main|staging
  - COMPOSE_PROJECT_NAME=darital-production|darital-staging
  - Create/update env.production and env.staging with your configuration
  - Never commit real secrets to Git

Examples:
  DARITAL_ENV=production ./scripts/deploy-vps.sh deploy
  DARITAL_ENV=staging DARITAL_GIT_BRANCH=staging ./scripts/deploy-vps.sh deploy

For detailed documentation, see VPS_DEPLOYMENT.md

EOF
}

# Main
cd "$REPO_DIR"

COMMAND="${1:-help}"

case "$COMMAND" in
    pull)
        cmd_pull
        ;;
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    logs)
        cmd_logs
        ;;
    logs:api)
        cmd_logs_api
        ;;
    logs:web)
        cmd_logs_web
        ;;
    deploy)
        cmd_deploy
        ;;
    migrate)
        cmd_migrate
        ;;
    status)
        cmd_status
        ;;
    backup)
        cmd_backup
        ;;
    restore)
        cmd_restore "$2"
        ;;
    help)
        cmd_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        cmd_help
        exit 1
        ;;
esac
