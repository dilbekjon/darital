import { getApiUrl } from '../lib/constants-fallback';
import { getToken, clearToken, clearAllAuthData } from '../state/authStore';

// Lazy load API_BASE to avoid calling getApiUrl() at module load time
function getApiBase(): string {
  return getApiUrl();
}

// Global flag to prevent infinite logout loops
let isHandling401 = false;

/**
 * Handle 401 Unauthorized responses by clearing auth and triggering logout
 */
async function handle401(): Promise<void> {
  if (isHandling401) {
    return; // Prevent infinite loops
  }
  
  isHandling401 = true;
  console.warn('🔒 [API Client] Received 401 Unauthorized - clearing auth data');
  
  try {
    await clearAllAuthData();
    // Note: Navigation to login screen should be handled by the app's auth state management
    // The App.tsx component will detect missing token and show login screen
  } catch (error) {
    console.error('❌ [API Client] Error clearing auth data:', error);
  } finally {
    isHandling401 = false;
  }
}

/**
 * Centralized API request handler with JWT attachment and 401 handling
 */
async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  
  // Build headers
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Make request
  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers,
    });
  } catch (error: any) {
    throw new Error(`Network error: ${error?.message || 'Failed to fetch'}`);
  }
  
  // Handle 401 Unauthorized
  if (res.status === 401) {
    await handle401();
    throw new Error('Unauthorized - Please log in again');
  }
  
  return res;
}

/** Error with HTTP status for callers to handle 4xx/5xx */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Parse JSON response with error handling
 */
async function parseJsonResponse(res: Response): Promise<any> {
  if (!res.ok) {
    let errorMessage = `API error ${res.status}`;
    let code: string | undefined;
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorMessage;
        code = errorData.code;
      } else {
        const text = await res.text();
        if (text) errorMessage = text;
      }
    } catch {
      // Ignore JSON parsing errors, use default message
    }
    throw new ApiError(errorMessage, res.status, code);
  }

  try {
    return await res.json();
  } catch (error: any) {
    throw new Error(`Failed to parse response: ${error?.message || 'Invalid JSON'}`);
  }
}

/**
 * GET request
 */
export async function apiGet(path: string): Promise<any> {
  const res = await apiRequest(path, { method: 'GET' });
  return parseJsonResponse(res);
}

/**
 * POST request
 */
export async function apiPost(path: string, body: any): Promise<any> {
  const res = await apiRequest(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJsonResponse(res);
}

/**
 * PATCH request
 */
export async function apiPatch(path: string, body: any): Promise<any> {
  const res = await apiRequest(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJsonResponse(res);
}

/**
 * DELETE request
 */
export async function apiDelete(path: string): Promise<any> {
  const res = await apiRequest(path, { method: 'DELETE' });
  return parseJsonResponse(res);
}

/**
 * Login request (doesn't require auth token)
 */
export async function loginRequest(email: string, password: string): Promise<{ accessToken: string }> {
  const apiBase = getApiBase();
  let res: Response;
  
  try {
    res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (error: any) {
    throw new Error(`Network error: ${error?.message || 'Failed to connect to server'}`);
  }
  
  if (!res.ok) {
    let errorMessage = 'Bad credentials';
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorMessage;
      }
    } catch {
      // Ignore JSON parsing errors
    }
    throw new Error(errorMessage);
  }
  
  try {
    return await res.json(); // { accessToken }
  } catch (error: any) {
    throw new Error(`Failed to parse response: ${error?.message || 'Invalid JSON'}`);
  }
}

/**
 * Get tenant's notification feed
 * Returns recent notifications (reminders, alerts)
 */
export async function getNotificationsFeed() {
  return apiGet('/tenant/notifications/feed');
}
