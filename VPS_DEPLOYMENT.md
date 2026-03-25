# Darital VPS Deployment Guide

Complete guide to deploy Darital application to your VPS at airnet.uz

## Server Details
- **Server IP**: 46.8.176.171
- **OS**: Ubuntu 22.04
- **Location**: BKM
- **SSH Login**: darital
- **Domain**: darital-arenda.uz

## Prerequisites

### 1. Initial VPS Setup (SSH Access)

```bash
# Connect to VPS
ssh darital@46.8.176.171

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Install Git
sudo apt install -y git

# Install Nginx (for reverse proxy and SSL)
sudo apt install -y nginx

# Install Certbot for SSL certificates
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Clone Repository on VPS

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/darital.git
cd darital

# Or if SSH key is set up:
git clone git@github.com:YOUR_USERNAME/darital.git
cd darital
```

### 3. Set Up Environment Files

```bash
# Copy production environment file
cp .env.production .env

# Edit with your actual values
nano .env
```

**Update these values in `.env`:**
- `POSTGRES_PASSWORD` - Use a strong password
- `MINIO_ROOT_PASSWORD` - Use a strong password
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `MAIL_*` - Add your email service credentials
- `NEXT_PUBLIC_API_URL` - Set to your domain: `https://api.darital-arenda.uz/api`
- `CORS_ORIGINS` - Update with your actual domains

### 4. Start Services

```bash
# Navigate to project root
cd ~/darital

# Start Docker Compose services (uses docker-compose.prod.yml + .env)
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f

# Check container status
docker compose ps
```

### 5. Configure Nginx (Reverse Proxy + SSL)

Create Nginx config for SSL termination:

```bash
sudo nano /etc/nginx/sites-available/darital
```

Add the configuration from `deploy/nginx.ssl.conf` in your project.

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Set Up SSL Certificate

```bash
sudo certbot certonly --nginx -d darital-arenda.uz -d api.darital-arenda.uz -d admin.darital-arenda.uz -d www.darital-arenda.uz

# Auto-renew SSL
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
```

### 7. Database Setup

```bash
# Run database migrations
docker compose exec api npx prisma migrate deploy

# (Optional) Run database seeding
# docker compose exec api node prisma/seed.ts
```

## Deployment Workflow

### Push New Code to VPS

```bash
# On your local machine
git add .
git commit -m "Your message"
git push origin main

# On VPS
cd ~/darital
git pull origin main

# Rebuild and restart services
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose logs -f api
```

### View Container Logs

```bash
docker compose logs -f api        # API logs
docker compose logs -f admin-web  # Admin web logs
docker compose logs -f tenant-web # Tenant web logs
docker compose logs -f postgres   # Database logs
docker compose logs -f redis      # Cache logs
docker compose logs -f minio      # File storage logs
```

### Port Mapping

- **80** (HTTP) → Nginx
- **443** (HTTPS) → Nginx
- **5432** → PostgreSQL (internal only - no external access)
- **6379** → Redis (internal only - no external access)
- **9000** → MinIO API (internal, proxied through Nginx at `/files`)
- **9001** → MinIO Console (http://localhost:9001)

### Useful Commands

```bash
# Restart all services
docker compose restart

# Stop all services
docker compose down

# Remove all data (WARNING: destructive)
docker compose down -v

# Execute command in API container
docker compose exec api bash

# Access PostgreSQL
docker compose exec postgres psql -U postgres -d darital

# Access Redis
docker compose exec redis redis-cli

# View Docker disk usage
docker system df

# Clean up unused Docker images/volumes
docker system prune
```

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker compose logs

# Check if ports are already in use
sudo netstat -tulpn | grep LISTEN

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database Connection Issues
```bash
# Check database is running
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U postgres -d darital -c "SELECT 1"
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx config syntax
sudo nginx -t
```

### Disk Space Issues
```bash
# Check disk usage
df -h

# Check Docker usage
docker system df

# Clean up Docker
docker system prune -a
docker volume prune
```

## Security Checklist

- [ ] Change all default passwords (.env file)
- [ ] Set strong JWT_SECRET
- [ ] Configure firewall rules
- [ ] Enable SSH key authentication (disable password)
- [ ] Set up regular database backups
- [ ] Monitor server resources
- [ ] Keep Docker and system packages updated
- [ ] Use HTTPS everywhere (SSL certificates)
- [ ] Restrict database access to internal network only
- [ ] Use strong MinIO credentials

## Backup Strategy

```bash
# Backup database
docker compose exec postgres pg_dump -U postgres darital > backup_$(date +%Y%m%d).sql

# Backup MinIO data
docker cp darital-minio:/data ./minio_backup_$(date +%Y%m%d)

# Restore database
docker compose exec -T postgres psql -U postgres darital < backup_20260325.sql
```

## Monitoring

Monitor your application health:

```bash
# Check system resources
top
free -h
df -h

# Monitor Docker logs in real-time
docker compose logs --tail=50 -f

# Check container resource usage
docker stats
```

## Support & Documentation

- Project Repository: https://github.com/YOUR_USERNAME/darital
- Render Configuration: `render.yaml` (alternative cloud deployment)
- Local Development: See root README.md
- Docker Compose Files: 
  - Development: `docker-compose.yml`
  - Production: `docker-compose.prod.yml`
  - VPS Override: `docker-compose.vps.yml`
