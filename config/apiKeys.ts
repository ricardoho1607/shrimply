// config/apiKeys.ts
export const API_KEYS = {
  GOOGLE_PLACES: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',
};


// Validate API keys on app start
export const validateApiKeys = () => {
  if (!API_KEYS.GOOGLE_PLACES) {
    console.warn('Google Places API key is missing');
    return false;
  }
  return true;
};