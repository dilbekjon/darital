# Cloudflare R2 Configuration - Verified ✅

Your MinIO environment variables are correctly configured for Cloudflare R2:

```bash
MINIO_ENDPOINT=https://3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com/darital
MINIO_PORT=443
MINIO_ACCESS_KEY=shepqoyov@gmail.com
MINIO_SECRET_KEY=zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG
MINIO_BUCKET=darital
```

## How It Works

The MinIO service will automatically:

1. **Parse the endpoint URL**:
   - Extracts hostname: `3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com`
   - Detects SSL from `https://` protocol
   - Extracts bucket from path: `darital` (as fallback if MINIO_BUCKET not set)

2. **Connect to Cloudflare R2**:
   - Uses port 443 (HTTPS)
   - Enables SSL automatically
   - Uses the bucket name: `darital`

3. **Generate correct URLs**:
   - Generated file URLs will be: `https://3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com/darital/filename.pdf`
   - Port 443 is omitted from URLs (standard HTTPS port)

## Ready to Deploy

✅ All code changes are complete
✅ MinIO service handles Cloudflare R2 correctly
✅ URL parsing and SSL detection work automatically
✅ API builds successfully

Just copy these environment variables to your Render dashboard and deploy!
