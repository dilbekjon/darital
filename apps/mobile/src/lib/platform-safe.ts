/**
 * Safe Platform utilities that handle cases where Platform might not be initialized
 * Use this instead of directly importing Platform in module-level code
 */

let PlatformCache: { OS: string; Version: number | string } | null = null;

/**
 * Safely get Platform.OS
 * Returns 'unknown' if Platform is not yet initialized
 */
export function getPlatformOS(): string {
  if (PlatformCache) {
    return PlatformCache.OS;
  }

  try {
    const { Platform } = require('react-native');
    if (Platform && Platform.OS) {
      PlatformCache = { OS: Platform.OS, Version: Platform.Version };
      return Platform.OS;
    }
  } catch (error) {
    console.warn('[Platform] Platform not yet initialized, returning "unknown"');
  }

  return 'unknown';
}

/**
 * Safely get Platform.Version
 * Returns 0 if Platform is not yet initialized
 */
export function getPlatformVersion(): number | string {
  if (PlatformCache) {
    return PlatformCache.Version;
  }

  try {
    const { Platform } = require('react-native');
    if (Platform && Platform.Version) {
      PlatformCache = { OS: Platform.OS, Version: Platform.Version };
      return Platform.Version;
    }
  } catch (error) {
    console.warn('[Platform] Platform not yet initialized, returning 0');
  }

  return 0;
}

/**
 * Check if platform is iOS
 */
export function isIOS(): boolean {
  return getPlatformOS() === 'ios';
}

/**
 * Check if platform is Android
 */
export function isAndroid(): boolean {
  return getPlatformOS() === 'android';
}

/**
 * Get Platform object (use only in components/hooks, not at module level)
 */
export function getPlatform() {
  try {
    const { Platform } = require('react-native');
    return Platform;
  } catch (error) {
    console.warn('[Platform] Platform not available');
    return null;
  }
}

