'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from '../../contexts/ThemeContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

function TgLoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { darkMode } = useTheme()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token') || ''
    if (!token) {
      setError('Token topilmadi.')
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/telegram-exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Login failed')
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', data.accessToken)
        }
        if (!cancelled) router.replace('/tenant')
      } catch (e: any) {
        if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
          if (!cancelled) router.replace('/tenant')
          return
        }
        if (!cancelled) setError(e?.message || 'Login failed')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full p-6 rounded-xl shadow border ${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
        <h1 className="text-xl font-bold mb-2">Darital</h1>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Telegram orqali kiryapsiz…</p>
        )}
      </div>
    </div>
  )
}

export default function TgLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <TgLoginInner />
    </Suspense>
  )
}
