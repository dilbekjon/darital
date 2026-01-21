import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getApiUrl } from './constants-fallback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '../api/client';

const NOTIFICATIONS_STORAGE_KEY = 'recentNotifications';
const MAX_STORED_NOTIFICATIONS = 5;

// Flag to ensure notification handler is only set once
let notificationHandlerInitialized = false;

/**
 * Initialize notification handler - call this after React Native is initialized
 * This is called lazily to avoid accessing Platform constants too early
 */
function initializeNotificationHandler() {
  if (notificationHandlerInitialized) {
    return;
  }
  
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    notificationHandlerInitialized = true;
  } catch (error) {
    console.warn('[Notifications] Failed to set notification handler:', error);
  }
}

interface StoredNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: number;
}

/**
 * Register for push notifications and get FCM token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Initialize notification handler on first use (after RN is ready)
  initializeNotificationHandler();
  
  let token: string | null = null;

  try {
    if (!Device.isDevice) {
      console.log('📱 Push notifications require a physical device or Expo Go');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Notification permission not granted');
      return null;
    }

    // Get Expo push token
    // Note: In Expo Go, this returns an Expo push token, not a raw FCM token
    // For production, build a development build or standalone app
    
    // Try to get projectId from app config, or use without it
    let tokenData;
    try {
      // Get project ID from fallback (doesn't use expo-constants)
      const { getConstantsSafe } = require('./constants-fallback');
      const constants = getConstantsSafe();
      const projectId = constants?.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        // Fallback: try without projectId (works in some Expo Go scenarios)
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
    } catch (error: any) {
      // If projectId error, try one more time without it
      if (error.message?.includes('projectId')) {
        console.log('💡 Trying without projectId...');
        tokenData = await Notifications.getExpoPushTokenAsync();
      } else {
        throw error;
      }
    }
    
    token = tokenData.data;
    console.log('✅ Push token obtained:', token.substring(0, 50) + '...');
  } catch (error: any) {
    console.log('⚠️ Failed to get push token:', error.message);
    console.log('💡 Note: Full push notification support requires a development build');
    console.log('📖 See: https://docs.expo.dev/push-notifications/overview/');
    return null;
  }

  // Configure Android notification channel
  // Lazy import Platform to avoid accessing it before RN is initialized
  try {
    const { Platform } = require('react-native');
    if (Platform && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  } catch (error) {
    console.warn('[Notifications] Could not configure Android channel:', error);
  }

  return token;
}

/**
 * Register device token with backend
 */
export async function registerDeviceWithBackend(fcmToken: string): Promise<boolean> {
  try {
    // Lazy import Platform to avoid accessing it before RN is initialized
    const { Platform } = require('react-native');
    const platform = Platform?.OS || 'unknown';
    const token = await getToken();
    
    if (!token) {
      console.log('⚠️ No auth token available, skipping device registration');
      return false;
    }
    
    // Call POST /tenant/devices/register
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenant/devices/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fcmToken,
          platform,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️ Device registration failed:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Device registered with backend:', result.message || 'Success');
    return true;
  } catch (error: any) {
    console.log('⚠️ Could not register device with backend:', error.message);
    console.log('💡 This is OK - app will work without push notifications');
    return false;
  }
}

// Helper to get token (import from authStore)
async function getToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return token;
  } catch {
    return null;
  }
}

/**
 * Save notification to local storage
 */
export async function saveNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    const existingNotifications = await getStoredNotifications();
    
    const newNotification: StoredNotification = {
      id: Date.now().toString(),
      title,
      body,
      data,
      timestamp: Date.now(),
    };

    // Add to beginning and keep only last 5
    const updatedNotifications = [newNotification, ...existingNotifications].slice(
      0,
      MAX_STORED_NOTIFICATIONS
    );

    await AsyncStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(updatedNotifications)
    );
  } catch (error) {
    console.error('Failed to save notification:', error);
  }
}

/**
 * Get stored notifications
 */
export async function getStoredNotifications(): Promise<StoredNotification[]> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get stored notifications:', error);
    return [];
  }
}

/**
 * Clear all stored notifications
 */
export async function clearStoredNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }
}

/**
 * Get notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

