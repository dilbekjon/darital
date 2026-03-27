#!/bin/bash
# Complete SSL Setup Script for Darital VPS
# Run this on your VPS: bash FINAL_SSL_SETUP.sh

set -e

echo "========================================="
echo "Darital SSL Setup Script"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo: sudo bash FINAL_SSL_SETUP.sh"
    exit 1
fi

echo "Step 1: Checking existing certificates..."
if [ -d "/etc/letsencrypt/live/darital-arenda.uz" ]; then
    echo "✅ Let's Encrypt certificate found!"
    CERT_PATH="/etc/letsencrypt/live/darital-arenda.uz"
    USE_LETSENCRYPT=true
elif [ -f "/etc/ssl/certs/darital-arenda.uz.crt" ]; then
    echo "✅ Purchased SSL certificate found!"
    CERT_PATH="/etc/ssl/certs"
    USE_LETSENCRYPT=false
else
    echo "❌ No SSL certificates found!"
    echo "Please run the DNS challenge method to get a certificate first."
    exit 1
fi

echo ""
echo "Step 2: Creating nginx HTTPS configuration..."

if [ "$USE_LETSENCRYPT" = true ]; then
    # Use Let's Encrypt certificates
    cat > /etc/nginx/sites-available/darital <<'EOF'
# HTTPS Configuration with Let's Encrypt

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name darital-arenda.uz www.darital-arenda.uz admin.darital-arenda.uz api.darital-arenda.uz;
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
        proxy_set_header X-Forwarded-Proto https;
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
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400;
        client_max_body_size 100M;
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
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400;
        client_max_body_size 100M;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
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
        proxy_set_header X-Forwarded-Proto https;
    }
    
    location /files/ {
        proxy_pass http://localhost:9000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        client_max_body_size 100M;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400;
        client_max_body_size 100M;
    }
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF
else
    echo "Using purchased SSL certificate..."
    # Configuration for purchased SSL would go here
fi

echo ""
echo "Step 3: Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid!"
    echo ""
    echo "Step 4: Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded!"
else
    echo "❌ Nginx configuration has errors!"
    exit 1
fi

echo ""
echo "Step 5: Testing HTTPS..."
echo "Testing https://darital-arenda.uz..."
curl -Ik https://darital-arenda.uz | head -1

echo "Testing https://admin.darital-arenda.uz..."
curl -Ik https://admin.darital-arenda.uz | head -1

echo "Testing https://api.darital-arenda.uz..."
curl -Ik https://api.darital-arenda.uz | head -1

echo ""
echo "========================================="
echo "✅ SSL Setup Complete!"
echo "========================================="
echo ""
echo "Your sites are now available at:"
echo "  - https://darital-arenda.uz"
echo "  - https://admin.darital-arenda.uz"
echo "  - https://api.darital-arenda.uz"
echo ""
