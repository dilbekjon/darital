'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { login, getMe, ApiError, tenantLoginRequestCode, tenantLoginSetPassword, tenantLoginStatus } from '@/lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useUntypedTranslations } from '../../i18n/useUntypedTranslations'
import { useTheme } from '../../contexts/ThemeContext'
import { Language, languageNames, languageFlags } from '../../lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [step, setStep] = useState<'phone' | 'password' | 'code' | 'set_password'>('phone')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const { language, setLanguage } = useLanguage()
  const t = useUntypedTranslations()
  const { darkMode, toggleTheme } = useTheme()

  const resetFlow = () => {
    setStep('phone')
    setPassword('')
    setCode('')
    setNewPassword('')
    setConfirmNewPassword('')
    setShowPassword(false)
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const trimmedPhone = phone.trim()
      
      if (!trimmedPhone) {
        setError('Telefon raqam kiritilishi shart')
        setIsLoading(false)
        return
      }

      if (step === 'phone') {
        const status = await tenantLoginStatus(trimmedPhone)
        if (!status.exists) {
          setError('Bu telefon raqam bo‘yicha tenant topilmadi')
          setIsLoading(false)
          return
        }

        if (status.passwordSet) {
          setStep('password')
          setIsLoading(false)
          return
        }

        await tenantLoginRequestCode(trimmedPhone)
        setStep('code')
        setError('Tasdiqlash kodi SMS orqali yuborildi. 8 xonali kodni kiriting.')
        setIsLoading(false)
        return
      }

      if (step === 'password') {
        const trimmedPassword = password.trim()
        if (!trimmedPassword) {
          setError('Parol kiritilishi shart')
          setIsLoading(false)
          return
        }

        const data = await login(trimmedPhone, trimmedPassword)
        localStorage.setItem('accessToken', data.accessToken)
        const user = await getMe()
        if (user.role === 'TENANT_USER' || user.role === 'TENANT') {
          router.push('/tenant')
        } else {
          router.push('/dashboard')
        }
        return
      }

      if (step === 'code') {
        const trimmedCode = code.trim()
        if (!/^\d{8}$/.test(trimmedCode)) {
          setError('Kod 8 xonali raqam bo‘lishi kerak')
          setIsLoading(false)
          return
        }
        setStep('set_password')
        setIsLoading(false)
        return
      }

      if (step === 'set_password') {
        const trimmedCode = code.trim()
        const trimmedNewPassword = newPassword.trim()
        const trimmedConfirm = confirmNewPassword.trim()

        if (!/^\d{8}$/.test(trimmedCode)) {
          setError('Kod 8 xonali raqam bo‘lishi kerak')
          setIsLoading(false)
          return
        }
        if (trimmedNewPassword.length < 6) {
          setError('Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak')
          setIsLoading(false)
          return
        }
        if (trimmedNewPassword !== trimmedConfirm) {
          setError('Parollar mos emas')
          setIsLoading(false)
          return
        }

        await tenantLoginSetPassword(trimmedPhone, trimmedCode, trimmedNewPassword)

        const data = await login(trimmedPhone, trimmedNewPassword)
        localStorage.setItem('accessToken', data.accessToken)
        router.push('/tenant')
        return
      }
    } catch (err) {
      console.error('Login error:', err)
      if (err instanceof ApiError) {
        const errorMessage = err.data?.message || err.message || (t.invalidCredentials || 'Noto\'g\'ri telefon yoki parol')
        console.error('API Error:', err.status, errorMessage, err.data)
        setError(errorMessage)
      } else {
        console.error('Unknown error:', err)
        setError(`Cannot connect to API: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 flex items-center justify-center px-4 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      {/* Removed page-specific top bar; GlobalHeader handles language/theme */}

      {/* Login Card */}
      <div className="max-w-md w-full mt-16">
        <div className={`rounded-2xl p-8 shadow-2xl border-2 transition-all duration-300 ${
          darkMode
            ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-yellow-500/40'
            : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={`text-4xl font-bold mb-2 ${
              darkMode
                ? 'text-white drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                : 'bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent'
            }`}
            style={darkMode ? {
              textShadow: '0 0 20px rgba(234, 179, 8, 0.3)',
              WebkitTextStroke: '1px rgba(234, 179, 8, 0.3)'
            } : {}}>
              {darkMode && '✨ '}Darital
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {t.login}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className={`mb-6 px-4 py-3 rounded-xl border-2 ${
              darkMode
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-yellow-400' : 'text-gray-700'
              }`}>
                {t.phone || 'Telefon raqam'}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                  darkMode
                    ? 'bg-gray-800/50 border-yellow-500/40 text-white placeholder-gray-500 focus:border-yellow-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'
                }`}
                placeholder="998901234567"
                disabled={isLoading || step !== 'phone'}
              />
              {step !== 'phone' && (
                <button
                  type="button"
                  onClick={resetFlow}
                  disabled={isLoading}
                  className={`mt-2 text-sm font-medium underline transition-colors ${
                    darkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-blue-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Telefon raqamni o‘zgartirish
                </button>
              )}
            </div>

            {step === 'password' && (
              <div>
              <label htmlFor="password" className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-yellow-400' : 'text-gray-700'
              }`}>
                {t.password}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={step === 'password'}
                  minLength={6}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-800/50 border-yellow-500/40 text-white placeholder-gray-500 focus:border-yellow-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
                    darkMode ? 'text-gray-400 hover:text-yellow-400' : 'text-gray-500 hover:text-blue-600'
                  }`}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              </div>
            )}

            {step === 'code' && (
              <div>
                <label htmlFor="code" className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-yellow-400' : 'text-gray-700'
                }`}>
                  Tasdiqlash kodi
                </label>
                <input
                  id="code"
                  type="tel"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-800/50 border-yellow-500/40 text-white placeholder-gray-500 focus:border-yellow-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'
                  }`}
                  placeholder="12345678"
                  disabled={isLoading}
                />
              </div>
            )}

            {step === 'set_password' && (
              <>
                <div>
                  <label htmlFor="newPassword" className={`block text-sm font-semibold mb-2 ${
                    darkMode ? 'text-yellow-400' : 'text-gray-700'
                  }`}>
                    Yangi parol
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                      darkMode
                        ? 'bg-gray-800/50 border-yellow-500/40 text-white placeholder-gray-500 focus:border-yellow-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="confirmNewPassword" className={`block text-sm font-semibold mb-2 ${
                    darkMode ? 'text-yellow-400' : 'text-gray-700'
                  }`}>
                    Yangi parolni tasdiqlang
                  </label>
                  <input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                      darkMode
                        ? 'bg-gray-800/50 border-yellow-500/40 text-white placeholder-gray-500 focus:border-yellow-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-bold py-3 px-4 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                darkMode
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black focus:ring-yellow-500 shadow-lg shadow-yellow-500/50'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white focus:ring-blue-500 shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
            >
              {isLoading
                ? t.loading
                : step === 'phone'
                  ? 'Davom etish'
                  : step === 'password'
                    ? t.login
                    : step === 'code'
                      ? 'Kod tekshirish'
                      : 'Parolni o‘rnatish'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
