# Cloudflare R2 Public Development URL Configuration

## Problem
After enabling public access in Cloudflare R2, you get a **Public Development URL** like:
```
https://pub-35a27cdd2083465f81499a8d1a3bd948.r2.dev
```

But the code is generating URLs using the endpoint `3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com`, which doesn't work for public access.

## Solution: Use Public Development URL

Cloudflare R2 requires using the **Public Development URL** for public file access, not the endpoint URL.

## Environment Variable

Add this to your Render environment variables:

```bash
MINIO_PUBLIC_URL=https://pub-35a27cdd2083465f81499a8d1a3bd948.r2.dev
```

## Complete R2 Configuration

Your full environment variables should be:

```bash
MINIO_ACCESS_KEY=ba8683f2bb37c9b49a336f30656f97e3
MINIO_BUCKET=darital
MINIO_ENDPOINT=3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com
MINIO_PORT=443
MINIO_SECRET_KEY=99c372c40d97e5e26efb2de89c11cdb8878e1b46c45e9041e83852bb030e73c6
MINIO_USE_SSL=true
MINIO_PUBLIC_URL=https://pub-35a27cdd2083465f81499a8d1a3bd948.r2.dev
```

## How It Works

1. **Upload**: Files are uploaded using `MINIO_ENDPOINT` (the API endpoint)
2. **Public Access**: URLs are generated using `MINIO_PUBLIC_URL` (the public development URL)

Generated URLs will be:
```
https://pub-35a27cdd2083465f81499a8d1a3bd948.r2.dev/darital/contract.pdf
```

## Important Notes

⚠️ **Development URL Limitations**:
- Rate-limited (not recommended for production)
- Cloudflare features like Access and Caching are unavailable
- For production, connect a custom domain to the bucket

✅ **For Production**: 
1. Set up a custom domain in R2 bucket settings
2. Update `MINIO_PUBLIC_URL` to your custom domain (e.g., `https://files.yourdomain.com`)

## After Setting MINIO_PUBLIC_URL

1. Restart your API service on Render
2. Upload a new file to test
3. The generated URL will use the public development URL
4. Files should be accessible without authorization errors

## Verification

After setting the environment variable and restarting:
- Check API logs for: `✅ Using public URL for file access: https://pub-xxx.r2.dev`
- Upload a file and check the generated URL
- Try accessing the URL directly in browser - should show the file
