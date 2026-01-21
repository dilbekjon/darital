# Render Environment Variables

Copy these environment variables to your Render service configuration:

## Required for API Service

```bash
# Port (Render will set this automatically, but you can override)
PORT=10000

# MinIO Play (Free Public MinIO Server)
MINIO_ENDPOINT=play.min.io
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=Q3AM3UQ867SPQQA43P2F
MINIO_SECRET_KEY=zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG
MINIO_BUCKET=contracts

# Database (set your own)
DATABASE_URL=your_database_url_here

# JWT Secret (set your own)
JWT_SECRET=your_jwt_secret_here

# CORS Origins (comma-separated)
CORS_ORIGINS=https://your-admin-web.onrender.com,https://your-tenant-web.onrender.com
```

## For Next.js Apps (Admin-web & Tenant-web)

```bash
# Port (Render will set this automatically)
PORT=10000

# API URL
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api
```

## Notes

- MinIO Play is a free public MinIO server for testing
- The bucket will be created automatically if it doesn't exist
- Make sure to set your own DATABASE_URL and JWT_SECRET
- Update CORS_ORIGINS with your actual Render URLs
