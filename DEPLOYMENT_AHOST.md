# Deployment Guide for ahost.uz

This guide will help you deploy your Darital application to ahost.uz hosting and set up automatic deployments.

## 📋 Prerequisites

1. **Domain and Hosting** at ahost.uz
2. **SSH Access** to your server
3. **Node.js 18+** and **pnpm** installed on server
4. **PostgreSQL** database (can use ahost.uz database or external)
5. **Git** repository (GitHub/GitLab/Bitbucket)

## 🏗️ Architecture Overview

Your application consists of:
- **Backend API** (NestJS) - Port 3001
- **Admin Panel** (Next.js) - Port 3000
- **Tenant Portal** (Next.js) - Port 3002
- **Infrastructure**: PostgreSQL, Redis, MinIO

## 🚀 Step 1: Server Setup

### 1.1 Connect to Your Server

```bash
ssh username@your-server-ip
# or
ssh username@yourdomain.uz
```

### 1.2 Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 (Process Manager)
npm install -g pm2

# Install Nginx (if not already installed)
sudo apt install nginx -y

# Install PostgreSQL client (if needed)
sudo apt install postgresql-client -y
```

### 1.3 Create Application Directory

```bash
# Create directory for your app
sudo mkdir -p /var/www/darital
sudo chown -R $USER:$USER /var/www/darital
cd /var/www/darital
```

## 🔧 Step 2: Clone and Setup Repository

### 2.1 Clone Your Repository

```bash
cd /var/www/darital
git clone https://github.com/yourusername/your-repo.git .
# or if you have SSH key set up:
# git clone git@github.com:yourusername/your-repo.git .
```

### 2.2 Install Dependencies

```bash
pnpm install
```

## 🗄️ Step 3: Database Setup

### Option A: Using ahost.uz Database

1. Log into your ahost.uz control panel
2. Create a PostgreSQL database
3. Note down:
   - Database name
   - Database user
   - Database password
   - Database host (usually `localhost`)

### Option B: Using External Database

If you prefer external database (like Supabase, Railway, etc.), use those credentials.

### 3.1 Run Database Migrations

```bash
cd /var/www/darital/apps/api
pnpm prisma:generate
pnpm prisma:migrate deploy
```

## 🔐 Step 4: Environment Configuration

### 4.1 Backend API Environment (`apps/api/.env`)

```bash
cd /var/www/darital/apps/api
nano .env
```

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/darital

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS - Update with your production domains
CORS_ORIGINS=https://admin.yourdomain.uz,https://portal.yourdomain.uz

# Server
PORT=3001
NODE_ENV=production

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=contracts

# Email (SMTP)
MAIL_HOST=smtp.your-email-provider.com
MAIL_PORT=587
MAIL_USER=your-email@yourdomain.uz
MAIL_PASS=your-email-password
MAIL_FROM=noreply@yourdomain.uz

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-admin-chat-id

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn

# Firebase (optional)
FCM_KEY=your-firebase-key
```

### 4.2 Admin Panel Environment (`apps/admin-web/.env.local`)

```bash
cd /var/www/darital/apps/admin-web
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.uz/api
NODE_ENV=production
```

### 4.3 Tenant Portal Environment (`apps/tenant-web/.env.local`)

```bash
cd /var/www/darital/apps/tenant-web
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.uz/api
NODE_ENV=production
```

## 🏗️ Step 5: Build Applications

```bash
cd /var/www/darital

# Build all applications
pnpm build

# Or build individually:
# cd apps/api && pnpm build
# cd ../admin-web && pnpm build
# cd ../tenant-web && pnpm build
```

## 🚀 Step 6: Start Services with PM2

### 6.1 Create PM2 Ecosystem File

```bash
cd /var/www/darital
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'darital-api',
      script: './apps/api/dist/main.js',
      cwd: '/var/www/darital',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/www/darital/logs/api-error.log',
      out_file: '/var/www/darital/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'darital-admin',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/darital/apps/admin-web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/www/darital/logs/admin-error.log',
      out_file: '/var/www/darital/logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'darital-tenant',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/darital/apps/tenant-web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/var/www/darital/logs/tenant-error.log',
      out_file: '/var/www/darital/logs/tenant-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

### 6.2 Create Logs Directory

```bash
mkdir -p /var/www/darital/logs
```

### 6.3 Start Services

```bash
cd /var/www/darital
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # This will generate a command to run on boot
```

### 6.4 PM2 Useful Commands

```bash
pm2 list              # List all processes
pm2 logs              # View logs
pm2 restart all       # Restart all apps
pm2 stop all          # Stop all apps
pm2 delete all        # Delete all apps
pm2 monit             # Monitor dashboard
```

## 🌐 Step 7: Nginx Configuration

### 7.1 Create Nginx Configuration Files

```bash
sudo nano /etc/nginx/sites-available/darital-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.uz;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nano /etc/nginx/sites-available/darital-admin
```

```nginx
server {
    listen 80;
    server_name admin.yourdomain.uz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nano /etc/nginx/sites-available/darital-tenant
```

```nginx
server {
    listen 80;
    server_name portal.yourdomain.uz;  # or yourdomain.uz

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.2 Enable Sites

```bash
sudo ln -s /etc/nginx/sites-available/darital-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/darital-admin /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/darital-tenant /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 7.3 Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificates
sudo certbot --nginx -d api.yourdomain.uz
sudo certbot --nginx -d admin.yourdomain.uz
sudo certbot --nginx -d portal.yourdomain.uz

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

## 🔄 Step 8: Setup Automatic Deployment (CI/CD)

See `DEPLOYMENT_CI_CD.md` for GitHub Actions setup, or use the deployment script below.

## 📝 Step 9: Manual Deployment Script

Create a deployment script for easy updates:

```bash
cd /var/www/darital
nano deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /var/www/darital

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build applications
echo "🏗️ Building applications..."
pnpm build

# Run database migrations
echo "🗄️ Running database migrations..."
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate deploy
cd ../..

# Restart PM2 processes
echo "🔄 Restarting services..."
pm2 restart all

echo "✅ Deployment complete!"
```

Make it executable:

```bash
chmod +x deploy.sh
```

Run deployment:

```bash
./deploy.sh
```

## 🔍 Step 10: Monitoring and Maintenance

### Check Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Application logs
tail -f /var/www/darital/logs/api-error.log
tail -f /var/www/darital/logs/admin-error.log
```

### Health Checks

```bash
# Check if services are running
pm2 status

# Check API health
curl http://localhost:3001/health

# Check if ports are listening
netstat -tulpn | grep -E '3000|3001|3002'
```

## 🐛 Troubleshooting

### Services Not Starting

```bash
# Check PM2 logs
pm2 logs darital-api --lines 50

# Check if ports are available
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :3002

# Restart services
pm2 restart all
```

### Database Connection Issues

```bash
# Test database connection
cd apps/api
pnpm prisma:generate
pnpm prisma db pull  # Test connection
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## ✅ Deployment Checklist

- [ ] Server setup complete
- [ ] Node.js and pnpm installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Database configured and migrated
- [ ] Environment variables set
- [ ] Applications built
- [ ] PM2 configured and running
- [ ] Nginx configured
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Services tested and working
- [ ] Monitoring set up

