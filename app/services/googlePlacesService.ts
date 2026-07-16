// services/googlePlacesService.ts
import { API_KEYS } from '../../config/apiKeys';

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  city?: string;     // Add ? here
  state?: string;    // Add ? here
  country?: string;  // Add ? here
  placeId?: string;
  postalCode?: string;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Search places with autocomplete
  async searchPlaces(query: string, country: string = 'ID'): Promise<any[]> {
    if (!query || query.length < 3) return [];

    try {
      const response = await fetch(
        `${this.baseUrl}/autocomplete/json?input=${encodeURIComponent(query)}&components=country:${country}&key=${this.apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.predictions || [];
      }
      
      throw new Error(data.error_message || 'Places search failed');
    } catch (error) {
      console.error('Google Places search error:', error);
      throw error;
    }
  }

  // Search standardized cities and administrative regions worldwide.
  async searchLocations(query: string): Promise<PlaceSuggestion[]> {
    const input = query.trim();
    if (input.length < 2) return [];

    try {
      const params = new URLSearchParams({
        input,
        types: '(cities)',
        key: this.apiKey,
      });
      const response = await fetch(`${this.baseUrl}/autocomplete/json?${params.toString()}`);
      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') return [];
      if (data.status !== 'OK') {
        throw new Error(data.error_message || 'Location search failed');
      }

      return ((data.predictions || []) as GooglePlacePrediction[]).slice(0, 6).map(prediction => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting?.main_text || prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text || '',
      }));
    } catch (error) {
      console.error('Google location search error:', error);
      throw error;
    }
  }

  // Get detailed information about a place
  async getPlaceDetails(placeId: string): Promise<LocationData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/details/json?place_id=${placeId}&fields=place_id,formatted_address,geometry,address_component,name&key=${this.apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        return this.formatPlaceDetails(data.result);
      }
      
      throw new Error(data.error_message || 'Place details fetch failed');
    } catch (error) {
      console.error('Google Places details error:', error);
      throw error;
    }
  }

  // Reverse geocoding - get address from coordinates
  async reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        return this.formatPlaceDetails(data.results[0]);
      }
      
      throw new Error('Reverse geocoding failed');
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  async getTimeZone(latitude: number, longitude: number, date: Date = new Date()): Promise<string> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Valid coordinates are required to detect the farm timezone');
    }

    try {
      const timestamp = Math.floor(date.getTime() / 1000);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${timestamp}&key=${this.apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK' && typeof data.timeZoneId === 'string') {
        return data.timeZoneId;
      }

      throw new Error(data.errorMessage || 'Timezone detection failed');
    } catch (error) {
      console.error('Google timezone detection error:', error);
      throw error;
    }
  }

  // Format place details to our LocationData interface
  private formatPlaceDetails(place: PlaceDetails): LocationData {
    const addressComponents = place.address_components || [];
    
    // Extract address components
    const getComponent = (types: string[]) => {
      const component = addressComponents.find(comp => 
        comp.types.some(type => types.includes(type))
      );
      return component?.long_name || '';
    };

    const city = getComponent(['locality', 'administrative_area_level_2', 'sublocality']);
    const state = getComponent(['administrative_area_level_1']);
    const country = getComponent(['country']);
    const postalCode = getComponent(['postal_code']);

    return {
      address: place.formatted_address,
      city: city || 'Unknown City',
      state: state || 'Unknown State',
      country: country || 'Unknown Country',
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      postalCode: postalCode,
      placeId: place.place_id,
    };
  }
}

export const googlePlacesService = new GooglePlacesService(API_KEYS.GOOGLE_PLACES);
