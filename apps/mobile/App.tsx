import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import InvoiceQrScreen from './src/screens/InvoiceQrScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import PaymentDetailScreen from './src/screens/PaymentDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SplashScreen from './src/screens/SplashScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import MoreScreen from './src/screens/MoreScreen';
import ContractsScreen from './src/screens/ContractsScreen';
import ContractDetailScreen from './src/screens/ContractDetailScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { getToken, setToken, clearToken, hasPasscode, getPasscode, setPasscode, clearPasscode, getUserData, setUserData, isBiometricEnabled, getEncryptedToken, clearAllAuthData } from './src/state/authStore';
import { t } from './src/lib/i18n';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import PasscodeScreen from './src/screens/PasscodeScreen';
import { useNotifications } from './src/hooks/useNotifications';
import { isBiometricAvailable, attemptBiometricUnlock, getBiometricType } from './src/security/biometricAuth';

const Tab = createBottomTabNavigator();
const InvoicesStack = createNativeStackNavigator();
const PaymentsStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

function InvoicesStackNavigator() {
  return (
    <InvoicesStack.Navigator screenOptions={{ headerShown: false }}>
      <InvoicesStack.Screen name="InvoicesList" component={InvoicesScreen} />
      <InvoicesStack.Screen name="InvoiceQr" component={InvoiceQrScreen} />
    </InvoicesStack.Navigator>
  );
}

function PaymentsStackNavigator() {
  return (
    <PaymentsStack.Navigator screenOptions={{ headerShown: false }}>
      <PaymentsStack.Screen name="PaymentsList" component={PaymentsScreen} />
      <PaymentsStack.Screen name="PaymentDetail" component={PaymentDetailScreen} />
    </PaymentsStack.Navigator>
  );
}

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </ChatStack.Navigator>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} />
      <MoreStack.Screen name="Contracts" component={ContractsScreen} />
      <MoreStack.Screen name="ContractDetail" component={ContractDetailScreen} />
      <MoreStack.Screen name="Documents" component={DocumentsScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
    </MoreStack.Navigator>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [showSplash, setShowSplash] = useState(true);
  const [booting, setBooting] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [passcodeSetupMode, setPasscodeSetupMode] = useState(false);
  const [storedPasscode, setStoredPasscode] = useState<string | null>(null);
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const { darkMode } = useTheme();
  
  // Navigation ref for push notification handling
  const navigationRef = useRef<any>(null);

  // Initialize push notifications (only when authenticated)
  const { expoPushToken, notification } = useNotifications({
    onNotificationReceived: (notification) => {
      console.log('📬 Notification received in app:', notification);
      // App is in foreground - alert is already shown by useNotifications hook
    },
    onNotificationTapped: (response) => {
      console.log('👆 User tapped notification:', response);
      // Navigate to relevant screen based on notification data
      const { data } = response.notification.request.content;
      
      if (data?.type && navigationRef.current) {
        // Navigate to Invoices tab
        navigationRef.current.navigate('Invoices');
      }
    },
  });

  const checkAuth = async () => {
    console.log('🔍 Checking authentication on cold start...');
    
    // ============================================
    // COLD START BIOMETRIC AUTO-LOGIN
    // ============================================
    // Check if user has enabled biometric AND has an encrypted token stored
    const biometricEnabledFlag = await isBiometricEnabled();
    const encryptedToken = await getEncryptedToken();
    
    if (biometricEnabledFlag && encryptedToken) {
      console.log('🔐 Biometric enabled and token found, attempting automatic unlock...');
      
      // Check hardware availability
      const hardwareAvailable = await isBiometricAvailable();
      
      if (hardwareAvailable) {
        const biometricType = await getBiometricType();
        console.log(`🔐 Attempting automatic ${biometricType} authentication...`);
        
        // CRITICAL: Attempt biometric WITHOUT device passcode fallback
        const result = await attemptBiometricUnlock(true);
        
        if (result === 'success') {
          console.log('✅ Biometric authentication successful! Restoring session...');
          
          // Restore session from encrypted token
          await setToken(encryptedToken);
          
          // Go directly to app - bypass login and passcode screens
          setAuthed(true);
          setIsUnlocked(true);
          setNeedsPasscode(false);
          setBiometricAttempted(true);
          setBooting(false);
          return; // Exit early - user is in!
        } else {
          console.log('❌ Biometric authentication failed or cancelled');
          // Fall through to normal login flow
        }
      } else {
        console.log('⚠️ Biometric hardware not available or not enrolled');
      }
    }
    
    // ============================================
    // FALLBACK: NORMAL AUTHENTICATION FLOW
    // ============================================
    const token = await getToken();
    const hasPass = await hasPasscode();
    const pass = await getPasscode();
    
    setStoredPasscode(pass);
    
    if (token && hasPass) {
      // User is logged in and has passcode
      // Show passcode screen for verification
      console.log('🔒 Token found with passcode, showing passcode screen');
      setNeedsPasscode(true);
      setIsUnlocked(false);
      setAuthed(true);
    } else if (token) {
      // User is logged in but no passcode (shouldn't happen with new flow)
      console.log('✅ Token found without passcode, unlocking');
      setAuthed(true);
      setIsUnlocked(true);
    } else {
      // No token - show login screen
      console.log('📱 No token found, showing login screen');
    }
    
    setBiometricAttempted(true);
    setBooting(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    console.log('🚪 Logging out, clearing all auth data...');
    await clearAllAuthData();
    setAuthed(false);
    setNeedsPasscode(false);
    setIsUnlocked(false);
    setBiometricAttempted(false);
    setBiometricError(null);
  };

  const handlePasscodeSuccess = () => {
    setNeedsPasscode(false);
    setPasscodeSetupMode(false);
    setIsUnlocked(true);
    setAuthed(true);
  };

  const handlePasscodeSetup = async (passcode: string) => {
    await setPasscode(passcode);
    setStoredPasscode(passcode);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Show nothing while checking auth
  if (booting) {
    return <View style={{ flex: 1, backgroundColor: darkMode ? '#000000' : '#F0F9FF' }} />;
  }

  // Show passcode setup after first login
  if (passcodeSetupMode) {
    return (
      <PasscodeScreen
        mode="setup"
        onSuccess={handlePasscodeSuccess}
        onSetupComplete={handlePasscodeSetup}
      />
    );
  }

  // Show passcode verification if locked
  if (needsPasscode && storedPasscode && !isUnlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: darkMode ? '#000000' : '#F0F9FF' }}>
        {biometricError && biometricAttempted && (
          <View
            style={{
              backgroundColor: darkMode ? '#F59E0B' : '#FCD34D',
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: darkMode ? '#000000' : '#92400E',
                textAlign: 'center',
              }}
            >
              ⚠️ {biometricError}
            </Text>
          </View>
        )}
        <PasscodeScreen
          mode="verify"
          onSuccess={handlePasscodeSuccess}
          storedPasscode={storedPasscode}
        />
      </View>
    );
  }

  const rootStyle: any = {
    flex: 1,
    backgroundColor: darkMode ? '#000000' : '#F0F9FF',
  };
  if (Platform.OS === 'web') {
    rootStyle.height = '100vh';
    rootStyle.maxHeight = '100vh';
    rootStyle.overflow = 'hidden';
  }

  return (
    <SafeAreaView style={rootStyle}>
      <NavigationContainer ref={navigationRef}>
        {authed ? (
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarScrollEnabled: true,
              tabBarStyle: {
                backgroundColor: darkMode ? '#111827' : '#FFFFFF',
                borderTopColor: darkMode ? '#374151' : '#E5E7EB',
                borderTopWidth: 1,
                paddingTop: 10,
                paddingBottom: Math.max(insets.bottom, 10) + 4,
                height: 64 + Math.max(insets.bottom, 10) + 4,
                minHeight: 64 + Math.max(insets.bottom, 10) + 4,
              },
              tabBarActiveTintColor: darkMode ? '#FBBF24' : '#3B82F6',
              tabBarInactiveTintColor: darkMode ? '#6B7280' : '#9CA3AF',
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
                marginTop: 4,
              },
              tabBarItemStyle: {
                minWidth: 64,
              },
            }}
          >
          <Tab.Screen
            name="Home"
            options={{
              tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-variant-outline" size={size} color={color} />,
              tabBarLabel: t.home,
            }}
          >
            {({ navigation }) => <HomeScreen navigation={navigation} onSetupPasscode={() => setPasscodeSetupMode(true)} />}
          </Tab.Screen>
            <Tab.Screen
              name="Invoices"
              component={InvoicesStackNavigator}
              options={{
                tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />,
                tabBarLabel: t.invoices,
              }}
            />
            <Tab.Screen
              name="Payments"
              component={PaymentsStackNavigator}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.12)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <MaterialCommunityIcons name="credit-card-outline" size={size} color={color} />
                  </View>
                ),
                tabBarLabel: t.payments,
              }}
            />
            <Tab.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bell-outline" size={size} color={color} />,
                tabBarLabel: t.notifications,
                tabBarBadge: notification ? '•' : undefined,
              }}
            />
            <Tab.Screen
              name="Support"
              component={ChatStackNavigator}
              options={{
                tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chat-outline" size={size} color={color} />,
                tabBarLabel: t.support,
              }}
            />
            <Tab.Screen
              name="More"
              component={MoreStackNavigator}
              options={{
                tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="menu" size={size} color={color} />,
                tabBarLabel: t.more,
              }}
            />
            <Tab.Screen
              name="Logout"
              component={View}
              listeners={{
                tabPress: (e) => {
                  e.preventDefault();
                  handleLogout();
                },
              }}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <MaterialCommunityIcons name="logout-variant" size={size} color={color} />
                  </View>
                ),
                tabBarLabel: t.logout,
              }}
            />
          </Tab.Navigator>
        ) : (
          <LoginScreen 
            onLoggedIn={() => setAuthed(true)} 
            onNeedPasscodeSetup={() => setPasscodeSetupMode(true)}
          />
        )}
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
