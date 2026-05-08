// app/store/marketplaceStore.ts - With country filtering
import { create } from 'zustand';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export type PaymentMethod = 'cash' | 'top';

export interface PriceList {
  size20?: number;
  size30?: number;
  size40?: number;
  size50?: number;
  size60?: number;
  size70?: number;
  size80?: number;
  size90?: number;
  size100?: number;
  size100Plus?: number;
}

export interface BuyerListing {
  id: string;
  companyId: string;
  companyName: string;
  buyerName: string;
  contactPhone: string;
  contactEmail: string;
  deliveryLocation: string;
  city: string; // NEW: City field
  latitude: number; // NEW: Latitude
  longitude: number; // NEW: Longitude
  country: string; // NEW: Country field
  priceList: PriceList;
  paymentMethod: PaymentMethod;
  topDays?: number;
  additionalNotes?: string;
  postedDate: string;
  expiryDate: string;
  viewCount: number;
  status: 'active' | 'expired';
  userId?: string; // Add userId to track the creator
  createdBy?: string;
}

export interface SellerResponse {
  id: string;
  listingId: string;
  sellerId: string;
  sellerName: string;
  sellerCompany: string;
  message: string;
  proposedPrice?: PriceList;
  contactPhone: string;
  contactEmail: string;
  responseDate: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface MarketplaceState {
  currentCompanyId: string | null;
  currentCountry: string | null; // NEW: Store user's country
  buyerListings: BuyerListing[];
  sellerResponses: SellerResponse[];
  
  // Actions
  switchAccount: (companyId: string, country: string) => void; // Updated to include country
  addBuyerListing: (listing: Omit<BuyerListing, 'id' | 'postedDate' | 'viewCount' | 'status'>) => Promise<void>;
  deleteBuyerListing: (listingId: string) => Promise<void>;
  updateBuyerListing: (listingId: string, updates: Partial<BuyerListing>) => Promise<void>;
  getActiveBuyerListings: () => BuyerListing[];
  getAllActiveListings: () => BuyerListing[]; // Now filters by country
  getBuyerListingById: (listingId: string) => BuyerListing | undefined;
  incrementViewCount: (listingId: string) => Promise<void>;
  
  // Seller Response Actions
  addSellerResponse: (response: Omit<SellerResponse, 'id' | 'responseDate' | 'status'>) => Promise<void>;
  updateSellerResponseStatus: (responseId: string, status: 'pending' | 'accepted' | 'rejected') => Promise<void>;
  getSellerResponsesForListing: (listingId: string) => SellerResponse[];
  
  // Persistence
  loadData: () => Promise<void>;
  loadAllListings: () => Promise<void>;
  saveData: () => Promise<void>;
}

const LISTINGS_COLLECTION = 'marketplace_listings';
const RESPONSES_COLLECTION = 'marketplace_responses';

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  currentCompanyId: null,
  currentCountry: null,
  buyerListings: [],
  sellerResponses: [],

  switchAccount: (companyId: string, country: string) => {
    set({ currentCompanyId: companyId, currentCountry: country });
    get().loadData();
    get().loadAllListings();
  },

  addBuyerListing: async (listing) => {
    // Remove undefined values before sending to Firestore
    const cleanedListing: any = {
      ...listing,
      postedDate: new Date().toISOString(),
      viewCount: 0,
      status: 'active',
      companyId: listing.companyId || '',
      country: listing.country, // Ensure country is included
      userId: listing.userId, // Store the creator's UID
      createdBy: listing.userId,
      createdAt: serverTimestamp(),
    };

    // Remove undefined fields
    Object.keys(cleanedListing).forEach(key => {
      if (cleanedListing[key] === undefined) {
        delete cleanedListing[key];
      }
    });

    try {
      const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), cleanedListing);
      
      // Add to local state with the Firestore ID
      const listingWithId: BuyerListing = {
        companyId: listing.companyId || '',
        companyName: listing.companyName,
        buyerName: listing.buyerName,
        contactPhone: listing.contactPhone,
        contactEmail: listing.contactEmail,
        deliveryLocation: listing.deliveryLocation,
        city: listing.city || '',
        latitude: listing.latitude || 0,
        longitude: listing.longitude || 0,
        country: listing.country,
        priceList: listing.priceList,
        paymentMethod: listing.paymentMethod,
        additionalNotes: listing.additionalNotes,
        expiryDate: listing.expiryDate,
        id: docRef.id,
        postedDate: cleanedListing.postedDate,
        viewCount: 0,
        status: 'active',
        userId: listing.userId,
        createdBy: listing.userId,
      };

      // Only add topDays if it exists
      if (listing.topDays !== undefined) {
        listingWithId.topDays = listing.topDays;
      }
      
      set((state) => ({
        buyerListings: [...state.buyerListings, listingWithId],
      }));

      console.log('Listing created with ID:', docRef.id);
    } catch (error) {
      console.error('Failed to add buyer listing:', error);
      throw error;
    }
  },

  deleteBuyerListing: async (listingId: string) => {
    try {
      await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId));
      
      set((state) => ({
        buyerListings: state.buyerListings.filter((listing) => listing.id !== listingId),
      }));

      // Delete associated responses
      const responsesQuery = query(
        collection(db, RESPONSES_COLLECTION),
        where('listingId', '==', listingId)
      );
      const responsesSnapshot = await getDocs(responsesQuery);
      
      const deletePromises = responsesSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      set((state) => ({
        sellerResponses: state.sellerResponses.filter((response) => response.listingId !== listingId),
      }));
    } catch (error) {
      console.error('Failed to delete buyer listing:', error);
      throw error;
    }
  },

  updateBuyerListing: async (listingId: string, updates: Partial<BuyerListing>) => {
    try {
      const updateData: any = { ...updates, updatedAt: serverTimestamp() };
      await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), updateData);

      set((state) => ({
        buyerListings: state.buyerListings.map((listing) =>
          listing.id === listingId ? { ...listing, ...updates } : listing
        ),
      }));
    } catch (error) {
      console.error('Failed to update buyer listing:', error);
      throw error;
    }
  },

  getActiveBuyerListings: () => {
    const now = new Date();
    const companyId = get().currentCompanyId;
    return get().buyerListings.filter((listing) => {
      const expiryDate = new Date(listing.expiryDate);
      return expiryDate > now && listing.companyId === companyId;
    });
  },

  // Updated to filter by country
  getAllActiveListings: () => {
    const now = new Date();
    const userCountry = get().currentCountry;
    
    return get().buyerListings.filter((listing) => {
      const expiryDate = new Date(listing.expiryDate);
      const isActive = expiryDate > now;
      const isSameCountry = listing.country === userCountry;
      
      return isActive && isSameCountry;
    });
  },

  getBuyerListingById: (listingId: string) => {
    return get().buyerListings.find((listing) => listing.id === listingId);
  },

  incrementViewCount: async (listingId: string) => {
    try {
      await updateDoc(doc(db, LISTINGS_COLLECTION, listingId), {
        viewCount: increment(1),
      });

      set((state) => ({
        buyerListings: state.buyerListings.map((listing) =>
          listing.id === listingId
            ? { ...listing, viewCount: listing.viewCount + 1 }
            : listing
        ),
      }));
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  },

  addSellerResponse: async (response) => {
    const newResponse = {
      ...response,
      responseDate: new Date().toISOString(),
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, RESPONSES_COLLECTION), newResponse);

      const responseWithId: SellerResponse = {
        ...response,
        id: docRef.id,
        responseDate: newResponse.responseDate,
        status: 'pending',
      };

      set((state) => ({
        sellerResponses: [...state.sellerResponses, responseWithId],
      }));
    } catch (error) {
      console.error('Failed to add seller response:', error);
      throw error;
    }
  },

  updateSellerResponseStatus: async (responseId: string, status: 'pending' | 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, RESPONSES_COLLECTION, responseId), {
        status,
        updatedAt: serverTimestamp(),
      });

      set((state) => ({
        sellerResponses: state.sellerResponses.map((response) =>
          response.id === responseId ? { ...response, status } : response
        ),
      }));
    } catch (error) {
      console.error('Failed to update seller response status:', error);
      throw error;
    }
  },

  getSellerResponsesForListing: (listingId: string) => {
    return get().sellerResponses.filter((response) => response.listingId === listingId);
  },

  loadData: async () => {
    try {
      const companyId = get().currentCompanyId;
      if (!companyId) return;

      // Load responses for this company
      const responsesQuery = query(
        collection(db, RESPONSES_COLLECTION),
        where('sellerId', '==', companyId)
      );
      const responsesSnapshot = await getDocs(responsesQuery);
      
      const responses: SellerResponse[] = responsesSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as SellerResponse));

      set({ sellerResponses: responses });
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    }
  },

  // Updated to filter by country
  loadAllListings: async () => {
    try {
      const userCountry = get().currentCountry;
      if (!userCountry) {
        console.warn('No country set, loading all listings');
        const listingsSnapshot = await getDocs(collection(db, LISTINGS_COLLECTION));
        const listings: BuyerListing[] = listingsSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        } as BuyerListing));
        set({ buyerListings: listings });
        return;
      }

      // Query only listings from the user's country
      const listingsQuery = query(
        collection(db, LISTINGS_COLLECTION),
        where('country', '==', userCountry)
      );
      const listingsSnapshot = await getDocs(listingsQuery);
      
      const listings: BuyerListing[] = listingsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as BuyerListing));

      set({ buyerListings: listings });
      console.log(`Loaded ${listings.length} listings for country: ${userCountry}`);
    } catch (error) {
      console.error('Failed to load global listings:', error);
    }
  },

  saveData: async () => {
    // No-op for Firestore (data is saved immediately on each action)
    // Kept for API compatibility
  },
}));