import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCNo5RXCHLOIXJM_meJWXNPUV7gjxXhZkc",
  authDomain: "investashrimp-5d9e5.firebaseapp.com",
  projectId: "investashrimp-5d9e5",
  storageBucket: "investashrimp-5d9e5.firebasestorage.app",
  messagingSenderId: "496805431411",
  appId: "1:496805431411:web:9e497f6435a20466550206",
  measurementId: "G-TE86K5EKKB"
};

// Initialize Firebase for SSR compatibility
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
type FirebaseRuntime = typeof globalThis & { __shrimplyFirestore?: Firestore };
const firebaseRuntime = globalThis as FirebaseRuntime;

type AuthWithNetworkConfig = Auth & {
  config: {
    apiHost: string;
    apiScheme: string;
    tokenApiHost: string;
  };
};

const isInstalledWebApp = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && navigator.standalone === true);
};

const configureInstalledWebAppAuthProxy = (firebaseAuth: Auth) => {
  if (!isInstalledWebApp()) return;
  if (!["shrimplytech.com", "www.shrimplytech.com"].includes(window.location.hostname)) return;

  const { config } = firebaseAuth as AuthWithNetworkConfig;
  config.apiScheme = window.location.protocol.replace(":", "");
  config.apiHost = `${window.location.host}/firebase-auth/identitytoolkit`;
  config.tokenApiHost = `${window.location.host}/firebase-auth/securetoken`;
};

let appCheck: AppCheck | null = null;
const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_V3_SITE_KEY?.trim();
const isProduction = process.env.NODE_ENV === "production";
const appCheckDebugEnabled = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_ENABLED === "true";
if (typeof window !== "undefined" && appCheckSiteKey && (isProduction || appCheckDebugEnabled)) {
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
configureInstalledWebAppAuthProxy(auth);
const db = firebaseRuntime.__shrimplyFirestore ?? (
  typeof window === "undefined"
    ? getFirestore(app)
    : initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      })
);
firebaseRuntime.__shrimplyFirestore = db;
const storage = getStorage(app);

export { app, appCheck, auth, db, storage };
