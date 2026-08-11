// config/firebase.ts
import { initializeApp } from "firebase/app";
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import { createNativeAppCheckTokenProvider } from "./firebaseAppCheck";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNo5RXCHLOIXJM_meJWXNPUV7gjxXhZkc",
  authDomain: "investashrimp-5d9e5.firebaseapp.com",
  projectId: "investashrimp-5d9e5",
  storageBucket: "investashrimp-5d9e5.firebasestorage.app",
  messagingSenderId: "496805431411",
  appId: "1:496805431411:web:9e497f6435a20466550206",
  measurementId: "G-TE86K5EKKB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let appCheck: AppCheck | null = null;
const webAppCheckSiteKey = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_V3_SITE_KEY?.trim();
if (Platform.OS === "web" && typeof window !== "undefined" && webAppCheckSiteKey) {
  if (process.env.NODE_ENV !== "production") {
    (globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(webAppCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (Platform.OS === "android") {
  const nativeTokenProvider = createNativeAppCheckTokenProvider();
  if (nativeTokenProvider) {
    appCheck = initializeAppCheck(app, {
      provider: new CustomProvider({ getToken: nativeTokenProvider }),
      isTokenAutoRefreshEnabled: true,
    });
  }
}

// Initialize Firebase services
const getAppAuth = () => {
  if (Platform.OS === 'web') {
    return FirebaseAuth.getAuth(app);
  } else {
    // For native platforms, use the appropriate persistence
    const { initializeAuth, getReactNativePersistence } = FirebaseAuth as any;
    if (getReactNativePersistence) {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }
    return FirebaseAuth.getAuth(app);
  }
};

export const auth = getAppAuth();
export { appCheck };
export const db = getFirestore(app);
export const storage = getStorage(app); // ADD THIS LINE

export default app;
