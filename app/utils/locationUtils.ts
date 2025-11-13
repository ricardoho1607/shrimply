// utils/locationUtils.ts
import { LocationData } from '../services/googlePlacesService';

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First location
 * @param point2 Second location
 * @returns Distance in kilometers
 */
export const calculateDistance = (point1: LocationData, point2: LocationData): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(point2.latitude - point1.latitude);
  const dLon = deg2rad(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(point1.latitude)) * Math.cos(deg2rad(point2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 */
const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
};

/**
 * Check if a location is within service radius
 */
export const isWithinServiceRadius = (
  farmLocation: LocationData, 
  buyerLocation: LocationData, 
  serviceRadius: number
): boolean => {
  const distance = calculateDistance(farmLocation, buyerLocation);
  return distance <= serviceRadius;
};

/**
 * Get formatted distance string
 */
export const getDistanceString = (point1: LocationData, point2: LocationData): string => {
  const distance = calculateDistance(point1, point2);
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m away`;
  } else if (distance < 100) {
    return `${distance}km away`;
  } else {
    return `${Math.round(distance)}km away`;
  }
};

/**
 * Sort locations by distance from a reference point
 */
export const sortByDistance = <T extends { primaryLocation: LocationData }>(
  items: T[],
  referenceLocation: LocationData,
  ascending: boolean = true
): T[] => {
  return items.sort((a, b) => {
    const distanceA = calculateDistance(referenceLocation, a.primaryLocation);
    const distanceB = calculateDistance(referenceLocation, b.primaryLocation);
    
    return ascending ? distanceA - distanceB : distanceB - distanceA;
  });
};

/**
 * Filter locations within a certain radius
 */
export const filterByRadius = <T extends { primaryLocation: LocationData }>(
  items: T[],
  centerLocation: LocationData,
  radiusKm: number
): T[] => {
  return items.filter(item => 
    isWithinServiceRadius(centerLocation, item.primaryLocation, radiusKm)
  );
};

/**
 * Get the center point of multiple locations (for map centering)
 */
export const getCenterPoint = (locations: LocationData[]): LocationData | null => {
  if (locations.length === 0) return null;
  
  if (locations.length === 1) return locations[0];
  
  let totalLat = 0;
  let totalLng = 0;
  
  locations.forEach(location => {
    totalLat += location.latitude;
    totalLng += location.longitude;
  });
  
  return {
    address: 'Center Point',
    city: 'Multiple',
    state: 'Multiple',
    country: 'Multiple',
    latitude: totalLat / locations.length,
    longitude: totalLng / locations.length,
    placeId: 'center',
  };
};

/**
 * Validate if coordinates are valid
 */
export const isValidCoordinates = (latitude: number, longitude: number): boolean => {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

/**
 * Get location bounds for multiple points (useful for map zoom)
 */
export const getLocationBounds = (locations: LocationData[]) => {
  if (locations.length === 0) return null;
  
  let minLat = locations[0].latitude;
  let maxLat = locations[0].latitude;
  let minLng = locations[0].longitude;
  let maxLng = locations[0].longitude;
  
  locations.forEach(location => {
    minLat = Math.min(minLat, location.latitude);
    maxLat = Math.max(maxLat, location.latitude);
    minLng = Math.min(minLng, location.longitude);
    maxLng = Math.max(maxLng, location.longitude);
  });
  
  return {
    southwest: { latitude: minLat, longitude: minLng },
    northeast: { latitude: maxLat, longitude: maxLng },
  };
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (latitude: number, longitude: number): string => {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

/**
 * Get approximate region/province from coordinates (basic implementation)
 */
export const getRegionFromCoordinates = (latitude: number, longitude: number): string => {
  // This is a basic implementation for Indonesia
  // In production, use proper reverse geocoding or a region lookup service
  
  if (latitude >= -6.5 && latitude <= -5.8 && longitude >= 106.5 && longitude <= 107.2) {
    return 'Jakarta Region';
  } else if (latitude >= -7.5 && latitude <= -7.0 && longitude >= 112.5 && longitude <= 113.0) {
    return 'Surabaya Region';
  } else if (latitude >= 3.3 && latitude <= 3.8 && longitude >= 98.4 && longitude <= 99.0) {
    return 'Medan Region';
  }
  
  // Default regions based on rough coordinates
  if (latitude > 0) return 'Northern Indonesia';
  if (latitude < -8) return 'Southern Indonesia';
  if (longitude < 110) return 'Western Indonesia';
  return 'Eastern Indonesia';
};

/**
 * Create a location search radius options for UI
 */
export const getRadiusOptions = () => [
  { label: 'Within 10km', value: 10 },
  { label: 'Within 25km', value: 25 },
  { label: 'Within 50km', value: 50 },
  { label: 'Within 100km', value: 100 },
  { label: 'Within 200km', value: 200 },
  { label: 'Anywhere', value: 1000 },
];