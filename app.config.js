
export default {
  expo: {
    name: 'Shrimply',
    slug: 'investashrimp',
    version: '3.1.0',
    orientation: 'portrait',
    icon: './assets/images/app-icon.png',
    scheme: 'shrimply',
    userInterfaceStyle: 'automatic',
    runtimeVersion: '3.1.0',
    updates: {
      url: 'https://u.expo.dev/8a20b603-ee9c-44cc-8797-1865788511db',
    },
    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.shrimply.tech.investashrimp',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'This app needs access to your location to show nearby disease alerts and report outbreaks.',
      },
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
      },
    },

    android: {
      package: 'com.shrimply.tech.investashrimp',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA'],
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.VIBRATE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
        },
      },
    },

    web: {
      bundler: 'metro',
      favicon: './assets/images/ShrimplyLogo.png',
    },

    plugins: [
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          organization: 'shrimply',
          project: 'react-native',
        },
      ],
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/Shrimply2Logo.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      'expo-localization',
      'expo-font',
      '@react-native-community/datetimepicker',
      'expo-web-browser',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow $(PRODUCT_NAME) to use your location to show nearby disease alerts and report outbreaks.',
          isAndroidBackgroundLocationEnabled: false,
          isAndroidForegroundServiceEnabled: false,
        },
      ],
      [
        'expo-updates',
        {
          fallbackToCacheTimeout: 0,
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      router: {},
      eas: {
        projectId: '8a20b603-ee9c-44cc-8797-1865788511db',
      },
      expoPublic: {
        GOOGLE_PLACES: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
        FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      },
    },

    owner: 'shrimply.tech',
  },
};
