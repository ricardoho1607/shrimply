import type { AppCheckToken } from "firebase/app-check";

export type AppCheckTokenProvider = () => Promise<AppCheckToken>;

export const createNativeAppCheckTokenProvider = (): AppCheckTokenProvider | null => null;
