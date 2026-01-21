# Render Environment Variables

Copy these environment variables to your Render service configuration:

## Required for API Service

```bash
# Port (Render will set this automatically, but you can override)
PORT=10000

# Cloudflare R2 Storage (or MinIO Play for testing)
# Option 1: Cloudflare R2 (Production)
MINIO_ENDPOINT=https://3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com/darital
MINIO_PORT=443
MINIO_ACCESS_KEY=shepqoyov@gmail.com
MINIO_SECRET_KEY=zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG
MINIO_BUCKET=darital

# Option 2: MinIO Play (Free Public MinIO Server for testing)
# MINIO_ENDPOINT=play.min.io
# MINIO_PORT=9000
# MINIO_USE_SSL=true
# MINIO_ACCESS_KEY=Q3AM3UQ867SPQQA43P2F
# MINIO_SECRET_KEY=zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG
# MINIO_BUCKET=contracts

# Database (set your own)
DATABASE_URL=your_database_url_here

# JWT Secret (set your own)
JWT_SECRET=your_jwt_secret_here

# CORS Origins (comma-separated) - REQUIRED: Set your actual Render URLs
CORS_ORIGINS=https://darital-admin-web.onrender.com,https://darital-tenant-web.onrender.com
```

## For Next.js Apps (Admin-web & Tenant-web)

```bash
# Port (Render will set this automatically)
PORT=10000

# API URL
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api
```

## Notes

- **Cloudflare R2**: The endpoint URL can include the bucket path (e.g., `/darital`). The service will automatically extract the hostname and detect SSL from the `https://` protocol.
- **MinIO Play**: Free public MinIO server for testing (alternative option)
- The bucket will be created automatically if it doesn't exist (for MinIO, not Cloudflare R2)
- Make sure to set your own `DATABASE_URL` and `JWT_SECRET`
- Update `CORS_ORIGINS` with your actual Render URLs
- For Cloudflare R2, the bucket must already exist in your R2 account
