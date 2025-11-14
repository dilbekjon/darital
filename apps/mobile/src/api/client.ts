import Constants from 'expo-constants';
import { getToken } from '../state/authStore';

// Try environment variable first, then fall back to app.json extra config, then hardcoded default
const API_BASE = 
  process.env.EXPO_PUBLIC_API_URL || 
  Constants.expoConfig?.extra?.apiUrl || 
  'http://localhost:3001/api';

export async function apiGet(path: string) {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
  } catch (error: any) {
    throw new Error(`Network error: ${error?.message || 'Failed to fetch'}`);
  }
  
  if (!res.ok) {
    let errorMessage = `API error ${res.status}`;
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
    return await res.json();
  } catch (error: any) {
    throw new Error(`Failed to parse response: ${error?.message || 'Invalid JSON'}`);
  }
}

export async function loginRequest(email: string, password: string) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
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
