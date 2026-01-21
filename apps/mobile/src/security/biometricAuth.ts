import * as LocalAuthentication from 'expo-local-authentication';
// Platform is imported lazily inside functions to avoid early access

/**
 * Check if biometric hardware is available AND user has enrolled biometrics.
 * 
 * @returns true if device supports biometrics and user has enrolled Face ID/Touch ID
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      console.log('⚠️ No biometric hardware detected');
      return false;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      console.log('⚠️ No biometric enrolled (user needs to set up Face ID/Touch ID)');
      return false;
    }

    console.log('✅ Biometric hardware available and enrolled');
    return true;
  } catch (error) {
    console.log('❌ Error checking biometric availability:', error);
    return false;
  }
}

/**
 * Get the type of biometric authentication available on the device.
 * 
 * @returns 'Face ID', 'Touch ID', 'Iris', or 'Biometric'
 */
export async function getBiometricType(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    
    return 'Biometric';
  } catch {
    return 'Biometric';
  }
}

/**
 * Attempt biometric authentication WITHOUT falling back to device passcode.
 * 
 * CRITICAL: This function uses disableDeviceFallback: true to prevent the OS
 * from prompting for device PIN/passcode if biometric fails.
 * 
 * If biometric fails, the app will handle it by showing Login screen,
 * NOT by asking for device passcode.
 * 
 * @param automatic - If true, shows "Unlock" message; if false, shows "Verify" message
 * @returns 'success' | 'failed' | 'unavailable'
 */
export async function attemptBiometricUnlock(
  automatic = false
): Promise<'success' | 'failed' | 'unavailable'> {
  try {
    // First check if biometric is available
    const available = await isBiometricAvailable();
    if (!available) {
      return 'unavailable';
    }

    const biometricType = await getBiometricType();

    // Different prompts for automatic cold start vs manual retry
    const promptMessage = automatic
      ? `Unlock Darital with ${biometricType}`
      : `Verify your identity with ${biometricType}`;

    console.log(`🔐 Attempting ${biometricType} authentication (automatic: ${automatic})...`);

    // CRITICAL: Use disableDeviceFallback: true to prevent OS from asking for device passcode
    // Note: On iOS, this is supported natively.
    // On Android, fallbackEnabled: false achieves the same.
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      // PREVENT DEVICE PASSCODE FALLBACK
      disableDeviceFallback: true, // iOS and newer Android
      fallbackLabel: '', // Empty to hide fallback button
      cancelLabel: 'Cancel',
      // Note: fallbackEnabled:false prevents the OS from asking the device passcode.
      // If unsupported on some Android versions, the biometric will simply fail
      // and we'll treat it as 'failed', showing Login screen instead.
    });

    if (result.success) {
      console.log(`✅ ${biometricType} authentication successful!`);
      return 'success';
    } else {
      // User cancelled or biometric failed
      console.log(`❌ ${biometricType} authentication failed or cancelled`);
      return 'failed';
    }
  } catch (error: any) {
    // Handle errors gracefully
    console.log('❌ Biometric authentication error:', error.message || error);
    
    // Treat any error as 'failed', which will show Login screen
    // This ensures we never accidentally trigger device passcode prompt
    return 'failed';
  }
}

/**
 * Check if device supports biometric authentication at all (hardware check only).
 * This is less strict than isBiometricAvailable() - doesn't check enrollment.
 * 
 * @returns true if hardware exists
 */
export async function checkBiometricHardware(): Promise<boolean> {
  try {
    return await LocalAuthentication.hasHardwareAsync();
  } catch {
    return false;
  }
}

/**
 * Check if user has enrolled any biometric (Face ID, Touch ID, etc.)
 * 
 * @returns true if at least one biometric is enrolled
 */
export async function checkBiometricEnrollment(): Promise<boolean> {
  try {
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

/**
 * Legacy function for backward compatibility.
 * Prefer using isBiometricAvailable() for new code.
 */
export async function checkBiometricAvailable(): Promise<boolean> {
  return isBiometricAvailable();
}
