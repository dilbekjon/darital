# Darital VPS Deployment Guide

Complete guide to deploy Darital application to your VPS at airnet.uz

## Server Details
- **Server IP**: 46.8.176.171
- **OS**: Ubuntu 22.04
- **Location**: BKM
- **SSH Login**: darital
- **Domain**: darital-arenda.uz
jdmkT9Jlf7
## Prerequisites

### 1. Initial VPS Setup (SSH Access)

```bash
# Connect to VPS
ssh darital@46.8.176.171

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Install Git
sudo apt install -y git

# Install Nginx (for reverse proxy and SSL)
sudo apt install -y nginx

# Install Certbot for SSL certificates
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Clone Repository on VPS

```bash
cd ~
git clone https://github.com/dilbekjon/darital.git
cd darital

# Or if SSH key is set up:
git clone git@github.com:YOUR_USERNAME/darital.git
cd darital
```

### 3. Set Up Environment Files

```bash
# Copy production environment file
cp .env.production .env

# Edit with your actual values
nano .env
```

**Update these values in `.env`:**
- `POSTGRES_PASSWORD` - Use a strong password
- `MINIO_ROOT_PASSWORD` - Use a strong password
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `MAIL_*` - Add your email service credentials
- `NEXT_PUBLIC_API_URL` - Set to your domain: `https://api.darital-arenda.uz/api`
- `CORS_ORIGINS` - Update with your actual domains

### 4. Start Services

```bash
# Navigate to project root
cd ~/darital

# Start Docker Compose services (uses docker-compose.prod.yml + .env)
docker-compose -f docker-compose.prod.yml up -d
jdmkT9Jlf7
# View logs
docker-compose logs -f

# Check container status
docker-compose ps
```

### 5. Configure Nginx (Reverse Proxy + SSL)

Create Nginx config for SSL termination:

```bash
sudo nano /etc/nginx/sites-available/darital
```

Add the configuration from `deploy/nginx.ssl.conf` in your project.

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5.1 Nginx restart failure diagnosis (write everything here)

If `sudo systemctl restart nginx` fails after syntax passes, run:

```bash
sudo systemctl status nginx.service --no-pager
sudo journalctl -xeu nginx.service --no-pager --since '5 minutes ago'
sudo ss -tulpn | grep -E ':(80|443)'
sudo nginx -T | sed -n '1,240p'
```

Common fixes:
- Stop Apache/nginx duplicates: `sudo systemctl stop apache2` or `sudo systemctl stop nginx` if an old process remains.
- Remove duplicate `listen 80`/`listen 443 default_server` definitions in enabled configs.
- Ensure `/etc/nginx/nginx.conf` has `user www-data;` and no conflicting `events` block.

### 5.2 Add your real output below for diagnosis

**systemctl status nginx.service**
```
× nginx.service - A high performance web server and a reverse proxy server
× nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor p>
     Active: failed (Result: exit-code) since Thu 2026-03-26 20:53:22 UTC>
       Docs: man:nginx(8)
    Process: 360939 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; mast>
    Process: 360940 ExecStart=/usr/sbin/nginx -g daemon on; master_proces>
        CPU: 89ms

Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] still could not bin>
...skipping...
× nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor p>
     Active: failed (Result: exit-code) since Thu 2026-03-26 20:53:22 UTC>
       Docs: man:nginx(8)
    Process: 360939 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; mast>
    Process: 360940 ExecStart=/usr/sbin/nginx -g daemon on; master_proces>
        CPU: 89ms

Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] still could not bin>
Mar 26 20:53:22 darital systemd[1]: nginx.service: Control process exited>
Mar 26 20:53:22 darital systemd[1]: nginx.service: Failed with result 'ex>
Mar 26 20:53:22 darital systemd[1]: Failed to start A high performance we>
       Docs: man:nginx(8)
    Process: 360939 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; mast>
    Process: 360940 ExecStart=/usr/sbin/nginx -g daemon on; master_proces>
        CPU: 89ms
### 5.3 Action for bind() to 0.0.0.0:80 errors

Your output clearly shows:
- `nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)`
- `nginx: [emerg] still could not bind()`

This means another process is holding port 80, blocking nginx.

Run these commands and paste results here also:

```bash
sudo ss -tulpn | grep -E ':(80|443)'
sudo lsof -i :80 -nP
sudo lsof -i :443 -nP
```

Then stop or reconfigure the conflicting service:

- If Docker already owns 80 (common with compose service using host mode), change the compose port mapping to another port or disable that service.
- If an existing nginx/apache process is active, stop it:

```bash
sudo systemctl stop nginx
sudo systemctl stop apache2  # if present
```

- Confirm port freed:

```bash
sudo ss -tulpn | grep -E ':(80|443)'
```

- Then start nginx:

```bash
sudo systemctl start nginx
sudo systemctl status nginx --no-pager
```

If `docker compose` services need to stay on 80 for the app, update your Nginx config and compose mapping to use a nonconflicting port, e.g. 8080 for internal app and keep nginx on 80/443.

Add these findings here and I’ll give the exact port-mapping command for your `docker-compose.prod.yml` setup.

### 5.4 ✅ SOLUTION: Port Conflict Fixed

**Problem Identified:** Docker containers were binding to ports 80/443, preventing system nginx from starting.

**Solution Applied:** 
1. Updated `docker-compose.prod.yml` to expose container ports only to localhost (127.0.0.1)
2. Created proper system nginx configuration (`deploy/nginx.system.conf`)
3. System nginx now proxies public traffic (ports 80/443) to Docker containers on localhost

**Architecture:**
```
Internet (80/443) → System Nginx → Docker Containers (localhost:3000/3001/3002/9000)
```

**Complete Fix Instructions:** See `NGINX_FIX_INSTRUCTIONS.md` for detailed step-by-step guide.

**Quick Fix Commands:**

```bash
# 1. Stop Docker containers to free ports
cd ~/darital
docker compose -f docker-compose.prod.yml down

# 2. Pull latest changes (updated docker-compose.prod.yml)
git pull origin main

# 3. Install correct nginx config
sudo rm /etc/nginx/sites-enabled/darital
sudo rm /etc/nginx/sites-available/darital
sudo cp ~/darital/deploy/nginx.system.conf /etc/nginx/sites-available/darital
sudo ln -s /etc/nginx/sites-available/darital /etc/nginx/sites-enabled/darital
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# 4. Test nginx config
sudo nginx -t

# 5. Create certbot directory
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot

# 6. Start Docker containers (now on localhost only)
docker compose -f docker-compose.prod.yml up -d --build

# 7. Start system nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx

# 8. Verify
sudo ss -tulpn | grep -E ':(80|443)'  # Should show nginx, not docker-proxy
curl -I http://46.8.176.171
```

**Port Mapping After Fix:**
- Admin Web: `127.0.0.1:3000` (proxied via nginx)
- API: `127.0.0.1:3001` (proxied via nginx)
- Tenant Web: `127.0.0.1:3002` (proxied via nginx)
- MinIO API: `127.0.0.1:9000` (proxied via nginx)
- MinIO Console: `127.0.0.1:9001` (direct access)
- System Nginx: `0.0.0.0:80` and `0.0.0.0:443` (public)

Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:21 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] bind() to 0.0.0.0:8>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] bind() to [::]:80 f>
Mar 26 20:53:22 darital nginx[360940]: nginx: [emerg] still could not bin>
Mar 26 20:53:22 darital systemd[1]: nginx.service: Control process exited>
Mar 26 20:53:22 darital systemd[1]: nginx.service: Failed with result 'ex>
Mar 26 20:53:22 darital systemd[1]: Failed to start A high performance we>

# paste here
```

**journalctl -xeu nginx.service --since '5 minutes ago'**
```
Mar 26 20:53:22 darital systemd[1]: nginx.service: Failed with result 'ex>
░░ Subject: Unit failed
░░ Defined-By: systemd
░░ Support: http://www.ubuntu.com/support
░░ 
░░ The unit nginx.service has entered the 'failed' state with result 'exi>
Mar 26 20:53:22 darital systemd[1]: Failed to start A high performance we>
░░ Subject: A start job for unit nginx.service has failed
░░ Defined-By: systemd
░░ Support: http://www.ubuntu.com/support
░░ 
░░ A start job for unit nginx.service has finished with a failure.
░░ 
░░ The job identifier is 14298 and the job result is failed.
# paste here
```

**ss -tulpn | grep -E ':(80|443)'**
```
darital@darital:~/darital$ ss -tulpn | grep -E ':(80|443)'
tcp   LISTEN 0      4096               0.0.0.0:443       0.0.0.0:*          
tcp   LISTEN 0      4096               0.0.0.0:80        0.0.0.0:*          
tcp   LISTEN 0      4096                  [::]:443          [::]:*          
tcp   LISTEN 0      4096                  [::]:80           [::]:*          
# paste here
```

**sudo nginx -T | sed -n '1,240p'**
```
sudo nginx -T | sed -n '1,240p'
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
# configuration file /etc/nginx/nginx.conf:
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
        worker_connections 768;
        # multi_accept on;
}

http {

        ##
        # Basic Settings
        ##

        sendfile on;
        tcp_nopush on;
        types_hash_max_size 2048;
        # server_tokens off;

        # server_names_hash_bucket_size 64;
        # server_name_in_redirect off;

        include /etc/nginx/mime.types;
        default_type application/octet-stream;

        ##
        # SSL Settings
        ##

        ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3; # Dropping SSLv3, ref: POODLE
        ssl_prefer_server_ciphers on;

        ##
        # Logging Settings
        ##

        access_log /var/log/nginx/access.log;
        error_log /var/log/nginx/error.log;

        ##
        # Gzip Settings
        ##

        gzip on;

        # gzip_vary on;
        # gzip_proxied any;
        # gzip_comp_level 6;
        # gzip_buffers 16 8k;
        # gzip_http_version 1.1;
        # gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

        ##
        # Virtual Host Configs
        ##

        include /etc/nginx/conf.d/*.conf;
        include /etc/nginx/sites-enabled/*;
}


#mail {
#       # See sample authentication script at:
#       # http://wiki.nginx.org/ImapAuthenticateWithApachePhpScript
#
#       # auth_http localhost/auth.php;
#       # pop3_capabilities "TOP" "USER";
#       # imap_capabilities "IMAP4rev1" "UIDPLUS";
#
#       server {
#               listen     localhost:110;
#               protocol   pop3;
#               proxy      on;
#       }
#
#       server {
#               listen     localhost:143;
#               protocol   imap;
#               proxy      on;
#       }
#}

# configuration file /etc/nginx/modules-enabled/50-mod-http-geoip2.conf:
load_module modules/ngx_http_geoip2_module.so;

# configuration file /etc/nginx/modules-enabled/50-mod-http-image-filter.conf:
load_module modules/ngx_http_image_filter_module.so;

# configuration file /etc/nginx/modules-enabled/50-mod-http-xslt-filter.conf:
load_module modules/ngx_http_xslt_filter_module.so;

# configuration file /etc/nginx/modules-enabled/50-mod-mail.conf:
load_module modules/ngx_mail_module.so;

# configuration file /etc/nginx/modules-enabled/50-mod-stream.conf:
load_module modules/ngx_stream_module.so;

# configuration file /etc/nginx/modules-enabled/70-mod-stream-geoip2.conf:
load_module modules/ngx_stream_geoip2_module.so;

# configuration file /etc/nginx/mime.types:

types {
    text/html                             html htm shtml;
    text/css                              css;
    text/xml                              xml;
    image/gif                             gif;
    image/jpeg                            jpeg jpg;
    application/javascript                js;
    application/atom+xml                  atom;
    application/rss+xml                   rss;

    text/mathml                           mml;
    text/plain                            txt;
    text/vnd.sun.j2me.app-descriptor      jad;
    text/vnd.wap.wml                      wml;
    text/x-component                      htc;

    image/png                             png;
    image/tiff                            tif tiff;
    image/vnd.wap.wbmp                    wbmp;
    image/x-icon                          ico;
    image/x-jng                           jng;
    image/x-ms-bmp                        bmp;
    image/svg+xml                         svg svgz;
    image/webp                            webp;

    application/font-woff                 woff;
    application/java-archive              jar war ear;
    application/json                      json;
    application/mac-binhex40              hqx;
    application/msword                    doc;
    application/pdf                       pdf;
    application/postscript                ps eps ai;
    application/rtf                       rtf;
    application/vnd.apple.mpegurl         m3u8;
    application/vnd.ms-excel              xls;
    application/vnd.ms-fontobject         eot;
    application/vnd.ms-powerpoint         ppt;
    application/vnd.wap.wmlc              wmlc;
    application/vnd.google-earth.kml+xml  kml;
    application/vnd.google-earth.kmz      kmz;
    application/x-7z-compressed           7z;
    application/x-cocoa                   cco;
    application/x-java-archive-diff       jardiff;
    application/x-java-jnlp-file          jnlp;
    application/x-makeself                run;
    application/x-perl                    pl pm;
    application/x-pilot                   prc pdb;
    application/x-rar-compressed          rar;
    application/x-redhat-package-manager  rpm;
    application/x-sea                     sea;
    application/x-shockwave-flash         swf;
    application/x-stuffit                 sit;
    application/x-tcl                     tcl tk;
    application/x-x509-ca-cert            der pem crt;
    application/x-xpinstall               xpi;
    application/xhtml+xml                 xhtml;
    application/xspf+xml                  xspf;
    application/zip                       zip;

    application/octet-stream              bin exe dll;
    application/octet-stream              deb;
    application/octet-stream              dmg;
    application/octet-stream              iso img;
    application/octet-stream              msi msp msm;

    application/vnd.openxmlformats-officedocument.wordprocessingml.document    docx;
    application/vnd.openxmlformats-officedocument.spreadsheetml.sheet          xlsx;
    application/vnd.openxmlformats-officedocument.presentationml.presentation  pptx;

    audio/midi                            mid midi kar;
    audio/mpeg                            mp3;
    audio/ogg                             ogg;
    audio/x-m4a                           m4a;
    audio/x-realaudio                     ra;

    video/3gpp                            3gpp 3gp;
    video/mp2t                            ts;
    video/mp4                             mp4;
    video/mpeg                            mpeg mpg;
    video/quicktime                       mov;
    video/webm                            webm;
    video/x-flv                           flv;
    video/x-m4v                           m4v;
    video/x-mng                           mng;
    video/x-ms-asf                        asx asf;
    video/x-ms-wmv                        wmv;
    video/x-msvideo                       avi;
}

# configuration file /etc/nginx/sites-enabled/darital:
# NGINX copy/paste deployment config for /etc/nginx/sites-available/darital

server {
    listen 80;
    server_name admin.darital-arenda.uz tenant.darital-arenda.uz api.darital-arenda.uz;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
    }
}

# Optional redirect block for HTTP to HTTPS path (if you plan to set up SSL after this):
# server {
#     listen 80;
#     server_name admin.darital-arenda.uz tenant.darital-arenda.uz api.darital-arenda.uz;
#     return 301 https://$host$request_uri;
# }

# If there are validation issues:
# sudo journalctl -u nginx --no-pager --since "5 minutes ago"


# configuration file /etc/nginx/sites-enabled/default:
##
# You should look at the following URL's in order to grasp a solid understanding
# of Nginx configuration files in order to fully unleash the power of Nginx.
# https://www.nginx.com/resources/wiki/start/
# https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/
# https://wiki.debian.org/Nginx/DirectoryStructure
#
# In most cases, administrators will remove this file from sites-enabled/ and
# leave it as reference inside of sites-available where it will continue to be
# updated by the nginx packaging team.
#
# This file will automatically load configuration files provided by other
# applications, such as Drupal or Wordpress. These applications will be made
# available underneath a path with that package name, such as /drupal8.
#
darital@darital:~/darital$ 
```

Put the output of these commands in this file, not chat, so the problem is visible in one place.

### 6. Set Up SSL Certificate

```bash
sudo certbot certonly --nginx -d darital-arenda.uz -d api.darital-arenda.uz -d admin.darital-arenda.uz -d www.darital-arenda.uz

# Auto-renew SSL
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
```

### 7. Database Setup

```bash
# Run database migrations
docker compose exec api npx prisma migrate deploy

# (Optional) Run database seeding
# docker compose exec api node prisma/seed.ts
```

## Deployment Workflow

### Push New Code to VPS

```bash
# On your local machine
git add .
git commit -m "Your message"
git push origin main

# On VPS
cd ~/darital
git pull origin main

# Rebuild and restart services
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose logs -f api
```

### View Container Logs

```bash
docker compose logs -f api        # API logs
docker compose logs -f admin-web  # Admin web logs
docker compose logs -f tenant-web # Tenant web logs
docker compose logs -f postgres   # Database logs
docker compose logs -f redis      # Cache logs
docker compose logs -f minio      # File storage logs
```

### Port Mapping

- **80** (HTTP) → Nginx
- **443** (HTTPS) → Nginx
- **5432** → PostgreSQL (internal only - no external access)
- **6379** → Redis (internal only - no external access)
- **9000** → MinIO API (internal, proxied through Nginx at `/files`)
- **9001** → MinIO Console (http://localhost:9001)

### Useful Commands

```bash
# Restart all services
docker compose restart

# Stop all services
docker compose down

# Remove all data (WARNING: destructive)
docker compose down -v

# Execute command in API container
docker compose exec api bash

# Access PostgreSQL
docker compose exec postgres psql -U postgres -d darital

# Access Redis
docker compose exec redis redis-cli

# View Docker disk usage
docker system df

# Clean up unused Docker images/volumes
docker system prune
```

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker compose logs

# Check if ports are already in use
sudo netstat -tulpn | grep LISTEN

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database Connection Issues
```bash
# Check database is running
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U postgres -d darital -c "SELECT 1"
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx config syntax
sudo nginx -t
```

### Disk Space Issues
```bash
# Check disk usage
df -h

# Check Docker usage
docker system df

# Clean up Docker
docker system prune -a
docker volume prune
```

## Security Checklist

- [ ] Change all default passwords (.env file)
- [ ] Set strong JWT_SECRET
- [ ] Configure firewall rules
- [ ] Enable SSH key authentication (disable password)
- [ ] Set up regular database backups
- [ ] Monitor server resources
- [ ] Keep Docker and system packages updated
- [ ] Use HTTPS everywhere (SSL certificates)
- [ ] Restrict database access to internal network only
- [ ] Use strong MinIO credentials

## Backup Strategy

```bash
# Backup database
docker compose exec postgres pg_dump -U postgres darital > backup_$(date +%Y%m%d).sql

# Backup MinIO data
docker cp darital-minio:/data ./minio_backup_$(date +%Y%m%d)

# Restore database
docker compose exec -T postgres psql -U postgres darital < backup_20260325.sql
```

## Monitoring

Monitor your application health:

```bash
# Check system resources
top
free -h
df -h

# Monitor Docker logs in real-time
docker compose logs --tail=50 -f

# Check container resource usage
docker stats
```

## Support & Documentation

- Project Repository: https://github.com/YOUR_USERNAME/darital
- Render Configuration: `render.yaml` (alternative cloud deployment)
- Local Development: See root README.md
- Docker Compose Files: 
  - Development: `docker-compose.yml`
  - Production: `docker-compose.prod.yml`
  - VPS Override: `docker-compose.vps.yml`
