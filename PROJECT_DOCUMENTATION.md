# Darital Project Documentation

## 1. Project overview

Darital is a rental management platform for:

- admin operations
- tenant portal
- contract and document management
- invoices and payments
- utility billing
- notifications, chat, and Telegram integrations

The repository is a monorepo. The main production stack is deployed on one VPS and split into two environments:

- `production`
- `staging`


## 2. Main stack

### Backend

- `NestJS`
- `Prisma ORM`
- `PostgreSQL`
- `Redis`
- `BullMQ`
- `Socket.IO`
- `MinIO` for file storage

### Frontend

- `Next.js` admin panel
- `Next.js` tenant portal

### Mobile

- `Expo / React Native`

### Infra

- `Docker`
- `Docker Compose`
- `Nginx`
- `Let's Encrypt SSL`


## 3. Repository structure

```text
apps/
  api/           NestJS backend
  admin-web/     Admin panel
  tenant-web/    Tenant portal
  mobile/        Mobile app

deploy/          Nginx and SSL configs
scripts/         Deploy, backup, restore scripts
docker-compose*.yml
env*.example
```


## 4. Main applications

### Admin panel

- Purpose: internal management system
- Path in repo: `apps/admin-web`
- Public URL: `https://admin.darital-arenda.uz`
- Staging URL: `https://staging-admin.darital-arenda.uz`

### Tenant portal

- Purpose: tenant cabinet for contracts, invoices, payments, documents, chat
- Path in repo: `apps/tenant-web`
- Public URL: `https://darital-arenda.uz`
- Staging URL: `https://staging.darital-arenda.uz`

### API

- Purpose: single backend for admin, tenant, mobile, notifications, documents
- Path in repo: `apps/api`
- Public URL: `https://api.darital-arenda.uz/api`
- Staging URL: `https://staging-api.darital-arenda.uz/api`


## 5. Backend architecture

The backend is a `modular monolith`.

This means:

- one main API service
- one shared PostgreSQL database per environment
- modules are separated inside the codebase
- deployment is still simple because the system runs as one backend app

Main backend modules:

- `auth`
- `users`
- `tenants`
- `buildings`
- `companies`
- `units`
- `contracts`
- `documents`
- `invoices`
- `payments`
- `balances`
- `utility-bills`
- `chat`
- `notifications`
- `telegram`
- `reports`
- `exports`
- `audit-logs`
- `archive`


## 6. Database

Database engine:

- `PostgreSQL 16`

ORM:

- `Prisma`

Current environment databases:

- production DB: `darital`
- staging DB: `darital_staging`

Important business tables include:

- `users`
- `tenants`
- `buildings`
- `companies`
- `units`
- `Contract`
- `Invoice`
- `Payment`
- `documents`
- `utility_bills`
- `conversations`
- `messages`
- `notification_preferences`

Database migration source:

- `apps/api/prisma/migrations`

Prisma schema:

- `apps/api/prisma/schema.prisma`


## 7. Storage and files

Uploaded files and generated contract files are stored in:

- `MinIO`

Buckets:

- production: `contracts`
- staging: `contracts-staging`

File access is exposed through:

- production: `https://api.darital-arenda.uz/files/...`
- staging: `https://staging-api.darital-arenda.uz/files/...`


## 8. Queue and cache

Redis is used for:

- queue support
- background jobs
- notification processing
- temporary caching and async workflows

Queue library:

- `BullMQ`


## 9. Server and VPS layout

Current main VPS:

- IP: `46.8.194.218`
- OS: `Ubuntu 22.04`

Main server directories:

- production project: `/srv/darital-prod`
- staging project: `/srv/darital-staging`

Recommended Nginx config location:

- `/etc/nginx/sites-available/darital`

Production and staging are hosted on the same VPS, but isolated by:

- separate project folders
- separate env files
- separate Docker Compose project names
- separate ports
- separate PostgreSQL databases
- separate MinIO buckets


## 10. Docker structure

Main containers per environment:

- `postgres`
- `redis`
- `minio`
- `api`
- `admin-web`
- `tenant-web`

Production internal/public ports:

- admin: `3000`
- api: `3001`
- tenant: `3002`
- minio: `9000`
- minio console: `9001`

Staging internal/public ports:

- admin: `3100`
- api: `3101`
- tenant: `3102`
- minio: `9100`
- minio console: `9101`

Important compose files:

- `docker-compose.prod.yml`
- `docker-compose.vps.yml`
- `docker-compose.staging.yml`
- `docker-compose.vps.staging.yml`


## 11. Domains and routing

### Production

- `admin.darital-arenda.uz` -> admin panel
- `darital-arenda.uz` -> tenant portal
- `www.darital-arenda.uz` -> tenant portal
- `api.darital-arenda.uz` -> backend API and file proxy
- `pgadmin.darital-arenda.uz` -> pgAdmin reverse proxy

### Staging

- `staging-admin.darital-arenda.uz` -> staging admin panel
- `staging.darital-arenda.uz` -> staging tenant portal
- `staging-api.darital-arenda.uz` -> staging API and file proxy


## 12. Environment files

### Local examples

- `env.example`
- `env.production.example`
- `env.staging.example`

### Real server env files

- production: `/srv/darital-prod/env.production`
- staging: `/srv/darital-staging/env.staging`

These env files contain:

- database credentials
- JWT secret
- MinIO credentials
- SMTP credentials
- Telegram bot tokens
- SMS provider credentials
- CORS and public URL configuration


## 13. Credentials and password structure

Important rule:

- real secrets should stay only in server env files
- real secrets should not be committed to Git

Credentials are grouped by purpose:

### Server access

- SSH host
- SSH user
- SSH password or SSH key

### Database

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`

### Storage

- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`

### Application security

- `JWT_SECRET`

### Mail

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_FROM`

### Telegram

- `TELEGRAM_BOT_TOKEN`
- `ADMIN_TELEGRAM_BOT_TOKEN`

### SMS

- `DEVSMS_TOKEN`
- `ESKIZ_EMAIL`
- `ESKIZ_PASSWORD`

Recommended password policy:

- use different passwords for production and staging
- use a different JWT secret for each environment
- rotate passwords after server migration
- move from password login to SSH key login


## 14. Deploy flow

Production deploy folder:

- `/srv/darital-prod`

Staging deploy folder:

- `/srv/darital-staging`

Main deploy script:

- `scripts/deploy-vps.sh`

Useful commands:

```bash
# Production
cd /srv/darital-prod
DARITAL_ENV=production COMPOSE_PROJECT_NAME=darital-production IMAGE_PREFIX=darital-production ./scripts/deploy-vps.sh restart

# Staging
cd /srv/darital-staging
DARITAL_ENV=staging COMPOSE_PROJECT_NAME=darital-staging IMAGE_PREFIX=darital-staging ./scripts/deploy-vps.sh restart
```

Standard workflow:

1. push code to GitHub
2. pull latest code on VPS
3. deploy staging
4. test staging
5. deploy production


## 15. Backup and restore

Scripts:

- `scripts/backup-vps.sh`
- `scripts/restore-db-vps.sh`

Project docs:

- `BACKUP_GUIDE.md`
- `EMERGENCY_RESTORE.md`

What should be backed up:

- PostgreSQL data
- MinIO files
- env files
- Nginx config


## 16. Security notes

Current best-practice improvements:

- disable password SSH login after key-based access is configured
- change all default secrets
- keep production and staging secrets different
- keep MinIO console private if not needed publicly
- restrict firewall to `22`, `80`, `443`
- schedule automatic DB backups
- monitor Docker logs and disk usage
- rotate Telegram, SMTP, and SMS credentials if they were shared in chat


## 17. Quick technical summary

Darital is a monorepo rental platform with:

- `NestJS` API
- `Next.js` admin panel
- `Next.js` tenant portal
- `Expo` mobile app
- `PostgreSQL` database
- `Redis` queues/cache
- `MinIO` file storage
- `Docker + Nginx` VPS deployment

The backend is a `modular monolith`, not microservices.

Production and staging run on the same VPS, but are isolated by:

- separate folders
- separate env files
- separate databases
- separate buckets
- separate ports
- separate Docker project names


## 18. Onboarding note for new developer

If a new developer reads only this page, they should know:

- where the code lives
- which app does what
- which domains point to which service
- where production and staging are deployed
- where env files live
- how deploy works
- where secrets are stored
- how database and file storage are organized
