# COMPLETE VPS DEPLOYMENT - COPY PASTE EVERY COMMAND

## ⚠️ READ THIS FIRST
- Copy and paste each command ONE BY ONE
- Wait for each command to finish before running the next
- If a command fails, STOP and tell me the error

---

## STEP 1: CONNECT TO VPS

```bash
ssh darital@46.8.176.171
```

---

## STEP 2: CLEAN UP EVERYTHING

```bash
cd ~/darital

# Stop everything
sudo docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# Clean Docker
sudo docker system prune -a -f
sudo docker volume prune -f

# Check disk space (need at least 5GB free)
df -h
```

**STOP HERE** - Check the output of `df -h`. Do you have at least 5GB free? If not, clean up files first.

---

## STEP 3: PULL LATEST CODE

```bash
cd ~/darital
git pull origin main
```

---

## STEP 4: CREATE NGINX CONFIG

```bash
sudo tee /etc/nginx/sites-available/darital > /dev/null <<'EOF'
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
EOF
```

---

## STEP 5: CONFIGURE NGINX

```bash
# Remove old configs
sudo rm -f /etc/nginx/sites-enabled/darital
sudo rm -f /etc/nginx/sites-enabled/default

# Enable new config
sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/darital

# Test config
sudo nginx -t
```

**STOP HERE** - You should see "syntax is ok" and "test is successful". If not, tell me the error.

---

## STEP 6: CREATE CERTBOT DIRECTORY

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

---

## STEP 7: START DATABASE SERVICES FIRST

```bash
cd ~/darital

# Start only postgres, redis, minio (these don't need building)
sudo docker-compose -f docker-compose.prod.yml up -d postgres redis minio

# Wait for them to start
sleep 15

# Check they're running
sudo docker-compose -f docker-compose.prod.yml ps
```

**STOP HERE** - You should see postgres, redis, and minio with "Up" status. If not, tell me what you see.

---

## STEP 8: BUILD AND START API

```bash
# Build API (this takes 5-10 minutes)
sudo docker-compose -f docker-compose.prod.yml build api

# Start API
sudo docker-compose -f docker-compose.prod.yml up -d api

# Wait for it to start
sleep 30

# Check it's running
sudo docker-compose -f docker-compose.prod.yml ps
```

**STOP HERE** - Check if API is "Up". If it says "Exit" or error, run:
```bash
sudo docker-compose -f docker-compose.prod.yml logs api
```
And tell me the error.

---

## STEP 9: BUILD AND START WEB APPS

```bash
# Build admin web
sudo docker-compose -f docker-compose.prod.yml build admin-web

# Build tenant web
sudo docker-compose -f docker-compose.prod.yml build tenant-web

# Start both
sudo docker-compose -f docker-compose.prod.yml up -d admin-web tenant-web

# Wait for them to start
sleep 20

# Check all containers
sudo docker-compose -f docker-compose.prod.yml ps
```

**STOP HERE** - ALL containers should show "Up". If any show "Exit", tell me which one.

---

## STEP 10: START NGINX

```bash
# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

**STOP HERE** - Should show "active (running)" in green. If not, tell me the error.

---

## STEP 11: VERIFY EVERYTHING WORKS

```bash
# Check ports
sudo ss -tulpn | grep -E ':(80|443)'
```

Should show nginx on ports 80 and 443 (NOT docker-proxy).

```bash
# Test website
curl -I http://46.8.176.171
```

Should return "HTTP/1.1 200 OK" or similar.

```bash
# Test API
curl http://46.8.176.171/api/health
```

Should return JSON response.

---

## STEP 12: RUN DATABASE MIGRATIONS

```bash
cd ~/darital
sudo docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

---

## ✅ SUCCESS!

If you got here, your application is deployed!

- Website: http://46.8.176.171
- Admin: http://46.8.176.171 (will redirect based on subdomain when DNS is set up)
- API: http://46.8.176.171/api

---

## IF SOMETHING FAILS

Tell me:
1. Which step failed
2. The exact error message
3. Output of: `sudo docker-compose -f docker-compose.prod.yml ps`
4. Output of: `sudo docker-compose -f docker-compose.prod.yml logs [service-name]`

---

## USEFUL COMMANDS FOR LATER

```bash
# View logs
sudo docker-compose -f docker-compose.prod.yml logs -f

# Restart everything
sudo docker-compose -f docker-compose.prod.yml restart

# Stop everything
sudo docker-compose -f docker-compose.prod.yml down

# Check container status
sudo docker-compose -f docker-compose.prod.yml ps

# Check nginx status
sudo systemctl status nginx

# Restart nginx
sudo systemctl restart nginx
```
