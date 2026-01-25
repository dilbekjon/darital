# Fix Cloudflare R2 Public Access Authorization Error

## Problem
When trying to view PDF files from Cloudflare R2, you get:
```xml
<Error>
  <Code>InvalidArgument</Code>
  <Message>Authorization</Message>
</Error>
```

## Root Cause
The Cloudflare R2 bucket is not configured for public access. R2 requires explicit public access configuration in the dashboard.

## Solution: Enable Public Access in Cloudflare Dashboard

### Step 1: Go to Cloudflare Dashboard
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** → **Object Storage**
3. Click on your bucket: **`darital`**

### Step 2: Enable Public Access
1. Go to **Settings** tab
2. Scroll to **Public Access** section
3. Click **Allow Access** or toggle **Public Access** to **ON**
4. Save the changes

### Step 3: Verify Public Access
After enabling public access, your URLs should work:
```
https://3221035d27000c87b4eecb27c53050dd.r2.cloudflarestorage.com/darital/contract.pdf
```

## Alternative: Use Custom Domain (Recommended for Production)

For better security and branding, you can set up a custom domain:

1. In R2 bucket settings, go to **Custom Domains**
2. Add your domain (e.g., `files.yourdomain.com`)
3. Configure DNS as instructed
4. Update your URLs to use the custom domain

## Code Changes Made

The MinIO service now:
- ✅ Better error handling for bucket policy
- ✅ Logs warnings if bucket policy can't be set
- ✅ Provides clear instructions in logs about R2 public access

## Verification

After enabling public access:
1. Restart your API (if needed)
2. Try accessing a PDF URL directly in browser
3. Should see the PDF instead of XML error

## Important Notes

⚠️ **Security**: Public buckets allow anyone with the URL to access files. Consider:
- Using presigned URLs for sensitive documents
- Setting up custom domain with access controls
- Using Cloudflare Access for additional security

✅ **Current Setup**: Your bucket `darital` needs to be set to **Public** in Cloudflare dashboard for direct URL access to work.
