# Complete Deployment Guide: Render + aHost.uz Domain

This guide will help you deploy your full Darital property management system to Render (free tier) and connect it with your ahost.uz domain.

## Prerequisites

- GitHub account (free)
- Render account (free) - Sign up at https://render.com
- aHost.uz domain already registered
- Git repository pushed to GitHub

---

## Part 1: Prepare Your Repository

### Step 1.1: Push Your Code to GitHub

If you haven't already:

```bash
# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for Render deployment"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Part 2: Set Up Render Account

### Step 2.1: Create Render Account

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

### Step 2.2: Connect GitHub Repository

1. In Render dashboard, go to "New" → "Blueprint"
2. Connect your GitHub account if not already connected
3. Select your repository
4. Render will detect the `render.yaml` file

---

## Part 3: Deploy Using Blueprint (Recommended)

### Step 3.1: Deploy from Blueprint

1. In Render dashboard, click "New" → "Blueprint"
2. Select your GitHub repository
3. Render will read `render.yaml` and create all services
4. Click "Apply" to create:
   - PostgreSQL database
   - Redis instance
   - API backend
   - Admin web
   - Tenant web

### Step 3.2: Wait for Initial Deployment

- This will take 10-15 minutes
- Services will build and deploy automatically
- Note the URLs provided (e.g., `darital-api.onrender.com`)

---

## Part 4: Configure Environment Variables

### Step 4.1: API Backend Environment Variables

Go to your API service → Environment tab, add:

```env
# Database (already set from blueprint)
DATABASE_URL=<auto-set from database service>

# Redis (already set from blueprint)
REDIS_URL=<auto-set from redis service>

# CORS Origins (update with your domains)
CORS_ORIGINS=https://admin.yourdomain.uz,https://tenant.yourdomain.uz,https://yourdomain.uz

# JWT Configuration
JWT_SECRET=<generate a strong random string>
JWT_EXPIRES_IN=7d

# MinIO Configuration (for file storage)
# Option 1: Use Render Disk (persistent storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=<generate-random-key>
MINIO_SECRET_KEY=<generate-random-key>
MINIO_BUCKET=contracts
MINIO_USE_SSL=false

# Option 2: Use external MinIO service (recommended for production)
# MINIO_ENDPOINT=your-minio-endpoint.com
# MINIO_PORT=443
# MINIO_ACCESS_KEY=your-access-key
# MINIO_SECRET_KEY=your-secret-key
# MINIO_BUCKET=contracts
# MINIO_USE_SSL=true

# Email Configuration (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@yourdomain.uz

# Payment Gateway (Checkout.uz)
CHECKOUTUZ_API_KEY=your-checkoutuz-api-key
CHECKOUTUZ_BASE_URL=https://checkout.uz/api
CHECKOUTUZ_TIMEOUT_MS=10000

# Optional: Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-admin-chat-id

# Optional: SMS Provider
SMS_PROVIDER=twilio
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-api-secret
SMS_FROM_NUMBER=+1234567890

# Optional: Firebase Cloud Messaging
FCM_KEY=<base64-encoded-firebase-service-account-json>

# Optional: Sentry Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id

# Port (Render sets this automatically)
PORT=10000
```

### Step 4.2: Admin Web Environment Variables

Go to Admin Web service → Environment tab:

```env
NODE_ENV=production
PORT=10000
NEXT_PUBLIC_API_URL=https://darital-api.onrender.com/api
# Update this after setting custom domain to: https://api.yourdomain.uz/api
```

### Step 4.3: Tenant Web Environment Variables

Go to Tenant Web service → Environment tab:

```env
NODE_ENV=production
PORT=10000
NEXT_PUBLIC_API_URL=https://darital-api.onrender.com/api
# Update this after setting custom domain to: https://api.yourdomain.uz/api
```

---

## Part 5: Run Database Migrations

### Step 5.1: Connect to Database

1. Go to your PostgreSQL service in Render
2. Copy the "Internal Database URL" (for Render services) or "External Database URL" (for local access)
3. Go to API service → Shell tab
4. Run:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

This will:
- Run all database migrations
- Generate Prisma client
- Seed initial data (admin user, etc.)

---

## Part 6: Configure Custom Domain (aHost.uz)

### Step 6.1: Get Your Render Service URLs

From Render dashboard, note these URLs:
- API: `https://darital-api.onrender.com`
- Admin Web: `https://darital-admin-web.onrender.com`
- Tenant Web: `https://darital-tenant-web.onrender.com`

### Step 6.2: Configure DNS in aHost.uz

1. Log in to your aHost.uz account
2. Go to Domain Management → DNS Settings
3. Add/Edit DNS records:

**For API Backend:**
```
Type: CNAME
Name: api (or @ for root domain)
Value: darital-api.onrender.com
TTL: 3600
```

**For Admin Web:**
```
Type: CNAME
Name: admin
Value: darital-admin-web.onrender.com
TTL: 3600
```

**For Tenant Web:**
```
Type: CNAME
Name: tenant
Value: darital-tenant-web.onrender.com
TTL: 3600
```

**Alternative: If you want root domain for main site:**
```
Type: CNAME
Name: @
Value: darital-admin-web.onrender.com (or tenant-web)
TTL: 3600
```

### Step 6.3: Add Custom Domain in Render

**For API Service:**
1. Go to API service → Settings → Custom Domains
2. Click "Add Custom Domain"
3. Enter: `api.yourdomain.uz`
4. Render will show DNS instructions (you already configured this)
5. Click "Verify" - it may take a few minutes

**For Admin Web:**
1. Go to Admin Web service → Settings → Custom Domains
2. Add: `admin.yourdomain.uz`
3. Verify

**For Tenant Web:**
1. Go to Tenant Web service → Settings → Custom Domains
2. Add: `tenant.yourdomain.uz`
3. Verify

### Step 6.4: Update Environment Variables

After domains are verified, update:

**Admin Web:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.uz/api
```

**Tenant Web:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.uz/api
```

**API Backend:**
```env
CORS_ORIGINS=https://admin.yourdomain.uz,https://tenant.yourdomain.uz,https://yourdomain.uz
```

Then redeploy all services.

---

## Part 7: Configure SSL Certificates

Render automatically provides SSL certificates via Let's Encrypt for custom domains. Once your domain is verified, SSL will be enabled automatically (may take 5-10 minutes).

---

## Part 8: File Storage Setup

### Option A: Use Render Disk (Simple but Limited)

1. Go to API service → Settings → Disks
2. Add a new disk (e.g., 1GB)
3. Mount it at `/mnt/storage`
4. Update MinIO config to use local storage

### Option B: Use External MinIO Service (Recommended)

1. Sign up for free MinIO hosting (e.g., DigitalOcean Spaces, AWS S3, or self-hosted)
2. Get endpoint, access key, and secret key
3. Update MinIO environment variables in API service

### Option C: Use Cloud Storage Services

- **Backblaze B2** (free tier: 10GB storage, 1GB/day download)
- **Wasabi** (free tier available)
- **AWS S3** (free tier: 5GB for 12 months)

---

## Part 9: Test Your Deployment

### Step 9.1: Test API

Visit: `https://api.yourdomain.uz/docs` (Swagger documentation)

### Step 9.2: Test Admin Web

Visit: `https://admin.yourdomain.uz`
- Try logging in with seeded admin credentials

### Step 9.3: Test Tenant Web

Visit: `https://tenant.yourdomain.uz`
- Test tenant login

---

## Part 10: Monitor and Maintain

### Step 10.1: Enable Auto-Deploy

1. Go to each service → Settings
2. Enable "Auto-Deploy" from main branch
3. Every push to main will auto-deploy

### Step 10.2: Monitor Logs

- Go to each service → Logs tab
- Monitor for errors and performance

### Step 10.3: Set Up Alerts

1. Go to Account Settings → Notifications
2. Enable email alerts for:
   - Service failures
   - Deployment failures
   - Resource limits

---

## Important Notes & Limitations

### Free Tier Limitations:

1. **Sleep Mode**: Free services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds to wake up
   - Solution: Upgrade to paid plan or use a service like UptimeRobot (free) to ping your services

2. **Resource Limits**:
   - 512MB RAM per service
   - Limited CPU (shared)
   - 100GB bandwidth/month

3. **Database**:
   - 1GB storage limit on free PostgreSQL
   - Backup retention: 7 days

4. **Redis**:
   - 25MB memory limit
   - May need to upgrade for production

### Recommendations:

1. **For Production**: Consider upgrading to paid plans ($7-25/month per service)
2. **Keep Services Awake**: Use UptimeRobot (free) to ping services every 5 minutes
3. **Database Backups**: Export database regularly (Render provides daily backups on free tier)
4. **Monitor Usage**: Check Render dashboard regularly for resource usage

---

## Troubleshooting

### Services Not Starting

1. Check logs in Render dashboard
2. Verify all environment variables are set
3. Check database connection string
4. Verify build commands are correct

### Domain Not Working

1. Wait 24-48 hours for DNS propagation
2. Verify DNS records in aHost.uz
3. Check domain verification status in Render
4. Clear browser cache and try again

### Database Connection Errors

1. Verify DATABASE_URL is correct
2. Check if database is running
3. Verify network connectivity (use Internal Database URL)

### Build Failures

1. Check build logs
2. Verify Node.js version (should be 18+)
3. Check package.json scripts
4. Verify all dependencies are in package.json

---

## Support Resources

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- aHost.uz Support: Contact through their support system

---

## Next Steps

1. Set up monitoring (UptimeRobot for keeping services awake)
2. Configure backups
3. Set up error tracking (Sentry)
4. Optimize for production (caching, CDN, etc.)
5. Consider upgrading to paid plans for better performance

Good luck with your deployment! 🚀
