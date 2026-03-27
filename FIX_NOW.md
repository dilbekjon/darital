# COPY AND PASTE THESE COMMANDS ON YOUR VPS

## ⚠️ IMPORTANT: Nginx Config is Below (Scroll Down)
If step 4 shows the file doesn't exist, scroll down to the **"NGINX CONFIG"** section and copy it!

---

Run these commands **one by one** on your VPS to fix the nginx issue:

```bash
# 1. Stop Docker containers (this frees ports 80/443)
cd ~/darital
sudo docker-compose -f docker-compose.prod.yml down

# 2. Verify ports are free
sudo ss -tulpn | grep -E ':(80|443)'
# Should show nothing or only old nginx

# 3. Pull latest code changes
git pull origin main

# 4. Check if nginx.system.conf exists (if not, create it manually)
ls -la ~/darital/deploy/nginx.system.conf

# 4a. If file doesn't exist, create it manually:
sudo nano /etc/nginx/sites-available/darital
# Then SCROLL DOWN in this file to find "📄 NGINX CONFIG" section
# Copy that entire nginx config and paste it into nano
# Save with Ctrl+X, then Y, then Enter

# 5. Remove old nginx configs
sudo rm -f /etc/nginx/sites-enabled/darital
sudo rm -f /etc/nginx/sites-enabled/default

# 6. If nginx.system.conf exists, copy it:
sudo cp ~/darital/deploy/nginx.system.conf /etc/nginx/sites-available/darital

# 7. Create symlink
sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/darital

# 8. Test nginx config
sudo nginx -t
# Should say "syntax is ok" and "test is successful"

# 9. Create certbot directory
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot

# 10. Start Docker containers (now they only listen on localhost)
sudo docker-compose -f docker-compose.prod.yml up -d --build

# 11. Wait for containers to start (30 seconds)
sleep 30

# 12. Check containers are running
sudo docker-compose -f docker-compose.prod.yml ps
# All should show "Up"

# 13. Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 14. Check nginx status
sudo systemctl status nginx
# Should show "active (running)" in green

# 15. Verify ports
sudo ss -tulpn | grep -E ':(80|443)'
# Should show "nginx" NOT "docker-proxy"

# 16. Test the website
curl -I http://46.8.176.171
# Should return HTTP 200 OK

# 17. Test API
curl http://46.8.176.171/api/health
# Should return API response
```

---

## 📄 NGINX CONFIG (If file doesn't exist on VPS)

If `nginx.system.conf` doesn't exist after git pull, create it manually:

```bash
sudo nano /etc/nginx/sites-available/darital
```

Then paste this content:

```nginx
# System Nginx Configuration for Darital VPS Deployment

# API Server
server {
    listen 80;
    server_name api.darital-arenda.uz;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location /files/ {
        proxy_pass http://localhost:9000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        client_max_body_size 100M;
    }
}

# Admin Portal
server {
    listen 80;
    server_name admin.darital-arenda.uz;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        client_max_body_size 100M;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Tenant Portal (Main Domain)
server {
    listen 80;
    server_name darital-arenda.uz www.darital-arenda.uz;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location /chat/ {
        proxy_pass http://localhost:3001/chat/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /files/ {
        proxy_pass http://localhost:9000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        client_max_body_size 100M;
    }
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Default server (for IP access)
server {
    listen 80 default_server;
    server_name _;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host darital-arenda.uz;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

Then continue from step 7 (create symlink).

## ✅ SUCCESS INDICATORS

After running all commands, you should see:
- ✅ All Docker containers showing "Up" status
- ✅ Nginx showing "active (running)"
- ✅ Ports 80/443 owned by "nginx" (not docker-proxy)
- ✅ Website accessible at http://46.8.176.171

## 🔧 If Something Goes Wrong

### If docker-compose still fails:
```bash
# Check if docker is running
sudo systemctl status docker

# Start docker if needed
sudo systemctl start docker
```

### If nginx won't start:
```bash
# Check what's using port 80
sudo ss -tulpn | grep :80

# If docker-proxy is still there, kill it
sudo pkill docker-proxy
sudo systemctl stop nginx
sudo docker-compose -f docker-compose.prod.yml down
# Then start from step 8 again
```

### If containers won't start:
```bash
# Check logs
sudo docker-compose -f docker-compose.prod.yml logs

# Try rebuilding
sudo docker-compose -f docker-compose.prod.yml down
sudo docker-compose -f docker-compose.prod.yml build --no-cache
sudo docker-compose -f docker-compose.prod.yml up -d
```

## 📝 What This Fix Does

**Before:** Docker containers were using ports 80/443 → nginx couldn't start

**After:** 
- Docker containers only use localhost ports (3000, 3001, 3002, 9000)
- System nginx uses public ports 80/443
- Nginx proxies traffic to Docker containers
- Everything works! ✅

## 🔐 Fix Docker Permissions (Optional)

To run docker-compose without sudo in the future:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
ssh darital@46.8.176.171

# Now you can use docker without sudo
docker-compose -f docker-compose.prod.yml ps
```
