'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { login, getMe, ApiError } from '@/lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useUntypedTranslations } from '../../i18n/useUntypedTranslations'
import { useTheme } from '../../contexts/ThemeContext'
import { Language, languageNames, languageFlags } from '../../lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const { language, setLanguage } = useLanguage()
  const t = useUntypedTranslations()
  const { darkMode, toggleTheme } = useTheme()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Trim email and password to avoid whitespace issues
      const trimmedEmail = email.trim()
      const trimmedPassword = password.trim()
      
      if (!trimmedEmail || !trimmedPassword) {
        setError('Email and password are required')
        setIsLoading(false)
        return
      }
      
      console.log('Attempting login with email:', trimmedEmail)
      const data = await login(trimmedEmail, trimmedPassword)
      console.log('Login successful, token received')
      
      // Save token to localStorage
      localStorage.setItem('accessToken', data.accessToken)

      // Get user info to determine role
      try {
        console.log('Fetching user info...')
        const user = await getMe()
        console.log('User info received:', user)
        
        // Redirect based on role
        // Check for tenant role (can be 'TENANT_USER' enum or 'TENANT' string for backward compatibility)
        if (user.role === 'TENANT_USER' || user.role === 'TENANT') {
          router.push('/tenant')
        } else {
          router.push('/dashboard')
        }
      } catch (meError) {
        console.error('Error fetching user info:', meError)
        // If getMe fails, still try to redirect (token is valid)
        // But show a warning
        if (meError instanceof ApiError) {
          setError(`Login successful but failed to fetch user info: ${meError.message}. Redirecting anyway...`)
          setTimeout(() => router.push('/dashboard'), 2000)
        } else {
          setError('Login successful but failed to fetch user info. Redirecting...')
          setTimeout(() => router.push('/dashboard'), 2000)
        }
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      if (err instanceof ApiError) {
        const errorMessage = err.data?.message || err.message || 'Invalid email or password'
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
              <label htmlFor="email" className={`block text-sm font-semibold mb-2 ${
                darkMode ? 'text-yellow-400' : 'text-gray-700'
              }`}>
                {t.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                  darkMode
                    ? 'bg-gray-800/50 border-yellow-500/40 text-white placeholder-gray-500 focus:border-yellow-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'
                }`}
                placeholder="admin@darital.local"
                disabled={isLoading}
              />
            </div>

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
                  required
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

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-bold py-3 px-4 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                darkMode
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black focus:ring-yellow-500 shadow-lg shadow-yellow-500/50'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white focus:ring-blue-500 shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
            >
              {isLoading ? t.loading : t.login}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
