export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface SelectedLocation {
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  placeId: string;
}

interface GooglePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface GooglePlaceResult {
  place_id?: string;
  formatted_address?: string;
  name?: string;
  geometry?: {
    location?: { lat: () => number; lng: () => number };
  };
  address_components?: Array<{
    long_name: string;
    types: string[];
  }>;
}

interface GooglePlacesApi {
  AutocompleteService: new () => {
    getPlacePredictions: (
      request: { input: string; types: string[] },
      callback: (predictions: GooglePrediction[] | null, status: string) => void,
    ) => void;
  };
  PlacesService: new (element: HTMLDivElement) => {
    getDetails: (
      request: { placeId: string; fields: string[] },
      callback: (place: GooglePlaceResult | null, status: string) => void,
    ) => void;
  };
  PlacesServiceStatus: { OK: string; ZERO_RESULTS: string };
}

declare global {
  interface Window {
    google?: { maps?: { places?: GooglePlacesApi } };
  }
}

let placesPromise: Promise<GooglePlacesApi> | null = null;

function loadPlacesApi(): Promise<GooglePlacesApi> {
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps.places);
  if (placesPromise) return placesPromise;

  placesPromise = new Promise((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      reject(new Error('Google Places is not configured'));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-shrimply-google-places]');
    const handleLoad = () => {
      if (window.google?.maps?.places) resolve(window.google.maps.places);
      else reject(new Error('Google Places failed to load'));
    };

    if (existing) {
      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Places failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.shrimplyGooglePlaces = 'true';
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Places failed to load')), { once: true });
    document.head.appendChild(script);
  });

  return placesPromise;
}

export async function searchCityLocations(input: string): Promise<PlaceSuggestion[]> {
  const places = await loadPlacesApi();
  const service = new places.AutocompleteService();

  return new Promise((resolve, reject) => {
    service.getPlacePredictions({ input, types: ['(cities)'] }, (predictions, status) => {
      if (status === places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }
      if (status !== places.PlacesServiceStatus.OK || !predictions) {
        reject(new Error('Location search failed'));
        return;
      }
      resolve(predictions.slice(0, 6).map(prediction => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting?.main_text || prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text || '',
      })));
    });
  });
}

export async function getLocationDetails(placeId: string): Promise<SelectedLocation> {
  const places = await loadPlacesApi();
  const service = new places.PlacesService(document.createElement('div'));

  return new Promise((resolve, reject) => {
    service.getDetails(
      { placeId, fields: ['place_id', 'formatted_address', 'name', 'geometry', 'address_components'] },
      (place, status) => {
        const coordinates = place?.geometry?.location;
        if (status !== places.PlacesServiceStatus.OK || !place || !coordinates) {
          reject(new Error('Location details failed'));
          return;
        }

        const components = place.address_components || [];
        const component = (...types: string[]) =>
          components.find(item => item.types.some(type => types.includes(type)))?.long_name || '';

        resolve({
          address: place.formatted_address || place.name || '',
          latitude: coordinates.lat(),
          longitude: coordinates.lng(),
          city: component('locality', 'administrative_area_level_2', 'sublocality'),
          state: component('administrative_area_level_1'),
          country: component('country'),
          postalCode: component('postal_code') || undefined,
          placeId: place.place_id || placeId,
        });
      },
    );
  });
}
