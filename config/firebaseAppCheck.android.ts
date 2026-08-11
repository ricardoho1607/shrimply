import { getApp as getNativeFirebaseApp } from "@react-native-firebase/app";
import {
  getToken as getNativeAppCheckToken,
  initializeAppCheck as initializeNativeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from "@react-native-firebase/app-check";
import type { AppCheckTokenProvider } from "./firebaseAppCheck";

const FALLBACK_TOKEN_LIFETIME_MS = 30 * 60 * 1000;

const getTokenExpirationMillis = (token: string): number => {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return Date.now() + FALLBACK_TOKEN_LIFETIME_MS;
    const normalizedPayload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(globalThis.atob(paddedPayload)) as { exp?: unknown };
    const expirationSeconds = Number(payload.exp);
    if (Number.isFinite(expirationSeconds) && expirationSeconds * 1000 > Date.now()) {
      return expirationSeconds * 1000;
    }
  } catch {
    // The native SDK still supplied a valid opaque token; refresh it conservatively.
  }
  return Date.now() + FALLBACK_TOKEN_LIFETIME_MS;
};

let tokenProvider: AppCheckTokenProvider | null = null;

export const createNativeAppCheckTokenProvider = (): AppCheckTokenProvider => {
  if (tokenProvider) return tokenProvider;

  const provider = new ReactNativeFirebaseAppCheckProvider();
  provider.configure({
    android: {
      provider: __DEV__ ? "debug" : "playIntegrity",
    },
  });
  const nativeAppCheck = initializeNativeAppCheck(getNativeFirebaseApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  });

  tokenProvider = async () => {
    const result = await getNativeAppCheckToken(nativeAppCheck, false);
    if (!result.token) throw new Error("Firebase App Check returned an empty Android token.");
    return {
      token: result.token,
      expireTimeMillis: getTokenExpirationMillis(result.token),
    };
  };
  return tokenProvider;
};
