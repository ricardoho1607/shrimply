import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const useLocalOrsonEmulators = process.env.NODE_ENV !== "production"
  && process.env.NEXT_PUBLIC_ORSON_LOCAL_EMULATORS === "true";
const firebaseConfig = {
  apiKey: useLocalOrsonEmulators ? "demo-api-key" : "AIzaSyCNo5RXCHLOIXJM_meJWXNPUV7gjxXhZkc",
  authDomain: useLocalOrsonEmulators ? "demo-shrimply-agent.firebaseapp.com" : "investashrimp-5d9e5.firebaseapp.com",
  projectId: useLocalOrsonEmulators ? "demo-shrimply-agent" : "investashrimp-5d9e5",
  storageBucket: useLocalOrsonEmulators ? "demo-shrimply-agent.firebasestorage.app" : "investashrimp-5d9e5.firebasestorage.app",
  messagingSenderId: "496805431411",
  appId: "1:496805431411:web:9e497f6435a20466550206",
  measurementId: "G-TE86K5EKKB"
};

// Initialize Firebase for SSR compatibility
const app = useLocalOrsonEmulators
  ? getApps().find((existing) => existing.name === "orson-local") ?? initializeApp(firebaseConfig, "orson-local")
  : getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
type FirebaseRuntime = typeof globalThis & {
  __shrimplyFirestore?: Firestore;
  __shrimplyOrsonLocalFirestore?: Firestore;
};
const firebaseRuntime = globalThis as FirebaseRuntime;

type AuthWithNetworkConfig = Auth & {
  config: {
    apiHost: string;
    apiScheme: string;
    tokenApiHost: string;
  };
};

const configureProductionAuthProxy = (firebaseAuth: Auth) => {
  if (typeof window === "undefined") return;
  if (!["shrimplytech.com", "www.shrimplytech.com"].includes(window.location.hostname)) return;

  const { config } = firebaseAuth as AuthWithNetworkConfig;
  config.apiScheme = window.location.protocol.replace(":", "");
  config.apiHost = `${window.location.host}/firebase-auth/identitytoolkit`;
  config.tokenApiHost = `${window.location.host}/firebase-auth/securetoken`;
};

let appCheck: AppCheck | null = null;
const appCheckEnabled = !useLocalOrsonEmulators && process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_ENABLED === "true";
const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_V3_SITE_KEY?.trim();
const isProduction = process.env.NODE_ENV === "production";
const appCheckDebugEnabled = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_ENABLED === "true";
if (
  typeof window !== "undefined"
  && appCheckEnabled && appCheckSiteKey
  && (isProduction || appCheckDebugEnabled)
) {
  if (!isProduction) {
    (globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
  ],
});
configureProductionAuthProxy(auth);
const existingFirestore = useLocalOrsonEmulators
  ? firebaseRuntime.__shrimplyOrsonLocalFirestore
  : firebaseRuntime.__shrimplyFirestore;
const db = existingFirestore ?? (
  typeof window === "undefined"
    ? getFirestore(app)
    : initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      })
);
if (useLocalOrsonEmulators) firebaseRuntime.__shrimplyOrsonLocalFirestore = db;
else firebaseRuntime.__shrimplyFirestore = db;
const storage = getStorage(app);

type EmulatorRuntime = FirebaseRuntime & { __shrimplyOrsonEmulatorsConnected?: boolean };
if (useLocalOrsonEmulators && typeof window !== "undefined") {
  const emulatorRuntime = globalThis as EmulatorRuntime;
  if (!emulatorRuntime.__shrimplyOrsonEmulatorsConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8187);
    connectFunctionsEmulator(getFunctions(app), "127.0.0.1", 5001);
    connectStorageEmulator(storage, "127.0.0.1", 9297);
    emulatorRuntime.__shrimplyOrsonEmulatorsConnected = true;
  }
}

export { app, appCheck, auth, db, storage };
