'use client';

import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';

const sections = [
  {
    id: 'intro',
    title: 'Darital Admin nima?',
    body: 'Darital — uy-joy ijara (arendani) boshqarish tizimi. Binolar va kvartiralar, ijarachilar, shartnomalar, hisob-fakturalar va to\'lovlarni boshqarish, hisobotlar va mijozlar bilan chat/Telegram orqali aloqa uchun ishlatiladi.',
  },
  {
    id: 'start',
    title: 'Nimadan boshlash kerak?',
    body: 'Tizimga kirish uchun admin hisobingiz bilan login qiling. Keyin quyidagi ketma-ketlikni kuzating: avval obyektlar (binolar / kvartiralar), keyin ijarachilar, shartnomalar, hisob-fakturalar va to\'lovlar. Har bir bo\'lim sidebar (chap menyu) orqali ochiladi.',
    steps: [
      'Dashboard — umumiy statistika va tezkor ko\'rinish.',
      'Binolar va Kvartiralar — obyektlarni qo\'shish va tahrirlash.',
      'Ijarachilar — ijarachilarni ro\'yxatga olish.',
      'Shartnomalar — ijarachi bilan shartnoma yaratish (obyekt + muddat + narx).',
      'Hisob-fakturalar — to\'lovlar yaratish va muddatlarni kuzatish.',
      'To\'lovlar — kiritilgan to\'lovlarni tasdiqlash (Accept) yoki rad etish.',
    ],
  },
  {
    id: 'workflow',
    title: 'Admin ish ketma-ketligi',
    body: 'Ma\'lumotlar ob\'ektlar → ijarachilar → shartnomalar → hisob-fakturalar → to\'lovlar tartibida kiritiladi.',
    items: [
      { label: 'Dashboard', desc: 'Kirishdan keyin: ijarachilar, shartnomalar, to\'lovlar, daromad, kutilayotgan va muddati o\'tgan hisob-fakturalar.' },
      { label: 'Reports', desc: 'Tanlangan davr bo\'yicha daromad, hisob-fakturalar, to\'lovlar; PDF eksport.' },
      { label: 'Contracts', desc: 'Shartnoma yaratish, faol/arxiv, muddat va narxni boshqarish.' },
      { label: 'Tenants', desc: 'Ijarachilar ro\'yxati, qo\'shish, tahrirlash.' },
      { label: 'Units', desc: 'Kvartiralar (obyektlar) ro\'yxati va boshqaruvi.' },
      { label: 'Buildings', desc: 'Binolar ro\'yxati va boshqaruvi.' },
      { label: 'Payments', desc: 'To\'lovlar ro\'yxati, kutilayotganlarni tasdiqlash (Checkout.uz va boshqalar).' },
      { label: 'Invoices', desc: 'Hisob-fakturalar, holatlar: kutilmoqda, to\'langan, muddati o\'tgan.' },
      { label: 'Chat', desc: 'Admin panel ichida ijarachilar bilan yozishmalar (faqat chat ruxsati bor rollar).' },
      { label: 'Notifications', desc: 'Tizim bildirishnomalarini sozlash va yuborish.' },
      { label: 'Telegram Chat', desc: 'Telegram bot orqali ijarachilar bilan aloqa va to\'lovlar.' },
      { label: 'Email Templates', desc: 'Email shablonlarini tahrirlash.' },
      { label: 'Admin Users', desc: 'Admin foydalanuvchilar, rollar va ruxsatlar (RBAC).' },
      { label: 'Activity Logs', desc: 'Tizimdagi harakatlar jurnali.' },
      { label: 'Archive Management', desc: 'Arxivlangan ma\'lumotlar bilan ishlash.' },
    ],
  },
  {
    id: 'roles',
    title: 'Rollar va ruxsatlar',
    body: 'Har bir admin roli ma\'lum bo\'limlarni ko\'radi. Masalan: chat.read bo\'lmasa Chat ko\'rinmaydi va chat API so\'rovlari yuborilmaydi; PAYMENT_COLLECTOR (tolovyiguvchi) uchun Chat yashiriladi. Ruxsatlar Admin Users orqali boshqariladi.',
  },
  {
    id: 'support',
    title: 'Yordam',
    body: 'Savollar yoki texnik muammolar bo\'lsa, tizim administratori yoki rivojlantiruvchi jamoasi bilan bog\'laning. Admin panel: darital-admin-web.onrender.com.',
  },
];

export default function DocsPage() {
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-gray-100' : 'bg-stone-50 text-gray-900'}`}>
      <header className={`sticky top-0 z-10 border-b ${darkMode ? 'border-gray-800 bg-black/95' : 'border-gray-200 bg-stone-50/95'} backdrop-blur`}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity">
            <span className={darkMode ? 'text-white' : 'text-gray-900'}>Darital</span>
            <span className="text-gray-500">/</span>
            <span className="text-blue-500">Docs</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className={`text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>
              Login
            </Link>
            <Link href="/dashboard" className={`text-sm px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} transition-colors`}>
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12 pb-24">
        <div className="mb-12">
          <h1 className={`text-2xl sm:text-3xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Darital Admin — To‘liq qo‘llanma
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            Sayt haqida to‘liq ma’lumot va qanday ketma-ketlikda ishlash.
          </p>
        </div>

        <nav className={`mb-10 pb-6 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Mundarija
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {sections.map((sec) => (
            <section key={sec.id} id={sec.id} className="scroll-mt-24">
              <h2 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {sec.title}
              </h2>
              <p className={`mb-4 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {sec.body}
              </p>
              {'steps' in sec && sec.steps && (
                <ol className={`list-decimal list-inside space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {sec.steps.map((step, i) => (
                    <li key={i} className="pl-1">{step}</li>
                  ))}
                </ol>
              )}
              {'items' in sec && sec.items && (
                <ul className="space-y-3 mt-4">
                  {sec.items!.map((item, i) => (
                    <li key={i} className={`pl-4 border-l-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.label}</span>
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}> — {item.desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className={`mt-16 pt-8 border-t ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'} text-sm`}>
          <p>Darital Admin · <a href="https://darital-admin-web.onrender.com/" className={darkMode ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}>darital-admin-web.onrender.com</a></p>
        </footer>
      </main>
    </div>
  );
}
