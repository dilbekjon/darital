import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { loginRequest } from '../api/client';
import { setToken, hasPasscode, setUserData } from '../state/authStore';
import { t } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { Navbar } from '../components/Navbar';
import { DaritalLoader } from '../components/DaritalLoader';
import SetPasscodeScreen from './SetPasscodeScreen';

interface Props {
  onLoggedIn: () => void;
}

export default function LoginScreen({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetPasscode, setShowSetPasscode] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  const { darkMode } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', t.invalidCredentials);
      return;
    }

    try {
      setLoading(true);
      const { accessToken } = await loginRequest(email.trim(), password);
      
      console.log('✅ Login successful, checking passcode status...');
      
      // Save token and user data
      await setToken(accessToken);
      await setUserData(email.trim(), true);
      
      // Check if passcode exists
      const hasPass = await hasPasscode(email.trim());
      
      if (!hasPass) {
        // FORCE passcode setup - cannot skip
        console.log('🔒 No passcode found, forcing passcode setup...');
        setAuthToken(accessToken);
        setShowSetPasscode(true);
      } else {
        // Passcode exists, proceed to app
        console.log('✅ Passcode exists, proceeding to app...');
        onLoggedIn();
      }
    } catch (e: any) {
      console.error('❌ Login failed:', e);
      Alert.alert('Login Failed', e?.message || t.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeSetupComplete = () => {
    console.log('✅ Passcode setup complete, proceeding to app...');
    setShowSetPasscode(false);
    onLoggedIn();
  };

  if (loading) {
    return <DaritalLoader fullScreen darkMode={darkMode} />;
  }

  return (
    <>
      <View
        style={[
          styles.container,
          { backgroundColor: darkMode ? '#000000' : '#F0F9FF' },
        ]}
      >
        {/* Navbar */}
        <Navbar />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text
                style={[
                  styles.logo,
                  { color: darkMode ? '#FBBF24' : '#1E40AF' },
                ]}
              >
                ✨ DARITAL
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: darkMode ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                {t.login}
              </Text>
            </View>

            {/* Login Form */}
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  borderColor: darkMode ? '#374151' : '#E5E7EB',
                },
              ]}
            >
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: darkMode ? '#FBBF24' : '#1F2937' },
                  ]}
                >
                  {t.email}
                </Text>
                <TextInput
                  placeholder="admin@darital.local"
                  placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  style={[
                    styles.input,
                    {
                      backgroundColor: darkMode ? '#111827' : '#F9FAFB',
                      color: darkMode ? '#FFFFFF' : '#1F2937',
                      borderColor: darkMode ? '#EAB308' : '#D1D5DB',
                    },
                  ]}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: darkMode ? '#FBBF24' : '#1F2937' },
                  ]}
                >
                  {t.password}
                </Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={[
                    styles.input,
                    {
                      backgroundColor: darkMode ? '#111827' : '#F9FAFB',
                      color: darkMode ? '#FFFFFF' : '#1F2937',
                      borderColor: darkMode ? '#EAB308' : '#D1D5DB',
                    },
                  ]}
                />
              </View>

              {/* Login Button */}
              <TouchableOpacity
                onPress={onLogin}
                style={[
                  styles.button,
                  {
                    backgroundColor: darkMode ? '#EAB308' : '#3B82F6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: darkMode ? '#000000' : '#FFFFFF' },
                  ]}
                >
                  {t.login}
                </Text>
              </TouchableOpacity>

              {/* Demo Credentials */}
              <View style={styles.demoContainer}>
                <Text
                  style={[
                    styles.demoText,
                    { color: darkMode ? '#6B7280' : '#9CA3AF' },
                  ]}
                >
                  Demo: almurotov.dilbek@gmail.com
                </Text>
                <Text
                  style={[
                    styles.demoText,
                    { color: darkMode ? '#6B7280' : '#9CA3AF' },
                  ]}
                >
                  Password: admin123
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      </View>

      {/* FORCED Passcode Setup Modal */}
      <SetPasscodeScreen
        visible={showSetPasscode}
        onComplete={handlePasscodeSetupComplete}
        authToken={authToken}
        userId={email.trim()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 2,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  demoContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    alignItems: 'center',
  },
  demoText: {
    fontSize: 12,
    marginBottom: 4,
  },
});
