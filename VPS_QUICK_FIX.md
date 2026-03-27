# Quick Fix for VPS Docker Issues

## Problem 1: Docker Compose Command
Your system uses `docker-compose` (with hyphen), not `docker compose` (with space).

## Problem 2: Docker Permission Denied
Your user needs to be added to the docker group and you need to log out/in for it to take effect.

---

## IMMEDIATE FIX - Run These Commands:

### Step 1: Fix Docker Permissions

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Apply the group change WITHOUT logging out
newgrp docker

# Verify you can run docker
docker ps
```

### Step 2: Stop Docker Containers (Free Ports 80/443)

```bash
cd ~/darital

# Use docker-compose with hyphen (not docker compose)
sudo docker-compose -f docker-compose.prod.yml down
```

### Step 3: Verify Ports Are Free

```bash
sudo ss -tulpn | grep -E ':(80|443)'
```

**Expected:** Empty output (no processes on ports 80/443)

### Step 4: Pull Latest Changes

```bash
cd ~/darital
git pull origin main
```

### Step 5: Install Correct Nginx Config

```bash
# Remove old configs
sudo rm -f /etc/nginx/sites-enabled/darital
sudo rm -f /etc/nginx/sites-available/darital
sudo rm -f /etc/nginx/sites-enabled/default

# Install new config
sudo cp ~/darital/deploy/nginx.system.conf /etc/nginx/sites-available/darital
sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/darital

# Test nginx config
sudo nginx -t
```

### Step 6: Create Certbot Directory

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

### Step 7: Start Docker Containers

```bash
cd ~/darital

# Now use docker-compose WITHOUT sudo (after newgrp docker)
docker-compose -f docker-compose.prod.yml up -d --build
```

Wait 30-60 seconds for containers to start, then check:

```bash
docker-compose -f docker-compose.prod.yml ps
```

All should show "Up" status.

### Step 8: Start System Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### Step 9: Verify Everything Works

```bash
# Check nginx is on ports 80/443 (not docker-proxy)
sudo ss -tulpn | grep -E ':(80|443)'

# Test the site
curl -I http://46.8.176.171

# Test API
curl http://46.8.176.171/api/health
```

---

## If You Still Get Permission Errors

If `docker-compose` still gives permission errors after `newgrp docker`, you have two options:

### Option A: Use sudo (temporary)
```bash
sudo docker-compose -f docker-compose.prod.yml up -d --build
```

### Option B: Logout and Login (permanent fix)
```bash
# Logout from SSH
exit

# Login again
ssh darital@46.8.176.171

# Now docker should work without sudo
docker ps
docker-compose -f docker-compose.prod.yml ps
```

---

## Command Reference for Your System

Your system uses **docker-compose with hyphen**, so use these commands:

```bash
# Start containers
docker-compose -f docker-compose.prod.yml up -d

# Stop containers
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Summary of Changes

1. ✅ Use `docker-compose` (with hyphen) instead of `docker compose`
2. ✅ Fix docker permissions with `newgrp docker` or logout/login
3. ✅ Updated docker-compose.prod.yml exposes ports only to localhost
4. ✅ System nginx proxies to Docker containers
5. ✅ No more port conflicts!

---

## Troubleshooting

### If "newgrp docker" doesn't work:
```bash
# Just use sudo for now
sudo docker-compose -f docker-compose.prod.yml down
sudo docker-compose -f docker-compose.prod.yml up -d --build

# Then logout and login to make it permanent
exit
ssh darital@46.8.176.171
```

### If ports still in use:
```bash
# Check what's using the ports
sudo ss -tulpn | grep -E ':(80|443)'

# Kill any docker-proxy processes
sudo pkill docker-proxy

# Stop nginx if running
sudo systemctl stop nginx

# Then start fresh
sudo docker-compose -f docker-compose.prod.yml down
sudo docker-compose -f docker-compose.prod.yml up -d
sudo systemctl start nginx
```
