export const PERMISSIONS = {
  // Contracts
  'contracts.read': 'View contracts',
  'contracts.create': 'Create contracts',
  'contracts.update': 'Update contracts',
  'contracts.delete': 'Delete contracts',
  // Tenants
  'tenants.read': 'View tenants',
  'tenants.create': 'Create tenants',
  'tenants.update': 'Update tenants',
  'tenants.delete': 'Delete tenants',
  // Payments
  'payments.read': 'View payments',
  'payments.capture_offline': 'Mark offline payment',
  'payments.refund': 'Refund payment',
  // Reports
  'reports.view': 'View analytics & exports',
  // Chat/Support
  'chat.read': 'View conversations',
  'chat.reply': 'Reply in conversations',
  // Admin
  'admin.users.read': 'View admin users',
  'admin.users.update': 'Manage admin users/roles',
  // Notifications
  'notifications.manage': 'Manage reminder schedules & prefs',
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;

export const ROLE_PRESETS: Record<string, PermissionCode[]> = {
  SUPER_ADMIN: Object.keys(PERMISSIONS) as PermissionCode[],
  ADMIN: [
    'contracts.read','contracts.create','contracts.update','contracts.delete',
    'tenants.read','tenants.create','tenants.update','tenants.delete',
    'payments.read','payments.capture_offline',
    'reports.view','chat.read','chat.reply','notifications.manage'
  ],
  CASHIER: ['payments.read','payments.capture_offline'],
  SUPPORT: ['chat.read','chat.reply','tenants.read'],
  ANALYST: ['reports.view'],
};
