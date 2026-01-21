// Internationalization system for the app

export type Language = 'en' | 'ru' | 'uz';

export interface Translations {
  // Navigation & Common
  home: string;
  navigation: string;
  dashboard: string;
  invoices: string;
  payments: string;
  balance: string;
  property: string;
  contact: string;
  loading: string;
  error: string;
  tenants: string;
  activityLogs: string;
  activityLogsDesc: string;
  searchLogs: string;
  allActions: string;
  logsFound: string;
  clearFilters: string;
  noLogs: string;
  noLogsDesc: string;
  subject: string;
  viewDetails: string;
  notifications: string;
  notificationsManagement: string;
  sendTestNotifications: string;
  sendCustomTelegram: string;
  testNotificationSent: string;
  telegramMessageSent: string;
  enterTelegramMessage: string;
  sendTelegramMessage: string;
  sendTestNotification: string;
  notificationType: string;
  paymentReminder: string;
  overdueNotice: string;
  message: string;
  attachImage: string;
  
  // Dashboard
  goToDashboard: string;
  goToTenants: string;
  goToUnits: string;
  goToContracts: string;
  goToPayments: string;
  welcomeBack: string;
  premiumOverview: string;
  propertyOverview: string;
  currentBalance: string;
  yourActiveUnit: string;
  phoneNumber: string;
  quickActions: string;
  quickLinks: string;
  viewInvoices: string;
  checkYourBills: string;
  paymentHistory: string;
  viewTransactions: string;
  getSupport: string;
  contactUs: string;

  // Archive
  archiveTenantPrompt: string;
  archiveReason: string;
  unarchive: string;
  archive: string;
  archived: string;
  
  // Invoices
  invoicesList: string;
  unitName: string;
  amount: string;
  monthlyRent: string;
  totalContractAmount: string;
  dueDate: string;
  status: string;
  pending: string;
  paid: string;
  overdue: string;
  noInvoices: string;
  
  // Payments
  paymentsHistory: string;
  invoiceId: string;
  method: string;
  paidAt: string;
  confirmed: string;
  noPayments: string;
  
  // Contracts
  contracts: string;
  contractsList: string;
  viewContracts: string;
  viewContract: string;
  viewPDF: string;
  startDate: string;
  endDate: string;
  noContracts: string;
  contractDetails: string;
  draft: string;
  active: string;
  completed: string;
  cancelled: string;
  tenantName: string;
  actions: string;
  createContract: string;
  addContract: string;
  selectTenant: string;
  selectUnit: string;
  
  // Units
  units: string;
  createUnit: string;
  editUnit: string;
  noUnits: string;
  area: string;
  floor: string;
  price: string;
  currentTenant: string;
  
  // Admin Panel
  fullName: string;
  phone: string;
  createdAt: string;
  edit: string;
  delete: string;
  save: string;
  submit: string;
  interface: string;
  role: string;
  adminUsers: string;
  createUser: string;
  createTenant: string;
  noUsersFound: string;
  noTenants: string;
  tenantsList: string;
  editRole: string;
  editUserRole: string;
  roleUpdatedSuccessfully: string;
  confirmDeleteUser: string;
  userDeletedSuccessfully: string;
  reports: string;
  dateRange: string;
  generateReport: string;
  exportTenants: string;
  exportPayments: string;
  exportError: string;
  exporting: string;
  exportCSV: string;
  poweredByDarital: string;
  reportSummary: string;
  selectDatesAndGenerate: string;
  captureOffline: string;
  totalRevenue: string;
  totalInvoiced: string;
  outstandingAmount: string;
  total: string;
  howItWorks: string;
  testNotificationsDesc: string;
  customTelegramDesc: string;
  notificationsRespectPreferences: string;
  sentTo: string;
  imageSizeLimit: string;
  selectImageFile: string;
  clickToUpload: string;
  dragAndDrop: string;
  imageFormats: string;
  optional: string;
  supportsHtmlFormatting: string;
  characters: string;
  monthlyRevenue: string;
  activeContracts: string;
  pendingPayments: string;
  whatNeedsAttention: string;
  overdueInvoices: string;
  requiresImmediateAction: string;
  awaitingConfirmation: string;
  contractsExpiringSoon: string;
  within30Days: string;
  allCaughtUp: string;
  addTenant: string;
  recordPayment: string;
  openSupportChat: string;
  generateAndViewReports: string;
  manageTenantAccounts: string;
  manageRentalContracts: string;
  manageRentalUnits: string;
  viewAndManagePayments: string;
  manageAdminAccounts: string;
  allStatus: string;
  allRoles: string;
  allMethods: string;
  
  // Auth
  email: string;
  password: string;
  login: string;
  logout: string;
  invalidCredentials: string;
  
  // Theme
  lightMode: string;
  darkMode: string;
  light: string;
  dark: string;
  
  // Chat
  supportChat: string;
  chat: string;
  startNewChat: string;
  startConversation: string;
  chatWith: string;
  supportTeam: string;
  connected: string;
  connecting: string;
  typeMessage: string;
  send: string;
  sending: string;
  creating: string;
  conversation: string;
  conversations: string;
  messages: string;
  open: string;
  closed: string;
  all: string;
  assigned: string;
  assignToMe: string;
  closeChat: string;
  topic: string;
  enterTopic: string;
  topicPlaceholder: string;
  topicRequired: string;
  topicMinLength: string;
  cancel: string;
  closeModal: string;
  untitledConversation: string;
  noConversations: string;
  selectConversation: string;
  welcomeToChat: string;
  clickStartChat: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  
  // Section Titles
  insights: string;
  operations: string;
  showHelp: string;
  communication: string;
  administration: string;
  adminPanel: string;
  
  // Error Messages
  authenticationRequired: string;
  accessDenied: string;
  noPermissionMessage: string;
  unexpectedError: string;
  failedToDeleteContract: string;
  failedToUpdateContract: string;
  failedToCreateContract: string;
  failedToChangeStatus: string;
  pleaseSelectPdfFile: string;
  confirmDeleteContract: string;
  actionCannotBeUndone: string;
  
  // Search & Filters
  search: string;
  searchContracts: string;
  searchPlaceholder: string;
  searchCommands: string;
  focusSearch: string;
  toNavigate: string;
  toSelect: string;
  toOpenCommands: string;
  openCommandPalette: string;
  noResults: string;
  noResultsFound: string;
  results: string;
  noData: string;
  getStartedByCreating: string;
  selected: string;
  clearSelection: string;
  createNew: string;

  // Status Labels
  statusDraft: string;
  statusActive: string;
  statusCompleted: string;
  statusCancelled: string;
  
  // Other UI
  unit: string;
  notes: string;
  changeStatus: string;
  updateContract: string;
  editContract: string;
  selectPdfFile: string;
  pdfFileRequired: string;
  cannotChangeStatus: string;
  allowedTransitions: string;
  currentStatus: string;
  requestedStatus: string;
  tenant: string;
  contractNotes: string;
  contractNotesPlaceholder: string;
  contractPdfFile: string;
  currentPdf: string;
  viewCurrentPdf: string;
  leaveEmptyToKeepPdf: string;
  newFileSelected: string;
  saveChanges: string;
  
  // Invoices & Payments
  tenantId: string;
  tenantIdOptional: string;
  contractId: string;
  contractIdOptional: string;
  dueFrom: string;
  dueTo: string;
  markAsPaid: string;
  markPaid: string;
  processing: string;
  viewQr: string;
  qrCode: string;
  invoiceRecords: string;
  viewAndManageInvoices: string;
  noInvoicesFound: string;
  invoiceRecordsWillAppear: string;
  tryAdjustingFilters: string;
  showing: string;
  to: string;
  of: string;
  previous: string;
  next: string;
  page: string;
  notAvailable: string;
  failedToMarkPaid: string;
  noPermissionToMarkPaid: string;
  alreadyPaid: string;
  qrCodeNotAvailable: string;
  searchPayments: string;
  paymentRecordsWillAppear: string;
  online: string;
  offline: string;
  searchUsers: string;
  userRecordsWillAppear: string;
  getStartedByCreatingUser: string;
  superAdmin: string;
  admin: string;
  cashier: string;
  support: string;
  analyst: string;
  changeRole: string;
  updateRole: string;
  newUser: string;
  passwordMinLength: string;
  searchTenants: string;
  getStartedByCreatingTenant: string;
  tenantRecordsWillAppear: string;
  editTenant: string;
  createTenantAccount: string;
  confirmDeleteTenant: string;
  emailOptional: string;
  emailUsedForLogin: string;
  enterNewPasswordToChange: string;
  leaveEmptyToKeepPassword: string;
  searchUnits: string;
  getStartedByCreatingUnit: string;
  unitRecordsWillAppear: string;
  free: string;
  busy: string;
  maintenance: string;
  noTenant: string;
  failedToLoadDashboard: string;

  // Archive Page
  noArchivedTenants: string;
  archivedTenantsDesc: string;
  noArchivedContracts: string;
  archivedContractsDesc: string;
  noArchivedInvoices: string;
  archivedInvoicesDesc: string;
  noArchivedPayments: string;
  archivedPaymentsDesc: string;
  noArchivedConversations: string;
  archivedConversationsDesc: string;
  unarchiving: string;

  // Browser Compatibility
  browserNoVideoSupport: string;
  browserNoAudioSupport: string;

  // Activity Log Actions
  actionCreate: string;
  actionUpdate: string;
  actionDelete: string;
  actionLogin: string;
  actionLogout: string;
  actionExport: string;
  actionImport: string;
  actionApprove: string;
  actionReject: string;
  actionSend: string;

  // Archive Cleanup
  archiveCompleted: string;
  cleanupCompleted: string;

  // Archive Messages
  failedToLoadArchiveData: string;
  failedToRunAutoArchive: string;
  conversationRestoredSuccessfully: string;
  failedToRestoreConversation: string;
  tenantUnarchivedSuccessfully: string;
  failedToUnarchiveTenant: string;
  contractUnarchivedSuccessfully: string;
  failedToUnarchiveContract: string;
  invoiceUnarchivedSuccessfully: string;
  failedToUnarchiveInvoice: string;

  // System Status
  systemOnline: string;

  // Buildings
  buildings: string;
  manageBuildingsDesc: string;
  addBuilding: string;
  buildingName: string;
  address: string;
  addressPlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  create: string;
  editBuilding: string;
  searchBuildings: string;
  noBuildings: string;
  createFirstBuilding: string;
  tryDifferentSearch: string;
  totalBuildings: string;
  totalUnits: string;
  occupied: string;
  available: string;

  // Archive Management
  archiveManagement: string;
  archiveSummary: string;
  runAutoArchive: string;
  cleanupOldArchives: string;

  // Email Templates
  emailTemplates: string;
  emailTemplatesDesc: string;
  templates: string;
  templateSaved: string;
  saveError: string;
  availableVariables: string;
  sampleData: string;
  emailPreview: string;
  selectTemplate: string;
  selectTemplateDesc: string;
  body: string;
  saving: string;
  preview: string;
  resetToDefault: string;
  confirmReset: string;
  templateReset: string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Common
    home: 'Home',
    navigation: 'Navigation',
    dashboard: 'Home',
    goToDashboard: 'Go to Dashboard',
    goToTenants: 'Go to Tenants',
    goToUnits: 'Go to Units',
    goToContracts: 'Go to Contracts',
    invoices: 'Invoices',
    payments: 'Payments',
    balance: 'Balance',
    property: 'Property',
    contact: 'Contact',
    loading: 'Loading...',
    error: 'Error',
    tenants: 'Tenants',
    activityLogs: 'Activity Logs',
    activityLogsDesc: 'Track all admin actions and system events',
    searchLogs: 'Search logs...',
    allActions: 'All Actions',
    logsFound: 'logs found',
    clearFilters: 'Clear filters',
    noLogs: 'No activity logs',
    noLogsDesc: 'Activity logs will appear here',
    subject: 'Subject',
    viewDetails: 'View details',
    notifications: 'Notifications',
    notificationsManagement: 'Notifications Management',
    sendTestNotifications: 'Send Test Notifications',
    sendCustomTelegram: 'Send Custom Telegram Message',
    testNotificationSent: 'Test notification sent successfully',
    telegramMessageSent: 'Telegram message sent successfully',
    enterTelegramMessage: 'Enter your custom message here...',
    sendTelegramMessage: 'Send Telegram Message',
    sendTestNotification: 'Send Test Notification',
    notificationType: 'Notification Type',
    paymentReminder: 'Payment Reminder',
    overdueNotice: 'Overdue Notice',
    message: 'Message',
    attachImage: 'Attach Image',
    
    // Dashboard
    welcomeBack: 'Welcome Back',
    premiumOverview: '✨ Your Premium Property Overview',
    propertyOverview: 'Here\'s your property overview',
    currentBalance: 'Current balance',
    yourActiveUnit: 'Your active unit',
    phoneNumber: 'Phone number',
    quickActions: 'Quick Actions',
    quickLinks: 'Quick Links',
    viewInvoices: 'View Invoices',
    checkYourBills: 'Check your bills',
    paymentHistory: 'Payment History',
    viewTransactions: 'View transactions',
    getSupport: 'Get Support',
    contactUs: 'Contact us',

    // Archive
    archiveTenantPrompt: 'Enter reason for archiving this tenant (optional):',
    archiveReason: 'Archive Reason',
    unarchive: 'Unarchive',
    archive: 'Archive',
    archived: 'Archived',

    // Invoices
    invoicesList: 'Invoices List',
    unitName: 'Unit Name',
    amount: 'Amount',
    monthlyRent: 'Monthly Rent',
    totalContractAmount: 'Total Contract Amount',
    dueDate: 'Due Date',
    status: 'Status',
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    noInvoices: 'No invoices found',
    
    // Payments
    paymentsHistory: 'Payments History',
    invoiceId: 'Invoice ID',
    method: 'Method',
    paidAt: 'Paid At',
    confirmed: 'Confirmed',
    noPayments: 'No payments found',
    
    // Contracts
    contracts: 'Contracts',
    contractsList: 'Contracts List',
    viewContracts: 'View Contracts',
    viewContract: 'View Contract',
    viewPDF: 'View PDF',
    startDate: 'Start Date',
    endDate: 'End Date',
    noContracts: 'No contracts found',
    contractDetails: 'Contract Details',
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    tenantName: 'Tenant Name',
    actions: 'Actions',
    createContract: 'Create Contract',
    addContract: 'Add New Contract',
    selectTenant: 'Select Tenant',
    selectUnit: 'Select Unit',
    
    // Units
    units: 'Units',
    createUnit: 'Create Unit',
    editUnit: 'Edit Unit',
    noUnits: 'No units found',
    area: 'Area',
    floor: 'Floor',
    price: 'Price',
    currentTenant: 'Current Tenant',
    
    // Admin Panel
    fullName: 'Full Name',
    phone: 'Phone',
    createdAt: 'Created At',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    submit: 'Submit form',
    role: 'Role',
    adminUsers: 'Admin Users',
    createUser: 'Create User',
    createTenant: 'Create Tenant',
    noUsersFound: 'No users found',
    noTenants: 'No tenants found',
    tenantsList: 'Tenants List',
    editRole: 'Edit Role',
    editUserRole: 'Edit User Role',
    roleUpdatedSuccessfully: 'Role updated successfully',
    confirmDeleteUser: 'Are you sure you want to delete this user?',
    userDeletedSuccessfully: 'User deleted successfully',
    reports: 'Reports',
    dateRange: 'Date Range',
    generateReport: 'Generate Report',
    exportTenants: 'Export Tenants',
    exportPayments: 'Export Payments',
    exportError: 'Failed to export data',
    exporting: 'Exporting...',
    exportCSV: 'Export CSV',
    poweredByDarital: 'Darital Search',
    reportSummary: 'Report Summary',
    selectDatesAndGenerate: 'Select dates and generate a report',
    captureOffline: 'Capture Offline',
    totalRevenue: 'Total Revenue',
    totalInvoiced: 'Total Invoiced',
    outstandingAmount: 'Outstanding Amount',
    total: 'Total',
    howItWorks: 'How it works',
    testNotificationsDesc: 'Test Notifications: Sends pre-formatted payment reminders or overdue notices via Email and Telegram (if tenant has Telegram linked)',
    customTelegramDesc: 'Custom Telegram: Send personalized messages directly to tenants via Telegram. Requires tenant to have Telegram account linked.',
    notificationsRespectPreferences: 'All notifications respect tenant notification preferences and will only be sent through enabled channels.',
    sentTo: 'Sent to',
    imageSizeLimit: 'Image size must be less than 10MB',
    selectImageFile: 'Please select an image file',
    clickToUpload: 'Click to upload',
    dragAndDrop: 'or drag and drop',
    imageFormats: 'PNG, JPG, GIF up to 10MB',
    optional: 'Optional',
    supportsHtmlFormatting: 'Supports HTML formatting',
    characters: 'characters',
    monthlyRevenue: 'Monthly Revenue',
    activeContracts: 'Active Contracts',
    pendingPayments: 'Pending Payments',
    whatNeedsAttention: 'What Needs Your Attention',
    overdueInvoices: 'Overdue Invoices',
    requiresImmediateAction: 'Requires immediate action',
    awaitingConfirmation: 'Awaiting confirmation',
    contractsExpiringSoon: 'Contracts Expiring Soon',
    within30Days: 'Within 30 days',
    allCaughtUp: 'All caught up! No urgent items.',
    addTenant: 'Add Tenant',
    recordPayment: 'Record Payment',
    openSupportChat: 'Open Support Chat',
    generateAndViewReports: 'Generate and view financial reports',
    manageTenantAccounts: 'Manage tenant accounts and information',
    manageRentalContracts: 'Manage rental contracts and agreements',
    manageRentalUnits: 'Manage rental units and their availability',
    viewAndManagePayments: 'View and manage payment records',
    manageAdminAccounts: 'Manage admin user accounts and permissions',
    allStatus: 'All Status',
    allRoles: 'All Roles',
    allMethods: 'All Methods',
    
    // Auth
    email: 'Email',
    password: 'Password',
    login: 'Login',
    logout: 'Logout',
    invalidCredentials: 'Invalid credentials',
    
    // Theme
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    light: 'Light',
    dark: 'Dark',
    
    // Chat
    supportChat: 'Support Chat',
    chat: 'Chat',
    startNewChat: '+ Start New Chat',
    startConversation: 'Start a New Conversation',
    chatWith: 'Chat with',
    supportTeam: 'Support Team',
    connected: 'Connected',
    connecting: 'Connecting...',
    typeMessage: 'Type your message...',
    send: 'Send',
    sending: 'Sending...',
    creating: 'Creating...',
    conversation: 'Conversation',
    conversations: 'Conversations',
    messages: 'Messages',
    open: 'Open',
    closed: 'Closed',
    all: 'All',
    assigned: 'Assigned',
    assignToMe: 'Assign to Me',
    closeChat: 'Close Chat',
    topic: 'Topic',
    enterTopic: 'What would you like to discuss?',
    topicPlaceholder: 'e.g., Payment Issue, Maintenance Request...',
    topicRequired: 'Topic is required',
    topicMinLength: 'Topic must be at least 3 characters',
    cancel: 'Cancel',
    closeModal: 'Close modal / Cancel',
    untitledConversation: 'Untitled Conversation',
    noConversations: 'No conversations yet',
    selectConversation: 'Select a conversation to start chatting',
    welcomeToChat: 'Welcome to Support Chat',
    clickStartChat: 'Click "Start New Chat" to begin a conversation',
    justNow: 'Just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    
    // Section Titles
    insights: 'Insights',
    operations: 'Operations',
    showHelp: 'Show this help',
    communication: 'Communication',
    administration: 'Administration',
    adminPanel: 'Admin Panel',
    
    // Error Messages
    authenticationRequired: 'Authentication required',
    accessDenied: 'Access Denied',
    noPermissionMessage: 'You do not have permission to access this resource.',
    unexpectedError: 'An unexpected error occurred',
    failedToDeleteContract: 'Failed to delete contract',
    failedToUpdateContract: 'Failed to update contract',
    failedToCreateContract: 'Failed to create contract',
    failedToChangeStatus: 'Failed to change contract status',
    pleaseSelectPdfFile: 'Please select a PDF file',
    confirmDeleteContract: 'Are you sure you want to delete this contract?',
    actionCannotBeUndone: 'This action cannot be undone',
    
    // Search & Filters
    search: 'Search',
    searchContracts: 'Search contracts',
    searchPlaceholder: 'Search contracts by tenant, unit, status, amount...',
    searchCommands: 'Search commands...',
    focusSearch: 'Focus search',
    toNavigate: 'to navigate',
    toSelect: 'to select',
    toOpenCommands: 'for commands',
    openCommandPalette: 'Open command palette',
    noResults: 'No results found',
    noResultsFound: 'No results found',
    results: 'results',
    noData: 'No data available',
    getStartedByCreating: 'Get started by creating your first contract',
    selected: 'selected',
    clearSelection: 'Clear selection',
    createNew: 'Create new',
    
    // Status Labels
    statusDraft: 'Draft',
    statusActive: 'Active',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    
    // Other UI
    unit: 'Unit',
    notes: 'Notes',
    changeStatus: 'Change Status',
    updateContract: 'Update Contract',
    selectPdfFile: 'Select PDF File',
    pdfFileRequired: 'PDF file is required',
    cannotChangeStatus: 'Cannot change status from {currentStatus} to {requestedStatus}',
    allowedTransitions: 'Allowed transitions',
    currentStatus: 'Current Status',
    requestedStatus: 'Requested Status',
    tenant: 'Tenant',
    editContract: 'Edit Contract',
    contractNotes: 'Contract Notes / Description',
    contractNotesPlaceholder: 'Add any additional notes, terms, or description...',
    contractPdfFile: 'Contract PDF File (Optional)',
    currentPdf: 'Current PDF',
    viewCurrentPdf: 'View Current PDF',
    leaveEmptyToKeepPdf: 'Leave empty to keep the current PDF, or select a new file to replace it.',
    newFileSelected: 'New File Selected',
    saveChanges: 'Save Changes',
    
    // Invoices & Payments
    tenantId: 'Tenant ID',
    tenantIdOptional: 'Tenant ID (optional)',
    contractId: 'Contract ID',
    contractIdOptional: 'Contract ID (optional)',
    dueFrom: 'Due From',
    dueTo: 'Due To',
    markAsPaid: 'Mark as Paid',
    markPaid: 'Mark Paid',
    processing: 'Processing...',
    viewQr: 'View QR',
    qrCode: 'QR Code',
    invoiceRecords: 'Invoice Records',
    viewAndManageInvoices: 'View and manage invoice records',
    noInvoicesFound: 'No invoices found',
    invoiceRecordsWillAppear: 'Invoice records will appear here once invoices are created.',
    tryAdjustingFilters: 'Try adjusting your filters.',
    showing: 'Showing',
    to: 'to',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    notAvailable: 'N/A',
    failedToMarkPaid: 'Failed to mark invoice as paid.',
    noPermissionToMarkPaid: 'You do not have permission to mark payments as paid.',
    alreadyPaid: 'Already Paid',
    qrCodeNotAvailable: 'QR code not available (invoice already paid)',
    searchPayments: 'Search payments by invoice ID, amount, status...',
    paymentRecordsWillAppear: 'Payment records will appear here once payments are made.',
    online: 'Online',
    offline: 'Offline',
    searchUsers: 'Search users by name, email, role...',
    userRecordsWillAppear: 'User records will appear here once users are created.',
    getStartedByCreatingUser: 'Get started by creating your first admin user.',
    superAdmin: 'Super Admin',
    admin: 'Admin',
    cashier: 'Cashier',
    support: 'Support',
    analyst: 'Analyst',
    changeRole: 'Change Role',
    updateRole: 'Update Role',
    newUser: 'New User',
    passwordMinLength: 'Minimum 6 characters',
    searchTenants: 'Search tenants...',
    getStartedByCreatingTenant: 'Get started by creating your first tenant account.',
    tenantRecordsWillAppear: 'Tenant records will appear here once tenants are created.',
    editTenant: 'Edit Tenant',
    createTenantAccount: 'Create Tenant Account',
    confirmDeleteTenant: 'Are you sure you want to delete this tenant?',
    emailOptional: 'Optional - used for login and notifications',
    emailUsedForLogin: 'Used for login and notifications',
    enterNewPasswordToChange: 'Enter new password to change',
    leaveEmptyToKeepPassword: 'Leave empty to keep current password',
    searchUnits: 'Search units by name, price, area, floor, status...',
    getStartedByCreatingUnit: 'Get started by creating your first unit.',
    unitRecordsWillAppear: 'Unit records will appear here once units are created.',
    free: 'Free',
    busy: 'Busy',
    maintenance: 'Maintenance',
    noTenant: 'No Tenant',
    failedToLoadDashboard: 'Failed to load dashboard statistics',

    // Archive Page
    noArchivedTenants: 'No archived tenants',
    archivedTenantsDesc: 'Archived tenants will appear here when you archive them from the tenants page',
    noArchivedContracts: 'No archived contracts',
    archivedContractsDesc: 'Archived contracts will appear here when tenants are archived',
    noArchivedInvoices: 'No archived invoices',
    archivedInvoicesDesc: 'Archived invoices will appear here when tenants are archived',
    noArchivedPayments: 'No archived payments',
    archivedPaymentsDesc: 'Archived payments will appear here when tenants are archived',
    noArchivedConversations: 'No archived conversations',
    archivedConversationsDesc: 'Archived conversations will appear here after automatic archiving runs',
    unarchiving: 'Unarchiving...',

    // Browser Compatibility
    browserNoVideoSupport: 'Your browser does not support the video tag.',
    browserNoAudioSupport: 'Your browser does not support the audio tag.',

    // Activity Log Actions
    actionCreate: 'Create',
    actionUpdate: 'Update',
    actionDelete: 'Delete',
    actionLogin: 'Login',
    actionLogout: 'Logout',
    actionExport: 'Export',
    actionImport: 'Import',
    actionApprove: 'Approve',
    actionReject: 'Reject',
    actionSend: 'Send',

    // Archive Cleanup
    archiveCompleted: 'Archive completed',
    cleanupCompleted: 'Cleanup completed',

    // Archive Messages
    failedToLoadArchiveData: 'Failed to load archive data',
    failedToRunAutoArchive: 'Failed to run auto archive',
    conversationRestoredSuccessfully: 'Conversation restored successfully',
    failedToRestoreConversation: 'Failed to restore conversation',
    tenantUnarchivedSuccessfully: 'Tenant unarchived successfully',
    failedToUnarchiveTenant: 'Failed to unarchive tenant',
    contractUnarchivedSuccessfully: 'Contract unarchived successfully',
    failedToUnarchiveContract: 'Failed to unarchive contract',
    invoiceUnarchivedSuccessfully: 'Invoice unarchived successfully',
    failedToUnarchiveInvoice: 'Failed to unarchive invoice',

    // System Status
    systemOnline: 'System Online',

    // Buildings
    buildings: 'Buildings',
    manageBuildingsDesc: 'Organize and manage your properties by building',
    addBuilding: 'Add Building',
    buildingName: 'Building name',
    address: 'Address',
    addressPlaceholder: 'Street address',
    description: 'Description',
    descriptionPlaceholder: 'Optional description',
    create: 'Create',
    editBuilding: 'Edit Building',
    searchBuildings: 'Search buildings...',
    noBuildings: 'No buildings',
    createFirstBuilding: 'Create your first building to organize units',
    tryDifferentSearch: 'Try a different search term',
    totalBuildings: 'Total Buildings',
    totalUnits: 'Total Units',
    occupied: 'Occupied',
    available: 'Available',

    // Archive Management
    archiveManagement: 'Archive Management',
    archiveSummary: 'Archive Summary',
    runAutoArchive: 'Run Auto Archive',
    cleanupOldArchives: 'Cleanup Old Archives',

    // Email Templates
    emailTemplates: 'Email Templates',
    emailTemplatesDesc: 'Customize email notifications sent to tenants',
    templates: 'Templates',
    templateSaved: 'Template saved successfully!',
    saveError: 'Failed to save template',
    availableVariables: 'Available Variables',
    sampleData: 'Sample Data for Preview',
    emailPreview: 'Email Preview',
    selectTemplate: 'Select a Template',
    selectTemplateDesc: 'Choose a template from the list to edit',
    body: 'Body',
    saving: 'Saving...',
    preview: 'Preview',
    resetToDefault: 'Reset to Default',
    confirmReset: 'Are you sure you want to reset this template to default?',
    templateReset: 'Template reset to default',
  },
  ru: {
    // Navigation & Common
    home: 'Главная',
    navigation: 'Навигация',
    dashboard: 'Главная',
    goToDashboard: 'Перейти на главную',
    goToTenants: 'Перейти к арендаторам',
    goToUnits: 'Перейти к квартирам',
    goToContracts: 'Перейти к контрактам',
    goToPayments: 'Перейти к платежам',
    invoices: 'Счета',
    payments: 'Платежи',
    balance: 'Баланс',
    property: 'Недвижимость',
    contact: 'Контакт',
    loading: 'Загрузка...',
    error: 'Ошибка',
    tenants: 'Арендаторы',
    activityLogs: 'Журнал активности',
    activityLogsDesc: 'Отслеживайте все действия администраторов и системные события',
    searchLogs: 'Поиск журналов...',
    allActions: 'Все действия',
    logsFound: 'журналов найдено',
    clearFilters: 'Очистить фильтры',
    noLogs: 'Нет журналов активности',
    noLogsDesc: 'Журналы активности появятся здесь',
    subject: 'Тема',
    viewDetails: 'Просмотреть детали',
    notifications: 'Уведомления',
    notificationsManagement: 'Управление уведомлениями',
    sendTestNotifications: 'Отправить тестовые уведомления',
    sendCustomTelegram: 'Отправить пользовательское сообщение Telegram',
    testNotificationSent: 'Тестовое уведомление успешно отправлено',
    telegramMessageSent: 'Сообщение Telegram успешно отправлено',
    enterTelegramMessage: 'Введите ваше сообщение здесь...',
    sendTelegramMessage: 'Отправить сообщение Telegram',
    sendTestNotification: 'Отправить тестовое уведомление',
    notificationType: 'Тип уведомления',
    paymentReminder: 'Напоминание об оплате',
    overdueNotice: 'Уведомление о просрочке',
    message: 'Сообщение',
    attachImage: 'Прикрепить изображение',
    
    // Dashboard
    welcomeBack: 'Добро пожаловать',
    premiumOverview: '✨ Обзор вашей недвижимости премиум-класса',
    propertyOverview: 'Обзор вашей недвижимости',
    currentBalance: 'Текущий баланс',
    yourActiveUnit: 'Ваша активная квартира',
    phoneNumber: 'Номер телефона',
    quickActions: 'Быстрые действия',
    quickLinks: 'Быстрые ссылки',
    viewInvoices: 'Просмотр счетов',
    checkYourBills: 'Проверьте свои счета',
    paymentHistory: 'История платежей',
    viewTransactions: 'Просмотр транзакций',
    getSupport: 'Получить поддержку',
    contactUs: 'Свяжитесь с нами',

    // Archive
    archiveTenantPrompt: 'Введите причину архивирования арендатора (необязательно):',
    archiveReason: 'Причина архивирования',
    unarchive: 'Разархивировать',
    archive: 'Архивировать',
    archived: 'Архивировано',

    // Invoices
    invoicesList: 'Список счетов',
    unitName: 'Название квартиры',
    amount: 'Сумма',
    monthlyRent: 'Ежемесячная аренда',
    totalContractAmount: 'Общая сумма контракта',
    dueDate: 'Срок оплаты',
    status: 'Статус',
    pending: 'В ожидании',
    paid: 'Оплачено',
    overdue: 'Просрочено',
    noInvoices: 'Счета не найдены',
    
    // Payments
    paymentsHistory: 'История платежей',
    invoiceId: 'ID счета',
    method: 'Метод',
    paidAt: 'Оплачено',
    confirmed: 'Подтверждено',
    noPayments: 'Платежи не найдены',
    
    // Contracts
    contracts: 'Контракты',
    contractsList: 'Список контрактов',
    viewContracts: 'Просмотр контрактов',
    viewContract: 'Просмотр контракта',
    viewPDF: 'Просмотр PDF',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    noContracts: 'Контракты не найдены',
    contractDetails: 'Детали контракта',
    draft: 'Черновик',
    active: 'Активный',
    completed: 'Завершен',
    cancelled: 'Отменен',
    tenantName: 'Имя арендатора',
    actions: 'Действия',
    createContract: 'Создать контракт',
    addContract: 'Добавить новый контракт',
    selectTenant: 'Выберите арендатора',
    selectUnit: 'Выберите квартиру',
    
    // Units
    units: 'Квартиры',
    createUnit: 'Создать квартиру',
    editUnit: 'Редактировать квартиру',
    noUnits: 'Квартиры не найдены',
    area: 'Площадь',
    floor: 'Этаж',
    price: 'Цена',
    currentTenant: 'Текущий арендатор',
    
    // Admin Panel
    fullName: 'Полное имя',
    phone: 'Телефон',
    createdAt: 'Дата создания',
    edit: 'Редактировать',
    delete: 'Удалить',
    save: 'Сохранить',
    submit: 'Отправить форму',
    interface: 'Интерфейс',
    role: 'Роль',
    adminUsers: 'Администраторы',
    createUser: 'Создать пользователя',
    createTenant: 'Создать арендатора',
    noUsersFound: 'Пользователи не найдены',
    noTenants: 'Арендаторы не найдены',
    tenantsList: 'Список арендаторов',
    editRole: 'Изменить роль',
    editUserRole: 'Изменить роль пользователя',
    roleUpdatedSuccessfully: 'Роль успешно обновлена',
    confirmDeleteUser: 'Вы уверены, что хотите удалить этого пользователя?',
    userDeletedSuccessfully: 'Пользователь успешно удален',
    reports: 'Отчеты',
    dateRange: 'Диапазон дат',
    generateReport: 'Сгенерировать отчет',
    exportTenants: 'Экспорт арендаторов',
    exportPayments: 'Экспорт платежей',
    exportError: 'Не удалось экспортировать данные',
    exporting: 'Экспорт...',
    exportCSV: 'Экспорт CSV',
    poweredByDarital: 'Поиск Darital',
    reportSummary: 'Сводка отчета',
    selectDatesAndGenerate: 'Выберите даты и сгенерируйте отчет',
    captureOffline: 'Захватить офлайн',
    totalRevenue: 'Общий доход',
    totalInvoiced: 'Всего выставлено счетов',
    outstandingAmount: 'Неоплаченная сумма',
    total: 'Всего',
    howItWorks: 'Как это работает',
    testNotificationsDesc: 'Тестовые уведомления: Отправляет предварительно отформатированные напоминания об оплате или уведомления о просрочке по электронной почте и Telegram (если у арендатора есть связанный Telegram)',
    customTelegramDesc: 'Пользовательский Telegram: Отправляйте персонализированные сообщения напрямую арендаторам через Telegram. Требуется, чтобы у арендатора был связан аккаунт Telegram.',
    notificationsRespectPreferences: 'Все уведомления учитывают настройки уведомлений арендатора и будут отправляться только через включенные каналы.',
    sentTo: 'Отправлено',
    imageSizeLimit: 'Размер изображения должен быть менее 10 МБ',
    selectImageFile: 'Пожалуйста, выберите файл изображения',
    clickToUpload: 'Нажмите, чтобы загрузить',
    dragAndDrop: 'или перетащите и отпустите',
    imageFormats: 'PNG, JPG, GIF до 10 МБ',
    optional: 'Необязательно',
    supportsHtmlFormatting: 'Поддерживает форматирование HTML',
    characters: 'символов',
    monthlyRevenue: 'Месячный доход',
    activeContracts: 'Активные контракты',
    pendingPayments: 'Ожидающие платежи',
    whatNeedsAttention: 'Требует вашего внимания',
    overdueInvoices: 'Просроченные счета',
    requiresImmediateAction: 'Требует немедленных действий',
    awaitingConfirmation: 'Ожидает подтверждения',
    contractsExpiringSoon: 'Контракты скоро истекают',
    within30Days: 'В течение 30 дней',
    allCaughtUp: 'Все в порядке! Нет срочных дел.',
    addTenant: 'Добавить арендатора',
    recordPayment: 'Записать платеж',
    openSupportChat: 'Открыть чат поддержки',
    generateAndViewReports: 'Генерировать и просматривать финансовые отчеты',
    manageTenantAccounts: 'Управление учетными записями арендаторов и информацией',
    manageRentalContracts: 'Управление договорами аренды и соглашениями',
    manageRentalUnits: 'Управление квартирами и их доступностью',
    viewAndManagePayments: 'Просмотр и управление записями платежей',
    manageAdminAccounts: 'Управление учетными записями администраторов и разрешениями',
    allStatus: 'Все статусы',
    allRoles: 'Все роли',
    allMethods: 'Все методы',
    
    // Auth
    email: 'Электронная почта',
    password: 'Пароль',
    login: 'Войти',
    logout: 'Выйти',
    invalidCredentials: 'Неверные учетные данные',
    
    // Theme
    lightMode: 'Светлый режим',
    darkMode: 'Темный режим',
    light: 'Светлый',
    dark: 'Темный',
    
    // Chat
    supportChat: 'Чат поддержки',
    chat: 'Чат',
    startNewChat: '+ Начать новый чат',
    startConversation: 'Начать новый разговор',
    chatWith: 'Чат с',
    supportTeam: 'Команда поддержки',
    connected: 'Подключено',
    connecting: 'Подключение...',
    typeMessage: 'Введите сообщение...',
    send: 'Отправить',
    sending: 'Отправка...',
    creating: 'Создание...',
    conversation: 'Разговор',
    conversations: 'Разговоры',
    messages: 'Сообщения',
    open: 'Открыто',
    closed: 'Закрыто',
    all: 'Все',
    assigned: 'Назначено',
    assignToMe: 'Назначить мне',
    closeChat: 'Закрыть чат',
    topic: 'Тема',
    enterTopic: 'О чем вы хотите поговорить?',
    topicPlaceholder: 'например, Проблема с оплатой, Запрос на обслуживание...',
    topicRequired: 'Тема обязательна',
    topicMinLength: 'Тема должна содержать минимум 3 символа',
    cancel: 'Отмена',
    closeModal: 'Закрыть модальное окно / Отмена',
    untitledConversation: 'Разговор без названия',
    noConversations: 'Пока нет разговоров',
    selectConversation: 'Выберите разговор, чтобы начать общение',
    welcomeToChat: 'Добро пожаловать в чат поддержки',
    clickStartChat: 'Нажмите "Начать новый чат", чтобы начать разговор',
    justNow: 'Только что',
    minutesAgo: 'мин. назад',
    hoursAgo: 'ч. назад',
    daysAgo: 'дн. назад',
    
    // Section Titles
    insights: 'Аналитика',
    operations: 'Операции',
    showHelp: 'Показать эту справку',
    communication: 'Коммуникация',
    administration: 'Администрирование',
    adminPanel: 'Панель администратора',
    
    // Error Messages
    authenticationRequired: 'Требуется аутентификация',
    accessDenied: 'Доступ запрещен',
    noPermissionMessage: 'У вас нет разрешения на доступ к этому ресурсу.',
    unexpectedError: 'Произошла неожиданная ошибка',
    failedToDeleteContract: 'Не удалось удалить контракт',
    failedToUpdateContract: 'Не удалось обновить контракт',
    failedToCreateContract: 'Не удалось создать контракт',
    failedToChangeStatus: 'Не удалось изменить статус контракта',
    pleaseSelectPdfFile: 'Пожалуйста, выберите PDF файл',
    confirmDeleteContract: 'Вы уверены, что хотите удалить этот контракт?',
    actionCannotBeUndone: 'Это действие нельзя отменить',
    
    // Search & Filters
    search: 'Поиск',
    searchContracts: 'Поиск контрактов',
    searchPlaceholder: 'Поиск контрактов по арендатору, квартире, статусу, сумме...',
    searchCommands: 'Поиск команд...',
    focusSearch: 'Фокус на поиске',
    toNavigate: 'для навигации',
    toSelect: 'для выбора',
    toOpenCommands: 'для команд',
    openCommandPalette: 'Открыть палитру команд',
    noResults: 'Результаты не найдены',
    noResultsFound: 'Результаты не найдены',
    results: 'результатов',
    noData: 'Нет данных',
    getStartedByCreating: 'Начните с создания вашего первого контракта',
    selected: 'выбрано',
    clearSelection: 'Очистить выбор',
    createNew: 'Создать новый',
    
    // Status Labels
    statusDraft: 'Черновик',
    statusActive: 'Активный',
    statusCompleted: 'Завершен',
    statusCancelled: 'Отменен',
    
    // Other UI
    unit: 'Квартира',
    notes: 'Примечания',
    changeStatus: 'Изменить статус',
    updateContract: 'Обновить контракт',
    selectPdfFile: 'Выбрать PDF файл',
    pdfFileRequired: 'PDF файл обязателен',
    cannotChangeStatus: 'Невозможно изменить статус с {currentStatus} на {requestedStatus}',
    allowedTransitions: 'Разрешенные переходы',
    currentStatus: 'Текущий статус',
    requestedStatus: 'Запрошенный статус',
    tenant: 'Арендатор',
    editContract: 'Редактировать контракт',
    contractNotes: 'Примечания к контракту / Описание',
    contractNotesPlaceholder: 'Добавьте любые дополнительные примечания, условия или описание...',
    contractPdfFile: 'PDF файл контракта (необязательно)',
    currentPdf: 'Текущий PDF',
    viewCurrentPdf: 'Просмотр текущего PDF',
    leaveEmptyToKeepPdf: 'Оставьте пустым, чтобы сохранить текущий PDF, или выберите новый файл для замены.',
    newFileSelected: 'Выбран новый файл',
    saveChanges: 'Сохранить изменения',
    
    // Invoices & Payments
    tenantId: 'ID арендатора',
    tenantIdOptional: 'ID арендатора (необязательно)',
    contractId: 'ID контракта',
    contractIdOptional: 'ID контракта (необязательно)',
    dueFrom: 'Срок оплаты с',
    dueTo: 'Срок оплаты до',
    markAsPaid: 'Отметить как оплаченное',
    markPaid: 'Отметить оплаченным',
    processing: 'Обработка...',
    viewQr: 'Просмотр QR',
    qrCode: 'QR код',
    invoiceRecords: 'Записи счетов',
    viewAndManageInvoices: 'Просмотр и управление записями счетов',
    noInvoicesFound: 'Счета не найдены',
    invoiceRecordsWillAppear: 'Записи счетов появятся здесь после создания счетов.',
    tryAdjustingFilters: 'Попробуйте изменить фильтры.',
    showing: 'Показано',
    to: 'до',
    of: 'из',
    previous: 'Предыдущая',
    next: 'Следующая',
    page: 'Страница',
    notAvailable: 'Н/Д',
    failedToMarkPaid: 'Не удалось отметить счет как оплаченный.',
    noPermissionToMarkPaid: 'У вас нет разрешения отмечать платежи как оплаченные.',
    alreadyPaid: 'Уже оплачено',
    qrCodeNotAvailable: 'QR код недоступен (счет уже оплачен)',
    searchPayments: 'Поиск платежей по ID счета, сумме, статусу...',
    paymentRecordsWillAppear: 'Записи платежей появятся здесь после совершения платежей.',
    online: 'Онлайн',
    offline: 'Офлайн',
    searchUsers: 'Поиск пользователей по имени, email, роли...',
    userRecordsWillAppear: 'Записи пользователей появятся здесь после создания пользователей.',
    getStartedByCreatingUser: 'Начните с создания вашего первого администратора.',
    superAdmin: 'Супер администратор',
    admin: 'Администратор',
    cashier: 'Кассир',
    support: 'Поддержка',
    analyst: 'Аналитик',
    changeRole: 'Изменить роль',
    updateRole: 'Обновить роль',
    newUser: 'Новый пользователь',
    passwordMinLength: 'Минимум 6 символов',
    searchTenants: 'Поиск арендаторов...',
    getStartedByCreatingTenant: 'Начните с создания вашего первого аккаунта арендатора.',
    tenantRecordsWillAppear: 'Записи арендаторов появятся здесь после создания арендаторов.',
    editTenant: 'Редактировать арендатора',
    createTenantAccount: 'Создать аккаунт арендатора',
    confirmDeleteTenant: 'Вы уверены, что хотите удалить этого арендатора?',
    emailOptional: 'Необязательно - используется для входа и уведомлений',
    emailUsedForLogin: 'Используется для входа и уведомлений',
    enterNewPasswordToChange: 'Введите новый пароль для изменения',
    leaveEmptyToKeepPassword: 'Оставьте пустым, чтобы сохранить текущий пароль',
    searchUnits: 'Поиск квартир по названию, цене, площади, этажу, статусу...',
    getStartedByCreatingUnit: 'Начните с создания вашей первой квартиры.',
    unitRecordsWillAppear: 'Записи квартир появятся здесь после создания квартир.',
    free: 'Свободна',
    busy: 'Занята',
    maintenance: 'На обслуживании',
    noTenant: 'Нет арендатора',
    failedToLoadDashboard: 'Не удалось загрузить статистику панели управления',

    // Archive Page
    noArchivedTenants: 'Нет архивированных арендаторов',
    archivedTenantsDesc: 'Архивированные арендаторы появятся здесь после их архивирования на странице арендаторов',
    noArchivedContracts: 'Нет архивированных контрактов',
    archivedContractsDesc: 'Архивированные контракты появятся здесь при архивировании арендаторов',
    noArchivedInvoices: 'Нет архивированных счетов',
    archivedInvoicesDesc: 'Архивированные счета появятся здесь при архивировании арендаторов',
    noArchivedPayments: 'Нет архивированных платежей',
    archivedPaymentsDesc: 'Архивированные платежи появятся здесь при архивировании арендаторов',
    noArchivedConversations: 'Нет архивированных разговоров',
    archivedConversationsDesc: 'Архивированные разговоры появятся здесь после автоматического архивирования',
    unarchiving: 'Разархивирование...',

    // Browser Compatibility
    browserNoVideoSupport: 'Ваш браузер не поддерживает тег видео.',
    browserNoAudioSupport: 'Ваш браузер не поддерживает тег аудио.',

    // Activity Log Actions
    actionCreate: 'Создать',
    actionUpdate: 'Обновить',
    actionDelete: 'Удалить',
    actionLogin: 'Войти',
    actionLogout: 'Выйти',
    actionExport: 'Экспорт',
    actionImport: 'Импорт',
    actionApprove: 'Одобрить',
    actionReject: 'Отклонить',
    actionSend: 'Отправить',

    // Archive Cleanup
    archiveCompleted: 'Архивирование завершено',
    cleanupCompleted: 'Очистка завершена',

    // Archive Messages
    failedToLoadArchiveData: 'Не удалось загрузить данные архива',
    failedToRunAutoArchive: 'Не удалось запустить автоархивирование',
    conversationRestoredSuccessfully: 'Разговор восстановлен успешно',
    failedToRestoreConversation: 'Не удалось восстановить разговор',
    tenantUnarchivedSuccessfully: 'Арендатор разархивирован успешно',
    failedToUnarchiveTenant: 'Не удалось разархивировать арендатора',
    contractUnarchivedSuccessfully: 'Контракт разархивирован успешно',
    failedToUnarchiveContract: 'Не удалось разархивировать контракт',
    invoiceUnarchivedSuccessfully: 'Счет разархивирован успешно',
    failedToUnarchiveInvoice: 'Не удалось разархивировать счет',

    // System Status
    systemOnline: 'Система онлайн',

    // Buildings
    buildings: 'Здания',
    manageBuildingsDesc: 'Организуйте и управляйте своей недвижимостью по зданиям',
    addBuilding: 'Добавить здание',
    buildingName: 'Название здания',
    address: 'Адрес',
    addressPlaceholder: 'Улица и адрес',
    description: 'Описание',
    descriptionPlaceholder: 'Дополнительное описание',
    create: 'Создать',
    editBuilding: 'Редактировать здание',
    searchBuildings: 'Поиск зданий...',
    noBuildings: 'Нет зданий',
    createFirstBuilding: 'Создайте первое здание для организации квартир',
    tryDifferentSearch: 'Попробуйте другой поисковый запрос',
    totalBuildings: 'Всего зданий',
    totalUnits: 'Всего квартир',
    occupied: 'Занято',
    available: 'Доступно',

    // Archive Management
    archiveManagement: 'Управление архивом',
    archiveSummary: 'Сводка архива',
    runAutoArchive: 'Запустить автоархивирование',
    cleanupOldArchives: 'Очистить старые архивы',

    // Email Templates
    emailTemplates: 'Шаблоны писем',
    emailTemplatesDesc: 'Настройте уведомления по электронной почте, отправляемые арендаторам',
    templates: 'Шаблоны',
    templateSaved: 'Шаблон успешно сохранен!',
    saveError: 'Не удалось сохранить шаблон',
    availableVariables: 'Доступные переменные',
    sampleData: 'Примерные данные для предпросмотра',
    emailPreview: 'Предпросмотр письма',
    selectTemplate: 'Выберите шаблон',
    selectTemplateDesc: 'Выберите шаблон из списка для редактирования',
    body: 'Содержание',
    saving: 'Сохранение...',
    preview: 'Предпросмотр',
    resetToDefault: 'Сбросить по умолчанию',
    confirmReset: 'Вы уверены, что хотите сбросить этот шаблон к настройкам по умолчанию?',
    templateReset: 'Шаблон сброшен к настройкам по умолчанию',
  },
  uz: {
    // Navigation & Common
    home: 'Bosh sahifa',
    navigation: 'Navigatsiya',
    dashboard: 'Bosh sahifa',
    goToDashboard: 'Bosh sahifaga o\'tish',
    goToTenants: 'Ijara oluvchilarga o\'tish',
    goToUnits: 'Xonalarga o\'tish',
    invoices: 'Hisob-fakturalar',
    payments: 'To\'lovlar',
    balance: 'Balans',
    property: 'Mulk',
    contact: 'Aloqa',
    loading: 'Yuklanmoqda...',
    error: 'Xato',
    tenants: 'Ijara oluvchilar',
    activityLogs: 'Faollik jurnali',
    activityLogsDesc: 'Barcha admin harakatlari va tizim hodisalarini kuzatib boring',
    searchLogs: 'Jurnallarni qidirish...',
    allActions: 'Barcha harakatlar',
    logsFound: 'jurnal topildi',
    clearFilters: 'Filtrlarni tozalash',
    noLogs: 'Faollik jurnali yo\'q',
    noLogsDesc: 'Faollik jurnali bu yerda paydo bo\'ladi',
    subject: 'Mavzu',
    viewDetails: 'Tafsilotlarni ko\'rish',
    notifications: 'Xabarnomalar',
    notificationsManagement: 'Xabarnomalarni boshqarish',
    sendTestNotifications: 'Test xabarnomalarini yuborish',
    sendCustomTelegram: 'Maxsus Telegram xabari yuborish',
    testNotificationSent: 'Test xabarnomasi muvaffaqiyatli yuborildi',
    telegramMessageSent: 'Telegram xabari muvaffaqiyatli yuborildi',
    enterTelegramMessage: 'Xabaringizni kiriting...',
    sendTelegramMessage: 'Telegram xabari yuborish',
    sendTestNotification: 'Test xabarnomasi yuborish',
    notificationType: 'Xabarnoma turi',
    paymentReminder: 'To\'lov eslatmasi',
    overdueNotice: 'Muddati o\'tgan eslatma',
    message: 'Xabar',
    attachImage: 'Rasm qo\'shish',
    
    // Dashboard
    welcomeBack: 'Xush kelibsiz',
    premiumOverview: '✨ Premium mulkingiz haqida ma\'lumot',
    propertyOverview: 'Mulkingiz haqida ma\'lumot',
    currentBalance: 'Joriy balans',
    yourActiveUnit: 'Sizning faol xonangiz',
    phoneNumber: 'Telefon raqami',
    quickActions: 'Tez amallar',
    viewInvoices: 'Hisob-fakturalarni ko\'rish',
    checkYourBills: 'Hisob-fakturalaringizni tekshiring',
    paymentHistory: 'To\'lovlar tarixi',
    viewTransactions: 'Tranzaksiyalarni ko\'rish',
    getSupport: 'Yordam olish',
    contactUs: 'Biz bilan bog\'laning',

    // Archive
    archiveTenantPrompt: 'Ijara oluvchini arxivlash sababini kiriting (ixtiyoriy):',
    archiveReason: 'Arxivlash sababi',
    unarchive: 'Arxivdan chiqarish',
    archive: 'Arxivlash',
    archived: 'Arxivlangan',

    // Invoices
    invoicesList: 'Hisob-fakturalar ro\'yxati',
    unitName: 'Xona nomi',
    amount: 'Miqdor',
    monthlyRent: 'Oylik ijara',
    totalContractAmount: 'Shartnomaning umumiy summasi',
    dueDate: 'To\'lov muddati',
    status: 'Holat',
    pending: 'Kutilmoqda',
    paid: 'To\'langan',
    overdue: 'Muddati o\'tgan',
    noInvoices: 'Hisob-fakturalar topilmadi',
    
    // Payments
    paymentsHistory: 'To\'lovlar tarixi',
    invoiceId: 'Hisob-faktura ID',
    method: 'Usul',
    paidAt: 'To\'langan',
    confirmed: 'Tasdiqlangan',
    noPayments: 'To\'lovlar topilmadi',
    
    // Contracts
    contracts: 'Shartnomalar',
    contractsList: 'Shartnomalar ro\'yxati',
    viewContracts: 'Shartnomalarni ko\'rish',
    viewContract: 'Shartnomani ko\'rish',
    viewPDF: 'PDF ni ko\'rish',
    startDate: 'Boshlanish sanasi',
    endDate: 'Tugash sanasi',
    noContracts: 'Shartnomalar topilmadi',
    contractDetails: 'Shartnoma tafsilotlari',
    draft: 'Qoralama',
    active: 'Faol',
    completed: 'Yakunlangan',
    cancelled: 'Bekor qilingan',
    tenantName: 'Ijara oluvchi nomi',
    actions: 'Amallar',
    createContract: 'Shartnoma yaratish',
    addContract: 'Yangi shartnoma qo\'shish',
    selectTenant: 'Ijara oluvchini tanlang',
    selectUnit: 'Xonani tanlang',
    
    // Units
    units: 'Xonalar',
    createUnit: 'Xona yaratish',
    editUnit: 'Xonani tahrirlash',
    noUnits: 'Xonalar topilmadi',
    area: 'Maydon',
    floor: 'Qavat',
    price: 'Narx',
    currentTenant: 'Joriy ijara oluvchi',
    
    // Admin Panel
    fullName: 'To\'liq ism',
    phone: 'Telefon',
    createdAt: 'Yaratilgan sana',
    edit: 'Tahrirlash',
    delete: 'O\'chirish',
    save: 'Saqlash',
    submit: 'Formani yuborish',
    interface: 'Interfeys',
    role: 'Rol',
    adminUsers: 'Admin foydalanuvchilar',
    createUser: 'Foydalanuvchi yaratish',
    createTenant: 'Ijara oluvchi yaratish',
    noUsersFound: 'Foydalanuvchilar topilmadi',
    noTenants: 'Ijara oluvchilar topilmadi',
    tenantsList: 'Ijara oluvchilar ro\'yxati',
    editRole: 'Rolni tahrirlash',
    editUserRole: 'Foydalanuvchi rolini tahrirlash',
    roleUpdatedSuccessfully: 'Rol muvaffaqiyatli yangilandi',
    confirmDeleteUser: 'Bu foydalanuvchini o\'chirishni xohlaysizmi?',
    userDeletedSuccessfully: 'Foydalanuvchi muvaffaqiyatli o\'chirildi',
    reports: 'Hisobotlar',
    dateRange: 'Sana oralig\'i',
    generateReport: 'Hisobot yaratish',
    exportTenants: 'Ijara oluvchilarni eksport qilish',
    exportPayments: 'To\'lovlarni eksport qilish',
    exportError: 'Ma\'lumotlarni eksport qilishda xato',
    exporting: 'Eksport qilinmoqda...',
    exportCSV: 'CSV ni eksport qilish',
    poweredByDarital: 'Darital qidiruv',
    reportSummary: 'Hisobot xulosa',
    selectDatesAndGenerate: 'Sanani tanlang va hisobot yarating',
    captureOffline: 'Oflayn to\'lash',
    totalRevenue: 'Jami daromad',
    totalInvoiced: 'Jami hisob-faktura',
    outstandingAmount: 'To\'lanmagan summa',
    total: 'Jami',
    howItWorks: 'Qanday ishlaydi',
    testNotificationsDesc: 'Test xabarnomalar: Email va Telegram orqali oldindan formatlangan to\'lov eslatmalari yoki muddati o\'tgan xabarnomalarni yuboradi (agar ijara oluvchida Telegram bog\'langan bo\'lsa)',
    customTelegramDesc: 'Maxsus Telegram: Telegram orqali ijara oluvchilarga shaxsiy xabarlar yuborish. Ijara oluvchida Telegram hisobi bog\'langan bo\'lishi kerak.',
    notificationsRespectPreferences: 'Barcha xabarnomalar ijara oluvchining xabarnoma sozlamalariga rioya qiladi va faqat yoqilgan kanallar orqali yuboriladi.',
    sentTo: 'Yuborildi',
    imageSizeLimit: 'Rasm hajmi 10 MB dan kichik bo\'lishi kerak',
    selectImageFile: 'Iltimos, rasm faylini tanlang',
    clickToUpload: 'Yuklash uchun bosing',
    dragAndDrop: 'yoki sudrab tashlang',
    imageFormats: 'PNG, JPG, GIF 10 MB gacha',
    optional: 'Ixtiyoriy',
    supportsHtmlFormatting: 'HTML formatlashni qo\'llab-quvvatlaydi',
    characters: 'belgi',
    monthlyRevenue: 'Oylik daromad',
    activeContracts: 'Faol shartnomalar',
    pendingPayments: 'Kutilayotgan to\'lovlar',
    whatNeedsAttention: 'Sizning e\'tiboringizni talab qiladi',
    overdueInvoices: 'Muddati o\'tgan hisob-fakturalar',
    requiresImmediateAction: 'Zudlik bilan harakat talab qiladi',
    awaitingConfirmation: 'Tasdiqlash kutilmoqda',
    contractsExpiringSoon: 'Tez orada tugaydigan shartnomalar',
    within30Days: '30 kun ichida',
    allCaughtUp: 'Hammasi yaxshi! Shoshilinch ishlar yo\'q.',
    addTenant: 'Ijara oluvchi qo\'shish',
    recordPayment: 'To\'lovni qayd etish',
    openSupportChat: 'Yordam chatini ochish',
    generateAndViewReports: 'Moliyaviy hisobotlarni yaratish va ko\'rish',
    manageTenantAccounts: 'Ijara oluvchilar hisoblarini va ma\'lumotlarini boshqarish',
    manageRentalContracts: 'Ijara shartnomalari va kelishuvlarini boshqarish',
    manageRentalUnits: 'Ijara xonalarini va ularning mavjudligini boshqarish',
    viewAndManagePayments: 'To\'lov yozuvlarini ko\'rish va boshqarish',
    manageAdminAccounts: 'Admin foydalanuvchi hisoblarini va ruxsatlarni boshqarish',
    allStatus: 'Barcha holatlar',
    allRoles: 'Barcha rollar',
    allMethods: 'Barcha usullar',
    
    // Auth
    email: 'Elektron pochta',
    password: 'Parol',
    login: 'Kirish',
    logout: 'Chiqish',
    invalidCredentials: 'Noto\'g\'ri ma\'lumotlar',
    
    // Theme
    lightMode: 'Yorug\' rejim',
    darkMode: 'Qorong\'u rejim',
    light: 'Yorug\'',
    dark: 'Qorong\'u',
    
    // Chat
    supportChat: 'Yordam chati',
    chat: 'Chat',
    startNewChat: '+ Yangi chat boshlash',
    startConversation: 'Yangi suhbat boshlash',
    chatWith: 'Suhbat',
    supportTeam: 'Yordam jamoasi',
    connected: 'Ulangan',
    connecting: 'Ulanmoqda...',
    typeMessage: 'Xabar yozing...',
    send: 'Yuborish',
    sending: 'Yuborilmoqda...',
    creating: 'Yaratilmoqda...',
    conversation: 'Suhbat',
    conversations: 'Suhbatlar',
    messages: 'Xabarlar',
    open: 'Ochiq',
    closed: 'Yopiq',
    all: 'Hammasi',
    assigned: 'Tayinlangan',
    assignToMe: 'Menga tayinlash',
    closeChat: 'Chatni yopish',
    topic: 'Mavzu',
    enterTopic: 'Nima haqida gaplashmoqchisiz?',
    topicPlaceholder: 'masalan, To\'lov muammosi, Xizmat ko\'rsatish so\'rovi...',
    topicRequired: 'Mavzu majburiy',
    topicMinLength: 'Mavzu kamida 3 ta belgidan iborat bo\'lishi kerak',
    cancel: 'Bekor qilish',
    closeModal: 'Modalni yopish / Bekor qilish',
    untitledConversation: 'Nomsiz suhbat',
    noConversations: 'Hali suhbatlar yo\'q',
    selectConversation: 'Suhbatlashishni boshlash uchun suhbatni tanlang',
    welcomeToChat: 'Yordam chatiga xush kelibsiz',
    clickStartChat: 'Suhbatni boshlash uchun "Yangi chat boshlash" tugmasini bosing',
    justNow: 'Hozir',
    minutesAgo: 'daqiqa oldin',
    hoursAgo: 'soat oldin',
    daysAgo: 'kun oldin',
    
    // Section Titles
    insights: 'Tahlillar',
    operations: 'Operatsiyalar',
    showHelp: 'Yordamni ko\'rsatish',
    communication: 'Aloqa',
    administration: 'Ma\'muriyat',
    adminPanel: 'Admin panel',
    
    // Error Messages
    authenticationRequired: 'Autentifikatsiya talab qilinadi',
    accessDenied: 'Kirish rad etildi',
    noPermissionMessage: 'Sizda bu resursga kirish ruxsati yo\'q.',
    unexpectedError: 'Kutilmagan xato yuz berdi',
    failedToDeleteContract: 'Shartnomani o\'chirishda xato',
    failedToUpdateContract: 'Shartnomani yangilashda xato',
    failedToCreateContract: 'Shartnoma yaratishda xato',
    failedToChangeStatus: 'Shartnoma holatini o\'zgartirishda xato',
    pleaseSelectPdfFile: 'Iltimos, PDF faylni tanlang',
    confirmDeleteContract: 'Bu shartnomani o\'chirishni xohlaysizmi?',
    actionCannotBeUndone: 'Bu amalni bekor qilib bo\'lmaydi',
    
    // Search & Filters
    search: 'Qidirish',
    searchContracts: 'Shartnomalarni qidirish',
    searchPlaceholder: 'Ijara oluvchi, xona, holat, summa bo\'yicha qidirish...',
    searchCommands: 'Buyruqlarni qidirish...',
    focusSearch: 'Qidiruvga e\'tibor berish',
    toNavigate: 'navigatsiya qilish',
    toSelect: 'tanlash',
    toOpenCommands: 'buyruqlar uchun',
    openCommandPalette: 'Buyruq palitrasini ochish',
    noResults: 'Natijalar topilmadi',
    noResultsFound: 'Natijalar topilmadi',
    results: 'natijalar',
    noData: 'Ma\'lumotlar mavjud emas',
    getStartedByCreating: 'Birinchi shartnomani yaratishdan boshlang',
    selected: 'tanlangan',
    clearSelection: 'Tanlovni tozalash',
    createNew: 'Yangi yaratish',
    
    // Status Labels
    statusDraft: 'Qoralama',
    statusActive: 'Faol',
    statusCompleted: 'Yakunlangan',
    statusCancelled: 'Bekor qilingan',
    
    // Other UI
    unit: 'Xona',
    notes: 'Eslatmalar',
    changeStatus: 'Holatni o\'zgartirish',
    updateContract: 'Shartnomani yangilash',
    selectPdfFile: 'PDF faylni tanlang',
    pdfFileRequired: 'PDF fayl talab qilinadi',
    cannotChangeStatus: 'Holatni {currentStatus} dan {requestedStatus} ga o\'zgartirib bo\'lmaydi',
    allowedTransitions: 'Ruxsat etilgan o\'tishlar',
    currentStatus: 'Joriy holat',
    requestedStatus: 'So\'ralgan holat',
    tenant: 'Ijara oluvchi',
    editContract: 'Shartnomani tahrirlash',
    contractNotes: 'Shartnoma eslatmalari / Tavsif',
    contractNotesPlaceholder: 'Qo\'shimcha eslatmalar, shartlar yoki tavsif qo\'shing...',
    contractPdfFile: 'Shartnoma PDF fayli (ixtiyoriy)',
    currentPdf: 'Joriy PDF',
    viewCurrentPdf: 'Joriy PDFni ko\'rish',
    leaveEmptyToKeepPdf: 'Joriy PDFni saqlab qolish uchun bo\'sh qoldiring yoki almashtirish uchun yangi fayl tanlang.',
    newFileSelected: 'Yangi fayl tanlandi',
    saveChanges: 'O\'zgarishlarni saqlash',
    
    // Invoices & Payments
    tenantId: 'Ijara oluvchi ID',
    tenantIdOptional: 'Ijara oluvchi ID (ixtiyoriy)',
    contractId: 'Shartnoma ID',
    contractIdOptional: 'Shartnoma ID (ixtiyoriy)',
    dueFrom: 'To\'lov muddati dan',
    dueTo: 'To\'lov muddati gacha',
    markAsPaid: 'To\'langan deb belgilash',
    markPaid: 'To\'langan deb belgila',
    processing: 'Qayta ishlanmoqda...',
    viewQr: 'QR ni ko\'rish',
    qrCode: 'QR kod',
    invoiceRecords: 'Hisob-faktura yozuvlari',
    viewAndManageInvoices: 'Hisob-faktura yozuvlarini ko\'rish va boshqarish',
    noInvoicesFound: 'Hisob-fakturalar topilmadi',
    invoiceRecordsWillAppear: 'Hisob-fakturalar yaratilgandan keyin yozuvlar bu yerda paydo bo\'ladi.',
    tryAdjustingFilters: 'Filtrlarni o\'zgartirib ko\'ring.',
    showing: 'Ko\'rsatilmoqda',
    to: 'gacha',
    of: 'dan',
    previous: 'Oldingi',
    next: 'Keyingi',
    page: 'Sahifa',
    notAvailable: 'Mavjud emas',
    failedToMarkPaid: 'Hisob-fakturani to\'langan deb belgilashda xato.',
    noPermissionToMarkPaid: 'Sizda to\'lovlarni to\'langan deb belgilash ruxsati yo\'q.',
    alreadyPaid: 'Allaqachon to\'langan',
    qrCodeNotAvailable: 'QR kod mavjud emas (hisob-faktura allaqachon to\'langan)',
    searchPayments: 'Hisob-faktura ID, summa, holat bo\'yicha to\'lovlarni qidirish...',
    paymentRecordsWillAppear: 'To\'lovlar amalga oshirilgandan keyin to\'lov yozuvlari bu yerda paydo bo\'ladi.',
    online: 'Onlayn',
    offline: 'Oflayn',
    searchUsers: 'Ism, email, rol bo\'yicha foydalanuvchilarni qidirish...',
    userRecordsWillAppear: 'Foydalanuvchilar yaratilgandan keyin yozuvlar bu yerda paydo bo\'ladi.',
    getStartedByCreatingUser: 'Birinchi admin foydalanuvchini yaratishdan boshlang.',
    superAdmin: 'Super Admin',
    admin: 'Admin',
    cashier: 'Kassir',
    support: 'Yordam',
    analyst: 'Tahlilchi',
    changeRole: 'Rolni o\'zgartirish',
    updateRole: 'Rolni yangilash',
    newUser: 'Yangi foydalanuvchi',
    passwordMinLength: 'Kamida 6 ta belgi',
    searchTenants: 'Ijara oluvchilarni qidirish...',
    getStartedByCreatingTenant: 'Birinchi ijara oluvchi hisobini yaratishdan boshlang.',
    tenantRecordsWillAppear: 'Ijara oluvchilar yaratilgandan keyin yozuvlar bu yerda paydo bo\'ladi.',
    editTenant: 'Ijara oluvchini tahrirlash',
    createTenantAccount: 'Ijara oluvchi hisobini yaratish',
    confirmDeleteTenant: 'Bu ijara oluvchini o\'chirishni xohlaysizmi?',
    emailOptional: 'Ixtiyoriy - kirish va xabarnomalar uchun ishlatiladi',
    emailUsedForLogin: 'Kirish va xabarnomalar uchun ishlatiladi',
    enterNewPasswordToChange: 'O\'zgartirish uchun yangi parol kiriting',
    leaveEmptyToKeepPassword: 'Joriy parolni saqlab qolish uchun bo\'sh qoldiring',
    searchUnits: 'Nomi, narxi, maydoni, qavati, holati bo\'yicha xonalarni qidirish...',
    getStartedByCreatingUnit: 'Birinchi xonani yaratishdan boshlang.',
    unitRecordsWillAppear: 'Xonalar yaratilgandan keyin yozuvlar bu yerda paydo bo\'ladi.',
    free: 'Bo\'sh',
    busy: 'Band',
    maintenance: 'Xizmat ko\'rsatish',
    noTenant: 'Ijara oluvchi yo\'q',
    failedToLoadDashboard: 'Boshqaruv paneli statistikasini yuklashda xatolik yuz berdi',

    // Archive Page
    noArchivedTenants: 'Arxivlangan ijara oluvchilar yo\'q',
    archivedTenantsDesc: 'Ijara oluvchilar arxivlanganda ular bu yerda paydo bo\'ladi',
    noArchivedContracts: 'Arxivlangan shartnomalar yo\'q',
    archivedContractsDesc: 'Ijara oluvchilar arxivlanganda shartnomalar bu yerda paydo bo\'ladi',
    noArchivedInvoices: 'Arxivlangan hisob-fakturalar yo\'q',
    archivedInvoicesDesc: 'Ijara oluvchilar arxivlanganda hisob-fakturalar bu yerda paydo bo\'ladi',
    noArchivedPayments: 'Arxivlangan to\'lovlar yo\'q',
    archivedPaymentsDesc: 'Ijara oluvchilar arxivlanganda to\'lovlar bu yerda paydo bo\'ladi',
    noArchivedConversations: 'Arxivlangan suhbatlar yo\'q',
    archivedConversationsDesc: 'Avtomatik arxivlashdan keyin arxivlangan suhbatlar bu yerda paydo bo\'ladi',
    unarchiving: 'Arxivdan chiqarilmoqda...',

    // Browser Compatibility
    browserNoVideoSupport: 'Sizning brauzeringiz video tegi bilan ishlamaydi.',
    browserNoAudioSupport: 'Sizning brauzeringiz audio tegi bilan ishlamaydi.',

    // Activity Log Actions
    actionCreate: 'Yaratish',
    actionUpdate: 'Yangilash',
    actionDelete: 'O\'chirish',
    actionLogin: 'Kirish',
    actionLogout: 'Chiqish',
    actionExport: 'Eksport',
    actionImport: 'Import',
    actionApprove: 'Tasdiqlash',
    actionReject: 'Rad etish',
    actionSend: 'Yuborish',

    // Archive Cleanup
    archiveCompleted: 'Arxivlash yakunlandi',
    cleanupCompleted: 'Tozalash yakunlandi',

    // Archive Messages
    failedToLoadArchiveData: 'Arxiv ma\'lumotlarini yuklashda xato',
    failedToRunAutoArchive: 'Avtomatik arxivlashni ishga tushirishda xato',
    conversationRestoredSuccessfully: 'Suhbat muvaffaqiyatli tiklandi',
    failedToRestoreConversation: 'Suhbatni tiklashda xato',
    tenantUnarchivedSuccessfully: 'Ijara oluvchi muvaffaqiyatli arxivdan chiqarildi',
    failedToUnarchiveTenant: 'Ijara oluvchini arxivdan chiqarishda xato',
    contractUnarchivedSuccessfully: 'Shartnoma muvaffaqiyatli arxivdan chiqarildi',
    failedToUnarchiveContract: 'Shartnomani arxivdan chiqarishda xato',
    invoiceUnarchivedSuccessfully: 'Hisob-faktura muvaffaqiyatli arxivdan chiqarildi',
    failedToUnarchiveInvoice: 'Hisob-fakturani arxivdan chiqarishda xato',

    // System Status
    systemOnline: 'Tizim ishlamoqda',

    // Buildings
    buildings: 'Binolar',
    manageBuildingsDesc: 'Mulklaringizni binolar bo\'yicha tashkil qiling va boshqaring',
    addBuilding: 'Bino qo\'shish',
    buildingName: 'Bino nomi',
    address: 'Manzil',
    addressPlaceholder: 'Ko\'cha va manzil',
    description: 'Tavsif',
    descriptionPlaceholder: 'Qo\'shimcha tavsif',
    create: 'Yaratish',
    editBuilding: 'Binoni tahrirlash',
    searchBuildings: 'Binolarni qidirish...',
    noBuildings: 'Binolar yo\'q',
    createFirstBuilding: 'Xonalarni tashkil qilish uchun birinchi binoni yarating',
    tryDifferentSearch: 'Boshqa qidiruv so\'rovini sinab ko\'ring',
    totalBuildings: 'Jami binolar',
    totalUnits: 'Jami xonalar',
    occupied: 'Band',
    available: 'Mavjud',

    // Archive Management
    archiveManagement: 'Arxiv boshqaruvi',
    archiveSummary: 'Arxiv xulosa',
    runAutoArchive: 'Avtoarxvlashni ishga tushirish',
    cleanupOldArchives: 'Eski arxivlarni tozalash',

    // Email Templates
    emailTemplates: 'Email shablonlari',
    emailTemplatesDesc: 'Ijara oluvchilarga yuboriladigan email xabarnomalarini sozlang',
    templates: 'Shablonlar',
    templateSaved: 'Shablon muvaffaqiyatli saqlandi!',
    saveError: 'Shablonni saqlashda xato',
    availableVariables: 'Mavjud o\'zgaruvchilar',
    sampleData: 'Ko\'rish uchun namuna ma\'lumotlar',
    emailPreview: 'Email ko\'rishi',
    selectTemplate: 'Shablonni tanlang',
    selectTemplateDesc: 'Tahrirlash uchun ro\'yxatdan shablonni tanlang',
    body: 'Tarkib',
    saving: 'Saqlanmoqda...',
    preview: 'Ko\'rish',
    resetToDefault: 'Standartga qaytarish',
    confirmReset: 'Bu shablonni standartga qaytarishni xohlaysizmi?',
    templateReset: 'Shablon standartga qaytarildi',
  },
};

export function getTranslations(lang: Language): Record<string, string> {
  return translations[lang] || translations.uz;
}

export const languageNames: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  uz: 'O\'zbek',
};

export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  ru: '🇷🇺',
  uz: '🇺🇿',
};

