'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { isAuthenticated } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { darkMode } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check authentication on mount
    if (!loading) {
      if (!isAuthenticated() || !user) {
        router.push('/login')
        return
      }
    }
  }, [loading, user, router])

  // Show loading state while checking auth
  if (!mounted || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render (redirect will happen)
  if (!isAuthenticated() || !user) {
    return null
  }

  // Format token expiry for display
  const getTokenExpiryDisplay = () => {
    try {
      const expiryStr = localStorage.getItem('tokenExpiry')
      if (!expiryStr) return 'N/A'
      const expiry = new Date(parseInt(expiryStr, 10))
      return expiry.toLocaleString()
    } catch {
      return 'N/A'
    }
  }

  return (
    <main className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className={`mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {user.fullName || user.email}!
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Darital Admin Dashboard
            </p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* User Info Card */}
            <div className={`rounded-xl p-6 shadow-lg border-2 ${
              darkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                darkMode ? 'text-yellow-400' : 'text-gray-900'
              }`}>
                👤 Account Info
              </h2>
              <div className="space-y-3">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}>{user.email}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Role</p>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}>{user.role}</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Full Name</p>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}>{user.fullName || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Session Info Card */}
            <div className={`rounded-xl p-6 shadow-lg border-2 ${
              darkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                darkMode ? 'text-yellow-400' : 'text-gray-900'
              }`}>
                🔐 Session
              </h2>
              <div className="space-y-3">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
                  <p className="text-green-600 font-semibold">✅ Active</p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Token Expires</p>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}>{getTokenExpiryDisplay()}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className={`rounded-xl p-6 shadow-lg border-2 ${
              darkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                darkMode ? 'text-yellow-400' : 'text-gray-900'
              }`}>
                ⚡ Quick Actions
              </h2>
              <div className="space-y-2">
                <a
                  href="/dashboard"
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                  }`}
                >
                  Go to Dashboard →
                </a>
                <a
                  href="/admin/users"
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Manage Users →
                </a>
              </div>
            </div>
          </div>

          {/* Permissions Card (if user has permissions) */}
          {user.permissions && user.permissions.length > 0 && (
            <div className={`rounded-xl p-6 shadow-lg border-2 ${
              darkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                darkMode ? 'text-yellow-400' : 'text-gray-900'
              }`}>
                🔑 Permissions
              </h2>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((permission) => (
                  <span
                    key={permission}
                    className={`px-3 py-1 rounded-full text-sm ${
                      darkMode
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

