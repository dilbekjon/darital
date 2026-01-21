# CORS Error Fix

## Problem
You're getting this error:
```
Access to fetch at 'https://darital-api.onrender.com/api/auth/login' from origin 'https://darital-admin-web.onrender.com' has been blocked by CORS policy
```

## Solution

Add your Render URLs to the `CORS_ORIGINS` environment variable in your **API service** on Render:

### In Render Dashboard → API Service → Environment Variables

Add or update:

```bash
CORS_ORIGINS=https://darital-admin-web.onrender.com,https://darital-tenant-web.onrender.com
```

**Important**: 
- Use **comma-separated** values (no spaces after commas)
- Include **both** admin-web and tenant-web URLs
- Make sure there are **no trailing slashes** in the URLs
- The URLs must match **exactly** (including `https://`)

### After Updating

1. **Save** the environment variables in Render
2. **Redeploy** your API service (or it will restart automatically)
3. Check the API logs - you should see: `🌐 CORS Origins configured: [...]`
4. Try the login again

### If Still Not Working

Check the API logs for:
- `🚫 CORS blocked origin: ...` - This shows which origin was blocked
- `Allowed origins: ...` - This shows what origins are configured

Make sure the blocked origin **exactly matches** one of the allowed origins.

### Example Configuration

```bash
# For your current setup:
CORS_ORIGINS=https://darital-admin-web.onrender.com,https://darital-tenant-web.onrender.com

# If you have other domains, add them:
CORS_ORIGINS=https://darital-admin-web.onrender.com,https://darital-tenant-web.onrender.com,https://your-custom-domain.com
```
