
export default {
  expo: {
    name: 'Shrimply',
    slug: 'Shrimply',
    version: '1.0.5',
    orientation: 'portrait',
    icon: './assets/images/ShrimplyLogo.png',
    scheme: 'shrimply',
    userInterfaceStyle: 'automatic',
    runtimeVersion: { policy: 'appVersion' },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.shrimplytech.shrimply',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'This app needs access to your location to show nearby disease alerts and report outbreaks.',
      },
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
      },
    },

    android: {
      package: 'com.shrimplytech.shrimply',
      versionCode: 2,
      adaptiveIcon: {
        foregroundImage: './assets/images/ShrimplyLogo.png',
        backgroundColor: '#ffffff',
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA'],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
        },
      },
    },

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/ShrimplyLogo.png',
    },

    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/ShrimplyLogo.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      'expo-localization',
      'expo-font',
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
        projectId: 'bcecc2ab-013c-46d3-8fbd-10f5067d7065',
      },
      expoPublic: {
        GOOGLE_PLACES: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
        GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
        FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      },
    },

    owner: 'shrimply.tech',
  },
};
