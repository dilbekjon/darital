/**
 * Authentication utility functions with token expiration management
 */

const TOKEN_KEY = 'accessToken'
const TOKEN_EXPIRY_KEY = 'tokenExpiry'
const DEFAULT_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * Save token with expiration time
 * @param token - JWT access token
 * @param expiresInDays - Optional expiration in days (default: 7 days)
 */
export function saveToken(token: string, expiresInDays: number = 7): void {
  if (typeof window === 'undefined') return

  const expiryTime = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)
  
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
}

/**
 * Get token if it exists and is not expired
 * @returns Token string or null if expired/missing
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem(TOKEN_KEY)
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY)

  if (!token || !expiryTime) {
    return null
  }

  // Check if token is expired
  const now = Date.now()
  const expiry = parseInt(expiryTime, 10)

  if (now >= expiry) {
    // Token expired, clear it
    clearToken()
    return null
  }

  return token
}

/**
 * Check if token exists and is valid (not expired)
 */
export function isTokenValid(): boolean {
  return getToken() !== null
}

/**
 * Get token expiration time
 */
export function getTokenExpiry(): Date | null {
  if (typeof window === 'undefined') return null

  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (!expiryTime) return null

  return new Date(parseInt(expiryTime, 10))
}

/**
 * Get remaining time until token expires (in milliseconds)
 */
export function getTokenTimeRemaining(): number | null {
  if (typeof window === 'undefined') return null

  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (!expiryTime) return null

  const expiry = parseInt(expiryTime, 10)
  const remaining = expiry - Date.now()

  return remaining > 0 ? remaining : 0
}

/**
 * Clear token and expiry from localStorage
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return isTokenValid()
}

