# RBAC Audit Report — Darital Final Monorepo

**Scope:** apps/api (NestJS 11 + Prisma + Postgres), apps/admin-web (Next.js 16 + React 19).  
**RBAC:** `@Permissions()` + global PermissionsGuard, JWT auth. Roles: SUPER_ADMIN, ADMIN, USER_MANAGER, CASHIER, PAYMENT_COLLECTOR, SUPPORT, ANALYST, TENANT_USER.  
**Source of truth:** `apps/api/src/rbac/permissions.catalog.ts` (ROLE_PRESETS), controller decorators, `apps/api/src/rbac/rbac-inventory.generated.ts`.

---

## 1. Role Coverage Matrix (corrected from code)

Rows = roles. Columns = module/action. Cell = Allowed/Denied + required permission(s).  
**UI visible?** = sidebar/page gates by that permission. **API allowed?** = controller uses that permission; guard enforces.

| Module / Action | Permission(s) | SUPER_ADMIN | ADMIN | USER_MANAGER | CASHIER | PAYMENT_COLLECTOR | SUPPORT | ANALYST | TENANT_USER |
|-----------------|---------------|-------------|-------|--------------|---------|-------------------|---------|---------|-------------|
| **Buildings** list/create/edit/delete | buildings.read, .create, .update, .delete | Allowed | Allowed | Allowed | Denied | Denied | Denied | Denied | Denied |
| **Units** list/create/edit/delete/status | units.read, .create, .update, .delete | Allowed | Allowed | Allowed | list only | Denied | Denied | list only | Denied |
| **Tenants** list/create/edit/archive/restore/delete | tenants.read, .create, .update, .delete | Allowed | Allowed | Allowed | list only | list only | list only | list only | Denied |
| **Contracts** list/create/edit/status/archive/restore/pdf/delete | contracts.read, .create, .update, .delete | Allowed | Allowed | Allowed | list only | list only | list only | list only | Denied |
| **Invoices** list/one/qr/create/edit/archive/restore | invoices.read, contracts.update | Allowed | Allowed | Allowed | list only | list only | list only | list only | Denied |
| **Payments** list/record_offline/approve/capture/cancel | payments.read, .record_offline, .approve, .capture_offline | Allowed | Allowed (no record_offline) | Denied | Allowed (no record_offline) | read+record_offline | Denied | list only | Denied |
| **Documents** view/upload/delete | tenants.read, contracts.read, payments.read, tenants.update | Allowed | Allowed | Allowed | Allowed view | Allowed view | Allowed view | Denied | Denied |
| **Chat** list/assign/reply/close/archive/restore | chat.read, chat.reply; archive=admin.users.read | Allowed | Allowed | Allowed | Denied | Denied | Allowed | Denied | Allowed (chat only) |
| **Notifications** manage/test/templates/telegram | notifications.manage | Allowed | Allowed | Denied | Denied | Denied | Denied | Denied | Denied |
| **Admin Users** list/create/update roles | admin.users.read, admin.users.update | Allowed | Denied | Denied | Denied | Denied | Denied | Denied | Denied |
| **Reports/Exports** view + CSV | reports.view; exports: tenants/contracts/invoices/payments.read | Allowed | Allowed | Allowed (invoices export) | Denied | Denied | Denied | Allowed | Denied |
| **Audit logs** view | audit.read | Allowed | Denied | Denied | Denied | Denied | Denied | Allowed | Denied |
| **Archive** view/restore | admin.users.read | Allowed | Denied | Denied | Denied | Denied | Denied | Denied | Denied |
| **Telegram** manage/chatId linking | notifications.manage | Allowed | Allowed | Denied | Denied | Denied | Denied | Denied | Denied |

**UI visible?** Sidebar uses same permission codes (`AdminSidebar.tsx`: permissionCodes per item). Pages use `hasPermission(...)` from AuthContext (user.permissions from `/api/auth/me`).  
**API allowed?** Global PermissionsGuard + `@Permissions(...)` on each admin endpoint; tenant routes use `ensureTenantAccess(req.user)` (TENANT_USER only).

---

## 2. Reconcile: Presets vs Controllers

- **Invoices:** Controllers use `invoices.read` for list/one/qr and `contracts.update` for create/edit/archive/restore/delete. Presets give USER_MANAGER, PAYMENT_COLLECTOR, SUPPORT, ANALYST `invoices.read` — aligned.
- **Exports invoices:** Was `payments.read`; changed to `invoices.read` so USER_MANAGER/ANALYST can export invoices (aligned with catalog).
- **Bulk invoice status:** Was `payments.read`; changed to `invoices.update` so USER_MANAGER can bulk-update invoice status (aligned with catalog).
- **Audit logs:** Controller uses `audit.read`; only ANALYST and SUPER_ADMIN have `audit.read` — aligned.
- **Archive:** All endpoints use `admin.users.read`; only SUPER_ADMIN has it in presets — intended (archive stays super-admin only).
- **Receipts admin:** `getReceiptData`, `getPaymentHistoryAdmin`, `getChartDataAdmin` use `payments.read`; tenant self-service routes have no @Permissions (service uses req.user.id) — correct.
- **Tenant portal / tenant notifications:** No @Permissions; `ensureTenantAccess(req.user)` enforces TENANT_USER only — correct.

---

## 3. Fixes Applied (P0/P1)

| Id | Severity | Description | File(s) | Change |
|----|----------|-------------|---------|--------|
| F1 | P0 | Invoices list/one/qr use invoices.read | apps/api/src/invoices/invoices.controller.ts | Already fixed in prior audit: @Permissions('invoices.read') on findAll, findOne, getQrCode. |
| F2 | P0 | Audit logs use audit.read | apps/api/src/audit-logs/audit-logs.controller.ts | Already fixed: @Permissions('audit.read') on findAll. |
| F3 | P0 | Receipts admin endpoints have @Permissions | apps/api/src/receipts/receipts.controller.ts | Already fixed: @Permissions('payments.read') on getReceiptData, getPaymentHistoryAdmin, getChartDataAdmin. |
| F4 | P1 | Exports invoices used payments.read | apps/api/src/exports/exports.controller.ts | **Fixed:** @Permissions('payments.read') → @Permissions('invoices.read') on exportInvoices. |
| F5 | P1 | Bulk invoice status used payments.read | apps/api/src/bulk-actions/bulk-actions.controller.ts | **Fixed:** @Permissions('payments.read') → @Permissions('invoices.update') on bulkUpdateInvoiceStatus. |
| F6 | P1 | Activity Logs UI use audit.read | apps/admin-web: AdminSidebar, activity page | Already fixed: permissionCodes ['audit.read'], hasPermission('audit.read'). |
| F7 | P2 | AuthContext AdminRole enum missing USER_MANAGER, PAYMENT_COLLECTOR | apps/admin-web/src/contexts/AuthContext.tsx | **Fixed:** Added USER_MANAGER and PAYMENT_COLLECTOR to AdminRole enum. |

---

## 4. Backend RBAC Inventory

- **Artifact:** `apps/api/src/rbac/rbac-inventory.generated.ts`
- **Contents:** Every endpoint with `httpMethod`, `route`, `controllerFilePath`, `methodName`, `permissions[]`, `hasNoPermissions`, `isPublic`, optional `note`.
- **Helpers:** `ENDPOINTS_WITH_AUTH_NO_PERMISSIONS`, `PUBLIC_ENDPOINTS`.
- Regenerate when controllers or decorators change (manual or script).

---

## 5. How to Run

### API (dev)
```bash
cd apps/api
pnpm install
# Ensure DB: docker compose up -d postgres (from repo root)
pnpm prisma:generate
pnpm prisma:migrate   # or prisma migrate deploy in prod
pnpm rbac:seed        # seed permissions and role_permissions
pnpm dev
```

### Admin web (dev)
```bash
cd apps/admin-web
pnpm install
pnpm dev
# Uses NEXT_PUBLIC_API_URL (default http://localhost:3001/api)
```

### RBAC e2e tests (API)
```bash
cd apps/api
pnpm install
# Ensure DB running, migrated, and RBAC seeded
pnpm prisma:migrate   # or: npx prisma migrate deploy
pnpm rbac:seed
# Super admin login uses SEED_ADMIN_PASSWORD (default admin123). E2e creates role users with password rbac-e2e-pass.
pnpm test:e2e
```
- **Script:** `test:e2e` runs `jest -c jest-e2e.json --runInBand` (file: `apps/api/test/rbac.e2e-spec.ts`).
- **Test env:** `NODE_ENV=test` is set automatically by `test/jest-e2e.setup.ts` (referenced in `jest-e2e.json`). In test, throttling is disabled (NoopGuard) and ScheduleModule is not loaded (disabled in test to avoid cron timers keeping Jest alive and to keep e2e runs deterministic), so login is not rate-limited. `jest-e2e.json` sets `forceExit: true` so Jest exits cleanly (last resort; it can mask real leaks). To find the real handle later: run `pnpm test:e2e -- --detectOpenHandles`, then disable or close that resource in NODE_ENV=test (e.g. like ScheduleModule).
- **Deps:** `supertest` and `@types/supertest` added for e2e HTTP.
- Tests: no token → 401; tenant token → 403 on admin endpoints; per-role allow/deny (buildings, invoices, payments, receipts, exports, archive, audit-logs, admin/users).

### Run RBAC seed (required after clone / before e2e)
Re-run after any change to `ROLE_PRESETS` in `permissions.catalog.ts`; the DB `role_permissions` table is repopulated from the catalog (e.g. PAYMENT_COLLECTOR needs `contracts.read` for the Contracts page).
```bash
cd apps/api
pnpm rbac:seed
```

---

## 6. File List of Changes (this audit)

| File | Change |
|------|--------|
| apps/api/src/rbac/rbac-inventory.generated.ts | **Added.** Full controller endpoint inventory with permissions and flags. |
| apps/api/src/exports/exports.controller.ts | exportInvoices: @Permissions('payments.read') → @Permissions('invoices.read'). |
| apps/api/src/bulk-actions/bulk-actions.controller.ts | bulkUpdateInvoiceStatus: @Permissions('payments.read') → @Permissions('invoices.update'). |
| apps/admin-web/src/contexts/AuthContext.tsx | AdminRole enum: added USER_MANAGER, PAYMENT_COLLECTOR. |
| apps/api/test/rbac.e2e-spec.ts | **Added.** Runnable RBAC e2e: per-role allow/deny, 401 without token, tenant token → 403 on admin endpoints. |
| apps/api/jest-e2e.json | **Added.** Jest config for e2e (testMatch: test/**/*.e2e-spec.ts). |
| apps/api/package.json | test:e2e script; supertest + @types/supertest devDependencies. |
| RBAC_AUDIT_REPORT.md | **Added.** This report (matrix, reconcile, fixes, how to run). |

---

## 7. Optional: Dev permission debug panel (admin-web)

To add a dev-only panel that shows current role + permissions + page-required permission:

- In a layout or dashboard used only in development, render a small panel that:
  - Reads `user.role` and `user.permissions` from AuthContext.
  - For the current page, shows the required permission(s) (e.g. from a map of path → permissionCodes).
- Render only when `process.env.NODE_ENV === 'development'` (or a similar flag).
- No code added in this deliverable; can be implemented in a follow-up.

---

## 8. Stop conditions / notes

- **Login/seed:** Auth is `POST /api/auth/login`; RBAC seed is `pnpm rbac:seed` (apps/api). E2e uses same login and, if needed, Prisma to create one user per role for tests.
- **Permission codes in UI:** All sidebar and page permission codes used in admin-web exist in `permissions.catalog.ts`; no new codes invented except where catalog already had them (e.g. invoices.read, audit.read).
- **Tenant vs admin:** Tenant-portal and tenant notifications use `ensureTenantAccess(req.user)` and do not use @Permissions; tenant JWT cannot access admin endpoints because PermissionsGuard requires role permissions from DB (TENANT_USER has only chat.* in guard), so admin routes return 403 for tenant tokens.
