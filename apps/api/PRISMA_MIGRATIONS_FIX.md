# Prisma Migrations Fix - Production Ready ✅

## Problem
Production logs showed:
- `The table public.Invoice does not exist`
- `The table public.Payment does not exist`
- Cron jobs crashing due to missing tables
- Migrations never applied in production

## Solution Applied

### 1. ✅ Automatic Migration Deployment

**File**: `apps/api/package.json`
- Added `prestart` script to run migrations before start
- Added `postinstall` to generate Prisma client
- Production start command now runs migrations automatically

**File**: `apps/api/src/main.ts`
- Added migration deployment in `bootstrap()` for production
- Runs `npx prisma migrate deploy` before starting the server

### 2. ✅ Database Readiness Checks

**File**: `apps/api/src/prisma.service.ts`
- Added `checkTablesExist()` method
- Added `areCronTablesReady()` method for Invoice and Payment tables
- Checks table existence using PostgreSQL queries

### 3. ✅ Startup Guards for Cron Jobs

**Files Updated**:
- `apps/api/src/invoices/invoices.scheduler.ts`
- `apps/api/src/payments/payments.scheduler.ts`
- `apps/api/src/queues/reminder.scheduler.ts`
- `apps/api/src/invoices/invoices.service.ts` (markOverdueInvoices)

**Changes**:
- Added `dbReady` flag to each scheduler
- Check database tables on initialization
- Re-check before each cron job execution
- Skip execution if tables don't exist
- Log warnings instead of crashing

### 4. ✅ Error Handling Improvements

- Catch Prisma error code `P2021` (table does not exist)
- Handle errors gracefully without spamming logs
- Rate-limit error logging (once per minute for frequent cron jobs)
- Provide clear migration instructions in logs

### 5. ✅ Telegram Service (Already Safe)

**File**: `apps/api/src/telegram/telegram.service.ts`
- Already handles missing `TELEGRAM_BOT_TOKEN` gracefully
- Disables bot if token not set
- Won't crash app startup

## What to Do on Render Right Now

### ✅ Immediate Fix (Run Once)

1. Go to **Render Dashboard** → Your API Service → **Shell**
2. Run:
   ```bash
   cd apps/api
   npx prisma migrate deploy
   ```

This will instantly create:
- ✅ `Invoice` table
- ✅ `Payment` table  
- ✅ All other missing tables
- ✅ Fix all Prisma errors

### ✅ Automatic Migration (Going Forward)

The code now handles migrations automatically:
- `prestart` script runs migrations before starting
- `main.ts` also runs migrations in production
- **No manual action needed** for future deployments

### Render Configuration

**Build Command** (Render):
```bash
cd apps/api && pnpm install && pnpm run build
```

**Start Command** (Render):
```bash
cd apps/api && pnpm start:prod
```

Or use the default:
```bash
cd apps/api && pnpm start
```

Both will run migrations automatically.

## Environment Variables

Make sure these are set in Render:

```bash
DATABASE_URL=your_production_database_url
NODE_ENV=production
```

## Verification

After deployment, check logs for:
- ✅ `🔄 Running Prisma migrations...`
- ✅ `✅ Prisma migrations completed`
- ✅ `✅ Database tables ready for [scheduler name]`
- ✅ No table does not exist errors

If you see:
- ⚠️ `⏸️ Skipping [scheduler] - database tables not ready`

This means migrations haven't run yet. The app will continue working, but cron jobs will skip until tables exist.

## Testing

The fix ensures:
1. ✅ Migrations run automatically in production
2. ✅ Cron jobs don't crash if tables are missing
3. ✅ Clear error messages guide you to fix issues
4. ✅ App starts successfully even if migrations fail (with warnings)
5. ✅ Telegram bot won't crash if token is missing
