# VPS Deployment Checklist

Complete this checklist to deploy Darital to production.

## Pre-Deployment (Local Machine)

- [x] Deploy files pushed to GitHub
  - VPS_DEPLOYMENT.md (comprehensive guide)
  - DEPLOYMENT_QUICK_START.md (quick reference)
  - scripts/deploy-vps.sh (automated deployment script)
  
## VPS Setup (First Time Only)

**SSH Connection:**
```bash
ssh darital@46.8.176.171
```

- [ ] **Install Docker** (~5 min)
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  newgrp docker
  docker --version
  ```

- [ ] **Install Git** (~1 min)
  ```bash
  sudo apt update
  sudo apt install -y git
  ```

- [ ] **Clone Repository** (~2 min)
  ```bash
  cd ~
  git clone https://github.com/YOUR_USERNAME/darital.git
  cd darital
  ```

- [ ] **Setup Environment** (~3 min)
  ```bash
  cp .env.production .env
  nano .env  # Edit and save (Ctrl+X, Y, Enter)
  ```

  **Must Update These Values:**
  - [ ] `POSTGRES_PASSWORD` → Strong password (e.g., `MyStr0ng!Pass123`)
  - [ ] `MINIO_ROOT_PASSWORD` → Strong password (e.g., `MyStr0ng!Pass123`)
  - [ ] `JWT_SECRET` → `openssl rand -base64 32`
  - [ ] `NEXT_PUBLIC_API_URL` → `https://api.darital-arenda.uz/api`
  - [ ] `CORS_ORIGINS` → Your actual domains
  - [ ] `MAIL_HOST` → Your email provider (e.g., smtp.gmail.com)
  - [ ] `MAIL_USER` → Your email address
  - [ ] `MAIL_PASS` → App password (not regular password)
  - [ ] `MAIL_FROM` → Sender email

## Application Deployment

- [ ] **Start Services** (~2 min)
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```

- [ ] **Verify Services Running** (~1 min)
  ```bash
  docker compose ps
  # All services should show "Up" status
  ```

- [ ] **Check Logs** (~1 min)
  ```bash
  docker compose logs -f
  # Look for any errors, wait for services to stabilize
  # Press Ctrl+C to exit logs
  ```

- [ ] **Run Database Migrations** (~2 min)
  ```bash
  docker compose exec api npx prisma migrate deploy
  ```

## DNS Configuration (Required for HTTPS)

Contact your domain registrar or DNS provider:

- [ ] Point `darital-arenda.uz` → `46.8.176.171`
- [ ] Point `api.darital-arenda.uz` → `46.8.176.171`  
- [ ] Point `admin.darital-arenda.uz` → `46.8.176.171`
- [ ] Point `www.darital-arenda.uz` → `46.8.176.171`

Wait: DNS can take 5-30 minutes to propagate

Test: `nslookup darital-arenda.uz`

## Nginx & SSL Setup (Recommended)

- [ ] **Install Nginx & Certbot** (~2 min)
  ```bash
  sudo apt install -y nginx certbot python3-certbot-nginx
  ```

- [ ] **Setup Nginx Reverse Proxy** (~2 min)
  ```bash
  sudo cp deploy/nginx.conf /etc/nginx/sites-available/darital
  sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl start nginx
  sudo systemctl enable nginx
  ```

- [ ] **Get SSL Certificate** (~2 min)
  ```bash
  sudo certbot certonly --nginx \
    -d darital-arenda.uz \
    -d api.darital-arenda.uz \
    -d admin.darital-arenda.uz \
    -d www.darital-arenda.uz
  ```

- [ ] **Update Nginx Config with SSL Path** (~1 min)
  ```bash
  sudo nano /etc/nginx/sites-available/darital
  # Update paths to point to /etc/letsencrypt/live/darital-arenda.uz/
  sudo nginx -t
  sudo systemctl reload nginx
  ```

- [ ] **Setup Auto SSL Renewal** (~1 min)
  ```bash
  sudo certbot renew --dry-run
  sudo systemctl enable certbot.timer
  ```

## Application Access

After DNS propagates and HTTPS is configured:

- **Admin Panel**: https://admin.darital-arenda.uz
- **Tenant App**: https://darital-arenda.uz
- **API Health**: https://api.darital-arenda.uz/api/health
- **MinIO Console**: http://46.8.176.171:9001
  - Username: minioadmin
  - Password: (from .env MINIO_ROOT_PASSWORD)

## Ongoing Operations

### Deploying Updates

```bash
cd ~/darital

# Option 1: Manual
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# Option 2: Using provided script
./scripts/deploy-vps.sh deploy
```

### Useful Commands

```bash
# View status
./scripts/deploy-vps.sh status

# Watch logs
./scripts/deploy-vps.sh logs

# Backup database
./scripts/deploy-vps.sh backup

# View only API logs
./scripts/deploy-vps.sh logs:api
```

## Emergency Commands

```bash
# Stop all services
docker compose down

# View all containers
docker ps -a

# Restart specific service
docker compose restart api

# Enter database shell
docker compose exec postgres psql -U postgres -d darital

# View system resources
docker stats

# Cleanup unused Docker resources
docker system prune -a
```

## Troubleshooting

**Services won't start?**
```bash
docker compose logs
docker compose down
docker compose up -d --build
```

**Database error?**
```bash
docker compose logs postgres
docker compose exec postgres pg_isready
```

**Can't reach application?**
```bash
# Check DNS
nslookup darital-arenda.uz

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check logs
docker compose logs nginx
```

**SSL certificate issues?**
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

**Out of disk space?**
```bash
docker system df
docker image prune -a
docker volume prune
```

## Security Checklist

- [ ] All default passwords changed in .env
- [ ] JWT_SECRET is a long random string (40+ characters)
- [ ] Database backup strategy in place
- [ ] Server firewall configured (only 22, 80, 443)
- [ ] SSH key authentication enabled (disable password-based)
- [ ] Regular security updates enabled
- [ ] Database backups tested and working
- [ ] Monitoring/alerts configured if possible

## Support

**Issues?** Check these files:
- `VPS_DEPLOYMENT.md` - Complete setup guide
- `DEPLOYMENT_QUICK_START.md` - Quick reference
- `docker-compose.prod.yml` - Docker configuration
- `.env.production` - Example environment file
- `deploy/nginx.conf` - Nginx configuration

**Still stuck?**
- Check logs: `docker compose logs -f`
- SSH into container: `docker compose exec api bash`
- Emergency contact: Check your project's GitHub issues

## Final Verification

Once deployed, verify:

- [ ] Admin can log in at https://admin.darital-arenda.uz
- [ ] Tenants can access https://darital-arenda.uz
- [ ] API responds at https://api.darital-arenda.uz/api/health
- [ ] Database has data: `docker compose exec postgres psql -U postgres -d darital -c "SELECT COUNT(*) FROM \"User\";"`
- [ ] No errors in logs: `docker compose logs --tail=50`

---

**Deployment Complete!** Your Darital application is now running on production.

For updates, run: `./scripts/deploy-vps.sh deploy`
