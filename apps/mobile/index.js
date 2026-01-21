// Import URL polyfill for React Native (required for socket.io-client and other Node.js dependencies)
import 'react-native-url-polyfill/auto';

// CRITICAL: Do NOT access Platform or any native modules here
// React Native native bridge is not initialized yet
// Platform constants are only available after the app is registered and native modules are loaded
// Platform will be available in components/hooks after app initialization

// Note: expo-modules-core is provided by expo package, don't require it directly
// The expo package handles native module initialization automatically

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

