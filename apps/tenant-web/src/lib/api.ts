const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export function getSocketBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl || apiUrl === 'http' || apiUrl === 'https') return 'http://localhost:3001'
  try {
    const url = new URL(apiUrl)
    return url.origin
  } catch {
    return 'http://localhost:3001'
  }
}

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  // Use the Headers API to avoid index signature issues on HeadersInit
  const headers = new Headers(options.headers as HeadersInit)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch (error: any) {
    throw new ApiError(0, `Network error: ${error?.message || 'Failed to fetch'}`, null)
  }

  let data: any;
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : { message: 'Request failed' };
    }
  } catch (error: any) {
    // If JSON parsing fails, create a default error object
    data = { message: `Failed to parse response: ${error?.message || 'Invalid JSON'}` };
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Handle 401 by clearing token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
      }
      throw new ApiError(401, 'Unauthorized', data)
    }
    throw new ApiError(response.status, data.message || 'Request failed', data)
  }

  return data
}

// Fetch API for tenant portal (alias for fetchApi, uses accessToken)
export async function fetchTenantApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return fetchApi<T>(endpoint, options);
}

export interface LoginResponse {
  accessToken: string
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: string; // This will now be AdminRole from backend
  permissions: string[]; // Added permissions list
}

export async function login(loginId: string, password: string): Promise<LoginResponse> {
  return fetchApi<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginId, password }),
  });
}

export async function getMe(): Promise<UserResponse> {
  return fetchApi<UserResponse>('/auth/me'); // Endpoint changed from /me to /auth/me for consistency
}

export { ApiError }

