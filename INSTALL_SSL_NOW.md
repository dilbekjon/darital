# Install Your SSL Certificate - Step by Step

## You have these files in Desktop/darital-ssl:
- `darital-arenda.uz_key` (Private Key)
- `darital-arenda.uz.crt` (Certificate)
- `darital-arenda.uz.ca-bundle` (CA Bundle)
- `darital-arenda.uz.p7b` (PKCS7 format - not needed)

---

## STEP 1: Upload Files to VPS

### From Your Local Computer (Mac), run these commands:

```bash
# Upload the certificate files to your VPS
scp ~/Desktop/darital-ssl/darital-arenda.uz_key darital@46.8.176.171:~/
scp ~/Desktop/darital-ssl/darital-arenda.uz.crt darital@46.8.176.171:~/
scp ~/Desktop/darital-ssl/darital-arenda.uz.ca-bundle darital@46.8.176.171:~/
```

**Enter your VPS password when prompted.**

---

## STEP 2: SSH into Your VPS

```bash
ssh darital@46.8.176.171
```

---

## STEP 3: Move Files to Correct Locations

### On your VPS, run these commands:

```bash
# Create SSL directories if they don't exist
sudo mkdir -p /etc/ssl/private
sudo mkdir -p /etc/ssl/certs

# Move private key
sudo mv ~/darital-arenda.uz_key /etc/ssl/private/darital-arenda.uz.key

# Move certificate
sudo mv ~/darital-arenda.uz.crt /etc/ssl/certs/darital-arenda.uz.crt

# Move CA bundle
sudo mv ~/darital-arenda.uz.ca-bundle /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt

# Set correct permissions
sudo chmod 600 /etc/ssl/private/darital-arenda.uz.key
sudo chmod 644 /etc/ssl/certs/darital-arenda.uz.crt
sudo chmod 644 /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt

# Verify files are in place
ls -la /etc/ssl/private/darital-arenda.uz.key
ls -la /etc/ssl/certs/darital-arenda.uz.crt
ls -la /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt
```

---

## STEP 4: Update Nginx Configuration for HTTPS

```bash
sudo tee /etc/nginx/sites-available/darital > /dev/null <<'EOF'
# HTTPS Configuration with SSL Certificate

# API Server - HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.darital-arenda.uz;
    return 301 https://$host$request_uri;
}

# API Server - HTTPS
server {
    listen 443 ssl http2;
    server_name api.darital-arenda.uz;
    
    ssl_certificate /etc/ssl/certs/darital-arenda.uz.crt;
    ssl_certificate_key /etc/ssl/private/darital-arenda.uz.key;
    ssl_trusted_certificate /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
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
    return 301 https://$host$request_uri;
}

# Admin Portal - HTTPS
server {
    listen 443 ssl http2;
    server_name admin.darital-arenda.uz;
    
    ssl_certificate /etc/ssl/certs/darital-arenda.uz.crt;
    ssl_certificate_key /etc/ssl/private/darital-arenda.uz.key;
    ssl_trusted_certificate /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt;
    
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
    return 301 https://$host$request_uri;
}

# Tenant Portal - HTTPS
server {
    listen 443 ssl http2;
    server_name darital-arenda.uz www.darital-arenda.uz;
    
    ssl_certificate /etc/ssl/certs/darital-arenda.uz.crt;
    ssl_certificate_key /etc/ssl/private/darital-arenda.uz.key;
    ssl_trusted_certificate /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt;
    
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
    return 301 https://darital-arenda.uz$request_uri;
}
EOF
```

---

## STEP 5: Test and Reload Nginx

```bash
# Test nginx configuration
sudo nginx -t
```

**Should say:** "syntax is ok" and "test is successful"

```bash
# If test passes, reload nginx
sudo systemctl reload nginx
```

---

## STEP 6: Verify HTTPS Works

```bash
# Test HTTPS
curl -I https://darital-arenda.uz
curl -I https://admin.darital-arenda.uz
curl -I https://api.darital-arenda.uz
```

**Should return:** HTTP/2 200 or HTTP/2 301/302

---

## STEP 7: Test in Browser

Open your browser and visit:
- https://darital-arenda.uz
- https://admin.darital-arenda.uz
- https://api.darital-arenda.uz

You should see the green padlock 🔒 indicating HTTPS is working!

---

## If Something Goes Wrong

### Error: "cannot load certificate"
```bash
# Check files exist
ls -la /etc/ssl/private/darital-arenda.uz.key
ls -la /etc/ssl/certs/darital-arenda.uz.crt

# Check nginx error log
sudo tail -f /var/log/nginx/error.log
```

### Error: "certificate verify failed"
The CA bundle might be wrong. Try without it:
```bash
# Edit nginx config and comment out the ssl_trusted_certificate line
sudo nano /etc/nginx/sites-available/darital
# Add # before: ssl_trusted_certificate /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt;
# Save and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Summary of Commands

**On your LOCAL computer:**
```bash
scp ~/Desktop/darital-ssl/darital-arenda.uz_key darital@46.8.176.171:~/
scp ~/Desktop/darital-ssl/darital-arenda.uz.crt darital@46.8.176.171:~/
scp ~/Desktop/darital-ssl/darital-arenda.uz.ca-bundle darital@46.8.176.171:~/
ssh darital@46.8.176.171
```

**On your VPS:**
```bash
sudo mv ~/darital-arenda.uz_key /etc/ssl/private/darital-arenda.uz.key
sudo mv ~/darital-arenda.uz.crt /etc/ssl/certs/darital-arenda.uz.crt
sudo mv ~/darital-arenda.uz.ca-bundle /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt
sudo chmod 600 /etc/ssl/private/darital-arenda.uz.key
sudo chmod 644 /etc/ssl/certs/darital-arenda.uz.crt
sudo chmod 644 /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt
```

Then run the nginx config update command from STEP 4, test with `sudo nginx -t`, and reload with `sudo systemctl reload nginx`.

**That's it! Your site will be on HTTPS!** 🎉
