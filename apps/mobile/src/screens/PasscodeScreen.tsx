import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  Platform,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../lib/i18n';
import { attemptBiometricUnlock, checkBiometricAvailable } from '../security/biometricAuth';

interface PasscodeScreenProps {
  mode: 'setup' | 'verify';
  onSuccess: () => void;
  onSetupComplete?: (passcode: string) => void;
  storedPasscode?: string;
}

export default function PasscodeScreen({
  mode,
  onSuccess,
  onSetupComplete,
  storedPasscode,
}: PasscodeScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const { darkMode } = useTheme();

  useEffect(() => {
    const init = async () => {
      const available = await checkBiometricAvailable();
      setHasBiometrics(available);
      // Don't auto-trigger here anymore - App.tsx handles automatic unlock
      // This screen is only shown as fallback
    };
    init();
  }, []);

  const checkBiometrics = async () => {
    const available = await checkBiometricAvailable();
    setHasBiometrics(available);
  };

  const handleBiometric = async () => {
    if (!hasBiometrics) {
      Alert.alert(
        'Biometrics Not Available',
        'Face ID/Touch ID is not available on this device or not enrolled. Please use passcode.',
        [{ text: 'OK' }]
      );
      return;
    }
    // Manual trigger (not automatic), so pass false
    const result = await attemptBiometricUnlock(false);
    if (result === 'success') {
      onSuccess();
    } else if (result === 'failed') {
      // User cancelled or failed - don't show error, just stay on passcode screen
      console.log('Manual biometric attempt failed or cancelled');
    }
  };

  const handleNumberPress = (num: string) => {
    if (passcode.length < 4) {
      const newPasscode = passcode + num;
      setPasscode(newPasscode);

      if (newPasscode.length === 4) {
        if (mode === 'setup') {
          if (step === 'enter') {
            setConfirmPasscode(newPasscode);
            setStep('confirm');
            setPasscode('');
            setError('');
          } else {
            if (newPasscode === confirmPasscode) {
              onSetupComplete?.(newPasscode);
              Alert.alert('Success', t.passcodeSet);
              onSuccess();
            } else {
              Vibration.vibrate(500);
              setError(t.passcodeMismatch);
              setPasscode('');
              setTimeout(() => {
                setConfirmPasscode('');
                setStep('enter');
                setError('');
              }, 1000);
            }
          }
        } else {
          if (newPasscode === storedPasscode) {
            onSuccess();
          } else {
            Vibration.vibrate(500);
            setError(t.passcodeIncorrect);
            setPasscode('');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setPasscode(passcode.slice(0, -1));
    setError('');
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i < passcode.length
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
          {mode === 'verify' && hasBiometrics ? (
            <TouchableOpacity
              style={[
                styles.key,
                styles.iconKey,
                {
                  backgroundColor: darkMode ? 'rgba(251, 191, 36, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  borderColor: darkMode ? '#FBBF24' : '#3B82F6',
                },
              ]}
              onPress={handleBiometric}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint'}
                size={36}
                color={darkMode ? '#FBBF24' : '#3B82F6'}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.key} />
          )}

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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: darkMode ? '#000000' : '#F0F9FF' },
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: darkMode ? '#FBBF24' : '#3B82F6',
            },
          ]}
        >
          {mode === 'setup'
            ? step === 'enter'
              ? t.createPasscode
              : t.confirmPasscode
            : t.enterPasscode}
        </Text>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text
            style={[
              styles.subtitle,
              { color: darkMode ? '#9CA3AF' : '#6B7280' },
            ]}
          >
            {mode === 'setup'
              ? step === 'enter'
                ? 'Enter a 4-digit code'
                : 'Confirm your code'
              : 'Enter your passcode'}
          </Text>
        )}

        {renderDots()}
        {renderKeypad()}
      </View>
    </View>
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
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    opacity: 0.7,
  },
  error: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 40,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 50,
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
  iconKey: {
    borderWidth: 2,
  },
  deleteKey: {
    borderWidth: 1.5,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '400',
  },
});
