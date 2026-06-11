# Darital One-Server Production + Staging Setup

This setup runs both environments on one large VPS.

## Server layout

Use two separate folders:

```bash
/srv/darital-prod
/srv/darital-staging
```

Clone the repo into both:

```bash
git clone https://github.com/dilbekjon/darital.git /srv/darital-prod
git clone https://github.com/dilbekjon/darital.git /srv/darital-staging
```

## Branches

Production:

```bash
cd /srv/darital-prod
git checkout main
```

Staging:

```bash
cd /srv/darital-staging
git checkout staging
```

## Environment files

Production uses:

```bash
/srv/darital-prod/env.production
```

Staging uses:

```bash
/srv/darital-staging/env.staging
```

Keep these values separate between environments:

- `POSTGRES_DB`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_BUCKET`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_URL`
- `CORS_ORIGINS`
- Telegram tokens
- payment provider keys

## Ports

Production:

- admin: `127.0.0.1:3000`
- api: `127.0.0.1:3001`
- tenant: `127.0.0.1:3002`
- minio: `127.0.0.1:9000`
- minio console: `127.0.0.1:9001`

Staging:

- admin: `127.0.0.1:3100`
- api: `127.0.0.1:3101`
- tenant: `127.0.0.1:3102`
- minio: `127.0.0.1:9100`
- minio console: `127.0.0.1:9101`

## Domains

Production:

- `darital-arenda.uz`
- `admin.darital-arenda.uz`
- `api.darital-arenda.uz`

Staging:

- `staging.darital-arenda.uz`
- `staging-admin.darital-arenda.uz`
- `staging-api.darital-arenda.uz`

## Docker compose files

Base stack:

- [docker-compose.prod.yml](/Users/dilbekalmurotov/Desktop/Darital/docker-compose.prod.yml)

Staging override:

- [docker-compose.staging.yml](/Users/dilbekalmurotov/Desktop/Darital/docker-compose.staging.yml)

## Deploy commands

Production:

```bash
cd /srv/darital-prod
DARITAL_ENV=production \
COMPOSE_PROJECT_NAME=darital-production \
./scripts/deploy-vps.sh deploy
```

Staging:

```bash
cd /srv/darital-staging
DARITAL_ENV=staging \
DARITAL_GIT_BRANCH=staging \
COMPOSE_PROJECT_NAME=darital-staging \
./scripts/deploy-vps.sh deploy
```

## Manual docker commands

Production:

```bash
docker compose -p darital-production -f docker-compose.prod.yml --env-file env.production up -d --build
```

Staging:

```bash
docker compose -p darital-staging -f docker-compose.prod.yml -f docker-compose.staging.yml --env-file env.staging up -d --build
```

## Nginx

Use:

- [deploy/nginx.system.dual-env.conf](/Users/dilbekalmurotov/Desktop/Darital/deploy/nginx.system.dual-env.conf)

Place it at:

```bash
/etc/nginx/sites-available/darital
```

Then enable it:

```bash
ln -sf /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/darital
nginx -t
systemctl reload nginx
```

## SSL

After DNS is pointed to the VPS:

```bash
certbot --nginx \
  -d darital-arenda.uz \
  -d admin.darital-arenda.uz \
  -d api.darital-arenda.uz \
  -d staging.darital-arenda.uz \
  -d staging-admin.darital-arenda.uz \
  -d staging-api.darital-arenda.uz
```

## Verification

Production:

```bash
curl -I https://darital-arenda.uz
curl -I https://admin.darital-arenda.uz
curl -I https://api.darital-arenda.uz/api/health
```

Staging:

```bash
curl -I https://staging.darital-arenda.uz
curl -I https://staging-admin.darital-arenda.uz
curl -I https://staging-api.darital-arenda.uz/api/health
```
