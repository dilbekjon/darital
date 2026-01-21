# Environment Variables Template for Render Deployment

Copy these environment variables to your Render services. Replace placeholder values with your actual configuration.

## API Backend Service Environment Variables

```env
# ============================================
# DATABASE (Auto-configured from Render)
# ============================================
DATABASE_URL=<auto-set from database service>

# ============================================
# REDIS (Auto-configured from Render)
# ============================================
REDIS_URL=<auto-set from redis service>

# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
PORT=10000

# ============================================
# CORS Configuration
# ============================================
# Update with your actual domains after DNS setup
CORS_ORIGINS=https://admin.yourdomain.uz,https://tenant.yourdomain.uz,https://yourdomain.uz

# ============================================
# JWT Authentication
# ============================================
# Generate a strong random string (32+ characters)
# You can use: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this-immediately
JWT_EXPIRES_IN=7d

# ============================================
# MinIO File Storage
# ============================================
# Option 1: Local storage (Render Disk - limited)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=contracts
MINIO_USE_SSL=false

# Option 2: External MinIO (Recommended)
# MINIO_ENDPOINT=your-minio-endpoint.com
# MINIO_PORT=443
# MINIO_ACCESS_KEY=your-access-key
# MINIO_SECRET_KEY=your-secret-key
# MINIO_BUCKET=contracts
# MINIO_USE_SSL=true

# ============================================
# Email Configuration (SMTP)
# ============================================
# Gmail Example:
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-specific-password
MAIL_FROM=noreply@yourdomain.uz

# SendGrid Example:
# MAIL_HOST=smtp.sendgrid.net
# MAIL_PORT=587
# MAIL_USER=apikey
# MAIL_PASS=your-sendgrid-api-key
# MAIL_FROM=noreply@yourdomain.uz

# ============================================
# Payment Gateway (Checkout.uz)
# ============================================
CHECKOUTUZ_API_KEY=your-checkoutuz-api-key-here
CHECKOUTUZ_BASE_URL=https://checkout.uz/api
CHECKOUTUZ_TIMEOUT_MS=10000

# ============================================
# Telegram Bot (Optional)
# ============================================
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-admin-chat-id

# ============================================
# SMS Provider (Optional)
# ============================================
SMS_PROVIDER=twilio
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-api-secret
SMS_FROM_NUMBER=+1234567890

# ============================================
# Firebase Cloud Messaging (Optional)
# ============================================
# Base64 encode your Firebase service account JSON
# cat firebase-service-account.json | base64
FCM_KEY=your-base64-encoded-firebase-json

# ============================================
# Sentry Error Tracking (Optional)
# ============================================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

---

## Admin Web Service Environment Variables

```env
NODE_ENV=production
PORT=10000

# API URL - Update after setting custom domain
# Initially use Render URL:
NEXT_PUBLIC_API_URL=https://darital-api.onrender.com/api

# After custom domain is set, update to:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.uz/api
```

---

## Tenant Web Service Environment Variables

```env
NODE_ENV=production
PORT=10000

# API URL - Update after setting custom domain
# Initially use Render URL:
NEXT_PUBLIC_API_URL=https://darital-api.onrender.com/api

# After custom domain is set, update to:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.uz/api
```

---

## How to Generate Secure Keys

### JWT Secret (32+ characters)
```bash
openssl rand -base64 32
```

### MinIO Access/Secret Keys
```bash
# Access Key (random string)
openssl rand -hex 16

# Secret Key (longer, more secure)
openssl rand -hex 32
```

---

## Important Notes

1. **Never commit these values to Git** - They are sensitive
2. **Update CORS_ORIGINS** after setting up custom domains
3. **Update NEXT_PUBLIC_API_URL** in frontend services after API domain is configured
4. **Test all integrations** after setting environment variables
5. **Keep backups** of your environment variable values (store securely)

---

## Quick Setup Checklist

- [ ] Database URL auto-configured from Render
- [ ] Redis URL auto-configured from Render
- [ ] JWT_SECRET generated and set
- [ ] CORS_ORIGINS updated with your domains
- [ ] MinIO configured (local or external)
- [ ] Email SMTP configured
- [ ] Payment gateway API key set
- [ ] Frontend API URLs updated
- [ ] Optional services configured (Telegram, SMS, FCM, Sentry)
