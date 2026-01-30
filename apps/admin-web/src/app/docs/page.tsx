'use client';

import { useState, useEffect } from 'react';
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
  const [openId, setOpenId] = useState<string | null>('intro');
  const [activeId, setActiveId] = useState<string>('intro');
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId((e.target as HTMLElement).id);
        });
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    els.forEach((el) => observer.observe(el));
    return () => {
      els.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-gray-100' : 'bg-stone-50 text-gray-900'}`}>
      <header className={`sticky top-0 z-20 border-b ${darkMode ? 'border-gray-800 bg-black/95' : 'border-gray-200 bg-stone-50/95'} backdrop-blur`}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center justify-between">
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

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 flex gap-8">
        <nav className={`hidden lg:block w-48 flex-shrink-0 sticky top-24 self-start ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3">Mundarija</p>
          <ul className="space-y-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`block py-1.5 px-2 rounded-md text-sm transition-colors ${
                    activeId === s.id
                      ? darkMode
                        ? 'bg-blue-500/20 text-blue-400 font-medium'
                        : 'bg-blue-100 text-blue-700 font-medium'
                      : darkMode
                        ? 'hover:bg-gray-800 hover:text-white'
                        : 'hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 min-w-0 py-8 pb-24">
          <div className="mb-10">
            <h1 className={`text-2xl sm:text-3xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              Darital Admin — To‘liq qo‘llanma
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              Sayt haqida to‘liq ma’lumot va qanday ketma-ketlikda ishlash.
            </p>
          </div>

          <div className="lg:hidden mb-8">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Mundarija
            </p>
            <div className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`inline-block py-2 px-3 rounded-lg text-sm transition-all ${
                    activeId === s.id
                      ? darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                      : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {s.title}
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {sections.map((sec) => {
              const isOpen = openId === sec.id;
              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className={`scroll-mt-24 rounded-xl border transition-all duration-200 ${
                    darkMode
                      ? 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  } ${isOpen ? 'ring-1 ring-blue-500/20' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : sec.id)}
                    className={`w-full flex items-center justify-between gap-4 py-4 px-5 text-left rounded-xl transition-colors ${
                      darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <h2 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {sec.title}
                    </h2>
                    <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className={`px-5 pb-5 pt-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p className="mb-4 leading-relaxed">{sec.body}</p>
                        {'steps' in sec && sec.steps && (
                          <ol className="list-decimal list-inside space-y-2 text-sm">
                            {sec.steps.map((step, i) => (
                              <li key={i} className="pl-1">{step}</li>
                            ))}
                          </ol>
                        )}
                        {'items' in sec && sec.items && (
                          <ul className="space-y-3 mt-4">
                            {sec.items!.map((item, i) => (
                              <li key={i} className={`pl-4 border-l-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>{item.label}</span>
                                <span className="text-gray-500"> — {item.desc}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <footer className={`mt-16 pt-8 border-t ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'} text-sm`}>
            <p>Darital Admin · <a href="https://darital-admin-web.onrender.com/" className={darkMode ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}>darital-admin-web.onrender.com</a></p>
          </footer>
        </main>
      </div>

      {showBackTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className={`fixed bottom-6 right-6 z-10 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
            darkMode ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
