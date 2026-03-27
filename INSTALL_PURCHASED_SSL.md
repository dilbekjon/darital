# Install Purchased SSL Certificate

## You bought an SSL certificate - here's how to install it on your VPS

---

## STEP 1: Get Your SSL Certificate Files

Your SSL provider should give you these files:
1. **Certificate file** (usually `certificate.crt` or `your_domain.crt`)
2. **Private key** (usually `private.key` or `your_domain.key`)
3. **CA Bundle/Chain** (usually `ca_bundle.crt` or `chain.crt`)

Download these files to your computer.

---

## STEP 2: Upload Certificate Files to VPS

### Option A: Using SCP (from your computer)

```bash
# Upload from your local computer to VPS
scp /path/to/certificate.crt darital@46.8.176.171:~/
scp /path/to/private.key darital@46.8.176.171:~/
scp /path/to/ca_bundle.crt darital@46.8.176.171:~/
```

### Option B: Copy-Paste Method

On your VPS, create the files:

```bash
# Create certificate file
sudo nano /etc/ssl/certs/darital-arenda.uz.crt
# Paste the certificate content, save with Ctrl+X, Y, Enter

# Create private key file
sudo nano /etc/ssl/private/darital-arenda.uz.key
# Paste the private key content, save with Ctrl+X, Y, Enter

# Create CA bundle file
sudo nano /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt
# Paste the CA bundle content, save with Ctrl+X, Y, Enter
```

---

## STEP 3: Set Correct Permissions

```bash
# Secure the private key
sudo chmod 600 /etc/ssl/private/darital-arenda.uz.key
sudo chown root:root /etc/ssl/private/darital-arenda.uz.key

# Set certificate permissions
sudo chmod 644 /etc/ssl/certs/darital-arenda.uz.crt
sudo chmod 644 /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt
```

---

## STEP 4: Update Nginx Configuration

```bash
sudo tee /etc/nginx/sites-available/darital > /dev/null <<'EOF'
# HTTPS Configuration with Purchased SSL

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
    
    # If you have a CA bundle, add this line:
    # ssl_trusted_certificate /etc/ssl/certs/darital-arenda.uz-ca-bundle.crt;
    
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

# Should return HTTP/2 200 or similar
```

---

## Troubleshooting

### If nginx test fails with "cannot load certificate":

Check file paths and permissions:
```bash
ls -la /etc/ssl/certs/darital-arenda.uz.crt
ls -la /etc/ssl/private/darital-arenda.uz.key

# View nginx error
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### If browser shows "certificate not trusted":

You might be missing the CA bundle. Make sure you included the intermediate certificates.

### If you get "mixed content" warnings:

Update your application's API URL to use HTTPS in the environment variables.

---

## What Files Do You Have?

Tell me what files your SSL provider gave you, and I'll help you install them correctly!

Common file names:
- `certificate.crt` or `your_domain.crt`
- `private.key` or `your_domain.key`  
- `ca_bundle.crt` or `intermediate.crt` or `chain.crt`
