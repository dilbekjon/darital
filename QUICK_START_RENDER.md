# Quick Start: Deploy to Render in 30 Minutes

This is a condensed version of the full deployment guide. Follow these steps in order.

## Prerequisites Checklist

- [ ] Code pushed to GitHub
- [ ] Render account created (https://render.com)
- [ ] aHost.uz domain ready

---

## Step 1: Push Code to GitHub (5 min)

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

---

## Step 2: Deploy on Render (10 min)

1. Go to https://render.com → Dashboard
2. Click "New" → "Blueprint"
3. Connect GitHub → Select your repository
4. Render detects `render.yaml` automatically
5. Click "Apply" → Wait for deployment (10-15 min)

**Services Created:**
- ✅ PostgreSQL Database
- ✅ Redis
- ✅ API Backend
- ✅ Admin Web
- ✅ Tenant Web

---

## Step 3: Configure Environment Variables (5 min)

### API Service → Environment Tab

**Required:**
```env
JWT_SECRET=<generate: openssl rand -base64 32>
CORS_ORIGINS=https://admin.yourdomain.uz,https://tenant.yourdomain.uz
```

**MinIO (File Storage):**
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=contracts
```

**Email (Gmail example):**
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@yourdomain.uz
```

**Payment:**
```env
CHECKOUTUZ_API_KEY=your-key
CHECKOUTUZ_BASE_URL=https://checkout.uz/api
```

### Admin Web → Environment Tab
```env
NEXT_PUBLIC_API_URL=https://darital-api.onrender.com/api
```

### Tenant Web → Environment Tab
```env
NEXT_PUBLIC_API_URL=https://darital-api.onrender.com/api
```

---

## Step 4: Run Database Migrations (3 min)

1. Go to API service → Shell tab
2. Run:
```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

---

## Step 5: Configure DNS in aHost.uz (5 min)

### In aHost.uz DNS Settings:

**API:**
```
Type: CNAME
Name: api
Value: darital-api.onrender.com
```

**Admin:**
```
Type: CNAME
Name: admin
Value: darital-admin-web.onrender.com
```

**Tenant:**
```
Type: CNAME
Name: tenant
Value: darital-tenant-web.onrender.com
```

---

## Step 6: Add Custom Domains in Render (5 min)

1. **API Service** → Settings → Custom Domains
   - Add: `api.yourdomain.uz`
   - Verify (takes 2-5 min)

2. **Admin Web** → Settings → Custom Domains
   - Add: `admin.yourdomain.uz`
   - Verify

3. **Tenant Web** → Settings → Custom Domains
   - Add: `tenant.yourdomain.uz`
   - Verify

---

## Step 7: Update Frontend URLs (2 min)

After domains are verified:

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

Redeploy all services.

---

## Step 8: Test (2 min)

- ✅ API: `https://api.yourdomain.uz/docs`
- ✅ Admin: `https://admin.yourdomain.uz`
- ✅ Tenant: `https://tenant.yourdomain.uz`

---

## Important: Keep Services Awake

Free Render services sleep after 15 min inactivity.

**Solution:** Use UptimeRobot (free)
1. Sign up at https://uptimerobot.com
2. Add monitors for each service URL
3. Set interval: 5 minutes
4. Services stay awake!

---

## Troubleshooting

**Build fails?**
- Check logs in Render dashboard
- Verify pnpm is working (Render should auto-detect)

**Domain not working?**
- Wait 24-48 hours for DNS propagation
- Verify DNS records in aHost.uz
- Check domain status in Render

**Database errors?**
- Verify DATABASE_URL is set
- Run migrations again
- Check database service is running

---

## Next Steps

1. Set up UptimeRobot to keep services awake
2. Configure backups
3. Monitor logs regularly
4. Consider upgrading to paid plans for production

**Full detailed guide:** See `DEPLOYMENT_RENDER.md`

---

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com

Good luck! 🚀
