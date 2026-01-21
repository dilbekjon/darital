# Render Deployment Fixes - Complete Summary

This document summarizes all fixes applied to make the application deployable on Render.

## ✅ Changes Made

### 1. NestJS API Port Fix
- **File**: `apps/api/src/main.ts`
- **Change**: API now listens on `0.0.0.0` (all interfaces) and uses `process.env.PORT || 3000`
- **Why**: Render requires services to bind to all interfaces, not just localhost

### 2. MinIO Play Integration
- **File**: `apps/api/src/minio/minio.service.ts`
- **Changes**:
  - Added automatic SSL detection for MinIO Play (`play.min.io`)
  - Made `MINIO_PORT` optional (defaults to 9000)
  - Added support for `MINIO_USE_SSL` environment variable
- **Why**: MinIO Play is a free public MinIO server that uses HTTPS

### 3. Next.js Apps Port Configuration
- **Files**: 
  - `apps/tenant-web/package.json`
  - `apps/admin-web/package.json`
  - `apps/tenant-web/scripts/start.js` (new)
  - `apps/admin-web/scripts/start.js` (new)
- **Change**: Created Node.js start scripts that read `PORT` environment variable
- **Why**: Render sets `PORT` automatically, and Next.js needs to use it

## 📋 Environment Variables for Render

### API Service Environment Variables

Add these in your Render dashboard for the API service:

```bash
# Port (Render sets this automatically)
PORT=10000

# MinIO Play (Free Public MinIO Server)
MINIO_ENDPOINT=play.min.io
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=Q3AM3UQ867SPQQA43P2F
MINIO_SECRET_KEY=zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG
MINIO_BUCKET=contracts

# Database (REQUIRED - set your own)
DATABASE_URL=your_database_url_here

# JWT Secret (REQUIRED - set your own)
JWT_SECRET=your_jwt_secret_here

# CORS Origins (REQUIRED - update with your Render URLs)
CORS_ORIGINS=https://your-admin-web.onrender.com,https://your-tenant-web.onrender.com

# Node Environment
NODE_ENV=production
```

### Admin-Web Service Environment Variables

```bash
# Port (Render sets this automatically)
PORT=10000

# API URL (REQUIRED - update with your API Render URL)
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api

# Node Environment
NODE_ENV=production
```

### Tenant-Web Service Environment Variables

```bash
# Port (Render sets this automatically)
PORT=10000

# API URL (REQUIRED - update with your API Render URL)
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api

# Node Environment
NODE_ENV=production
```

## 🚀 Deployment Steps

1. **Push all changes to your repository**
   ```bash
   git add .
   git commit -m "Fix Render deployment: port binding, MinIO Play, and Next.js PORT handling"
   git push origin main
   ```

2. **Create services on Render**:
   - API Service (Web Service)
   - Admin-Web Service (Web Service)
   - Tenant-Web Service (Web Service)

3. **For each service, set the environment variables** listed above

4. **Build commands** (Render will auto-detect):
   - API: `cd apps/api && pnpm install && pnpm run build`
   - Admin-Web: `cd apps/admin-web && pnpm install && pnpm run build`
   - Tenant-Web: `cd apps/tenant-web && pnpm install && pnpm run build`

5. **Start commands**:
   - API: `cd apps/api && pnpm start`
   - Admin-Web: `cd apps/admin-web && pnpm start`
   - Tenant-Web: `cd apps/tenant-web && pnpm start`

## ✅ Verification

After deployment, verify:
1. ✅ API service shows "listening on port XXXX" in logs
2. ✅ Admin-web and Tenant-web start without port errors
3. ✅ MinIO bucket is created automatically (check API logs)
4. ✅ All services are accessible via Render URLs

## 📝 Notes

- **MinIO Play**: This is a free public MinIO server for testing. For production, consider setting up your own MinIO instance.
- **Port**: Render automatically sets the `PORT` environment variable. The code now properly uses it.
- **Database**: Make sure to set up a PostgreSQL database on Render and provide the `DATABASE_URL`.
- **CORS**: Update `CORS_ORIGINS` with your actual Render service URLs after deployment.

## 🔧 Troubleshooting

### API not starting
- Check that `PORT` is set (Render sets this automatically)
- Verify database connection with `DATABASE_URL`
- Check MinIO connection in logs

### Next.js apps not starting
- Verify `PORT` environment variable is set
- Check that `NEXT_PUBLIC_API_URL` points to your API service
- Review build logs for any TypeScript errors

### MinIO errors
- Verify MinIO credentials are correct
- Check that `MINIO_USE_SSL=true` is set for MinIO Play
- Ensure bucket name is set in `MINIO_BUCKET`
