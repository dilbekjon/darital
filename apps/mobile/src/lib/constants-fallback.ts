// Constants fallback - completely avoids expo-constants to prevent TurboModuleRegistry errors
// Uses only environment variables and hardcoded defaults

// NEVER import or require expo-constants here - it causes TurboModuleRegistry errors
// This module provides a safe replacement that uses only environment variables

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production' || __DEV__ === true;
}

export function getConstantsSafe() {
  // Return a safe fallback object that matches expo-constants structure
  // but doesn't actually use expo-constants
  return {
    expoConfig: {
      extra: {
        apiUrl: getApiUrl(),
      },
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined,
      },
      notification: {
        vapidPublicKey: process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || undefined,
      },
    },
  };
}

export function getApiUrl(): string {
  // Use environment variable first (most reliable and doesn't require native modules)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Development: use safe localhost default
  if (isDevelopment()) {
    const devUrl = 'http://localhost:3001/api';
    console.warn(
      '⚠️ [API Config] EXPO_PUBLIC_API_URL not set, using dev default:',
      devUrl,
      '\nSet EXPO_PUBLIC_API_URL in your .env file for production builds.'
    );
    return devUrl;
  }
  
  // Production: fail loudly if no URL configured
  const errorMsg = 
    '❌ [API Config] EXPO_PUBLIC_API_URL is required in production but not set!\n' +
    'Please set EXPO_PUBLIC_API_URL in your environment variables or .env file.\n' +
    'Example: EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api';
  
  console.error(errorMsg);
  
  // Return an obviously invalid URL so API calls fail fast
  return 'INVALID_API_URL_PLEASE_SET_EXPO_PUBLIC_API_URL';
}

