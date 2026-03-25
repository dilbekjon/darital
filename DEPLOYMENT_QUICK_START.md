# Quick Deployment Guide

Get Darital running on your VPS in 10 minutes.

## Step 1: SSH into VPS

```bash
ssh darital@46.8.176.171
```

## Step 2: Install Docker (first time only)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
```

## Step 3: Clone and Setup

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/darital.git
cd darital

# Create environment file
cp .env.production .env

# Edit configuration (update passwords, domains, etc.)
nano .env
```

**Key .env values to update:**
- `POSTGRES_PASSWORD` → Strong password
- `MINIO_ROOT_PASSWORD` → Strong password  
- `JWT_SECRET` → `openssl rand -base64 32`
- `NEXT_PUBLIC_API_URL` → `https://api.darital-arenda.uz/api`
- `CORS_ORIGINS` → Your domains
- `MAIL_*` → Email service credentials

## Step 4: Deploy

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## Step 5: Access Applications

- **Admin Panel**: http://admin.darital-arenda.uz (after DNS + Nginx setup)
- **Tenant App**: http://darital-arenda.uz (after DNS + Nginx setup)
- **API**: http://localhost:10000/api/health (internal)
- **MinIO Console**: http://localhost:9001

## Step 6: Setup Nginx & SSL (Optional but Recommended)

```bash
# Install Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy Nginx config
sudo cp deploy/nginx.ssl.conf /etc/nginx/sites-available/darital

# Enable site
sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot certonly --nginx -d darital-arenda.uz -d api.darital-arenda.uz -d admin.darital-arenda.uz
```

## Deployment Script

Use the provided script for easier management:

```bash
# View all commands
./scripts/deploy-vps.sh help

# Deploy new version
./scripts/deploy-vps.sh deploy

# View logs
./scripts/deploy-vps.sh logs

# Backup database
./scripts/deploy-vps.sh backup

# Restart services
./scripts/deploy-vps.sh restart
```

## Useful Commands

```bash
# Pull latest code and restart
./scripts/deploy-vps.sh deploy

# Watch logs in real-time
docker compose logs -f

# Check service status
docker compose ps

# Execute command in container
docker compose exec api bash

# Database operations
docker compose exec postgres psql -U postgres -d darital
```

## Troubleshooting

**Port already in use?**
```bash
sudo lsof -i :80
sudo lsof -i :443
```

**Services won't start?**
```bash
docker compose down
docker compose logs
docker compose up -d
```

**Database connection error?**
```bash
# Verify database service is running
docker compose ps postgres

# Check logs
docker compose logs postgres
```

## Next Steps

1. **Configure DNS**: Point `darital-arenda.uz`, `api.darital-arenda.uz`, and `admin.darital-arenda.uz` to your server IP (46.8.176.171)

2. **Setup Email**: Configure MAIL_* variables in .env for sending emails

3. **Setup Admin User**: Access database and create super admin user

4. **Enable HTTPS**: Run Certbot and update Nginx config

5. **Regular Backups**: Setup backup script to run daily

See `VPS_DEPLOYMENT.md` for complete documentation.
