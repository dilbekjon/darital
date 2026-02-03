import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../lib/i18n';
import { setPasscode, setBiometricEnabled, setEncryptedToken } from '../state/authStore';
import { isBiometricAvailable, getBiometricType } from '../security/biometricAuth';

interface SetPasscodeScreenProps {
  visible: boolean;
  onComplete: () => void;
  authToken: string; // Token from successful login
  userId?: string; // Optional user identifier
}

/**
 * SetPasscodeScreen - Forced passcode creation after successful login.
 * 
 * Flow:
 * 1. User enters new passcode (4 digits)
 * 2. User confirms passcode
 * 3. Passcode is stored in SecureStore
 * 4. If biometric available, offer to enable it
 * 5. If enabled, store encrypted token for auto-login
 * 6. Call onComplete() to continue to app
 * 
 * This screen cannot be dismissed until passcode is set.
 */
export default function SetPasscodeScreen({
  visible,
  onComplete,
  authToken,
  userId,
}: SetPasscodeScreenProps) {
  const [step, setStep] = useState<'enter' | 'confirm' | 'biometric'>('enter');
  const [passcode, setPasscodeValue] = useState('');
  const [confirmPasscode, setConfirmPasscodeValue] = useState('');
  const [firstPasscode, setFirstPasscode] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [biometricType, setBiometricType] = useState('Face ID');
  
  const { darkMode } = useTheme();

  // Load biometric type when component mounts
  useEffect(() => {
    const loadBiometricType = async () => {
      const type = await getBiometricType();
      setBiometricType(type);
    };
    loadBiometricType();
  }, []);

  const handleNumberPress = async (num: string) => {
    if (isProcessing) return;

    if (step === 'enter') {
      if (passcode.length < 4) {
        const newPasscode = passcode + num;
        setPasscodeValue(newPasscode);
        setError('');

        // When 4 digits entered, move to confirm step
        if (newPasscode.length === 4) {
          setFirstPasscode(newPasscode);
          setPasscodeValue('');
          setStep('confirm');
        }
      }
    } else if (step === 'confirm') {
      if (confirmPasscode.length < 4) {
        const newPasscode = confirmPasscode + num;
        setConfirmPasscodeValue(newPasscode);
        setError('');

        // When 4 digits entered, validate match
        if (newPasscode.length === 4) {
          if (newPasscode === firstPasscode) {
            // Success! Save passcode
            await savePasscode(newPasscode);
          } else {
            // Mismatch - restart
            Vibration.vibrate(500);
            setError(t.passcodeMismatch);
            setTimeout(() => {
              setPasscodeValue('');
              setConfirmPasscodeValue('');
              setFirstPasscode('');
              setStep('enter');
              setError('');
            }, 1500);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (isProcessing) return;
    
    if (step === 'enter') {
      setPasscodeValue(passcode.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPasscodeValue(confirmPasscode.slice(0, -1));
    }
    setError('');
  };

  const savePasscode = async (code: string) => {
    try {
      setIsProcessing(true);

      console.log('💾 Saving passcode to SecureStore...');
      await setPasscode(code, userId);
      console.log('✅ Passcode saved successfully');

      // Check if biometric is available
      const biometricAvailable = await isBiometricAvailable();
      
      if (biometricAvailable) {
        // Offer to enable biometric
        setStep('biometric');
      } else {
        // No biometric, just complete
        console.log('⚠️ Biometric not available, skipping biometric setup');
        onComplete();
      }
    } catch (error: any) {
      console.error('❌ Error saving passcode:', error);
      Alert.alert('Error', 'Failed to save passcode. Please try again.');
      // Reset to start
      setPasscodeValue('');
      setConfirmPasscodeValue('');
      setFirstPasscode('');
      setStep('enter');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      setIsProcessing(true);
      
      console.log(`✅ Enabling ${biometricType} for auto-login...`);

      // Enable biometric setting
      await setBiometricEnabled(true);
      
      // Store encrypted token for biometric auto-login
      await setEncryptedToken(authToken);
      
      console.log('✅ Biometric enabled successfully');
      Alert.alert(
        'Success',
        `${biometricType} enabled! You can now unlock Darital with ${biometricType} on next launch.`,
        [{ text: 'OK', onPress: onComplete }]
      );
    } catch (error: any) {
      console.error('❌ Error enabling biometric:', error);
      Alert.alert(t.error, t.biometricsNotAvailable);
      onComplete();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipBiometric = () => {
    console.log('⏭️ User skipped biometric setup');
    onComplete();
  };

  const renderDots = () => {
    const currentPasscode = step === 'enter' ? passcode : confirmPasscode;
    
    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i < currentPasscode.length
                    ? darkMode
                      ? '#FBBF24'
                      : '#3B82F6'
                    : 'transparent',
                borderColor: darkMode ? '#FBBF24' : '#3B82F6',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    return (
      <View style={styles.keypad}>
        {numbers.map((num) => (
          <TouchableOpacity
            key={num}
            style={[
              styles.key,
              {
                backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: darkMode ? 'rgba(251, 191, 36, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              },
            ]}
            onPress={() => handleNumberPress(num)}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            <Text
              style={[
                styles.keyText,
                { color: darkMode ? '#F3F4F6' : '#1F2937' },
              ]}
            >
              {num}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          <View style={styles.key} />

          <TouchableOpacity
            style={[
              styles.key,
              {
                backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: darkMode ? 'rgba(251, 191, 36, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              },
            ]}
            onPress={() => handleNumberPress('0')}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            <Text
              style={[
                styles.keyText,
                { color: darkMode ? '#F3F4F6' : '#1F2937' },
              ]}
            >
              0
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.key,
              styles.deleteKey,
              {
                backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                borderColor: darkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
              },
            ]}
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            <MaterialCommunityIcons
              name="backspace-outline"
              size={30}
              color={darkMode ? '#FCA5A5' : '#EF4444'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBiometricPrompt = () => {
    return (
      <View style={styles.biometricPrompt}>
        <MaterialCommunityIcons
          name={biometricType === 'Face ID' ? 'face-recognition' : 'fingerprint'}
          size={80}
          color={darkMode ? '#FBBF24' : '#3B82F6'}
        />
        
        <Text
          style={[
            styles.biometricTitle,
            { color: darkMode ? '#FBBF24' : '#3B82F6' },
          ]}
        >
          Enable {biometricType}?
        </Text>
        
        <Text
          style={[
            styles.biometricDescription,
            { color: darkMode ? '#9CA3AF' : '#6B7280' },
          ]}
        >
          Unlock Darital quickly and securely with {biometricType} on your next visit.
        </Text>

        <View style={styles.biometricButtons}>
          <TouchableOpacity
            style={[
              styles.biometricButton,
              styles.skipButton,
              {
                backgroundColor: darkMode ? 'rgba(107, 114, 128, 0.2)' : 'rgba(229, 231, 235, 0.8)',
              },
            ]}
            onPress={handleSkipBiometric}
            disabled={isProcessing}
          >
            <Text
              style={[
                styles.buttonText,
                { color: darkMode ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              Not Now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.biometricButton,
              styles.enableButton,
              {
                backgroundColor: darkMode ? '#FBBF24' : '#3B82F6',
              },
            ]}
            onPress={handleEnableBiometric}
            disabled={isProcessing}
          >
            <Text style={styles.enableButtonText}>
              {isProcessing ? 'Enabling...' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        // Prevent dismissal - passcode is required
        Alert.alert(
          'Passcode Required',
          'You must set up a passcode to secure your account before continuing.',
          [{ text: 'OK' }]
        );
      }}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: darkMode ? '#000000' : '#F0F9FF' },
        ]}
      >
        {step === 'biometric' ? (
          renderBiometricPrompt()
        ) : (
          <View style={styles.content}>
            <MaterialCommunityIcons
              name="shield-lock"
              size={64}
              color={darkMode ? '#FBBF24' : '#3B82F6'}
              style={{ marginBottom: 24 }}
            />
            
            <Text
              style={[
                styles.title,
                { color: darkMode ? '#FBBF24' : '#3B82F6' },
              ]}
            >
              {step === 'enter' ? 'Secure Your Account' : 'Confirm Passcode'}
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: darkMode ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              {step === 'enter'
                ? 'Create a 4-digit passcode to secure your Darital account'
                : 'Enter your passcode again to confirm'}
            </Text>

            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <View style={{ height: 24 }} />
            )}

            {renderDots()}
            {renderKeypad()}

            <Text
              style={[
                styles.securityNote,
                { color: darkMode ? '#6B7280' : '#9CA3AF' },
              ]}
            >
              🔒 Your passcode is stored securely on this device only
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  error: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 50,
    marginTop: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 320,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  key: {
    width: 75,
    height: 75,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  deleteKey: {
    borderWidth: 1.5,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '400',
  },
  securityNote: {
    fontSize: 12,
    marginTop: 32,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  biometricPrompt: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  biometricTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  biometricDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  biometricButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    maxWidth: 400,
  },
  biometricButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  enableButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

