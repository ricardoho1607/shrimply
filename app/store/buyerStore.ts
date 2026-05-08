// store/buyerStore.ts - Fixed version with proper initialization
import { create } from "zustand";
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface MonitoredCompany {
  id: string;
  companyName: string;
  location: string;
  farmType?: string;
  businessSize?: string;
  contactPhone?: string;
  dateAdded: string;
}

interface BuyerStore {
  monitoredCompanies: MonitoredCompany[];
  currentUserId?: string;
  isInitialized: boolean;
  
  addMonitoredCompany: (company: MonitoredCompany, userId: string) => Promise<void>;
  removeMonitoredCompany: (companyId: string, userId: string) => Promise<void>;
  loadMonitoredCompanies: (userId: string) => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  clearData: () => void;
}

export const useBuyerStore = create<BuyerStore>()(
    (set, get) => ({
      monitoredCompanies: [],
      currentUserId: undefined,
      isInitialized: false,
      
      switchUser: async (userId: string) => {
        const state = get();
        if (state.currentUserId !== userId) {
          console.log(`Switching buyer user from ${state.currentUserId} to ${userId}`);
          set({ 
            monitoredCompanies: [], 
            currentUserId: userId,
            isInitialized: false 
          });
          await get().loadMonitoredCompanies(userId);
        } else if (!state.isInitialized) {
          await get().loadMonitoredCompanies(userId);
        }
      },
      
      clearData: () => {
        set({ 
          monitoredCompanies: [], 
          currentUserId: undefined,
          isInitialized: false 
        });
      },
      
      addMonitoredCompany: async (company: MonitoredCompany, userId: string) => {
        const state = get();
        const exists = state.monitoredCompanies.find(c => c.id === company.id);
        if (exists) {
          console.log('Company already monitored:', company.id);
          return;
        }
        
        try {
          const docRef = doc(db, 'users', userId, 'monitoredCompanies', company.id);
          const companyData = {
            ...company,
            dateAdded: company.dateAdded || new Date().toISOString()
          };
          await setDoc(docRef, companyData);
          console.log('Company added to Firebase:', company.id);
          
          set((state) => ({
            monitoredCompanies: [...state.monitoredCompanies, companyData]
          }));
          console.log('Company added to local state. Total:', get().monitoredCompanies.length);
        } catch (error) {
          console.error('Error syncing company to Firebase:', error);
          throw error;
        }
      },
      
      removeMonitoredCompany: async (companyId: string, userId: string) => {
        const state = get();
        const companyToRemove = state.monitoredCompanies.find(c => c.id === companyId);
        
        set((state) => ({
          monitoredCompanies: state.monitoredCompanies.filter(c => c.id !== companyId)
        }));
        
        try {
          const docRef = doc(db, 'users', userId, 'monitoredCompanies', companyId);
          await deleteDoc(docRef);
          console.log('Company removed from Firebase:', companyId);
        } catch (error) {
          console.error('Error removing company from Firebase:', error);
          if (companyToRemove) {
            set((state) => ({
              monitoredCompanies: [...state.monitoredCompanies, companyToRemove]
            }));
          }
        }
      },
      
      loadMonitoredCompanies: async (userId: string) => {
        if (!userId) {
          console.error('No user ID provided to loadMonitoredCompanies');
          return;
        }
        
        try {
          console.log('Loading monitored companies from Firebase for user:', userId);
          const companiesRef = collection(db, 'users', userId, 'monitoredCompanies');
          const snapshot = await getDocs(companiesRef);
          
          const companies: MonitoredCompany[] = [];
          snapshot.forEach((doc) => {
            companies.push({
              id: doc.id,
              ...doc.data()
            } as MonitoredCompany);
          });
          
          console.log(`Loaded ${companies.length} monitored companies from Firebase`);
          set({ 
            monitoredCompanies: companies,
            isInitialized: true 
          });
        } catch (error) {
          console.error('Error loading monitored companies from Firebase:', error);
          set({ isInitialized: true });
        }
      },
    })
);
