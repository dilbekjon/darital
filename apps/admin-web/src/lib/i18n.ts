// Internationalization system for the app

export type Language = 'en' | 'ru' | 'uz';

export interface Translations {
  // Navigation & Common
  home: string;
  dashboard: string;
  invoices: string;
  payments: string;
  balance: string;
  property: string;
  contact: string;
  loading: string;
  error: string;
  tenants: string;
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
  welcomeBack: string;
  premiumOverview: string;
  propertyOverview: string;
  currentBalance: string;
  yourActiveUnit: string;
  phoneNumber: string;
  quickActions: string;
  viewInvoices: string;
  checkYourBills: string;
  paymentHistory: string;
  viewTransactions: string;
  getSupport: string;
  contactUs: string;
  
  // Invoices
  invoicesList: string;
  unitName: string;
  amount: string;
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
  reportSummary: string;
  selectDatesAndGenerate: string;
  captureOffline: string;
  totalRevenue: string;
  totalInvoiced: string;
  outstandingAmount: string;
  total: string;
  sending: string;
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
  createContract: string;
  addTenant: string;
  recordPayment: string;
  openSupportChat: string;
  contracts: string;
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
  untitledConversation: string;
  noConversations: string;
  selectConversation: string;
  welcomeToChat: string;
  clickStartChat: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Navigation & Common
    home: 'Home',
    dashboard: 'Home',
    invoices: 'Invoices',
    payments: 'Payments',
    balance: 'Balance',
    property: 'Property',
    contact: 'Contact',
    loading: 'Loading...',
    error: 'Error',
    tenants: 'Tenants',
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
    viewInvoices: 'View Invoices',
    checkYourBills: 'Check your bills',
    paymentHistory: 'Payment History',
    viewTransactions: 'View transactions',
    getSupport: 'Get Support',
    contactUs: 'Contact us',
    
    // Invoices
    invoicesList: 'Invoices List',
    unitName: 'Unit Name',
    amount: 'Amount',
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
    reportSummary: 'Report Summary',
    selectDatesAndGenerate: 'Select dates and generate a report',
    captureOffline: 'Capture Offline',
    totalRevenue: 'Total Revenue',
    totalInvoiced: 'Total Invoiced',
    outstandingAmount: 'Outstanding Amount',
    total: 'Total',
    sending: 'Sending...',
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
    createContract: 'Create Contract',
    addTenant: 'Add Tenant',
    recordPayment: 'Record Payment',
    openSupportChat: 'Open Support Chat',
    contracts: 'Contracts',
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
    untitledConversation: 'Untitled Conversation',
    noConversations: 'No conversations yet',
    selectConversation: 'Select a conversation to start chatting',
    welcomeToChat: 'Welcome to Support Chat',
    clickStartChat: 'Click "Start New Chat" to begin a conversation',
    justNow: 'Just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
  },
  ru: {
    // Navigation & Common
    home: 'Главная',
    dashboard: 'Главная',
    invoices: 'Счета',
    payments: 'Платежи',
    balance: 'Баланс',
    property: 'Недвижимость',
    contact: 'Контакт',
    loading: 'Загрузка...',
    error: 'Ошибка',
    tenants: 'Арендаторы',
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
    viewInvoices: 'Просмотр счетов',
    checkYourBills: 'Проверьте свои счета',
    paymentHistory: 'История платежей',
    viewTransactions: 'Просмотр транзакций',
    getSupport: 'Получить поддержку',
    contactUs: 'Свяжитесь с нами',
    
    // Invoices
    invoicesList: 'Список счетов',
    unitName: 'Название квартиры',
    amount: 'Сумма',
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
    reportSummary: 'Сводка отчета',
    selectDatesAndGenerate: 'Выберите даты и сгенерируйте отчет',
    captureOffline: 'Захватить офлайн',
    totalRevenue: 'Общий доход',
    totalInvoiced: 'Всего выставлено счетов',
    outstandingAmount: 'Неоплаченная сумма',
    total: 'Всего',
    sending: 'Отправка...',
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
    createContract: 'Создать контракт',
    addTenant: 'Добавить арендатора',
    recordPayment: 'Записать платеж',
    openSupportChat: 'Открыть чат поддержки',
    contracts: 'Контракты',
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
    untitledConversation: 'Разговор без названия',
    noConversations: 'Пока нет разговоров',
    selectConversation: 'Выберите разговор, чтобы начать общение',
    welcomeToChat: 'Добро пожаловать в чат поддержки',
    clickStartChat: 'Нажмите "Начать новый чат", чтобы начать разговор',
    justNow: 'Только что',
    minutesAgo: 'мин. назад',
    hoursAgo: 'ч. назад',
    daysAgo: 'дн. назад',
  },
  uz: {
    // Navigation & Common
    home: 'Bosh sahifa',
    dashboard: 'Bosh sahifa',
    invoices: 'Hisob-fakturalar',
    payments: 'To\'lovlar',
    balance: 'Balans',
    property: 'Mulk',
    contact: 'Aloqa',
    loading: 'Yuklanmoqda...',
    error: 'Xato',
    tenants: 'Ijara oluvchilar',
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
    
    // Invoices
    invoicesList: 'Hisob-fakturalar ro\'yxati',
    unitName: 'Xona nomi',
    amount: 'Miqdor',
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
    reportSummary: 'Hisobot xulosa',
    selectDatesAndGenerate: 'Sanani tanlang va hisobot yarating',
    captureOffline: 'Oflayn to\'lash',
    totalRevenue: 'Jami daromad',
    totalInvoiced: 'Jami hisob-faktura',
    outstandingAmount: 'To\'lanmagan summa',
    total: 'Jami',
    sending: 'Yuborilmoqda...',
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
    createContract: 'Shartnoma yaratish',
    addTenant: 'Ijara oluvchi qo\'shish',
    recordPayment: 'To\'lovni qayd etish',
    openSupportChat: 'Yordam chatini ochish',
    contracts: 'Shartnomalar',
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
    untitledConversation: 'Nomsiz suhbat',
    noConversations: 'Hali suhbatlar yo\'q',
    selectConversation: 'Suhbatlashishni boshlash uchun suhbatni tanlang',
    welcomeToChat: 'Yordam chatiga xush kelibsiz',
    clickStartChat: 'Suhbatni boshlash uchun "Yangi chat boshlash" tugmasini bosing',
    justNow: 'Hozir',
    minutesAgo: 'daqiqa oldin',
    hoursAgo: 'soat oldin',
    daysAgo: 'kun oldin',
  },
};

export function getTranslations(lang: Language): Translations {
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

