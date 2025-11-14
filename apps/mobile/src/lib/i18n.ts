// Internationalization system for the mobile app

export type Language = 'en' | 'ru' | 'uz';

export interface Translations {
  // Navigation & Common
  home: string;
  invoices: string;
  payments: string;
  balance: string;
  property: string;
  contact: string;
  loading: string;
  error: string;
  
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
  paymentDetails: string;
  paymentInformation: string;
  paymentMethod: string;
  createdAt: string;
  confirmedAt: string;
  notAvailable: string;
  goBack: string;
  invoiceInformation: string;
  unit: string;
  invoiceAmount: string;
  invoiceStatus: string;
  viewInvoice: string;
  backToPayments: string;
  tapToViewDetails: string;
  
  // QR & Notifications
  retry: string;
  ok: string;
  cancel: string;
  clear: string;
  clearAll: string;
  yourNotifications: string;
  noNotifications: string;
  clearNotificationsTitle: string;
  clearNotificationsMessage: string;
  notifications: string;
  payViaQr: string;
  invoicePayment: string;
  scanQrToPay: string;
  alreadyPaid: string;
  noQrData: string;
  checkStatus: string;
  loadingQr: string;
  failedToLoadQr: string;
  paymentConfirmed: string;
  invoicePaidMessage: string;
  
  // Offline Mode
  offlineMode: string;
  showingCachedData: string;
  
  // Chat
  support: string;
  supportChat: string;
  chatList: string;
  chat: string;
  typeMessage: string;
  send: string;
  noConversations: string;
  startNewChat: string;
  enterChatTopic: string;
  admin: string;
  you: string;
  justNow: string;
  chatWith: string;
  connected: string;
  connecting: string;
  disconnected: string;
  
  // Auth
  email: string;
  password: string;
  login: string;
  logout: string;
  invalidCredentials: string;
  loginFailed: string;
  
  // Theme
  lightMode: string;
  darkMode: string;
  light: string;
  dark: string;
  // Passcode
  enterPasscode: string;
  createPasscode: string;
  confirmPasscode: string;
  passcodeMismatch: string;
  passcodeSet: string;
  passcodeIncorrect: string;
  useBiometrics: string;
  biometricsFailed: string;
  biometricsNotAvailable: string;
}

const translations: Record<Language, Translations> = {
  en: {
    home: 'Home',
    invoices: 'Invoices',
    payments: 'Payments',
    balance: 'Balance',
    property: 'Property',
    contact: 'Contact',
    loading: 'Loading...',
    error: 'Error',
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
    invoicesList: 'Invoices List',
    unitName: 'Unit Name',
    amount: 'Amount',
    dueDate: 'Due Date',
    status: 'Status',
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    noInvoices: 'No invoices found',
    paymentsHistory: 'Payments History',
    invoiceId: 'Invoice ID',
    method: 'Method',
    paidAt: 'Paid At',
    confirmed: 'Confirmed',
    noPayments: 'No payments found',
    paymentDetails: 'Payment Details',
    paymentInformation: 'Payment Information',
    paymentMethod: 'Payment Method',
    createdAt: 'Created At',
    confirmedAt: 'Confirmed At',
    notAvailable: 'N/A',
    goBack: 'Go Back',
    invoiceInformation: 'Invoice Information',
    unit: 'Unit',
    invoiceAmount: 'Invoice Amount',
    invoiceStatus: 'Invoice Status',
    viewInvoice: 'View Invoice',
    backToPayments: 'Back to Payments',
    tapToViewDetails: 'Tap to view details',
    retry: 'Retry',
    ok: 'OK',
    cancel: 'Cancel',
    clear: 'Clear',
    clearAll: 'Clear All',
    yourNotifications: 'Your Notifications',
    noNotifications: 'No notifications yet',
    clearNotificationsTitle: 'Clear All Notifications',
    clearNotificationsMessage: 'Are you sure you want to clear all notifications?',
    notifications: 'Notifications',
    payViaQr: 'Pay via QR',
    invoicePayment: 'Invoice Payment',
    scanQrToPay: 'Scan QR code to pay',
    alreadyPaid: 'Already Paid',
    noQrData: 'No QR code available',
    checkStatus: 'Check Status',
    loadingQr: 'Loading QR code...',
    failedToLoadQr: 'Failed to load QR code',
    paymentConfirmed: 'Payment Confirmed',
    invoicePaidMessage: 'This invoice has already been paid',
    offlineMode: 'Offline Mode',
    showingCachedData: 'Showing cached data',
    support: 'Support',
    supportChat: 'Support Chat',
    chatList: 'Chat List',
    chat: 'Chat',
    typeMessage: 'Type a message...',
    send: 'Send',
    noConversations: 'No conversations yet',
    startNewChat: 'Start New Chat',
    enterChatTopic: 'Enter chat topic (optional)',
    admin: 'Admin',
    you: 'You',
    justNow: 'Just now',
    chatWith: 'Chat with',
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    logout: 'Logout',
    invalidCredentials: 'Invalid credentials',
    loginFailed: 'Login failed',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    light: 'Light',
    dark: 'Dark',
    // Passcode
    enterPasscode: 'Enter Passcode',
    createPasscode: 'Create Passcode',
    confirmPasscode: 'Confirm Passcode',
    passcodeMismatch: 'Passcodes do not match',
    passcodeSet: 'Passcode set successfully!',
    passcodeIncorrect: 'Incorrect passcode',
    useBiometrics: 'Use Biometrics',
    biometricsFailed: 'Biometric authentication failed',
    biometricsNotAvailable: 'Biometrics not available',
  },
  ru: {
    home: 'Главная',
    invoices: 'Счета',
    payments: 'Платежи',
    balance: 'Баланс',
    property: 'Недвижимость',
    contact: 'Контакт',
    loading: 'Загрузка...',
    error: 'Ошибка',
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
    invoicesList: 'Список счетов',
    unitName: 'Название квартиры',
    amount: 'Сумма',
    dueDate: 'Срок оплаты',
    status: 'Статус',
    pending: 'В ожидании',
    paid: 'Оплачено',
    overdue: 'Просрочено',
    noInvoices: 'Счета не найдены',
    paymentsHistory: 'История платежей',
    invoiceId: 'ID счета',
    method: 'Метод',
    paidAt: 'Оплачено',
    confirmed: 'Подтверждено',
    noPayments: 'Платежи не найдены',
    paymentDetails: 'Детали платежа',
    paymentInformation: 'Информация о платеже',
    paymentMethod: 'Способ оплаты',
    createdAt: 'Создано',
    confirmedAt: 'Подтверждено',
    notAvailable: 'Н/Д',
    goBack: 'Назад',
    invoiceInformation: 'Информация о счете',
    unit: 'Квартира',
    invoiceAmount: 'Сумма счета',
    invoiceStatus: 'Статус счета',
    viewInvoice: 'Просмотр счета',
    backToPayments: 'Назад к платежам',
    tapToViewDetails: 'Нажмите для просмотра',
    retry: 'Повторить',
    ok: 'ОК',
    cancel: 'Отмена',
    clear: 'Очистить',
    clearAll: 'Очистить все',
    yourNotifications: 'Ваши уведомления',
    noNotifications: 'Нет уведомлений',
    clearNotificationsTitle: 'Очистить все уведомления',
    clearNotificationsMessage: 'Вы уверены, что хотите очистить все уведомления?',
    notifications: 'Уведомления',
    payViaQr: 'Оплата по QR',
    invoicePayment: 'Оплата счета',
    scanQrToPay: 'Отсканируйте QR-код для оплаты',
    alreadyPaid: 'Уже оплачено',
    noQrData: 'QR-код недоступен',
    checkStatus: 'Проверить статус',
    loadingQr: 'Загрузка QR-кода...',
    failedToLoadQr: 'Не удалось загрузить QR-код',
    paymentConfirmed: 'Платеж подтвержден',
    invoicePaidMessage: 'Этот счет уже оплачен',
    offlineMode: 'Автономный режим',
    showingCachedData: 'Показаны сохраненные данные',
    support: 'Поддержка',
    supportChat: 'Чат поддержки',
    chatList: 'Список чатов',
    chat: 'Чат',
    typeMessage: 'Введите сообщение...',
    send: 'Отправить',
    noConversations: 'Пока нет разговоров',
    startNewChat: 'Начать новый чат',
    enterChatTopic: 'Введите тему чата (необязательно)',
    admin: 'Администратор',
    you: 'Вы',
    justNow: 'Только что',
    chatWith: 'Чат с',
    connected: 'Подключено',
    connecting: 'Подключение...',
    disconnected: 'Отключено',
    email: 'Электронная почта',
    password: 'Пароль',
    login: 'Войти',
    logout: 'Выйти',
    invalidCredentials: 'Неверные учетные данные',
    loginFailed: 'Ошибка входа',
    lightMode: 'Светлый режим',
    darkMode: 'Темный режим',
    light: 'Светлый',
    dark: 'Темный',
    // Passcode
    enterPasscode: 'Введите код-пароль',
    createPasscode: 'Создать код-пароль',
    confirmPasscode: 'Подтвердите код-пароль',
    passcodeMismatch: 'Код-пароли не совпадают',
    passcodeSet: 'Код-пароль успешно установлен!',
    passcodeIncorrect: 'Неверный код-пароль',
    useBiometrics: 'Использовать биометрию',
    biometricsFailed: 'Биометрическая аутентификация не удалась',
    biometricsNotAvailable: 'Биометрия недоступна',
  },
  uz: {
    home: 'Bosh sahifa',
    invoices: 'Hisob-fakturalar',
    payments: 'To\'lovlar',
    balance: 'Balans',
    property: 'Mulk',
    contact: 'Aloqa',
    loading: 'Yuklanmoqda...',
    error: 'Xato',
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
    invoicesList: 'Hisob-fakturalar ro\'yxati',
    unitName: 'Xona nomi',
    amount: 'Miqdor',
    dueDate: 'To\'lov muddati',
    status: 'Holat',
    pending: 'Kutilmoqda',
    paid: 'To\'langan',
    overdue: 'Muddati o\'tgan',
    noInvoices: 'Hisob-fakturalar topilmadi',
    paymentsHistory: 'To\'lovlar tarixi',
    invoiceId: 'Hisob-faktura ID',
    method: 'Usul',
    paidAt: 'To\'langan',
    confirmed: 'Tasdiqlangan',
    noPayments: 'To\'lovlar topilmadi',
    paymentDetails: 'To\'lov tafsilotlari',
    paymentInformation: 'To\'lov ma\'lumotlari',
    paymentMethod: 'To\'lov usuli',
    createdAt: 'Yaratilgan',
    confirmedAt: 'Tasdiqlangan',
    notAvailable: 'Mavjud emas',
    goBack: 'Orqaga',
    invoiceInformation: 'Hisob-faktura ma\'lumotlari',
    unit: 'Xona',
    invoiceAmount: 'Hisob-faktura miqdori',
    invoiceStatus: 'Hisob-faktura holati',
    viewInvoice: 'Hisob-fakturani ko\'rish',
    backToPayments: 'To\'lovlarga qaytish',
    tapToViewDetails: 'Tafsilotlarni ko\'rish uchun bosing',
    retry: 'Qayta urinish',
    ok: 'OK',
    cancel: 'Bekor qilish',
    clear: 'Tozalash',
    clearAll: 'Hammasini tozalash',
    yourNotifications: 'Sizning xabarnomalaringiz',
    noNotifications: 'Hali xabarnomalar yo\'q',
    clearNotificationsTitle: 'Barcha xabarnomalarni tozalash',
    clearNotificationsMessage: 'Barcha xabarnomalarni o\'chirmoqchimisiz?',
    notifications: 'Xabarnomalar',
    payViaQr: 'QR orqali to\'lash',
    invoicePayment: 'Hisob-faktura to\'lovi',
    scanQrToPay: 'To\'lash uchun QR kodni skanerlang',
    alreadyPaid: 'Allaqachon to\'langan',
    noQrData: 'QR kod mavjud emas',
    checkStatus: 'Holatni tekshirish',
    loadingQr: 'QR kod yuklanmoqda...',
    failedToLoadQr: 'QR kodni yuklash xatosi',
    paymentConfirmed: 'To\'lov tasdiqlandi',
    invoicePaidMessage: 'Bu hisob-faktura allaqachon to\'langan',
    offlineMode: 'Oflayn rejim',
    showingCachedData: 'Saqlangan ma\'lumotlar ko\'rsatilmoqda',
    support: 'Yordam',
    supportChat: 'Yordam chati',
    chatList: 'Chatlar ro\'yxati',
    chat: 'Chat',
    typeMessage: 'Xabar yozing...',
    send: 'Yuborish',
    noConversations: 'Hozircha suhbatlar yo\'q',
    startNewChat: 'Yangi chat boshlash',
    enterChatTopic: 'Chat mavzusini kiriting (ixtiyoriy)',
    admin: 'Administrator',
    you: 'Siz',
    justNow: 'Hozirgina',
    chatWith: 'Chat',
    connected: 'Ulangan',
    connecting: 'Ulanmoqda...',
    disconnected: 'Uzildi',
    email: 'Elektron pochta',
    password: 'Parol',
    login: 'Kirish',
    logout: 'Chiqish',
    invalidCredentials: 'Noto\'g\'ri ma\'lumotlar',
    loginFailed: 'Kirish xatosi',
    lightMode: 'Yorug\' rejim',
    darkMode: 'Qorong\'u rejim',
    light: 'Yorug\'',
    dark: 'Qorong\'u',
    // Passcode
    enterPasscode: 'Kod-parolni kiriting',
    createPasscode: 'Kod-parol yarating',
    confirmPasscode: 'Kod-parolni tasdiqlang',
    passcodeMismatch: 'Kod-parollar mos kelmadi',
    passcodeSet: 'Kod-parol muvaffaqiyatli o\'rnatildi!',
    passcodeIncorrect: 'Noto\'g\'ri kod-parol',
    useBiometrics: 'Biometrikadan foydalaning',
    biometricsFailed: 'Biometrik autentifikatsiya muvaffaqiyatsiz',
    biometricsNotAvailable: 'Biometrika mavjud emas',
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.uz; // Default to Uzbek
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

// Export a default translation object (Uzbek) for cases where LanguageContext is not available
// This prevents "undefined" errors if screens are rendered without provider
export const t: Translations = getTranslations('uz');

