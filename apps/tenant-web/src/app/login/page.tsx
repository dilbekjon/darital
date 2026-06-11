'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ApiError, tenantLoginRequestCode, tenantLoginStatus, tenantLoginVerify } from '@/lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useUntypedTranslations } from '../../i18n/useUntypedTranslations'
import { useTheme } from '../../contexts/ThemeContext'
import { Language, languageNames, languageFlags } from '../../lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [smsTarget, setSmsTarget] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const { language, setLanguage } = useLanguage()
  const t = useUntypedTranslations()
  const { darkMode, toggleTheme } = useTheme()

  const UZ_COUNTRY_CODE = '998'
  const extractUzLocalDigits = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const withoutCc = digits.startsWith(UZ_COUNTRY_CODE) ? digits.slice(UZ_COUNTRY_CODE.length) : digits
    return withoutCc.slice(0, 9)
  }

  const formatUzPhone = (value: string) => {
    const local = extractUzLocalDigits(value)
    const a = local.slice(0, 2)
    const b = local.slice(2, 5)
    const c = local.slice(5, 7)
    const d = local.slice(7, 9)

    let out = `+${UZ_COUNTRY_CODE}`
    if (a.length > 0) out += ` (${a}`
    if (a.length === 2) out += ')'
    if (b.length > 0) out += ` ${b}`
    if (c.length > 0) out += `-${c}`
    if (d.length > 0) out += `-${d}`
    return out
  }

  const normalizeUzPhone = (value: string) => {
    const local = extractUzLocalDigits(value)
    return local.length ? `+${UZ_COUNTRY_CODE}${local}` : ''
  }

  const resetFlow = () => {
    setStep('phone')
    setCode('')
    setSmsTarget(null)
    setError('')
  }

  const resendCode = async () => {
    const trimmedPhone = normalizeUzPhone(phone.trim())
    if (!trimmedPhone) {
      setError('Telefon raqam kiritilishi shart')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const res = await tenantLoginRequestCode(trimmedPhone)
      setSmsTarget(res.smsTarget || null)
      setError(`Tasdiqlash kodi ${res.smsTarget || 'raqamingizga'} qayta yuborildi. 4 xonali kodni kiriting.`)
    } catch (err) {
      console.error('Resend code error:', err)
      if (err instanceof ApiError) setError(err.data?.message || err.message)
      else setError('Kod yuborishda xatolik')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const trimmedPhone = normalizeUzPhone(phone.trim())
      
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

        const res = await tenantLoginRequestCode(trimmedPhone)
        setSmsTarget(res.smsTarget || status.smsTarget || null)
        setStep('code')
        setError('')
        setIsLoading(false)
        return
      }

      if (step === 'code') {
        const trimmedCode = code.trim()
        if (!/^\d{4}$/.test(trimmedCode)) {
          setError('Kod 4 xonali raqam bo‘lishi kerak')
          setIsLoading(false)
          return
        }

        const data = await tenantLoginVerify(trimmedPhone, trimmedCode)
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
                onChange={(e) => setPhone(formatUzPhone(e.target.value))}
                required
                inputMode="tel"
                autoComplete="tel"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                  darkMode
                    ? 'bg-gray-800/50 border-yellow-500/40 text-white placeholder-gray-500 focus:border-yellow-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'
                }`}
                placeholder="+998 (90) 123-45-67"
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

            {step === 'code' && (
              <div>
                <p className={`mb-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  📩 4 xonali tasdiqlash kodi {smsTarget || 'kontakt raqamingizga'} SMS orqali yuborildi.
                </p>
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
                  placeholder="1234" maxLength={4} inputMode="numeric"
                  disabled={isLoading}
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={isLoading}
                    className={`text-sm font-medium underline transition-colors ${
                      darkMode ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Kodni qayta yuborish
                  </button>
                </div>
              </div>
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
                  ? 'SMS kod olish'
                  : 'Kirish'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
