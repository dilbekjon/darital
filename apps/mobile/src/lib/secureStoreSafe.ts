import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const FALLBACK_PREFIX = 'darital_secure_';

const isWeb = Platform.OS === 'web';

let useFallback: boolean | null = isWeb ? true : null;

async function ensureAvailability(): Promise<boolean> {
  if (useFallback === true) return true;
  if (useFallback === false) return false;
  try {
    await SecureStore.getItemAsync('__probe__');
    useFallback = false;
    return false;
  } catch {
    useFallback = true;
    return true;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb || (await ensureAvailability())) {
    return AsyncStorage.getItem(FALLBACK_PREFIX + key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb || (await ensureAvailability())) {
    await AsyncStorage.setItem(FALLBACK_PREFIX + key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb || (await ensureAvailability())) {
    await AsyncStorage.removeItem(FALLBACK_PREFIX + key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
