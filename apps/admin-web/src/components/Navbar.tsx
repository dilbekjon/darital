'use client';

import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Language, languageNames, languageFlags } from '../lib/i18n';

export function Navbar() {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { darkMode, toggleTheme } = useTheme();

  return (
    <nav className={`w-full sticky top-0 z-50 transition-colors duration-500 ${
      darkMode 
        ? 'bg-gradient-to-r from-gray-900 via-black to-gray-900' 
        : 'bg-gradient-to-r from-blue-50 via-white to-blue-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Language Selector - Left */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 border ${
                darkMode
                  ? 'bg-gradient-to-r from-gray-800 to-gray-900 border-yellow-500/40 text-white hover:border-yellow-400'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 shadow-md'
              } hover:scale-105`}
            >
              <span className="text-xl">{languageFlags[language]}</span>
              <span className="text-sm font-semibold">{languageNames[language]}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Language Dropdown */}
            {showLangMenu && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowLangMenu(false)}
                />
                <div className={`absolute left-0 mt-2 w-48 rounded-xl shadow-2xl overflow-hidden z-50 border ${
                  darkMode
                    ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-yellow-500/40'
                    : 'bg-white border-gray-200'
                }`}>
                  {(['en', 'ru', 'uz'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setShowLangMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                        language === lang
                          ? darkMode
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-50 text-blue-600'
                          : darkMode
                          ? 'text-gray-300 hover:bg-gray-700/50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl">{languageFlags[lang]}</span>
                      <span className="font-medium">{languageNames[lang]}</span>
                      {language === lang && (
                        <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle Switch - Right */}
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium transition-colors ${darkMode ? 'text-gray-500' : 'text-gray-700'}`}>
              {t.light}
            </span>
            <button
              onClick={toggleTheme}
              className={`relative w-16 h-8 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                darkMode 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 focus:ring-yellow-500 shadow-lg shadow-yellow-500/50' 
                  : 'bg-gradient-to-r from-gray-300 to-gray-400 focus:ring-blue-500 shadow-md'
              }`}
              style={{
                boxShadow: darkMode 
                  ? '0 0 20px rgba(234, 179, 8, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.2)' 
                  : '0 4px 6px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Toggle Circle */}
              <div
                className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-all duration-500 flex items-center justify-center ${
                  darkMode 
                    ? 'translate-x-8 bg-gradient-to-br from-gray-900 to-black shadow-xl' 
                    : 'translate-x-0 bg-white shadow-lg'
                }`}
                style={{
                  boxShadow: darkMode 
                    ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(234, 179, 8, 0.3)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}
              >
                {/* Icon inside circle */}
                {darkMode ? (
                  <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              {/* Stars decoration (only visible in dark mode) */}
              <div className={`absolute inset-0 flex items-center justify-around px-2 transition-opacity duration-500 ${darkMode ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-yellow-200 text-xs animate-pulse" style={{animationDelay: '0s'}}>✦</span>
                <span className="text-yellow-300 text-xs animate-pulse" style={{animationDelay: '0.3s'}}>✦</span>
                <span className="text-yellow-200 text-xs animate-pulse" style={{animationDelay: '0.6s'}}>✦</span>
              </div>
            </button>
            <span className={`text-sm font-medium transition-colors ${darkMode ? 'text-yellow-400' : 'text-gray-400'}`}>
              {t.dark}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

