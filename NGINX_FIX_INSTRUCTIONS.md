# Nginx Port Conflict Fix - Step by Step Instructions

## Problem Summary
System nginx cannot start because Docker containers are already using ports 80 and 443. The error message shows:
```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
```

## Root Cause
Your `ss -tulpn` output shows docker-proxy is holding ports 80/443, which blocks system nginx from starting.

## Solution Overview
We'll use **system nginx** as the reverse proxy (on ports 80/443) and configure Docker containers to expose their ports only to localhost (127.0.0.1). This way:
- System nginx listens on public ports 80/443
- Docker containers listen on localhost:3000, localhost:3001, localhost:3002, localhost:9000
- System nginx proxies requests to Docker containers

---

## Step-by-Step Fix

### Step 1: Stop All Docker Containers

```bash
cd ~/darital
docker compose -f docker-compose.prod.yml down
```

This will stop all containers and free up ports 80/443.

### Step 2: Verify Ports Are Free

```bash
sudo ss -tulpn | grep -E ':(80|443)'
```

**Expected output:** Nothing (empty) - this means ports are free.

If you still see something using the ports, identify and stop it:
```bash
# If apache2 is running
sudo systemctl stop apache2

# If old nginx process
sudo pkill nginx
```

### Step 3: Pull Latest Code (Updated docker-compose.prod.yml)

```bash
cd ~/darital
git pull origin main
```

The updated `docker-compose.prod.yml` now includes port mappings:
- API: `127.0.0.1:3001:3001`
- Admin Web: `127.0.0.1:3000:3000`
- Tenant Web: `127.0.0.1:3002:3002`
- MinIO: `127.0.0.1:9000:9000` and `127.0.0.1:9001:9001`

### Step 4: Update Nginx Configuration

Remove the old incorrect config and install the new one:

```bash
# Remove old config
sudo rm /etc/nginx/sites-enabled/darital
sudo rm /etc/nginx/sites-available/darital

# Copy new config from your repo
sudo cp ~/darital/deploy/nginx.system.conf /etc/nginx/sites-available/darital

# Create symlink to enable it
sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/darital

# Test nginx configuration
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 5: Remove Default Nginx Site (Optional but Recommended)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

This prevents conflicts with the default server block.

### Step 6: Create Certbot Directory

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

### Step 7: Start Docker Containers

```bash
cd ~/darital
docker compose -f docker-compose.prod.yml up -d --build
```

Wait for containers to start (about 30-60 seconds), then check status:

```bash
docker compose -f docker-compose.prod.yml ps
```

All containers should show "Up" status.

### Step 8: Start System Nginx

```bash
sudo systemctl start nginx
sudo systemctl status nginx
```

**Expected output:** `active (running)` in green.

### Step 9: Verify Everything Works

Check that nginx is listening on ports 80/443:
```bash
sudo ss -tulpn | grep -E ':(80|443)'
```

**Expected output:** Should show nginx (not docker-proxy) on ports 80 and 443.

Test the services:
```bash
# Test by IP
curl -I http://46.8.176.171

# Test API endpoint
curl -I http://46.8.176.171/api/health

# If DNS is configured, test domains
curl -I http://admin.darital-arenda.uz
curl -I http://api.darital-arenda.uz
curl -I http://darital-arenda.uz
```

### Step 10: Enable Nginx Auto-Start

```bash
sudo systemctl enable nginx
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] `docker compose ps` shows all containers running
- [ ] `sudo systemctl status nginx` shows nginx active (running)
- [ ] `sudo ss -tulpn | grep :80` shows nginx (not docker-proxy)
- [ ] `curl http://localhost:3001/api/health` returns API response
- [ ] `curl http://localhost:3000` returns admin web page
- [ ] `curl http://localhost:3002` returns tenant web page
- [ ] `curl http://46.8.176.171` returns tenant web page through nginx
- [ ] No port conflict errors in logs

---

## Troubleshooting

### If Docker containers won't start:
```bash
docker compose -f docker-compose.prod.yml logs
```

### If nginx won't start:
```bash
sudo nginx -t
sudo journalctl -xeu nginx.service --no-pager
```

### If you see "connection refused" errors:
```bash
# Check if containers are listening on localhost
sudo ss -tulpn | grep -E ':(3000|3001|3002|9000)'

# Should show docker-proxy on 127.0.0.1:3000, 3001, 3002, 9000
```

### If you need to restart everything:
```bash
# Stop everything
docker compose -f docker-compose.prod.yml down
sudo systemctl stop nginx

# Start Docker first
docker compose -f docker-compose.prod.yml up -d

# Wait 30 seconds, then start nginx
sleep 30
sudo systemctl start nginx
```

---

## Port Mapping Reference

| Service | Container Port | Host Port | Access |
|---------|---------------|-----------|---------|
| Admin Web | 3000 | 127.0.0.1:3000 | Via nginx only |
| API | 3001 | 127.0.0.1:3001 | Via nginx only |
| Tenant Web | 3002 | 127.0.0.1:3002 | Via nginx only |
| MinIO API | 9000 | 127.0.0.1:9000 | Via nginx only |
| MinIO Console | 9001 | 127.0.0.1:9001 | Direct access |
| Nginx HTTP | - | 0.0.0.0:80 | Public |
| Nginx HTTPS | - | 0.0.0.0:443 | Public (after SSL) |

---

## Next Steps: SSL Setup

Once nginx is working on HTTP (port 80), you can set up SSL:

```bash
# Install certbot if not already installed
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot certonly --nginx \
  -d darital-arenda.uz \
  -d www.darital-arenda.uz \
  -d admin.darital-arenda.uz \
  -d api.darital-arenda.uz

# Update nginx config to use SSL (use deploy/nginx.ssl.conf as reference)
# Then reload nginx
sudo systemctl reload nginx
```

---

## Summary

The fix involves:
1. ✅ Updated `docker-compose.prod.yml` to expose ports only to localhost
2. ✅ Created proper system nginx config (`deploy/nginx.system.conf`)
3. ✅ System nginx proxies public traffic to Docker containers on localhost
4. ✅ No more port conflicts!

Your architecture is now:
```
Internet (80/443) → System Nginx → Docker Containers (localhost:3000/3001/3002/9000)
```
