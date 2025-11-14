import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Keys for AsyncStorage (non-sensitive data)
const TOKEN_KEY = 'accessToken';
const USER_DATA_KEY = 'userData';

// Keys for SecureStore (sensitive data)
// Note: SecureStore keys are scoped per-device, not per-user.
// For multi-user support, use userId in key name.
const PASSCODE_KEY_PREFIX = 'darital_passcode_';
const BIOMETRIC_ENABLED_KEY = 'darital_biometric_enabled';
const ENCRYPTED_TOKEN_KEY = 'darital_encrypted_token';

/**
 * Sanitize a string to be a valid SecureStore key.
 * SecureStore keys must contain only alphanumeric characters, ".", "-", and "_".
 * 
 * This function converts emails and other identifiers to valid keys by:
 * - Replacing @ with _at_
 * - Replacing other invalid chars with _
 * - Ensuring key is not empty
 * 
 * @param input - Raw input string (e.g., email address)
 * @returns Valid SecureStore key
 */
function sanitizeSecureStoreKey(input: string | undefined): string {
  if (!input || input.trim() === '') {
    return 'default';
  }
  
  // Replace @ with _at_, and any other invalid characters with _
  return input
    .trim()
    .replace(/@/g, '_at_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100); // Limit length to be safe
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ============================================
// SECURE PASSCODE MANAGEMENT (SecureStore)
// ============================================

/**
 * Store user's local passcode securely using expo-secure-store.
 * Never stores in plaintext AsyncStorage.
 * 
 * @param passcode - 4-6 digit passcode
 * @param userId - Optional user identifier (use email or user ID)
 */
export async function setPasscode(passcode: string, userId?: string): Promise<void> {
  const sanitizedUserId = sanitizeSecureStoreKey(userId);
  const key = `${PASSCODE_KEY_PREFIX}${sanitizedUserId}`;
  await SecureStore.setItemAsync(key, passcode);
}

/**
 * Retrieve stored passcode from SecureStore.
 * Returns null if no passcode is set.
 */
export async function getPasscode(userId?: string): Promise<string | null> {
  const sanitizedUserId = sanitizeSecureStoreKey(userId);
  const key = `${PASSCODE_KEY_PREFIX}${sanitizedUserId}`;
  return await SecureStore.getItemAsync(key);
}

/**
 * Clear stored passcode from SecureStore.
 */
export async function clearPasscode(userId?: string): Promise<void> {
  const sanitizedUserId = sanitizeSecureStoreKey(userId);
  const key = `${PASSCODE_KEY_PREFIX}${sanitizedUserId}`;
  await SecureStore.deleteItemAsync(key);
}

/**
 * Check if user has a passcode set.
 */
export async function hasPasscode(userId?: string): Promise<boolean> {
  const passcode = await getPasscode(userId);
  return passcode !== null;
}

// ============================================
// BIOMETRIC SETTINGS (SecureStore)
// ============================================

/**
 * Enable or disable biometric authentication.
 * Stores preference in SecureStore.
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Check if user has enabled biometric authentication.
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

/**
 * Clear biometric setting.
 */
export async function clearBiometricEnabled(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

// ============================================
// ENCRYPTED TOKEN FOR BIOMETRIC AUTO-LOGIN
// ============================================

/**
 * Store an encrypted refresh token for biometric auto-login.
 * 
 * Security note: We store the actual auth token encrypted in SecureStore.
 * When biometric succeeds, we decrypt and restore the session.
 * This is more secure than storing password.
 * 
 * @param token - Auth token to encrypt and store
 */
export async function setEncryptedToken(token: string): Promise<void> {
  // expo-secure-store automatically encrypts data on device
  await SecureStore.setItemAsync(ENCRYPTED_TOKEN_KEY, token);
}

/**
 * Retrieve encrypted token after biometric success.
 */
export async function getEncryptedToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ENCRYPTED_TOKEN_KEY);
}

/**
 * Clear encrypted token.
 */
export async function clearEncryptedToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ENCRYPTED_TOKEN_KEY);
}

// ============================================
// USER DATA (Non-sensitive - AsyncStorage)
// ============================================

export async function setUserData(email: string, rememberMe: boolean): Promise<void> {
  if (rememberMe) {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify({ email }));
  }
}

export async function getUserData(): Promise<{ email: string } | null> {
  const data = await AsyncStorage.getItem(USER_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearUserData(): Promise<void> {
  await AsyncStorage.removeItem(USER_DATA_KEY);
}

// ============================================
// FULL LOGOUT (Clear everything)
// ============================================

/**
 * Complete logout: clear all auth data, tokens, passcodes, biometric settings.
 */
export async function clearAllAuthData(userId?: string): Promise<void> {
  await clearToken();
  await clearPasscode(userId);
  await clearBiometricEnabled();
  await clearEncryptedToken();
  await clearUserData();
}
