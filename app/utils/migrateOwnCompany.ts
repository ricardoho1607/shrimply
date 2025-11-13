// utils/migrateOwnCompany.ts
// Migrate only the current user's company

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  placeId?: string;
}

// Default coordinates for common locations
const DEFAULT_LOCATIONS: Record<string, LocationData> = {
  'Jakarta': {
    address: 'Jakarta, Indonesia',
    latitude: -6.2088,
    longitude: 106.8456,
    city: 'Jakarta',
    state: 'DKI Jakarta',
    country: 'Indonesia',
  },
  'Surabaya': {
    address: 'Surabaya, East Java, Indonesia',
    latitude: -7.2575,
    longitude: 112.7521,
    city: 'Surabaya',
    state: 'East Java',
    country: 'Indonesia',
  },
  'Bandung': {
    address: 'Bandung, West Java, Indonesia',
    latitude: -6.9175,
    longitude: 107.6191,
    city: 'Bandung',
    state: 'West Java',
    country: 'Indonesia',
  },
  'Melbourne': {
    address: 'Melbourne, VIC, Australia',
    latitude: -37.8136,
    longitude: 144.9631,
    city: 'Melbourne',
    state: 'Victoria',
    country: 'Australia',
  },
  'Lampung': {
    address: 'Lampung, Indonesia',
    latitude: -5.3971,
    longitude: 105.2668,
    city: 'Lampung',
    state: 'Lampung',
    country: 'Indonesia',
  },
  'Bangka': {
    address: 'Bangka Belitung, Indonesia',
    latitude: -2.7411,
    longitude: 106.4406,
    city: 'Bangka',
    state: 'Bangka Belitung',
    country: 'Indonesia',
  },
  'Bali': {
    address: 'Bali, Indonesia',
    latitude: -8.3405,
    longitude: 115.0920,
    city: 'Denpasar',
    state: 'Bali',
    country: 'Indonesia',
  },
};

function guessLocationFromString(locationString: string): LocationData {
  // Try to match with default locations
  for (const [key, location] of Object.entries(DEFAULT_LOCATIONS)) {
    if (locationString.toLowerCase().includes(key.toLowerCase())) {
      return {
        ...location,
        address: locationString, // Keep original address
      };
    }
  }

  // If no match, return a default location with warning
  console.warn(`⚠️ Could not determine coordinates for: ${locationString}`);
  console.warn(`Please update this manually in company settings or contact support`);
  
  // Parse the string to extract city/state/country
  const parts = locationString.split(',').map((p: string) => p.trim());
  
  return {
    address: locationString,
    latitude: 0, // You'll need to manually update these
    longitude: 0,
    city: parts[0] || '',
    state: parts[1] || '',
    country: parts[parts.length - 1] || 'Indonesia',
    placeId: `migrated-${Date.now()}`,
  };
}

export async function migrateOwnCompany(companyId: string) {
  console.log('🔄 Starting company location migration for company:', companyId);
  
  try {
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    
    if (!companyDoc.exists()) {
      throw new Error('Company not found');
    }

    const companyData = companyDoc.data();
    const companyName = companyData.companyName || 'Unknown';

    console.log(`\n--- Processing: ${companyName} ---`);

    // Check if primaryLocation is already a LocationData object
    if (typeof companyData.primaryLocation === 'object' && companyData.primaryLocation !== null) {
      console.log('✅ Already has LocationData format');
      return {
        success: true,
        alreadyMigrated: true,
        message: 'Company already uses LocationData format',
      };
    }

    // Check if it's a string
    if (typeof companyData.primaryLocation === 'string') {
      console.log(`📍 Old location (string): ${companyData.primaryLocation}`);
      
      // Convert string to LocationData
      const locationData = guessLocationFromString(companyData.primaryLocation);
      
      console.log(`📍 New location data:`, {
        address: locationData.address,
        lat: locationData.latitude,
        lng: locationData.longitude,
        city: locationData.city,
        state: locationData.state,
      });

      // Update the document
      await updateDoc(doc(db, 'companies', companyId), {
        primaryLocation: locationData,
        locationData: locationData,
        serviceRadius: companyData.serviceRadius || 50,
      });

      console.log('✅ Successfully migrated');
      
      if (locationData.latitude === 0 && locationData.longitude === 0) {
        return {
          success: true,
          needsManualUpdate: true,
          message: 'Migration successful, but coordinates are 0,0. Please update your location in Company Settings for accurate disease notifications.',
        };
      }
      
      return {
        success: true,
        alreadyMigrated: false,
        message: 'Successfully migrated company location!',
      };
    }

    throw new Error('Unknown location format');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}