# Cloudflare R2 MinIO Configuration ✅

## Environment Variables

Set these in Render (or your production environment):

```bash
MINIO_ACCESS_KEY=ba8683f2bb37c9b49a336f30656f97e3
MINIO_BUCKET=darital
MINIO_ENDPOINT=3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com
MINIO_PORT=443
MINIO_SECRET_KEY=99c372c40d97e5e26efb2de89c11cdb8878e1b46c45e9041e83852bb030e73c6
MINIO_USE_SSL=true
```

## How It Works

The MinIO service automatically:

1. **Detects Plain Hostname**: Since `MINIO_ENDPOINT` doesn't start with `http://` or `https://`, it's treated as a plain hostname
2. **Uses SSL**: `MINIO_USE_SSL=true` explicitly enables SSL
3. **Uses Port 443**: `MINIO_PORT=443` is used for HTTPS
4. **Uses Separate Bucket**: `MINIO_BUCKET=darital` is used as the bucket name

## Configuration Flow

```
MINIO_ENDPOINT (plain hostname)
  ↓
parseEndpoint() detects plain hostname
  ↓
Uses MINIO_PORT (443)
  ↓
Checks MINIO_USE_SSL === 'true' → useSSL = true
  ↓
Creates MinioClient with:
  - endPoint: 3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com
  - port: 443
  - useSSL: true
  - accessKey: ba8683f2bb37c9b49a336f30656f97e3
  - secretKey: 99c372c40d97e5e26efb2de89c11cdb8878e1b46c45e9041e83852bb030e73c6
  - bucket: darital
```

## URL Generation

Uploaded files will have URLs like:
```
https://3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com/darital/filename.pdf
```

Note: Port 443 is omitted from URLs (standard HTTPS port).

## Verification

The service will:
- ✅ Connect to Cloudflare R2 using HTTPS on port 443
- ✅ Use the `darital` bucket
- ✅ Generate public URLs for uploaded files
- ✅ Automatically create the bucket if it doesn't exist

## Testing

After setting these environment variables, restart your API. The MinIO service will:
1. Initialize with the R2 credentials
2. Verify bucket existence (or create it)
3. Be ready for file uploads

Check logs for:
- `MinIO initialized successfully`
- `Creating MinIO bucket: darital` (if bucket doesn't exist)
