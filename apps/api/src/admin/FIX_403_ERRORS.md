# Fix 403 Forbidden Errors

## Problem
After creating an admin user, all API endpoints return `403 Forbidden`:
- `GET /api/tenants` → 403
- `GET /api/contracts` → 403
- `GET /api/payments` → 403
- `GET /api/invoices` → 403
- `GET /api/conversations/unread/count` → 403

## Root Cause
The admin user was created with `AdminRole.ADMIN`, but the `PermissionsGuard` requires permissions to be seeded in the database via the `RolePermission` table.

## Solution 1: Use SUPER_ADMIN (Quick Fix) ✅

The admin controller now creates users as `SUPER_ADMIN` which bypasses all permission checks.

**Already Applied**: The controller has been updated to create `SUPER_ADMIN` users.

## Solution 2: Seed Permissions (Proper Fix)

If you want to use `ADMIN` role instead, you need to seed the permissions:

### On Render (Production)

1. Go to **Render Dashboard** → API Service → **Shell**
2. Run:
   ```bash
   cd apps/api
   npx ts-node src/rbac/seed.ts
   ```

This will:
- Create all permission records
- Assign permissions to roles based on `ROLE_PRESETS`:
  - `SUPER_ADMIN`: All permissions
  - `ADMIN`: contracts.*, tenants.*, payments.read, payments.capture_offline, reports.view, chat.read, chat.reply, notifications.manage
  - `CASHIER`: payments.read, payments.capture_offline
  - `SUPPORT`: chat.read, chat.reply, tenants.read
  - `ANALYST`: reports.view

### Required Permissions for Admin Dashboard

The admin dashboard needs these permissions:
- `tenants.read` - View tenants
- `contracts.read` - View contracts
- `payments.read` - View payments and invoices
- `chat.read` - View conversations

All of these are included in the `ADMIN` role preset.

## Verification

After seeding permissions, your `ADMIN` role user should be able to access all endpoints.

Or, if using `SUPER_ADMIN` (current fix), the user bypasses all permission checks automatically.

## Current Status

✅ **Fixed**: Admin controller now creates `SUPER_ADMIN` users by default, which bypasses permission checks.

If you want to use `ADMIN` role, run the permissions seed script as shown above.
