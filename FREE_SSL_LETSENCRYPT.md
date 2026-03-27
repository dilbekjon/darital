# Get FREE SSL with Let's Encrypt (Wildcard)

## Let's Encrypt provides FREE SSL certificates, including wildcards!

But first, you need to fix the firewall issue.

---

## PROBLEM: Hosting Provider Firewall

Your hosting provider (airnet.uz) is blocking port 80 from the internet, which prevents Let's Encrypt from verifying your domain.

### Solution: Contact airnet.uz Support

**Send this message to airnet.uz support (in Russian):**

---

Здравствуйте,

У меня VPS сервер с IP 46.8.176.171 (пользователь: darital).

Я пытаюсь установить SSL-сертификат Let's Encrypt, но получаю ошибку:
"Timeout during connect (likely firewall problem)"

**Проблема:** Порты 80 и 443 заблокированы на уровне сети, и Let's Encrypt не может подключиться к моему серверу для проверки домена.

**Запрос:** Пожалуйста, откройте следующие порты для моего VPS:
- Порт 80 (HTTP) - входящие соединения
- Порт 443 (HTTPS) - входящие соединения

Эти порты необходимы для:
1. Получения SSL-сертификата от Let's Encrypt
2. Работы веб-сайта darital-arenda.uz

Спасибо!

---

**English version:**

Hello,

I have a VPS server with IP 46.8.176.171 (user: darital).

I'm trying to install a Let's Encrypt SSL certificate, but I'm getting an error:
"Timeout during connect (likely firewall problem)"

**Problem:** Ports 80 and 443 are blocked at the network level, and Let's Encrypt cannot connect to my server to verify the domain.

**Request:** Please open the following ports for my VPS:
- Port 80 (HTTP) - incoming connections
- Port 443 (HTTPS) - incoming connections

These ports are required for:
1. Obtaining SSL certificate from Let's Encrypt
2. Running the website darital-arenda.uz

Thank you!

---

## AFTER airnet.uz Opens the Ports:

### Get FREE Wildcard SSL from Let's Encrypt

```bash
# Install certbot DNS plugin for manual DNS challenge
sudo apt install -y certbot

# Get wildcard certificate using DNS challenge
sudo certbot certonly --manual --preferred-challenges dns \
  -d darital-arenda.uz \
  -d *.darital-arenda.uz
```

**Certbot will ask you to:**
1. Add a TXT record to your DNS
2. Wait for DNS to propagate
3. Press Enter to continue

**Example TXT record:**
- Name: `_acme-challenge.darital-arenda.uz`
- Type: `TXT`
- Value: (certbot will give you this value)

### After Getting the Certificate:

```bash
# Update nginx config to use Let's Encrypt certificates
sudo tee /etc/nginx/sites-available/darital > /dev/null <<'EOF'
# HTTPS with Let's Encrypt Wildcard Certificate

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name darital-arenda.uz www.darital-arenda.uz admin.darital-arenda.uz api.darital-arenda.uz;
    return 301 https://$host$request_uri;
}

# API Server - HTTPS
server {
    listen 443 ssl http2;
    server_name api.darital-arenda.uz;
    
    ssl_certificate /etc/letsencrypt/live/darital-arenda.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/darital-arenda.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location /files/ {
        proxy_pass http://localhost:9000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin Portal - HTTPS
server {
    listen 443 ssl http2;
    server_name admin.darital-arenda.uz;
    
    ssl_certificate /etc/letsencrypt/live/darital-arenda.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/darital-arenda.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Tenant Portal - HTTPS
server {
    listen 443 ssl http2;
    server_name darital-arenda.uz www.darital-arenda.uz;
    
    ssl_certificate /etc/letsencrypt/live/darital-arenda.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/darital-arenda.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx
```

---

## Summary:

1. ✅ Your main site works with HTTPS
2. ❌ Subdomains need wildcard certificate
3. 💰 Sectigo wildcard = paid
4. 🆓 Let's Encrypt wildcard = FREE (but need firewall opened)

**Next steps:**
1. Contact airnet.uz to open ports 80/443
2. Use Let's Encrypt DNS challenge for FREE wildcard SSL
3. Or buy wildcard from Sectigo if you prefer