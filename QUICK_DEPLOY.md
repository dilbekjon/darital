# Quick Deployment Guide

## 🚀 Fast Track Deployment (5 Steps)

### Step 1: Prepare Your Server

```bash
# SSH into your server
ssh username@your-server-ip

# Install Node.js and pnpm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm pm2

# Create project directory
sudo mkdir -p /var/www/darital
sudo chown -R $USER:$USER /var/www/darital
cd /var/www/darital
```

### Step 2: Clone Repository

```bash
git clone https://github.com/yourusername/your-repo.git .
pnpm install
```

### Step 3: Configure Environment

```bash
# Backend
cd apps/api
cp ../../env.example .env
nano .env  # Edit with your production values

# Admin Panel
cd ../admin-web
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.uz/api" > .env.local

# Tenant Portal
cd ../tenant-web
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.uz/api" > .env.local
```

### Step 4: Build and Start

```bash
cd /var/www/darital
pnpm build
cd apps/api && pnpm prisma:migrate deploy && cd ../..
pm2 start ecosystem.config.js
pm2 save
```

### Step 5: Setup Nginx and SSL

```bash
# Copy Nginx configs (see DEPLOYMENT_AHOST.md)
sudo nano /etc/nginx/sites-available/darital-api
# ... (copy config from DEPLOYMENT_AHOST.md)

sudo ln -s /etc/nginx/sites-available/darital-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d api.yourdomain.uz
```

## 🔄 Automatic Deployment Setup

### Option 1: GitHub Actions (Recommended)

1. **Add GitHub Secrets**:
   - Go to: Settings → Secrets → Actions
   - Add: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`

2. **Push to main branch**:
   ```bash
   git push origin main
   ```
   Deployment happens automatically!

### Option 2: Manual Script

```bash
# Copy deploy.sh to server
scp deploy.sh username@your-server-ip:/var/www/darital/

# SSH and run
ssh username@your-server-ip
cd /var/www/darital
chmod +x deploy.sh
./deploy.sh
```

## 📝 Important Notes

1. **Update CORS** in `apps/api/src/main.ts` with your production domains
2. **Set strong JWT_SECRET** in production
3. **Configure database** connection
4. **Setup SSL** certificates for HTTPS
5. **Configure DNS** to point to your server

## 🆘 Need Help?

- Full guide: See `DEPLOYMENT_AHOST.md`
- CI/CD setup: See `DEPLOYMENT_CI_CD.md`
- Troubleshooting: Check logs with `pm2 logs`

