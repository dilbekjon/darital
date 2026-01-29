/**
 * RBAC QA + Security Audit Report — Darital Final Monorepo
 * Scope: apps/api (NestJS), apps/admin-web (Next.js), permissions.catalog.ts
 * Generated from static analysis of controllers, guards, and UI permission checks.
 */

// =============================================================================
// 1. ROLE COVERAGE MATRIX
// =============================================================================
// Rows = AdminRole. Columns = Module/Action.
// Cell = Expected (Allowed/Denied), permission code(s), UI visible?, API allowed?
// Source: apps/api/src/rbac/permissions.catalog.ts ROLE_PRESETS + controller @Permissions.
//
// Legend: Y = yes, N = no. "API" = endpoint enforces permission; "UI" = sidebar/page gates by permission.

export const ROLE_COVERAGE_MATRIX = {
  Buildings: {
    list: { permission: 'buildings.read', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    create: { permission: 'buildings.create', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    edit: { permission: 'buildings.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    delete: { permission: 'buildings.delete', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Units: {
    list: { permission: 'units.read', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'Y', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'Y', TENANT_USER: 'N' },
    create: { permission: 'units.create', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    edit: { permission: 'units.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    delete: { permission: 'units.delete', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    status: { permission: 'units.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Tenants: {
    list: { permission: 'tenants.read', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'Y', PAYMENT_COLLECTOR: 'Y', SUPPORT: 'Y', ANALYST: 'Y', TENANT_USER: 'N' },
    create: { permission: 'tenants.create', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    edit: { permission: 'tenants.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    archive: { permission: 'tenants.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    restore: { permission: 'tenants.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    delete: { permission: 'tenants.delete', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Contracts: {
    list: { permission: 'contracts.read', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'Y', PAYMENT_COLLECTOR: 'Y', SUPPORT: 'Y', ANALYST: 'Y', TENANT_USER: 'N' },
    create: { permission: 'contracts.create', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    edit: { permission: 'contracts.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    activate_cancel_status: { permission: 'contracts.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    archive_restore: { permission: 'contracts.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    pdf_view: { permission: 'contracts.read', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'Y', PAYMENT_COLLECTOR: 'Y', SUPPORT: 'Y', ANALYST: 'Y', TENANT_USER: 'N' },
    delete: { permission: 'contracts.delete', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Invoices: {
    list: { permission: 'invoices.read (API currently payments.read — BUG)', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'N_API', CASHIER: 'Y', PAYMENT_COLLECTOR: 'N_API', SUPPORT: 'Y', ANALYST: 'Y', TENANT_USER: 'N' },
    create: { permission: 'contracts.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    edit: { permission: 'contracts.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    status_archive_restore_delete: { permission: 'contracts.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Payments: {
    list_view: { permission: 'payments.read', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'N', CASHIER: 'Y', PAYMENT_COLLECTOR: 'Y', SUPPORT: 'N', ANALYST: 'Y', TENANT_USER: 'N' },
    record_offline: { permission: 'payments.record_offline', SUPER_ADMIN: 'Y', ADMIN: 'N', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'Y', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    approve_capture_cancel: { permission: 'payments.approve / payments.capture_offline', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'N', CASHIER: 'Y', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    webhook: { permission: 'Public (no auth)', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'Y', PAYMENT_COLLECTOR: 'Y', SUPPORT: 'Y', ANALYST: 'Y', TENANT_USER: 'Y' },
  },
  Documents: {
    view: { permission: 'tenants.read / contracts.read / payments.read by relation', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'Y', PAYMENT_COLLECTOR: 'Y', SUPPORT: 'Y', ANALYST: 'N', TENANT_USER: 'N' },
    upload_delete: { permission: 'tenants.update', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Chat: {
    list: { permission: 'chat.read', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'Y', ANALYST: 'N', TENANT_USER: 'Y_via_guard' },
    assign_reply_close_upload: { permission: 'chat.reply', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'Y', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'Y', ANALYST: 'N', TENANT_USER: 'Y_via_guard' },
    archive_restore: { permission: 'admin.users.read (archive module)', SUPER_ADMIN: 'Y', ADMIN: 'N', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Notifications: {
    send_test_manage_templates_telegram: { permission: 'notifications.manage', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Users_Admin: {
    list: { permission: 'admin.users.read', SUPER_ADMIN: 'Y', ADMIN: 'N', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
    create_edit_roles: { permission: 'admin.users.update', SUPER_ADMIN: 'Y', ADMIN: 'N', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Reports_Exports: {
    view_export_csv: { permission: 'reports.view; exports use tenants/contracts/payments.read', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'Y', TENANT_USER: 'N' },
  },
  Audit_Logs: {
    view: { permission: 'audit.read (API currently admin.users.read — BUG)', SUPER_ADMIN: 'Y', ADMIN: 'N', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N_API', TENANT_USER: 'N' },
  },
  Archive: {
    view_restore: { permission: 'admin.users.read (no audit.read / archive in catalog)', SUPER_ADMIN: 'Y', ADMIN: 'N', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
  Telegram: {
    manage_chatId_linking: { permission: 'notifications.manage', SUPER_ADMIN: 'Y', ADMIN: 'Y', USER_MANAGER: 'N', CASHIER: 'N', PAYMENT_COLLECTOR: 'N', SUPPORT: 'N', ANALYST: 'N', TENANT_USER: 'N' },
  },
} as const;

// =============================================================================
// 2. PER-ROLE TEST CASES (happy + negative)
// =============================================================================
// Each role: 5 actions that MUST work, 5 that MUST be denied. Route + API endpoint + @Permissions on method.

export const TEST_CASES_SUPER_ADMIN = {
  mustWork: [
    { action: 'List buildings', page: '/admin/buildings', api: 'GET /api/buildings', decorator: '@Permissions(\'buildings.read\')', file: 'apps/api/src/buildings/buildings.controller.ts' },
    { action: 'List invoices', page: '/admin/invoices', api: 'GET /api/invoices', decorator: '@Permissions(\'payments.read\')', file: 'apps/api/src/invoices/invoices.controller.ts' },
    { action: 'View audit logs', page: '/admin/activity', api: 'GET /api/audit-logs', decorator: '@Permissions(\'admin.users.read\')', file: 'apps/api/src/audit-logs/audit-logs.controller.ts' },
    { action: 'Approve payment', page: '/admin/payments', api: 'PATCH /api/payments/:id/verify/accept', decorator: '@Permissions(\'payments.approve\')', file: 'apps/api/src/payments/payments.controller.ts' },
    { action: 'Create admin user', page: '/admin/users', api: 'POST /api/admin/users', decorator: '@Permissions(\'admin.users.update\')', file: 'apps/api/src/users/users.controller.ts' },
  ],
  mustDeny: [] as const, // SUPER_ADMIN has all; no denial for admin actions
};

export const TEST_CASES_ADMIN = {
  mustWork: [
    { action: 'List buildings', page: '/admin/buildings', api: 'GET /api/buildings', decorator: '@Permissions(\'buildings.read\')' },
    { action: 'List payments', page: '/admin/payments', api: 'GET /api/payments', decorator: '@Permissions(\'payments.read\')' },
    { action: 'Record offline payment', page: '/admin/payments', api: 'POST /api/payments/offline', decorator: 'N/A — ADMIN has payments.approve and capture_offline but NOT record_offline; ADMIN cannot record offline', note: 'ROLE_PRESETS ADMIN has payments.capture_offline, payments.approve but NOT payments.record_offline' },
    { action: 'Approve payment', page: '/admin/payments', api: 'PATCH /api/payments/:id/verify/accept', decorator: '@Permissions(\'payments.approve\')' },
    { action: 'Export payments CSV', page: '/admin/reports or exports', api: 'GET /api/exports/payments', decorator: '@Permissions(\'payments.read\')' },
  ],
  mustDeny: [
    { action: 'View audit logs', page: '/admin/activity', api: 'GET /api/audit-logs', decorator: '@Permissions(\'admin.users.read\')', reason: 'ADMIN has no admin.users.read' },
    { action: 'View archive', page: '/admin/archive', api: 'GET /api/archive/summary', decorator: '@Permissions(\'admin.users.read\')', reason: 'ADMIN has no admin.users.read' },
    { action: 'List admin users', page: '/admin/users', api: 'GET /api/admin/users', decorator: '@Permissions(\'admin.users.read\')', reason: 'ADMIN has no admin.users.read' },
    { action: 'Change user role', page: '/admin/users', api: 'PUT /api/admin/users/:id/role', decorator: '@Permissions(\'admin.users.update\')', reason: 'ADMIN has no admin.users.update' },
    { action: 'Record offline (if intended)', page: '/admin/payments', api: 'POST /api/payments/offline', decorator: '@Permissions(\'payments.record_offline\')', reason: 'ADMIN has payments.approve/capture_offline but not record_offline' },
  ],
};

export const TEST_CASES_USER_MANAGER = {
  mustWork: [
    { action: 'List buildings', page: '/admin/buildings', api: 'GET /api/buildings', decorator: '@Permissions(\'buildings.read\')' },
    { action: 'Create unit', page: '/admin/units', api: 'POST /api/units', decorator: '@Permissions(\'units.create\')' },
    { action: 'List tenants', page: '/admin/tenants', api: 'GET /api/tenants', decorator: '@Permissions(\'tenants.read\')' },
    { action: 'Create contract', page: '/admin/contracts', api: 'POST /api/contracts', decorator: '@Permissions(\'contracts.create\')' },
    { action: 'Create invoice', page: '/admin/invoices', api: 'POST /api/invoices', decorator: '@Permissions(\'contracts.update\')' },
  ],
  mustDeny: [
    { action: 'List invoices (API)', page: '/admin/invoices', api: 'GET /api/invoices', decorator: '@Permissions(\'payments.read\')', reason: 'USER_MANAGER has invoices.read but API requires payments.read — 403', file: 'apps/api/src/invoices/invoices.controller.ts' },
    { action: 'List payments', page: '/admin/payments', api: 'GET /api/payments', decorator: '@Permissions(\'payments.read\')', reason: 'USER_MANAGER has no payments.read' },
    { action: 'Record offline payment', page: '/admin/payments', api: 'POST /api/payments/offline', decorator: '@Permissions(\'payments.record_offline\')', reason: 'USER_MANAGER has no payments.*' },
    { action: 'Approve payment', page: '/admin/payments', api: 'PATCH /api/payments/:id/verify/accept', decorator: '@Permissions(\'payments.approve\')', reason: 'USER_MANAGER has no payments.approve' },
    { action: 'View audit logs', page: '/admin/activity', api: 'GET /api/audit-logs', decorator: '@Permissions(\'admin.users.read\')', reason: 'USER_MANAGER has no admin.users.read' },
  ],
};

export const TEST_CASES_CASHIER = {
  mustWork: [
    { action: 'List payments', page: '/admin/payments', api: 'GET /api/payments', decorator: '@Permissions(\'payments.read\')' },
    { action: 'List invoices', page: '/admin/invoices', api: 'GET /api/invoices', decorator: '@Permissions(\'payments.read\')' },
    { action: 'Approve payment', page: '/admin/payments', api: 'PATCH /api/payments/:id/verify/accept', decorator: '@Permissions(\'payments.approve\')' },
    { action: 'Capture offline', page: '/admin/payments', api: 'PATCH /api/payments/:id/capture', decorator: '@Permissions(\'payments.capture_offline\')' },
    { action: 'View tenants (read-only)', page: '/admin/tenants', api: 'GET /api/tenants', decorator: '@Permissions(\'tenants.read\')' },
  ],
  mustDeny: [
    { action: 'Record offline payment', page: '/admin/payments', api: 'POST /api/payments/offline', decorator: '@Permissions(\'payments.record_offline\')', reason: 'CASHIER has payments.approve/capture_offline, not record_offline' },
    { action: 'Create building', page: '/admin/buildings', api: 'POST /api/buildings', decorator: '@Permissions(\'buildings.create\')', reason: 'CASHIER has no buildings.*' },
    { action: 'Create contract', page: '/admin/contracts', api: 'POST /api/contracts', decorator: '@Permissions(\'contracts.create\')', reason: 'CASHIER has no contracts.create' },
    { action: 'Manage notifications', page: '/admin/notifications', api: 'POST /api/notifications/send-test', decorator: '@Permissions(\'notifications.manage\')', reason: 'CASHIER has no notifications.manage' },
    { action: 'View audit logs', page: '/admin/activity', api: 'GET /api/audit-logs', decorator: '@Permissions(\'admin.users.read\')', reason: 'CASHIER has no admin.users.read' },
  ],
};

export const TEST_CASES_PAYMENT_COLLECTOR = {
  mustWork: [
    { action: 'List payments', page: '/admin/payments', api: 'GET /api/payments', decorator: '@Permissions(\'payments.read\')' },
    { action: 'Record offline payment', page: '/admin/payments', api: 'POST /api/payments/offline', decorator: '@Permissions(\'payments.record_offline\')' },
    { action: 'List invoices', page: '/admin/invoices', api: 'GET /api/invoices', decorator: 'Currently payments.read — if fixed to invoices.read, PAYMENT_COLLECTOR has invoices.read' },
    { action: 'View tenants', page: '/admin/tenants', api: 'GET /api/tenants', decorator: '@Permissions(\'tenants.read\')' },
    { action: 'View contracts', page: '/admin/contracts', api: 'GET /api/contracts', decorator: '@Permissions(\'contracts.read\')' },
  ],
  mustDeny: [
    { action: 'Approve payment', page: '/admin/payments', api: 'PATCH /api/payments/:id/verify/accept', decorator: '@Permissions(\'payments.approve\')', reason: 'PAYMENT_COLLECTOR has no payments.approve' },
    { action: 'Create invoice', page: '/admin/invoices', api: 'POST /api/invoices', decorator: '@Permissions(\'contracts.update\')', reason: 'PAYMENT_COLLECTOR has no contracts.update' },
    { action: 'Create building', page: '/admin/buildings', api: 'POST /api/buildings', decorator: '@Permissions(\'buildings.create\')', reason: 'PAYMENT_COLLECTOR has no buildings.*' },
    { action: 'View audit logs', page: '/admin/activity', api: 'GET /api/audit-logs', decorator: '@Permissions(\'admin.users.read\')', reason: 'PAYMENT_COLLECTOR has no admin.users.read' },
    { action: 'Export payments', page: '/admin/reports', api: 'GET /api/exports/payments', decorator: '@Permissions(\'payments.read\')', reason: 'PAYMENT_COLLECTOR has payments.read — so this would ALLOW; only approve/record_offline are restricted' },
  ],
};

export const TEST_CASES_SUPPORT = {
  mustWork: [
    { action: 'List conversations', page: '/admin/chat', api: 'GET /api/conversations', decorator: '@Permissions(\'chat.read\')' },
    { action: 'Assign conversation', page: '/admin/chat', api: 'PATCH /api/conversations/:id/assign', decorator: '@Permissions(\'chat.reply\')' },
    { action: 'Reply in chat', page: '/admin/chat', api: 'POST message via socket or send', decorator: 'chat.reply' },
    { action: 'List tenants', page: '/admin/tenants', api: 'GET /api/tenants', decorator: '@Permissions(\'tenants.read\')' },
    { action: 'List invoices', page: '/admin/invoices', api: 'GET /api/invoices', decorator: '@Permissions(\'payments.read\')' },
  ],
  mustDeny: [
    { action: 'Create building', page: '/admin/buildings', api: 'POST /api/buildings', decorator: '@Permissions(\'buildings.create\')', reason: 'SUPPORT has no buildings.*' },
    { action: 'List payments', page: '/admin/payments', api: 'GET /api/payments', decorator: '@Permissions(\'payments.read\')', reason: 'SUPPORT has no payments.read' },
    { action: 'View audit logs', page: '/admin/activity', api: 'GET /api/audit-logs', decorator: '@Permissions(\'admin.users.read\')', reason: 'SUPPORT has no admin.users.read' },
    { action: 'Manage notifications', page: '/admin/notifications', api: 'POST /api/notifications/send-test', decorator: '@Permissions(\'notifications.manage\')', reason: 'SUPPORT has notifications.manage in preset — re-check; preset has notifications.manage? No — SUPPORT has chat.read, chat.reply, chat.manage, tenants.read, contracts.read, invoices.read. So SUPPORT cannot manage notifications' },
    { action: 'Export reports', page: '/admin/reports', api: 'GET /api/exports/contracts', decorator: '@Permissions(\'contracts.read\')', reason: 'SUPPORT has contracts.read — export contracts would ALLOW' },
  ],
};

export const TEST_CASES_ANALYST = {
  mustWork: [
    { action: 'View reports', page: '/admin/reports', api: 'GET /api/reports (or dashboard stats)', decorator: '@Permissions(\'reports.view\')' },
    { action: 'List buildings', page: '/admin/buildings', api: 'GET /api/buildings', decorator: '@Permissions(\'buildings.read\')' },
    { action: 'List payments', page: '/admin/payments', api: 'GET /api/payments', decorator: '@Permissions(\'payments.read\')' },
    { action: 'List invoices', page: '/admin/invoices', api: 'GET /api/invoices', decorator: '@Permissions(\'payments.read\')' },
    { action: 'Export payments', page: '/admin/reports', api: 'GET /api/exports/payments', decorator: '@Permissions(\'payments.read\')' },
  ],
  mustDeny: [
    { action: 'View audit logs (API)', page: '/admin/activity', api: 'GET /api/audit-logs', decorator: '@Permissions(\'admin.users.read\')', reason: 'ANALYST has audit.read but API uses admin.users.read — 403', file: 'apps/api/src/audit-logs/audit-logs.controller.ts' },
    { action: 'Create contract', page: '/admin/contracts', api: 'POST /api/contracts', decorator: '@Permissions(\'contracts.create\')', reason: 'ANALYST has no contracts.create' },
    { action: 'Approve payment', page: '/admin/payments', api: 'PATCH /api/payments/:id/verify/accept', decorator: '@Permissions(\'payments.approve\')', reason: 'ANALYST has no payments.approve' },
    { action: 'Manage users', page: '/admin/users', api: 'GET /api/admin/users', decorator: '@Permissions(\'admin.users.read\')', reason: 'ANALYST has no admin.users.read' },
    { action: 'Run archive', page: '/admin/archive', api: 'POST /api/archive/run-auto-archive', decorator: '@Permissions(\'admin.users.read\')', reason: 'ANALYST has no admin.users.read' },
  ],
};

export const TEST_CASES_TENANT_USER = {
  mustWork: [
    { action: 'Get own conversations', page: 'tenant portal', api: 'GET /api/conversations', decorator: 'PermissionsGuard allows TENANT_USER for chat.read (permissions.guard.ts)' },
    { action: 'Get messages', page: 'tenant portal', api: 'GET /api/conversations/:id/messages', decorator: '@Permissions(\'chat.read\')' },
    { action: 'Create conversation', page: 'tenant portal', api: 'POST /api/conversations', decorator: '@Permissions(\'chat.read\')' },
    { action: 'Tenant portal /me', page: 'tenant-web', api: 'GET /api/auth/me', decorator: 'No @Permissions on MeController' },
    { action: 'Tenant portal invoices (tenant-portal controller)', page: 'tenant-web', api: 'GET /api/tenant-portal/invoices', decorator: 'TenantPortal uses tenant JWT, not admin permissions' },
  ],
  mustDeny: [
    { action: 'List admin buildings', page: 'N/A', api: 'GET /api/buildings', decorator: '@Permissions(\'buildings.read\')', reason: 'TENANT_USER has no admin permissions; guard denies' },
    { action: 'List payments (admin)', page: 'N/A', api: 'GET /api/payments', decorator: '@Permissions(\'payments.read\')', reason: 'TENANT_USER has no payments.read' },
    { action: 'View audit logs', page: 'N/A', api: 'GET /api/audit-logs', decorator: '@Permissions(\'admin.users.read\')', reason: 'TENANT_USER has no admin.users.read' },
    { action: 'List admin users', page: 'N/A', api: 'GET /api/admin/users', decorator: '@Permissions(\'admin.users.read\')', reason: 'TENANT_USER has no admin.users.read' },
    { action: 'Export tenants', page: 'N/A', api: 'GET /api/exports/tenants', decorator: '@Permissions(\'tenants.read\')', reason: 'TENANT_USER has no tenants.read' },
  ],
};

// =============================================================================
// 3. FINDINGS REPORT — Prioritized fixes (P0 / P1 / P2)
// =============================================================================
// File paths and suggested code edits. Verify by running e2e or manual tests after changes.

export const FINDINGS = {
  P0_critical: [
    {
      id: 'F1',
      title: 'InvoicesController uses payments.read for list/one/qr — USER_MANAGER and PAYMENT_COLLECTOR get 403',
      detail: 'UI gates Invoices page by invoices.read. USER_MANAGER and PAYMENT_COLLECTOR have invoices.read but not payments.read. API GET /api/invoices and GET /api/invoices/:id and GET /api/invoices/:id/qr require payments.read.',
      file: 'apps/api/src/invoices/invoices.controller.ts',
      fix: 'Change @Permissions on findAll, findOne, getQrCode from payments.read to invoices.read.',
      lines: '21, 30, 37',
    },
    {
      id: 'F2',
      title: 'AuditLogsController uses admin.users.read — ANALYST cannot view audit logs',
      detail: 'ROLE_PRESETS give ANALYST audit.read for "View audit logs". Audit-logs controller GET uses admin.users.read. Only SUPER_ADMIN has admin.users.read after seed.',
      file: 'apps/api/src/audit-logs/audit-logs.controller.ts',
      fix: 'Change @Permissions on findAll from admin.users.read to audit.read.',
      lines: '16',
    },
    {
      id: 'F3',
      title: 'ReceiptsController has no @Permissions — any authenticated user can access admin receipt endpoints',
      detail: 'GET /api/receipts/payment/:paymentId, GET /api/receipts/history/:tenantId, GET /api/receipts/chart-data/:tenantId are admin-facing. No PermissionsGuard check; only JwtAuthGuard.',
      file: 'apps/api/src/receipts/receipts.controller.ts',
      fix: 'Add @UseGuards(JwtAuthGuard, PermissionsGuard) at class level and @Permissions(\'payments.read\') on getReceiptData, getPaymentHistoryAdmin (history/:tenantId), getChartDataAdmin (chart-data/:tenantId). Tenant-only routes (history, chart-data without :tenantId) can remain without @Permissions if guarded by tenant-id-from-JWT in service, or use a dedicated tenant permission.',
      lines: '13-42',
    },
  ],
  P1_high: [
    {
      id: 'F4',
      title: 'PermissionsGuard references non-existent permission chat.write',
      detail: 'TENANT_USER branch in PermissionsGuard checks chatPermissions = [\'chat.read\', \'chat.write\', \'chat.reply\', \'chat.manage\']. PERMISSIONS catalog has no chat.write.',
      file: 'apps/api/src/rbac/permissions.guard.ts',
      fix: 'Remove chat.write from the chatPermissions array; use only chat.read, chat.reply, chat.manage.',
      lines: '41-42',
    },
    {
      id: 'F5',
      title: 'Admin Invoices page: verify/accept uses payments.capture_offline in UI but API uses payments.approve',
      detail: 'admin-web invoices page checks hasPermission(\'payments.capture_offline\') for mark paid / verify. PaymentsController verify/accept and decline use payments.approve. CASHIER has both so works; if a role had only capture_offline they would see button but get 403.',
      file: 'apps/admin-web/src/app/admin/invoices/page.tsx',
      fix: 'Use hasPermission(\'payments.approve\') for verify/accept/decline and mark-as-paid actions that call verify or update payment status. Reserve payments.capture_offline for "capture offline" only if semantically different.',
      lines: '196-197, 239-240, 519',
    },
    {
      id: 'F6',
      title: 'Admin Payments page: verify/delete/edit check payments.capture_offline instead of payments.approve',
      detail: 'payments/page.tsx uses hasPermission(\'payments.capture_offline\') for verify, delete, edit. API: update, verify/accept, verify/decline, remove use payments.approve; capture uses payments.capture_offline.',
      file: 'apps/admin-web/src/app/admin/payments/page.tsx',
      fix: 'Use hasPermission(\'payments.approve\') for verify accept/decline, update, and delete payment. Use payments.capture_offline only for "capture offline" action.',
      lines: '178-179, 214-215, 261-262, 504',
    },
    {
      id: 'F7',
      title: 'Activity Logs and Archive sidebar use admin.users.read — ANALYST should see Activity Logs',
      detail: 'Sidebar Activity Logs and Archive use permissionCodes [\'admin.users.read\']. ANALYST has audit.read; only SUPER_ADMIN has admin.users.read. So ANALYST never sees Activity Logs in sidebar even after F2 fix.',
      file: 'apps/admin-web/src/components/AdminSidebar.tsx',
      fix: 'Use permissionCodes [\'audit.read\'] for Activity Logs (line ~200). For Archive, either add audit.read (so ANALYST can view) or keep admin.users.read (archive stays super-admin only); recommend audit.read for Activity Logs only.',
      lines: '198-201 (activity), 210-212 (archive)',
    },
  ],
  P2_medium: [
    {
      id: 'F8',
      title: 'Archive module uses only admin.users.read — no dedicated permission',
      detail: 'Archive controller and sidebar use admin.users.read. Catalog has no archive.view or archive.manage. So only SUPER_ADMIN can access archive after seed.',
      file: 'apps/api/src/archive/archive.controller.ts',
      fix: 'Option A: Add permission audit.read to archive endpoints so ANALYST can view/restore. Option B: Add permissions archive.view / archive.manage in catalog and ROLE_PRESETS, then use them in ArchiveController and AdminSidebar.',
      lines: '15-78',
    },
    {
      id: 'F9',
      title: 'Exports invoices endpoint uses payments.read',
      detail: 'GET /api/exports/invoices has @Permissions(\'payments.read\'). USER_MANAGER has invoices.read but not payments.read; cannot export invoices. Align with F1: use invoices.read for invoice export if USER_MANAGER should export.',
      file: 'apps/api/src/exports/exports.controller.ts',
      fix: 'Change @Permissions for exportInvoices from payments.read to invoices.read (or keep payments.read if only payment-related roles should export invoices).',
      lines: '37-38',
    },
    {
      id: 'F10',
      title: 'BulkActionsController bulk invoices/status uses payments.read',
      detail: 'POST /api/bulk/invoices/status has @Permissions(\'payments.read\'). USER_MANAGER has invoices.read, invoices.update; changing invoice status is update. Consider invoices.update for bulk invoice status.',
      file: 'apps/api/src/bulk-actions/bulk-actions.controller.ts',
      fix: 'Consider @Permissions(\'invoices.update\') for bulkUpdateInvoiceStatus so USER_MANAGER can bulk-update invoice status.',
      lines: '32-34',
    },
    {
      id: 'F11',
      title: 'AuthContext AdminRole enum missing USER_MANAGER and PAYMENT_COLLECTOR',
      detail: 'AuthContext.tsx AdminRole enum has SUPER_ADMIN, ADMIN, CASHIER, SUPPORT, ANALYST, TENANT_USER. Missing USER_MANAGER, PAYMENT_COLLECTOR. hasPermission uses user.permissions from API so still works; role display may show raw string.',
      file: 'apps/admin-web/src/contexts/AuthContext.tsx',
      fix: 'Add USER_MANAGER and PAYMENT_COLLECTOR to AdminRole enum for consistency and correct display.',
      lines: '8-15',
    },
  ],
} as const;
