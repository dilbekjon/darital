'use client'

import { useState, useEffect, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from '../../contexts/ThemeContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phone, setPhone] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { darkMode } = useTheme()

  useEffect(() => {
    const p = searchParams.get('phone') || ''
    const t = searchParams.get('token') || ''
    setPhone(p)
    setToken(t)
  }, [searchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Parollar mos kelmadi')
      return
    }
    if (password.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak')
      return
    }
    if (!phone || !token) {
      setError('Link noto\'g\'ri. SMS dagi to\'liq havoladan foydalaning.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/tenant-setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: any) {
      setError(err.message || 'Parol o\'rnatishda xatolik')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`max-w-md w-full p-8 rounded-2xl text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Parol o'rnatildi</h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Endi kirish sahifasiga yo'naltirilmoqdasiz...
        </p>
      </div>
    )
  }

  return (
    <div className={`max-w-md w-full p-8 rounded-2xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <h1 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Parol o'rnating
      </h1>
      <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Darital ijara portalingiz uchun parol yarating. Kamida 6 ta belgidan foydalaning.
      </p>
      {phone && (
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Telefon: {phone}
        </p>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Yangi parol *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={`w-full px-4 py-3 rounded-xl border-2 ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="••••••••"
            disabled={loading}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Parolni tasdiqlang *
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className={`w-full px-4 py-3 rounded-xl border-2 ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="••••••••"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !phone || !token}
          className="w-full py-3 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Kutilmoqda...' : "Parolni o'rnatish"}
        </button>
      </form>
    </div>
  )
}

export default function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-black">
      <Suspense fallback={<div className="text-gray-500">Yuklanmoqda...</div>}>
        <SetupForm />
      </Suspense>
    </div>
  )
}
