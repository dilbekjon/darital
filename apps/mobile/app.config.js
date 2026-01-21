export default {
  expo: {
    name: "Darital Tenant",
    slug: "darital-tenant",
    version: "1.0.0",
    orientation: "portrait",
    // icon: "./assets/icon.png", // Commented out if file doesn't exist
    userInterfaceStyle: "automatic",
    scheme: "daritaltenant",
    // Explicitly disable New Architecture (Fabric/TurboModules) for Expo Go compatibility
    // New Architecture requires a custom dev client build
    newArchEnabled: false,
    // Use Hermes engine (default for Expo SDK 54)
    jsEngine: "hermes",
    splash: {
      // image: "./assets/splash.png", // Commented out if file doesn't exist
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.darital.tenant",
      infoPlist: {
        NSFaceIDUsageDescription: "Use Face ID to quickly and securely unlock your Darital account."
      }
    },
    android: {
      // adaptiveIcon: {
      //   foregroundImage: "./assets/adaptive-icon.png",
      //   backgroundColor: "#ffffff"
      // }, // Commented out if file doesn't exist
      package: "com.darital.tenant",
      permissions: [
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ],
      // googleServicesFile: "./google-services.json" // Commented out if file doesn't exist
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // API URL must be set via EXPO_PUBLIC_API_URL env var
      // In dev, defaults to http://localhost:3001/api (see constants-fallback.ts)
      // In prod, must be explicitly set or app will fail
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            newArchEnabled: false,
          },
          ios: {
            newArchEnabled: false,
          },
        },
      ],
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID for secure authentication."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#3B82F6",
          sounds: ["./assets/notification-sound.wav"]
        }
      ],
      "expo-secure-store"
    ]
  }
};

