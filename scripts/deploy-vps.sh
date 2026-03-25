#!/bin/bash
# Darital VPS Deployment Script
# Usage: ./scripts/deploy-vps.sh [pull|start|restart|logs|stop]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

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
        print_error ".env file not found. Copy .env.production to .env and update values."
        exit 1
    fi
}

# Command handlers
cmd_pull() {
    print_header "Pulling Latest Code"
    git pull origin main
    print_success "Code updated"
}

cmd_start() {
    print_header "Starting Services"
    check_env
    docker compose -f $COMPOSE_FILE up -d
    print_success "Services started"
    print_info "Waiting for services to be healthy..."
    sleep 5
    docker compose ps
}

cmd_stop() {
    print_header "Stopping Services"
    docker compose -f $COMPOSE_FILE down
    print_success "Services stopped"
}

cmd_restart() {
    print_header "Restarting Services"
    check_env
    docker compose -f $COMPOSE_FILE restart
    print_success "Services restarted"
    sleep 3
    docker compose ps
}

cmd_logs() {
    print_header "Viewing Logs (last 50 lines, following)"
    docker compose -f $COMPOSE_FILE logs --tail=50 -f
}

cmd_logs_api() {
    print_header "API Logs"
    docker compose -f $COMPOSE_FILE logs --tail=50 -f api
}

cmd_logs_web() {
    print_header "Admin Web Logs"
    docker compose -f $COMPOSE_FILE logs --tail=50 -f admin-web
}

cmd_deploy() {
    print_header "Full Deployment (pull + restart)"
    cmd_pull
    echo ""
    cmd_restart
    echo ""
    print_success "Deployment complete!"
    docker compose ps
}

cmd_migrate() {
    print_header "Running Database Migrations"
    docker compose -f $COMPOSE_FILE exec api npx prisma migrate deploy
    print_success "Migrations completed"
}

cmd_status() {
    print_header "Service Status"
    docker compose -f $COMPOSE_FILE ps
    echo ""
    print_header "Docker System Info"
    docker system df
}

cmd_backup() {
    print_header "Database Backup"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker compose -f $COMPOSE_FILE exec -T postgres pg_dump -U postgres darital > "$BACKUP_FILE"
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
    
    docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres darital < "$1"
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
  - Create/update .env file with your configuration
  - See .env.production for all available options
  - Never commit .env to Git (added to .gitignore)

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
