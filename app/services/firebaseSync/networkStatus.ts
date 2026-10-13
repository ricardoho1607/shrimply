import { Platform } from 'react-native';

export const NetInfo = Platform.OS === 'web'
  ? {
    addEventListener: (callback: (state: { isConnected: boolean }) => void) => {
      // On web, assume online and use the browser's online event
      if (typeof window !== 'undefined') {
        const handler = () => callback({ isConnected: navigator.onLine });
        window.addEventListener('online', handler);
        window.addEventListener('offline', handler);
        // Call immediately
        callback({ isConnected: navigator.onLine });
        return () => {
          window.removeEventListener('online', handler);
          window.removeEventListener('offline', handler);
        };
      }
      callback({ isConnected: true });
      return () => { };
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Avoid initializing native NetInfo during web SSR.
  : require('@react-native-community/netinfo').default;
