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

interface GoogleFormattableText {
  text: string;
}

interface GoogleAddressComponent {
  longText?: string;
  types: string[];
}

interface GooglePlace {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: { lat: () => number; lng: () => number };
  addressComponents?: GoogleAddressComponent[];
  fetchFields: (request: { fields: string[] }) => Promise<unknown>;
}

interface GooglePlacePrediction {
  placeId: string;
  text: GoogleFormattableText;
  mainText?: GoogleFormattableText;
  secondaryText?: GoogleFormattableText;
  toPlace: () => GooglePlace;
}

interface GooglePlacesApi {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      includedPrimaryTypes: string[];
      sessionToken: object;
    }) => Promise<{ suggestions: Array<{ placePrediction?: GooglePlacePrediction }> }>;
  };
  Place: new (options: { id: string }) => GooglePlace;
}

interface GoogleMapsApi {
  importLibrary: (library: 'places') => Promise<GooglePlacesApi>;
}

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
    __shrimplyGoogleMapsReady?: () => void;
  }
}

let mapsPromise: Promise<GoogleMapsApi> | null = null;
let placesPromise: Promise<GooglePlacesApi> | null = null;
let sessionToken: object | null = null;
const placePredictions = new Map<string, GooglePlacePrediction>();

function loadGoogleMapsApi(): Promise<GoogleMapsApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Places requires a browser'));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  const pending = new Promise<GoogleMapsApi>((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      reject(new Error('Google Places is not configured'));
      return;
    }

    const fail = () => {
      delete window.__shrimplyGoogleMapsReady;
      reject(new Error('Google Places failed to load'));
    };

    window.__shrimplyGoogleMapsReady = () => {
      const maps = window.google?.maps;
      delete window.__shrimplyGoogleMapsReady;
      if (maps?.importLibrary) resolve(maps);
      else fail();
    };

    document.querySelector<HTMLScriptElement>('script[data-shrimply-google-places]')?.remove();

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=__shrimplyGoogleMapsReady&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.shrimplyGooglePlaces = 'true';
    script.addEventListener('error', fail, { once: true });
    document.head.appendChild(script);
  });

  mapsPromise = pending.catch(error => {
    mapsPromise = null;
    throw error;
  });
  return mapsPromise;
}

function loadPlacesApi(): Promise<GooglePlacesApi> {
  if (placesPromise) return placesPromise;

  const pending = loadGoogleMapsApi().then(maps => maps.importLibrary('places'));
  placesPromise = pending.catch(error => {
    placesPromise = null;
    throw error;
  });
  return placesPromise;
}

export async function searchCityLocations(input: string): Promise<PlaceSuggestion[]> {
  const places = await loadPlacesApi();
  sessionToken ||= new places.AutocompleteSessionToken();

  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    includedPrimaryTypes: ['(cities)'],
    sessionToken,
  });

  const predictions = suggestions
    .map(suggestion => suggestion.placePrediction)
    .filter((prediction): prediction is GooglePlacePrediction => Boolean(prediction))
    .slice(0, 6);

  placePredictions.clear();
  predictions.forEach(prediction => placePredictions.set(prediction.placeId, prediction));

  return predictions.map(prediction => ({
    placeId: prediction.placeId,
    description: prediction.text.text,
    mainText: prediction.mainText?.text || prediction.text.text,
    secondaryText: prediction.secondaryText?.text || '',
  }));
}

export async function getLocationDetails(placeId: string): Promise<SelectedLocation> {
  const places = await loadPlacesApi();
  const place = placePredictions.get(placeId)?.toPlace() || new places.Place({ id: placeId });

  await place.fetchFields({
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'],
  });

  const coordinates = place.location;
  if (!coordinates) throw new Error('Location details failed');

  const components = place.addressComponents || [];
  const component = (...types: string[]) =>
    components.find(item => item.types.some(type => types.includes(type)))?.longText || '';

  const postalCode = component('postal_code');
  const selectedLocation: SelectedLocation = {
    address: place.formattedAddress || place.displayName || '',
    latitude: coordinates.lat(),
    longitude: coordinates.lng(),
    city: component('locality', 'administrative_area_level_2', 'sublocality'),
    state: component('administrative_area_level_1'),
    country: component('country'),
    ...(postalCode ? { postalCode } : {}),
    placeId: place.id || placeId,
  };

  sessionToken = null;
  placePredictions.clear();
  return selectedLocation;
}
