# Setup HTTPS with SSL Certificate

## ✅ Your site is working on HTTP! Now let's add HTTPS.

---

## STEP 1: Install Certbot (if not already installed)

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

---

## STEP 2: Get SSL Certificates

```bash
# Get certificates for all your domains
sudo certbot certonly --nginx \
  -d darital-arenda.uz \
  -d www.darital-arenda.uz \
  -d admin.darital-arenda.uz \
  -d api.darital-arenda.uz

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service (Y)
# - Share email with EFF (optional - Y or N)
```

**IMPORTANT:** Your domains must be pointing to your VPS IP (46.8.176.171) for this to work!

---

## STEP 3: Update Nginx Configuration for HTTPS

```bash
sudo tee /etc/nginx/sites-available/darital > /dev/null <<'EOF'
# HTTPS Configuration with SSL

# API Server - HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.darital-arenda.uz;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

# API Server - HTTPS
server {
    listen 443 ssl http2;
    server_name api.darital-arenda.uz;
    
    ssl_certificate /etc/letsencrypt/live/darital-arenda.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/darital-arenda.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
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

# Admin Portal - HTTP to HTTPS redirect
server {
    listen 80;
    server_name admin.darital-arenda.uz;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

# Admin Portal - HTTPS
server {
    listen 443 ssl http2;
    server_name admin.darital-arenda.uz;
    
    ssl_certificate /etc/letsencrypt/live/darital-arenda.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/darital-arenda.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
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

# Tenant Portal - HTTP to HTTPS redirect
server {
    listen 80;
    server_name darital-arenda.uz www.darital-arenda.uz;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

# Tenant Portal - HTTPS
server {
    listen 443 ssl http2;
    server_name darital-arenda.uz www.darital-arenda.uz;
    
    ssl_certificate /etc/letsencrypt/live/darital-arenda.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/darital-arenda.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
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

# Default server - HTTP to HTTPS redirect
server {
    listen 80 default_server;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://darital-arenda.uz$request_uri;
    }
}
EOF
```

---

## STEP 4: Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

---

## STEP 5: Verify HTTPS Works

```bash
# Test HTTPS
curl -I https://darital-arenda.uz
curl -I https://admin.darital-arenda.uz
curl -I https://api.darital-arenda.uz

# All should return "HTTP/2 200" or similar
```

---

## STEP 6: Setup Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Enable automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check renewal timer status
sudo systemctl status certbot.timer
```

---

## ✅ DONE!

Your site is now accessible via HTTPS:
- https://darital-arenda.uz
- https://admin.darital-arenda.uz
- https://api.darital-arenda.uz

HTTP requests will automatically redirect to HTTPS.

---

## Troubleshooting

### If certbot fails with "DNS problem":
Your domains aren't pointing to your VPS yet. Check your DNS settings:
- darital-arenda.uz → 46.8.176.171
- www.darital-arenda.uz → 46.8.176.171
- admin.darital-arenda.uz → 46.8.176.171
- api.darital-arenda.uz → 46.8.176.171

### If nginx test fails:
```bash
# Check the error
sudo nginx -t

# View nginx error log
sudo tail -f /var/log/nginx/error.log
```

### If certificate path is different:
```bash
# Check where certificates are stored
sudo certbot certificates

# Update the paths in nginx config to match
```

---

## Certificate Renewal

Certificates auto-renew every 60 days. To manually renew:

```bash
sudo certbot renew
sudo systemctl reload nginx
```
