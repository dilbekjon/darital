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
  monthlyRent: string;
  totalContractAmount: string;
  dueDate: string;
  status: string;
  pending: string;
  paid: string;
  overdue: string;
  noInvoices: string;
  payNow: string;
  paymentFailed: string;
  refresh: string;
  deadline: string;
  daysRemaining: string;
  daysOverdue: string;
  dueSoon: string;
  payBefore: string;
  paymentDue: string;
  urgentPayment: string;
  
  // Payments
  paymentsHistory: string;
  invoiceId: string;
  method: string;
  paidAt: string;
  confirmed: string;
  paymentAccepted: string;
  awaitingPayment: string;
  noPayments: string;
  
  // Documents
  documents: string;
  myDocuments: string;
  noDocuments: string;
  noDocumentsYet: string;
  download: string;
  documentSummary: string;
  totalDocuments: string;
  totalSize: string;
  receipts: string;
  viewDocuments: string;
  receipt: string;
  receiptError: string;
  preferencesSaved: string;
  saveError: string;
  settings: string;
  managePreferences: string;
  documentsDescription: string;
  
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

  // System Status
  systemOnline: string;
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
    monthlyRent: 'Monthly Rent',
    totalContractAmount: 'Total Contract Amount',
    dueDate: 'Due Date',
    status: 'Status',
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    noInvoices: 'No invoices found',
    payNow: 'Pay Now',
    paymentFailed: 'Unable to start payment. Please try again.',
    refresh: 'Refresh',
    deadline: 'Deadline',
    daysRemaining: 'days remaining',
    daysOverdue: 'days overdue',
    dueSoon: 'Due Soon',
    payBefore: 'Please pay before deadline',
    paymentDue: 'Payment Due',
    urgentPayment: 'Urgent: Payment is overdue!',
    
    // Payments
    paymentsHistory: 'Payments History',
    invoiceId: 'Invoice ID',
    method: 'Method',
    paidAt: 'Paid At',
    confirmed: 'Confirmed',
    paymentAccepted: 'Payment Accepted',
    awaitingPayment: 'Awaiting Payment',
    noPayments: 'No payments found',
    
    // Documents
    documents: 'Documents',
    myDocuments: 'My Documents',
    noDocuments: 'No Documents',
    noDocumentsYet: 'Your documents will appear here once uploaded',
    download: 'Download',
    documentSummary: 'Document Summary',
    totalDocuments: 'Total Documents',
    totalSize: 'Total Size',
    receipts: 'Receipts',
    viewDocuments: 'View Documents',
    receipt: 'Receipt',
    receiptError: 'Failed to load receipt',
    preferencesSaved: 'Preferences saved successfully!',
    saveError: 'Failed to save preferences',
    settings: 'Settings',
    managePreferences: 'Manage Preferences',
    documentsDescription: 'View and download your lease agreements, receipts, and other documents',
    
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

    // System Status
    systemOnline: 'System Online',
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
    monthlyRent: 'Ежемесячная аренда',
    totalContractAmount: 'Общая сумма контракта',
    dueDate: 'Срок оплаты',
    status: 'Статус',
    pending: 'В ожидании',
    paid: 'Оплачено',
    overdue: 'Просрочено',
    noInvoices: 'Счета не найдены',
    payNow: 'Оплатить',
    paymentFailed: 'Не удалось начать оплату. Попробуйте еще раз.',
    refresh: 'Обновить',
    deadline: 'Срок оплаты',
    daysRemaining: 'дней осталось',
    daysOverdue: 'дней просрочено',
    dueSoon: 'Скоро срок оплаты',
    payBefore: 'Пожалуйста, оплатите до срока',
    paymentDue: 'Платеж должен быть оплачен',
    urgentPayment: 'Срочно: Платеж просрочен!',
    
    // Payments
    paymentsHistory: 'История платежей',
    invoiceId: 'ID счета',
    method: 'Метод',
    paidAt: 'Оплачено',
    confirmed: 'Подтверждено',
    paymentAccepted: 'Платеж принят',
    awaitingPayment: 'Ожидание платежа',
    noPayments: 'Платежи не найдены',
    
    // Documents
    documents: 'Документы',
    myDocuments: 'Мои документы',
    noDocuments: 'Нет документов',
    noDocumentsYet: 'Ваши документы появятся здесь после загрузки',
    download: 'Скачать',
    documentSummary: 'Сводка документов',
    totalDocuments: 'Всего документов',
    totalSize: 'Общий размер',
    receipts: 'Квитанции',
    viewDocuments: 'Просмотр документов',
    receipt: 'Квитанция',
    receiptError: 'Не удалось загрузить квитанцию',
    preferencesSaved: 'Настройки успешно сохранены!',
    saveError: 'Не удалось сохранить настройки',
    settings: 'Настройки',
    managePreferences: 'Управление настройками',
    documentsDescription: 'Просмотр и загрузка договоров аренды, квитанций и других документов',
    
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

    // System Status
    systemOnline: 'Система онлайн',
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
    monthlyRent: 'Oylik ijara',
    totalContractAmount: 'Shartnomaning umumiy summasi',
    dueDate: 'To\'lov muddati',
    status: 'Holat',
    pending: 'Kutilmoqda',
    paid: 'To\'langan',
    overdue: 'Muddati o\'tgan',
    noInvoices: 'Hisob-fakturalar topilmadi',
    payNow: 'To\'lash',
    paymentFailed: 'To\'lovni boshlab bo\'lmadi. Qayta urinib ko\'ring.',
    refresh: 'Yangilash',
    deadline: 'Muddati',
    daysRemaining: 'kun qoldi',
    daysOverdue: 'kun muddati o\'tgan',
    dueSoon: 'Tez orada muddat',
    payBefore: 'Iltimos, muddatgacha to\'lang',
    paymentDue: 'To\'lov muddati',
    urgentPayment: 'Shoshilinch: To\'lov muddati o\'tdi!',
    
    // Payments
    paymentsHistory: 'To\'lovlar tarixi',
    invoiceId: 'Hisob-faktura ID',
    method: 'Usul',
    paidAt: 'To\'langan',
    confirmed: 'Tasdiqlangan',
    paymentAccepted: 'To\'lov qabul qilindi',
    awaitingPayment: 'To\'lov kutilmoqda',
    noPayments: 'To\'lovlar topilmadi',
    
    // Documents
    documents: 'Hujjatlar',
    myDocuments: 'Mening hujjatlarim',
    noDocuments: 'Hujjatlar yo\'q',
    noDocumentsYet: 'Hujjatlar yuklangandan keyin ular bu yerda paydo bo\'ladi',
    download: 'Yuklab olish',
    documentSummary: 'Hujjatlar xulosa',
    totalDocuments: 'Jami hujjatlar',
    totalSize: 'Jami hajmi',
    receipts: 'Kvitansiyalar',
    viewDocuments: 'Hujjatlarni ko\'rish',
    receipt: 'Kvitansiya',
    receiptError: 'Kvitansiyani yuklab bo\'lmadi',
    preferencesSaved: 'Sozlamalar muvaffaqiyatli saqlandi!',
    saveError: 'Sozlamalarni saqlab bo\'lmadi',
    settings: 'Sozlamalar',
    managePreferences: 'Sozlamalarni boshqarish',
    documentsDescription: 'Ijara shartnomalari, kvitansiyalar va boshqa hujjatlarni ko\'rish va yuklab olish',
    
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

    // System Status
    systemOnline: 'Tizim ishlamoqda',
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

