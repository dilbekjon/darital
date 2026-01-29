export const PERMISSIONS = {
  // Buildings
  'buildings.read': 'View buildings',
  'buildings.create': 'Create buildings',
  'buildings.update': 'Update buildings',
  'buildings.delete': 'Delete buildings',
  // Units (Rooms)
  'units.read': 'View units/rooms',
  'units.create': 'Create units/rooms',
  'units.update': 'Update units/rooms',
  'units.delete': 'Delete units/rooms',
  // Contracts
  'contracts.read': 'View contracts',
  'contracts.create': 'Create contracts',
  'contracts.update': 'Update contracts',
  'contracts.delete': 'Delete contracts',
  // Tenants (Users)
  'tenants.read': 'View tenants',
  'tenants.create': 'Create tenants',
  'tenants.update': 'Update tenants',
  'tenants.delete': 'Delete tenants',
  // Payments
  'payments.read': 'View payments',
  'payments.record_offline': 'Record offline payment details',
  'payments.approve': 'Approve payments (online and offline)',
  'payments.capture_offline': 'Mark offline payment as received',
  'payments.refund': 'Refund payment',
  // Invoices
  'invoices.read': 'View invoices',
  'invoices.create': 'Create invoices',
  'invoices.update': 'Update invoices',
  'invoices.delete': 'Delete invoices',
  // Reports
  'reports.view': 'View analytics & exports',
  // Chat/Support
  'chat.read': 'View conversations',
  'chat.reply': 'Reply in conversations',
  'chat.manage': 'Manage all conversations',
  // Admin
  'admin.users.read': 'View admin users',
  'admin.users.update': 'Manage admin users/roles',
  // Notifications
  'notifications.manage': 'Manage reminder schedules & prefs',
  // Audit
  'audit.read': 'View audit logs',
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;

export const ROLE_PRESETS: Record<string, PermissionCode[]> = {
  // Main Director (Super Admin) - Full access to everything
  SUPER_ADMIN: Object.keys(PERMISSIONS) as PermissionCode[],
  
  // General Admin (legacy) - Most permissions except user management
  ADMIN: [
    'buildings.read', 'buildings.create', 'buildings.update', 'buildings.delete',
    'units.read', 'units.create', 'units.update', 'units.delete',
    'contracts.read', 'contracts.create', 'contracts.update', 'contracts.delete',
    'tenants.read', 'tenants.create', 'tenants.update', 'tenants.delete',
    'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
    'payments.read', 'payments.capture_offline', 'payments.approve',
    'reports.view', 'chat.read', 'chat.reply', 'notifications.manage'
  ],
  
  // User Manager - Manages buildings, rooms, users, contracts - NO payment access
  USER_MANAGER: [
    'buildings.read', 'buildings.create', 'buildings.update', 'buildings.delete',
    'units.read', 'units.create', 'units.update', 'units.delete',
    'contracts.read', 'contracts.create', 'contracts.update', 'contracts.delete',
    'tenants.read', 'tenants.create', 'tenants.update', 'tenants.delete',
    'invoices.read', 'invoices.create', 'invoices.update',
    'chat.read', 'chat.reply'
  ],
  
  // Cashier - Verifies and approves all payments, cannot edit payment details
  CASHIER: [
    'payments.read',
    'payments.approve',
    'payments.capture_offline',
    'invoices.read',
    'tenants.read',
    'contracts.read'
  ],
  
  // Payment Collector - Collects cash, records details, CANNOT approve
  PAYMENT_COLLECTOR: [
    'payments.read',
    'payments.record_offline',
    'invoices.read',
    'tenants.read',
    'contracts.read',
    'units.read',
    'chat.read'
  ],
  
  // Support - Chat and tenant info access only
  SUPPORT: [
    'chat.read', 'chat.reply', 'chat.manage',
    'tenants.read',
    'contracts.read',
    'invoices.read'
  ],
  
  // Analyst - Reports and view-only access
  ANALYST: [
    'reports.view',
    'buildings.read',
    'units.read',
    'contracts.read',
    'tenants.read',
    'payments.read',
    'invoices.read',
    'audit.read'
  ],
};
