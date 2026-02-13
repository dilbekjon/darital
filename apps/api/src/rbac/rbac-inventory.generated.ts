/**
 * RBAC inventory — generated from controller scan.
 * Do not edit by hand; regenerate when controllers change.
 * Base path: /api (global prefix in main.ts).
 */

export interface RbacEndpoint {
  httpMethod: string;
  route: string;
  controllerFilePath: string;
  methodName: string;
  permissions: string[];
  hasNoPermissions: boolean;
  isPublic: boolean;
  note?: string;
}

export const RBAC_INVENTORY: RbacEndpoint[] = [
  // app.controller.ts
  { httpMethod: 'GET', route: '/api/', controllerFilePath: 'src/app.controller.ts', methodName: 'getHello', permissions: [], hasNoPermissions: true, isPublic: true },
  { httpMethod: 'GET', route: '/api/health', controllerFilePath: 'src/app.controller.ts', methodName: 'getHealth', permissions: [], hasNoPermissions: true, isPublic: true },
  { httpMethod: 'GET', route: '/api/admin/ping', controllerFilePath: 'src/app.controller.ts', methodName: 'adminPing', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  // auth
  { httpMethod: 'POST', route: '/api/auth/login', controllerFilePath: 'src/auth/auth.controller.ts', methodName: 'login', permissions: [], hasNoPermissions: true, isPublic: true },
  { httpMethod: 'GET', route: '/api/auth/me', controllerFilePath: 'src/auth/me.controller.ts', methodName: 'me', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Any authenticated user; returns req.user with role and permissions' },
  // admin
  { httpMethod: 'POST', route: '/api/admin/create', controllerFilePath: 'src/admin/admin.controller.ts', methodName: 'create', permissions: [], hasNoPermissions: true, isPublic: true },
  { httpMethod: 'POST', route: '/api/admin/clear-database', controllerFilePath: 'src/admin/admin.controller.ts', methodName: 'clearDatabase', permissions: [], hasNoPermissions: true, isPublic: true },
  // buildings
  { httpMethod: 'GET', route: '/api/buildings', controllerFilePath: 'src/buildings/buildings.controller.ts', methodName: 'findAll', permissions: ['buildings.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/buildings/statistics', controllerFilePath: 'src/buildings/buildings.controller.ts', methodName: 'getStatistics', permissions: ['reports.view'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/buildings/:id', controllerFilePath: 'src/buildings/buildings.controller.ts', methodName: 'findOne', permissions: ['buildings.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/buildings', controllerFilePath: 'src/buildings/buildings.controller.ts', methodName: 'create', permissions: ['buildings.create'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PUT', route: '/api/buildings/:id', controllerFilePath: 'src/buildings/buildings.controller.ts', methodName: 'update', permissions: ['buildings.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/buildings/:id', controllerFilePath: 'src/buildings/buildings.controller.ts', methodName: 'remove', permissions: ['buildings.delete'], hasNoPermissions: false, isPublic: false },
  // units
  { httpMethod: 'GET', route: '/api/units', controllerFilePath: 'src/units/units.controller.ts', methodName: 'findAll', permissions: ['units.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/units/:id', controllerFilePath: 'src/units/units.controller.ts', methodName: 'findOne', permissions: ['units.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/units', controllerFilePath: 'src/units/units.controller.ts', methodName: 'create', permissions: ['units.create'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/units/:id', controllerFilePath: 'src/units/units.controller.ts', methodName: 'update', permissions: ['units.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/units/:id', controllerFilePath: 'src/units/units.controller.ts', methodName: 'remove', permissions: ['units.delete'], hasNoPermissions: false, isPublic: false },
  // tenants
  { httpMethod: 'GET', route: '/api/tenants', controllerFilePath: 'src/tenants/tenants.controller.ts', methodName: 'findAll', permissions: ['tenants.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/tenants/:id', controllerFilePath: 'src/tenants/tenants.controller.ts', methodName: 'findOne', permissions: ['tenants.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/tenants', controllerFilePath: 'src/tenants/tenants.controller.ts', methodName: 'create', permissions: ['tenants.create'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/tenants/:id', controllerFilePath: 'src/tenants/tenants.controller.ts', methodName: 'update', permissions: ['tenants.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PUT', route: '/api/tenants/:id/archive', controllerFilePath: 'src/tenants/tenants.controller.ts', methodName: 'archive', permissions: ['tenants.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PUT', route: '/api/tenants/:id/unarchive', controllerFilePath: 'src/tenants/tenants.controller.ts', methodName: 'unarchive', permissions: ['tenants.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/tenants/:id', controllerFilePath: 'src/tenants/tenants.controller.ts', methodName: 'remove', permissions: ['tenants.delete'], hasNoPermissions: false, isPublic: false },
  // contracts
  { httpMethod: 'GET', route: '/api/contracts', controllerFilePath: 'src/contracts/contracts.controller.ts', methodName: 'findAll', permissions: ['contracts.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/contracts/:id', controllerFilePath: 'src/contracts/contracts.controller.ts', methodName: 'findOne', permissions: ['contracts.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/contracts', controllerFilePath: 'src/contracts/contracts.controller.ts', methodName: 'create', permissions: ['contracts.create'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/contracts/:id', controllerFilePath: 'src/contracts/contracts.controller.ts', methodName: 'update', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/contracts/:id/status', controllerFilePath: 'src/contracts/contracts.controller.ts', methodName: 'changeStatus', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PUT', route: '/api/contracts/:id/archive', controllerFilePath: 'src/contracts/contracts.controller.ts', methodName: 'archive', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PUT', route: '/api/contracts/:id/unarchive', controllerFilePath: 'src/contracts/contracts.controller.ts', methodName: 'unarchive', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/contracts/:id', controllerFilePath: 'src/contracts/contracts.controller.ts', methodName: 'remove', permissions: ['contracts.delete'], hasNoPermissions: false, isPublic: false },
  // invoices
  { httpMethod: 'GET', route: '/api/invoices', controllerFilePath: 'src/invoices/invoices.controller.ts', methodName: 'findAll', permissions: ['invoices.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/invoices/:id', controllerFilePath: 'src/invoices/invoices.controller.ts', methodName: 'findOne', permissions: ['invoices.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/invoices/:id/qr', controllerFilePath: 'src/invoices/invoices.controller.ts', methodName: 'getQrCode', permissions: ['invoices.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/invoices', controllerFilePath: 'src/invoices/invoices.controller.ts', methodName: 'create', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/invoices/:id', controllerFilePath: 'src/invoices/invoices.controller.ts', methodName: 'update', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PUT', route: '/api/invoices/:id/archive', controllerFilePath: 'src/invoices/invoices.controller.ts', methodName: 'archive', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PUT', route: '/api/invoices/:id/unarchive', controllerFilePath: 'src/invoices/invoices.controller.ts', methodName: 'unarchive', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/invoices/:id', controllerFilePath: 'src/invoices/invoices.controller.ts', methodName: 'remove', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  // payments
  { httpMethod: 'GET', route: '/api/payments', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'findAll', permissions: ['payments.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/payments', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'create', permissions: ['payments.record_offline'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/payments/offline', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'recordOfflinePayment', permissions: ['payments.record_offline'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/payments/:id', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'update', permissions: ['payments.approve'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/payments/:id/verify/accept', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'acceptPayment', permissions: ['payments.approve'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/payments/:id/verify/decline', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'declinePayment', permissions: ['payments.approve'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/payments/:id/capture', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'captureOffline', permissions: ['payments.capture_offline'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/payments/:id', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'remove', permissions: ['payments.approve'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/payments/webhook/:provider', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'webhook', permissions: [], hasNoPermissions: true, isPublic: true },
  { httpMethod: 'POST', route: '/api/payments/webhook-sim/:provider/:paymentId', controllerFilePath: 'src/payments/payments.controller.ts', methodName: 'simulateWebhook', permissions: [], hasNoPermissions: true, isPublic: true },
  // balances
  { httpMethod: 'GET', route: '/api/balances', controllerFilePath: 'src/balances/balances.controller.ts', methodName: 'findAll', permissions: ['payments.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/balances/:tenantId', controllerFilePath: 'src/balances/balances.controller.ts', methodName: 'findOne', permissions: ['payments.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/balances/:tenantId/reset', controllerFilePath: 'src/balances/balances.controller.ts', methodName: 'reset', permissions: ['payments.capture_offline'], hasNoPermissions: false, isPublic: false },
  // receipts
  { httpMethod: 'GET', route: '/api/receipts/payment/:paymentId', controllerFilePath: 'src/receipts/receipts.controller.ts', methodName: 'getReceiptData', permissions: ['payments.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/receipts/history', controllerFilePath: 'src/receipts/receipts.controller.ts', methodName: 'getPaymentHistory', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant self-service; service uses req.user.id' },
  { httpMethod: 'GET', route: '/api/receipts/history/:tenantId', controllerFilePath: 'src/receipts/receipts.controller.ts', methodName: 'getPaymentHistoryAdmin', permissions: ['payments.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/receipts/chart-data', controllerFilePath: 'src/receipts/receipts.controller.ts', methodName: 'getChartData', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant self-service; service uses req.user.id' },
  { httpMethod: 'GET', route: '/api/receipts/chart-data/:tenantId', controllerFilePath: 'src/receipts/receipts.controller.ts', methodName: 'getChartDataAdmin', permissions: ['payments.read'], hasNoPermissions: false, isPublic: false },
  // audit-logs
  { httpMethod: 'GET', route: '/api/audit-logs', controllerFilePath: 'src/audit-logs/audit-logs.controller.ts', methodName: 'findAll', permissions: ['audit.read'], hasNoPermissions: false, isPublic: false },
  // archive
  { httpMethod: 'GET', route: '/api/archive/summary', controllerFilePath: 'src/archive/archive.controller.ts', methodName: 'getSummary', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/archive/run-auto-archive', controllerFilePath: 'src/archive/archive.controller.ts', methodName: 'runAutoArchive', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/archive/conversations', controllerFilePath: 'src/archive/archive.controller.ts', methodName: 'getArchivedConversations', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/archive/conversations/:id/messages', controllerFilePath: 'src/archive/archive.controller.ts', methodName: 'getArchivedMessages', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/archive/conversations/:id/restore', controllerFilePath: 'src/archive/archive.controller.ts', methodName: 'restoreArchivedConversation', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/archive/cleanup/:days', controllerFilePath: 'src/archive/archive.controller.ts', methodName: 'cleanupOldArchives', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  // chat (conversations)
  { httpMethod: 'POST', route: '/api/conversations', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'createConversation', permissions: ['chat.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/conversations/unread/count', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'getUnreadCount', permissions: ['chat.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/conversations', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'findAll', permissions: ['chat.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/conversations/:id', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'findOne', permissions: ['chat.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/conversations/:id/messages', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'getMessages', permissions: ['chat.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/conversations/:id/assign', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'assignAdmin', permissions: ['chat.reply'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/conversations/:id/unassign', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'unassignAdmin', permissions: ['chat.reply'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/conversations/:id/close', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'closeConversation', permissions: ['chat.reply'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/conversations/upload', controllerFilePath: 'src/chat/chat.controller.ts', methodName: 'uploadFile', permissions: ['chat.reply'], hasNoPermissions: false, isPublic: false },
  // email-templates
  { httpMethod: 'GET', route: '/api/email-templates', controllerFilePath: 'src/email-templates/email-templates.controller.ts', methodName: 'findAll', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/email-templates/:id', controllerFilePath: 'src/email-templates/email-templates.controller.ts', methodName: 'findOne', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PUT', route: '/api/email-templates/:id', controllerFilePath: 'src/email-templates/email-templates.controller.ts', methodName: 'update', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/email-templates/:id/preview', controllerFilePath: 'src/email-templates/email-templates.controller.ts', methodName: 'preview', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/email-templates/:id/reset', controllerFilePath: 'src/email-templates/email-templates.controller.ts', methodName: 'reset', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/email-templates/seed', controllerFilePath: 'src/email-templates/email-templates.controller.ts', methodName: 'seed', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  // bulk-actions
  { httpMethod: 'POST', route: '/api/bulk/invoices/status', controllerFilePath: 'src/bulk-actions/bulk-actions.controller.ts', methodName: 'bulkUpdateInvoiceStatus', permissions: ['invoices.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/bulk/payments/status', controllerFilePath: 'src/bulk-actions/bulk-actions.controller.ts', methodName: 'bulkUpdatePaymentStatus', permissions: ['payments.capture_offline'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/bulk/contracts/status', controllerFilePath: 'src/bulk-actions/bulk-actions.controller.ts', methodName: 'bulkUpdateContractStatus', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/bulk/units/status', controllerFilePath: 'src/bulk-actions/bulk-actions.controller.ts', methodName: 'bulkUpdateUnitStatus', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/bulk/units/assign-building', controllerFilePath: 'src/bulk-actions/bulk-actions.controller.ts', methodName: 'bulkAssignUnitsToBuilding', permissions: ['contracts.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/bulk/notifications/send', controllerFilePath: 'src/bulk-actions/bulk-actions.controller.ts', methodName: 'bulkSendNotifications', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  // exports
  { httpMethod: 'GET', route: '/api/exports/tenants', controllerFilePath: 'src/exports/exports.controller.ts', methodName: 'exportTenants', permissions: ['tenants.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/exports/contracts', controllerFilePath: 'src/exports/exports.controller.ts', methodName: 'exportContracts', permissions: ['contracts.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/exports/invoices', controllerFilePath: 'src/exports/exports.controller.ts', methodName: 'exportInvoices', permissions: ['invoices.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/exports/payments', controllerFilePath: 'src/exports/exports.controller.ts', methodName: 'exportPayments', permissions: ['payments.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/exports/units', controllerFilePath: 'src/exports/exports.controller.ts', methodName: 'exportUnits', permissions: ['contracts.read'], hasNoPermissions: false, isPublic: false },
  // documents
  { httpMethod: 'GET', route: '/api/documents/tenant/:tenantId', controllerFilePath: 'src/documents/documents.controller.ts', methodName: 'findAllForTenant', permissions: ['tenants.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/documents/contract/:contractId', controllerFilePath: 'src/documents/documents.controller.ts', methodName: 'findAllForContract', permissions: ['contracts.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/documents/payment/:paymentId', controllerFilePath: 'src/documents/documents.controller.ts', methodName: 'findAllForPayment', permissions: ['payments.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/documents/:id', controllerFilePath: 'src/documents/documents.controller.ts', methodName: 'findOne', permissions: ['tenants.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/documents/upload', controllerFilePath: 'src/documents/documents.controller.ts', methodName: 'upload', permissions: ['tenants.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/documents/:id', controllerFilePath: 'src/documents/documents.controller.ts', methodName: 'remove', permissions: ['tenants.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/documents/stats/:tenantId', controllerFilePath: 'src/documents/documents.controller.ts', methodName: 'getStats', permissions: ['tenants.read'], hasNoPermissions: false, isPublic: false },
  // telegram
  { httpMethod: 'GET', route: '/api/telegram/users', controllerFilePath: 'src/telegram/telegram.controller.ts', methodName: 'getUsers', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/telegram/users/:chatId', controllerFilePath: 'src/telegram/telegram.controller.ts', methodName: 'getUserByChatId', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/telegram/send-message', controllerFilePath: 'src/telegram/telegram.controller.ts', methodName: 'sendMessage', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/telegram/send-broadcast', controllerFilePath: 'src/telegram/telegram.controller.ts', methodName: 'sendBroadcast', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/telegram/bot-info', controllerFilePath: 'src/telegram/telegram.controller.ts', methodName: 'getBotInfo', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  // notifications
  { httpMethod: 'POST', route: '/api/notifications/test', controllerFilePath: 'src/notifications/notifications.controller.ts', methodName: 'sendTest', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'POST', route: '/api/notifications/telegram/test', controllerFilePath: 'src/notifications/notifications.controller.ts', methodName: 'sendTelegramTest', permissions: ['notifications.manage'], hasNoPermissions: false, isPublic: false },
  // admin/users
  { httpMethod: 'POST', route: '/api/admin/users', controllerFilePath: 'src/users/users.controller.ts', methodName: 'create', permissions: ['admin.users.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/admin/users', controllerFilePath: 'src/users/users.controller.ts', methodName: 'findAll', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'GET', route: '/api/admin/users/:id', controllerFilePath: 'src/users/users.controller.ts', methodName: 'findOne', permissions: ['admin.users.read'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/admin/users/:id', controllerFilePath: 'src/users/users.controller.ts', methodName: 'update', permissions: ['admin.users.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'DELETE', route: '/api/admin/users/:id', controllerFilePath: 'src/users/users.controller.ts', methodName: 'remove', permissions: ['admin.users.update'], hasNoPermissions: false, isPublic: false },
  { httpMethod: 'PATCH', route: '/api/admin/users/:id/role', controllerFilePath: 'src/users/users.controller.ts', methodName: 'updateRole', permissions: ['admin.users.update'], hasNoPermissions: false, isPublic: false },
  // reports
  { httpMethod: 'GET', route: '/api/reports', controllerFilePath: 'src/reports/reports.controller.ts', methodName: 'getReport', permissions: ['reports.view'], hasNoPermissions: false, isPublic: false },
  // tenant-portal (tenant-only via ensureTenantAccess; no @Permissions)
  { httpMethod: 'GET', route: '/api/tenant/me', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getTenantProfile', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess(req.user)' },
  { httpMethod: 'GET', route: '/api/tenant/invoices', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getTenantInvoices', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'GET', route: '/api/tenant/payments', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getTenantPayments', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'POST', route: '/api/tenant/payments/intent', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'createPaymentIntent', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'GET', route: '/api/tenant/payments/:id', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getPaymentDetails', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'POST', route: '/api/tenant/payments/:id/refresh', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'refreshPaymentStatus', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'GET', route: '/api/tenant/balance', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getBalance', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'POST', route: '/api/tenant/devices/register', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'registerDevice', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'GET', route: '/api/tenant/devices', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getDevices', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'GET', route: '/api/tenant/notifications/preferences', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getNotificationPreferences', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'PATCH', route: '/api/tenant/notifications/preferences', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'updateNotificationPreferences', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'GET', route: '/api/tenant/receipts/payment/:paymentId', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getReceiptForPayment', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess; service checks ownership' },
  { httpMethod: 'GET', route: '/api/tenant/receipts/chart-data', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getReceiptChartData', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'GET', route: '/api/tenant/documents', controllerFilePath: 'src/tenant-portal/tenant-portal.controller.ts', methodName: 'getDocuments', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  // in-app-notifications (tenant-only via ensureTenantAccess)
  { httpMethod: 'GET', route: '/api/tenant/notifications/in-app', controllerFilePath: 'src/in-app-notifications/in-app-notifications.controller.ts', methodName: 'getNotifications', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'GET', route: '/api/tenant/notifications/in-app/unread-count', controllerFilePath: 'src/in-app-notifications/in-app-notifications.controller.ts', methodName: 'getUnreadCount', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'POST', route: '/api/tenant/notifications/in-app/:id/read', controllerFilePath: 'src/in-app-notifications/in-app-notifications.controller.ts', methodName: 'markAsRead', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'POST', route: '/api/tenant/notifications/in-app/read-all', controllerFilePath: 'src/in-app-notifications/in-app-notifications.controller.ts', methodName: 'markAllAsRead', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
  { httpMethod: 'DELETE', route: '/api/tenant/notifications/in-app/:id', controllerFilePath: 'src/in-app-notifications/in-app-notifications.controller.ts', methodName: 'deleteNotification', permissions: [], hasNoPermissions: true, isPublic: false, note: 'Tenant-only: ensureTenantAccess' },
];

/** Endpoints that are protected (JWT) but have no @Permissions — potential review. */
export const ENDPOINTS_WITH_AUTH_NO_PERMISSIONS = RBAC_INVENTORY.filter(
  (e) => !e.isPublic && e.hasNoPermissions && e.permissions.length === 0,
);

/** Endpoints that are public (no JWT required). */
export const PUBLIC_ENDPOINTS = RBAC_INVENTORY.filter((e) => e.isPublic);
