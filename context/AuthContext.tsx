// context/AuthContext.tsx - Fixed version with stable references and proper hook ordering
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  sendEmailVerification
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc,
  serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import firebaseApp, { auth, db } from '../config/firebase';
import { googlePlacesService, LocationData } from '../app/services/googlePlacesService'
import { useBuyerStore } from '../app/store/buyerStore';
import { usePondStore } from '../app/store/pondStore';
import { syncPublicCompanyProfile } from '../app/utils/publicCompanyProfile';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { getSystemTimeZone, isValidTimeZone, resolveFarmTimeZone } from '../shared/farmDate';
import { isCompanyProfileComplete, isUserOnboardingComplete } from '../shared/onboarding';

type UserRole = 'owner' | 'co-owner' | 'technician' | 'manager' | 'admin' | 'buyer' | 'mechanic';
type StaffRole = 'co-owner' | 'manager' | 'technician' | 'admin' | 'mechanic';

interface User {
  id: string;
  uid: string;
  email: string;
  name?: string;
  phone?: string;
  profileImage?: string;
  role?: UserRole;
  hasCompletedSetup: boolean;
  companyId?: string;
  invitedBy?: string;
  inviteToken?: string;
  joinedDate?: string;
  lastActive?: string;
}

interface Company {
  id: string;
  companyName: string;
  primaryLocation: string | LocationData;
  farmType: string;
  businessSize: 'small' | 'medium' | 'large' | 'enterprise';
  description: string;
  contactPhone: string;
  isPublicProfile: boolean;
  country?: string;
  ownerId: string;
  teamMembers: string[];
  pendingInvites: PendingInvite[];
  serviceRadius?: number;
  locationData?: LocationData;
  isSearchable?: boolean;
  logo?: string;
  logoUrl?: string;
  timeZone?: string;
  harvestProjectionMarketPrices?: Record<string, number>;
}

const getEffectiveUserRole = (user: User | null, company: Company | null): User['role'] | undefined => {
  if (!user) return undefined;
  const ownsFarmCompany = company?.ownerId === user.uid && company?.farmType !== 'buyer';
  return ownsFarmCompany ? 'owner' : user.role;
};

const OWNER_ROLES: UserRole[] = ['owner', 'co-owner'];
const STAFF_SETUP_ROLES: UserRole[] = ['co-owner', 'technician', 'manager', 'admin', 'mechanic'];
const isOwnerRole = (role?: UserRole | null) => !!role && OWNER_ROLES.includes(role);
const isProtectedOwnerRole = (role?: UserRole | null) => role === 'owner' || role === 'co-owner';

interface PendingInvite {
  email: string;
  role: UserRole;
  invitedBy: string;
  inviteToken: string;
  inviteDate: string;
  message?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  companyId?: string;
}

interface CompanyInviteResult {
  inviteId: string;
  inviteToken: string;
  inviteLink: string;
  expiresAt: string;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  lastActive?: string;
}

interface JoinRequest {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedRole: StaffRole;
  message?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  processedBy?: string;
  processedAt?: string;
}

interface CompanySearchResult {
  id: string;
  companyName: string;
  region: string;
  country: string;
  farmType: string;
  businessSize: string;
  memberCount: number;
  logo?: string;
  logoUrl?: string;
}

interface CompanySetupData {
  companyName: string;
  primaryLocation: string | LocationData;
  country?: string;
  farmType: string;
  businessSize: 'small' | 'medium' | 'large' | 'enterprise';
  description: string;
  contactPhone: string;
  isPublicProfile: boolean;
  serviceRadius?: number;
  locationData?: LocationData;
  timeZone?: string;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string, inviteToken?: string, keepMeSignedIn?: boolean) => Promise<void>;
  signUp: (email: string, password: string, inviteToken?: string, keepMeSignedIn?: boolean) => Promise<void>;
  signInWithGoogle: (inviteToken?: string, idToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeRoleSelection: (role: UserRole) => Promise<void>;
  completeCompanySetup: (companyData: CompanySetupData) => Promise<void>;
  updateUserProfile?: (profileData: { name?: string; phone?: string; profileImage?: string }) => Promise<void>;
  inviteTeamMember?: (inviteData: { email: string; role: StaffRole; message?: string }) => Promise<CompanyInviteResult>;
  requestToJoinCompany: (request: { companyId: string; requestedRole: StaffRole; message?: string }) => Promise<void>;
  searchCompanies: (query: string) => Promise<CompanySearchResult[]>;
  getJoinRequests: () => Promise<JoinRequest[]>;
  approveJoinRequest: (requestId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  getTeamMembers: () => Promise<TeamMember[]>;
  acceptInvite: (inviteToken: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshCompanyData: (overrideCompanyId?: string) => Promise<void>;
  isAuthenticated: boolean;
  needsRoleSelection: boolean;
  needsSetup: boolean;
  isBuyer: boolean;
  getCompanyLocationData: () => LocationData | null;
  getCompanyLocationString: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const firebaseFunctions = getFunctions(firebaseApp);

const convertStringToLocationData = (locationString: string): LocationData => ({
  address: locationString,
  city: locationString.split(',')[0]?.trim() || locationString,
  state: locationString.split(',')[1]?.trim() || 'Unknown State',
  country: 'Indonesia',
  latitude: 0,
  longitude: 0,
  placeId: `legacy-${Date.now()}`,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyResolved, setCompanyResolved] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const previousCompanyRef = useRef<Company | null>(null);
  const timeZoneMigrationRef = useRef<Set<string>>(new Set());
  const publicMemberCountSyncRef = useRef<Map<string, number>>(new Map());
  const clearPondData = usePondStore((state) => state.clearData);
  const clearBuyerData = useBuyerStore((state) => state.clearData);

  useEffect(() => {
    // Only need this on web to complete the redirect flow
    if (Platform.OS === 'web') {
      WebBrowser.maybeCompleteAuthSession();
    }
  }, []);

  const setupCompanyListener = useCallback((companyId: string, canSyncPublicProfile: boolean) => {
    setCompanyResolved(false);
    return onSnapshot(doc(db, 'companies', companyId), (companyDoc) => {
      if (companyDoc.exists()) {
        const companyData = companyDoc.data() as Company;
        usePondStore.getState().switchAccount(companyId, companyData.timeZone);
        
        if (JSON.stringify(previousCompanyRef.current) !== JSON.stringify(companyData)) {
          previousCompanyRef.current = companyData;
          setCompany(companyData);
        }

        const publicMemberCount = new Set([
          ...(Array.isArray(companyData.teamMembers) ? companyData.teamMembers : []),
          companyData.ownerId,
        ].filter((memberId): memberId is string => typeof memberId === 'string' && Boolean(memberId.trim()))).size;
        if ((canSyncPublicProfile || companyData.ownerId === auth.currentUser?.uid)
          && (companyData.isPublicProfile === true || companyData.isSearchable === true)
          && publicMemberCountSyncRef.current.get(companyId) !== publicMemberCount) {
          publicMemberCountSyncRef.current.set(companyId, publicMemberCount);
          void syncPublicCompanyProfile(companyId, companyData).catch((error) => {
            publicMemberCountSyncRef.current.delete(companyId);
            console.log('Public company member count sync failed (non-critical):', error);
          });
        }

        if (!isValidTimeZone(companyData.timeZone)
          && companyData.ownerId === auth.currentUser?.uid
          && !timeZoneMigrationRef.current.has(companyId)) {
          timeZoneMigrationRef.current.add(companyId);
          const location = typeof companyData.primaryLocation === 'object'
            ? companyData.primaryLocation
            : companyData.locationData;

          void (async () => {
            const detectedTimeZone = location
              && Number.isFinite(location.latitude)
              && Number.isFinite(location.longitude)
              && (location.latitude !== 0 || location.longitude !== 0)
              ? await googlePlacesService.getTimeZone(location.latitude, location.longitude)
                .catch(() => getSystemTimeZone())
              : getSystemTimeZone();

            try {
              await updateDoc(doc(db, 'companies', companyId), {
                timeZone: resolveFarmTimeZone(detectedTimeZone),
                updatedAt: serverTimestamp(),
              });
            } catch (error) {
              timeZoneMigrationRef.current.delete(companyId);
              console.log('Company timezone migration failed (non-critical):', error);
            }
          })();
        }
        
        if (companyData.primaryLocation && typeof companyData.primaryLocation === 'string' && !companyData.locationData) {
          setTimeout(async () => {
            try {
              const locationData = convertStringToLocationData(companyData.primaryLocation as string);
              await updateDoc(doc(db, 'companies', companyId), { locationData, serviceRadius: 50 });
            } catch (error) {
              console.log('Background migration failed (non-critical):', error);
            }
          }, 2000);
        }
      } else {
        if (previousCompanyRef.current !== null) {
          previousCompanyRef.current = null;
          setCompany(null);
        }
      }
      setCompanyResolved(true);
    }, (error) => {
      console.error('Error listening to company data:', error);
      if (previousCompanyRef.current !== null) {
        previousCompanyRef.current = null;
        setCompany(null);
      }
      setCompanyResolved(true);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    let userUnsubscribe: (() => void) | null = null;
    let companyUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (!isMounted) return;
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }
      if (companyUnsubscribe) {
        companyUnsubscribe();
        companyUnsubscribe = null;
      }

      if (firebaseUser) {
        userUnsubscribe = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          async (userDoc) => {
            if (!isMounted) return;
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              setUser(userData);

              if (companyUnsubscribe) {
                companyUnsubscribe();
                companyUnsubscribe = null;
              }
              if (userData.companyId) {
                companyUnsubscribe = setupCompanyListener(userData.companyId, isOwnerRole(userData.role));
              } else {
                previousCompanyRef.current = null;
                setCompany(null);
                setCompanyResolved(true);
              }
            } else {
              const newUser: User = {
                id: firebaseUser.uid, uid: firebaseUser.uid, email: firebaseUser.email || '',
                hasCompletedSetup: false, joinedDate: new Date().toISOString(), lastActive: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              setUser(newUser);
              previousCompanyRef.current = null;
              setCompany(null);
              setCompanyResolved(true);
            }
            setInitializing(false);
          },
          (error) => {
            console.error('Error listening to user data:', error);
            if (isMounted) setInitializing(false);
          }
        );
      } else {
        setUser(null);
        previousCompanyRef.current = null;
        setCompany(null);
        setCompanyResolved(true);
        setInitializing(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (userUnsubscribe) userUnsubscribe();
      if (companyUnsubscribe) companyUnsubscribe();
    };
  }, [setupCompanyListener]);

  const refreshCompanyData = useCallback(async (overrideCompanyId?: string) => {
    const targetCompanyId = overrideCompanyId || user?.companyId;
    if (!targetCompanyId) return;
    try {
      const companyDoc = await getDoc(doc(db, 'companies', targetCompanyId));
      if (companyDoc.exists()) {
        const newCompanyData = companyDoc.data() as Company;
        if (JSON.stringify(previousCompanyRef.current) !== JSON.stringify(newCompanyData)) {
          previousCompanyRef.current = newCompanyData;
          setCompany(newCompanyData);
        }
        setCompanyResolved(true);
      } else {
        if (previousCompanyRef.current !== null) {
          previousCompanyRef.current = null;
          setCompany(null);
        }
        setCompanyResolved(true);
      }
    } catch (error) {
      console.error('Error refreshing company data:', error);
      throw error;
    }
  }, [user?.companyId]);

  const refreshUserData = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUser(userData);
        if (userData.companyId) await refreshCompanyData();
        else {
          previousCompanyRef.current = null;
          setCompany(null);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  }, [refreshCompanyData]);

  const signIn = async (email: string, password: string, inviteToken?: string, keepMeSignedIn: boolean = true) => {
    setLoading(true);
    try {
      try {
        let persistence;
        if (Platform.OS === 'web') {
          persistence = keepMeSignedIn ? browserLocalPersistence : browserSessionPersistence;
        } else {
          persistence = keepMeSignedIn ? undefined : inMemoryPersistence;
        }
        if (persistence) await setPersistence(auth, persistence);
      } catch (pError) {
        console.error('Error setting persistence:', pError);
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (inviteToken) await processInviteAfterAuth(userCredential.user.uid, inviteToken);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUser(userData);
        if (userData.companyId) await refreshCompanyData(userData.companyId);
      } else {
        const newUser: User = {
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          email: userCredential.user.email || email,
          hasCompletedSetup: false,
          joinedDate: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
        setUser(newUser);
        previousCompanyRef.current = null;
        setCompany(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, inviteToken?: string, keepMeSignedIn: boolean = true) => {
    setLoading(true);
    try {
      try {
        let persistence;
        if (Platform.OS === 'web') {
          persistence = keepMeSignedIn ? browserLocalPersistence : browserSessionPersistence;
        } else {
          persistence = keepMeSignedIn ? undefined : inMemoryPersistence;
        }
        if (persistence) await setPersistence(auth, persistence);
      } catch (pError) {
        console.error('Error setting persistence:', pError);
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser: User = {
        id: userCredential.user.uid, uid: userCredential.user.uid, email,
        hasCompletedSetup: false, joinedDate: new Date().toISOString(), lastActive: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      if (inviteToken) await processInviteAfterAuth(userCredential.user.uid, inviteToken);
    } finally {
      setLoading(false);
    }
  };

  const processInviteAfterAuth = async (userId: string, inviteToken: string) => {
    try {
      if (auth.currentUser?.uid !== userId) throw new Error('Authenticated user mismatch');
      if (!auth.currentUser.emailVerified) {
        try {
          await sendEmailVerification(auth.currentUser);
        } finally {
          await firebaseSignOut(auth);
        }
        throw new Error('Verification email sent. Verify your email, then reopen the invitation link to join the company.');
      }
      await auth.currentUser.getIdToken(true);
      const acceptCompanyInvite = httpsCallable(firebaseFunctions, 'acceptCompanyInvite');
      await acceptCompanyInvite({ inviteToken });
      await refreshUserData();
    } catch (error) {
      console.error('Error processing invite:', error);
      throw error;
    }
  };

  const signInWithGoogle = async (inviteToken?: string, idToken?: string) => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        if (inviteToken) await processInviteAfterAuth(result.user.uid, inviteToken);
        await refreshUserData();
      } else if (idToken) {
        // Native flow using the token provided by the component
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        if (inviteToken) await processInviteAfterAuth(userCredential.user.uid, inviteToken);
        await refreshUserData();
      } else {
        throw new Error('Google Sign-In: Missing ID Token for Native platform');
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() });
      } catch (error) {
        console.error('Error updating last active during sign out:', error);
      }
    }
    await firebaseSignOut(auth);
    clearPondData();
    clearBuyerData();
    setUser(null);
    previousCompanyRef.current = null;
    setCompany(null);
    setCompanyResolved(true);
    // Redirection is handled automatically by RootLayoutNav based on auth state
  };

  const completeRoleSelection = async (role: User['role']) => {
    if (!user) return;
    const updatedData: any = { role, lastActive: serverTimestamp() };
    if (role && STAFF_SETUP_ROLES.includes(role)) updatedData.hasCompletedSetup = false;
    await updateDoc(doc(db, 'users', user.uid), updatedData);
    setUser({ ...user, ...updatedData });
  };

  const completeCompanySetup = async (companyData: CompanySetupData) => {
  if (!user || (user.role !== 'owner' && company?.ownerId !== user.uid)) {
    throw new Error('Only owners can set up a company');
  }
  if (!isCompanyProfileComplete(companyData)) {
    throw new Error('Complete all required farm details before continuing');
  }

  try {
    const resumableCompany = user.companyId && company?.ownerId === user.uid ? company : null;
    const companyRef = resumableCompany
      ? doc(db, 'companies', resumableCompany.id)
      : doc(collection(db, 'companies'));
    
    let primaryLocation: string | LocationData;
    let locationData: LocationData | undefined;

    // Handle different location data formats
    if (typeof companyData.primaryLocation === 'string') {
      // String location provided
      primaryLocation = companyData.primaryLocation;
      // Check if locationData was provided separately
      if (companyData.locationData) {
        locationData = companyData.locationData;
      }
    } else {
      // LocationData object provided as primaryLocation
      locationData = companyData.primaryLocation;
      primaryLocation = companyData.primaryLocation;
    }

    // Build the company document
    const newCompany: any = {
      ...(resumableCompany || {}),
      id: companyRef.id,
      companyName: companyData.companyName,
      primaryLocation: primaryLocation,
      country: companyData.country || (locationData?.country) || '',
      farmType: companyData.farmType,
      businessSize: companyData.businessSize,
      description: companyData.description,
      contactPhone: companyData.contactPhone,
      isPublicProfile: companyData.isPublicProfile,
      ownerId: user.uid,
      teamMembers: resumableCompany?.teamMembers?.includes(user.uid)
        ? resumableCompany.teamMembers
        : [user.uid],
      pendingInvites: resumableCompany?.pendingInvites || [],
      serviceRadius: companyData.serviceRadius || 50,
      isSearchable: true,
      timeZone: resolveFarmTimeZone(companyData.timeZone, getSystemTimeZone()),
      updatedAt: serverTimestamp(),
      ...(!resumableCompany ? { createdAt: serverTimestamp() } : {}),
    };

    // Add locationData if available
    if (locationData) {
      newCompany.locationData = locationData;
    }

    console.log('Creating company with data:', newCompany);

    // Save to Firestore
    await setDoc(companyRef, newCompany, { merge: Boolean(resumableCompany) });
    await syncPublicCompanyProfile(companyRef.id, newCompany);

    // Update user document
    await updateDoc(doc(db, 'users', user.uid), {
      hasCompletedSetup: true,
      companyId: newCompany.id,
      lastActive: serverTimestamp()
    });

    console.log('Company created successfully with ID:', newCompany.id);

    // Update local state
    setUser({ ...user, hasCompletedSetup: true, companyId: newCompany.id });
    setCompanyResolved(true);
    
    // Trigger company data refresh
    await refreshCompanyData(newCompany.id);
  } catch (error) {
    console.error('Error in completeCompanySetup:', error);
    throw error;
  }
};

  const updateUserProfile = useCallback(async (profileData: { name?: string; phone?: string; profileImage?: string }) => {
    if (!user) throw new Error('User must be authenticated to update profile');
    try {
      const updateData: any = { lastActive: serverTimestamp() };
      if (profileData.name !== undefined) updateData.name = profileData.name;
      if (profileData.phone !== undefined) updateData.phone = profileData.phone;
      if (profileData.profileImage !== undefined) updateData.profileImage = profileData.profileImage;

      await updateDoc(doc(db, 'users', user.uid), updateData);
      setUser({ ...user, ...updateData });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }, [user]);

  const requestToJoinCompany = useCallback(async (request: { companyId: string; requestedRole: StaffRole; message?: string }) => {
    if (!user) throw new Error('User must be authenticated to request joining a company');
    if (user.companyId) throw new Error('You are already part of a company');
    if (!auth.currentUser?.emailVerified) {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      throw new Error('Verification email sent. Verify your email before requesting company access.');
    }
    await auth.currentUser.getIdToken(true);
    const teamAccess = httpsCallable(firebaseFunctions, 'acceptCompanyInvite');
    await teamAccess({ operation: 'createCompanyJoinRequest', ...request });
  }, [user]);

  const searchCompanies = useCallback(async (searchTerm: string): Promise<CompanySearchResult[]> => {
    if (!searchTerm.trim()) return [];
    try {
      const companiesQuery = query(collection(db, 'publicCompanyProfiles'), where('isPublicProfile', '==', true));
      const companiesSnapshot = await getDocs(companiesQuery);
      const results: CompanySearchResult[] = [];

      companiesSnapshot.forEach((profileDoc) => {
        const companyData = profileDoc.data() as Partial<Company> & {
          companyId?: string;
          location?: string;
          publicMemberCount?: number;
        };
        const companyName = typeof companyData.companyName === 'string' ? companyData.companyName : '';
        if (companyName.toLowerCase().includes(searchTerm.toLowerCase())) {
          let region = '', country = '';
          if (companyData.locationData) {
            region = companyData.locationData.state || companyData.locationData.city || '';
            country = companyData.locationData.country || '';
          } else if (typeof companyData.primaryLocation === 'string') {
            const parts = companyData.primaryLocation.split(',');
            region = parts[0]?.trim() || '';
            country = parts[parts.length - 1]?.trim() || '';
          } else if (companyData.location) {
            const parts = companyData.location.split(',');
            region = parts[0]?.trim() || '';
            country = companyData.country || parts[parts.length - 1]?.trim() || '';
          }
          results.push({
            id: companyData.companyId || profileDoc.id, companyName, region, country,
            farmType: companyData.farmType || '', businessSize: companyData.businessSize || '',
            memberCount: typeof companyData.publicMemberCount === 'number' && Number.isFinite(companyData.publicMemberCount)
              ? Math.max(0, Math.floor(companyData.publicMemberCount))
              : 0,
            logo: companyData.logo, logoUrl: companyData.logoUrl,
          });
        }
      });
      return results;
    } catch (error) {
      console.error('Error searching companies:', error);
      throw error;
    }
  }, []);

  const getJoinRequests = useCallback(async (): Promise<JoinRequest[]> => {
    if (!user || !isOwnerRole(user.role) || !company) return [];
    try {
      const requestsQuery = query(collection(db, 'joinRequests'),
        where('companyId', '==', company.id), where('status', '==', 'pending')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests: JoinRequest[] = [];
      requestsSnapshot.forEach((doc) => requests.push({ id: doc.id, ...doc.data() } as JoinRequest));
      return requests;
    } catch (error) {
      console.error('Error getting join requests:', error);
      return [];
    }
  }, [user, company]);

  const approveJoinRequest = useCallback(async (requestId: string) => {
    if (!user || !isOwnerRole(user.role) || !company) throw new Error('Only company owners and co-owners can approve join requests');
    try {
      const teamAccess = httpsCallable(firebaseFunctions, 'acceptCompanyInvite');
      await teamAccess({ operation: 'processCompanyJoinRequest', requestId, decision: 'approve' });
      await refreshCompanyData();
    } catch (error) {
      console.error('Error approving join request:', error);
      throw error;
    }
  }, [user, company, refreshCompanyData]);

  const rejectJoinRequest = useCallback(async (requestId: string) => {
    if (!user || !isOwnerRole(user.role) || !company) throw new Error('Only company owners and co-owners can reject join requests');
    try {
      const teamAccess = httpsCallable(firebaseFunctions, 'acceptCompanyInvite');
      await teamAccess({ operation: 'processCompanyJoinRequest', requestId, decision: 'reject' });
    } catch (error) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  }, [user, company]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!user || !isOwnerRole(user.role) || !company) throw new Error('Only company owners and co-owners can remove members');
    if (memberId === user.uid) throw new Error('Cannot remove yourself');
    try {
      const memberDoc = await getDoc(doc(db, 'users', memberId));
      const memberRole = memberDoc.exists() ? (memberDoc.data() as User).role : undefined;
      if (isProtectedOwnerRole(memberRole) || memberId === company.ownerId) {
        throw new Error('Owners and co-owners cannot be removed from the team');
      }
      const teamAccess = httpsCallable(firebaseFunctions, 'acceptCompanyInvite');
      await teamAccess({ operation: 'removeCompanyMember', companyId: company.id, memberId });
      await refreshCompanyData();
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }, [user, company, refreshCompanyData]);

  const inviteTeamMember = useCallback(async (inviteData: { email: string; role: StaffRole; message?: string }): Promise<CompanyInviteResult> => {
    if (!user || !company || !isOwnerRole(user.role)) throw new Error('Only company owners and co-owners can send invitations');
    if (!auth.currentUser?.emailVerified) {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      throw new Error('Verification email sent. Verify your email before creating invitations.');
    }
    await auth.currentUser.getIdToken(true);
    const createInvite = httpsCallable<
      { operation: 'createCompanyInvite'; companyId: string; email: string; role: StaffRole; message?: string },
      CompanyInviteResult
    >(firebaseFunctions, 'acceptCompanyInvite');
    const response = await createInvite({ operation: 'createCompanyInvite', companyId: company.id, ...inviteData });
    return response.data;
  }, [user, company]);

  const getTeamMembers = useCallback(async (): Promise<TeamMember[]> => {
    if (!company) return [];
    const members: TeamMember[] = [];

    // Use a Set to avoid duplicates
    const allMemberIds = new Set<string>();
    
    // Always include the owner
    if (company.ownerId) {
      allMemberIds.add(company.ownerId);
    }
    
    // Add all other team members
    if (company.teamMembers && Array.isArray(company.teamMembers)) {
      company.teamMembers.forEach(id => allMemberIds.add(id));
    }

    for (const memberId of allMemberIds) {
      try {
        const memberDoc = await getDoc(doc(db, 'users', memberId));
        if (memberDoc.exists()) {
          const memberData = memberDoc.data() as User;
          
          // Ensure owner role is correctly set even if missing in user doc
          let role = memberData.role;
          if (memberId === company.ownerId) {
            role = 'owner';
          }
          
          members.push({
            id: memberData.id,
            email: memberData.email,
            name: memberData.name || memberData.email.split('@')[0],
            role: (role || 'technician') as TeamMember['role'], // Default to technician if role is missing and not owner
            status: 'active',
            joinedDate: memberData.joinedDate || '',
            lastActive: memberData.lastActive
          });
        }
      } catch (error) {
        console.error(`Error loading member ${memberId}:`, error);
      }
    }

    if (isOwnerRole(user?.role) && company.pendingInvites && Array.isArray(company.pendingInvites)) {
      for (const invite of company.pendingInvites) {
        if (invite.status === 'pending') {
          members.push({
            id: `invite_${invite.inviteToken}`,
            email: invite.email,
            name: invite.email.split('@')[0],
            role: invite.role,
            status: 'pending',
            joinedDate: invite.inviteDate,
          });
        }
      }
    }
    if (isOwnerRole(user?.role) && auth.currentUser?.emailVerified) {
      const listInvites = httpsCallable<
        { operation: 'listCompanyInvites'; companyId: string },
        { invites: { id: string; email: string; role: UserRole; status: string; createdAt: number | null }[] }
      >(firebaseFunctions, 'acceptCompanyInvite');
      const response = await listInvites({ operation: 'listCompanyInvites', companyId: company.id });
      response.data.invites.forEach((invite) => {
        if (invite.status !== 'pending') return;
        members.push({
          id: `invite_${invite.id}`,
          email: invite.email,
          name: invite.email.split('@')[0],
          role: invite.role,
          status: 'pending',
          joinedDate: invite.createdAt ? new Date(invite.createdAt).toISOString() : '',
        });
      });
    }
    return members;
  }, [company, user?.role]);

  const acceptInvite = useCallback(async (inviteToken: string) => {
    if (!user) throw new Error('User must be authenticated to accept invitations');
    await processInviteAfterAuth(user.uid, inviteToken);
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) setUser(userDoc.data() as User);
  }, [user]);

  const getCompanyLocationData = useCallback((): LocationData | null => {
    if (!company) return null;
    if (company.locationData) return company.locationData;
    if (typeof company.primaryLocation === 'string') return convertStringToLocationData(company.primaryLocation);
    if (typeof company.primaryLocation === 'object') return company.primaryLocation;
    return null;
  }, [company]);

  const getCompanyLocationString = useCallback((): string => {
    if (!company) return '';
    if (typeof company.primaryLocation === 'string') return company.primaryLocation;
    if (typeof company.primaryLocation === 'object') return company.primaryLocation.address;
    return '';
  }, [company]);

  // All hooks must be called before the conditional return
  // All hooks must be called before any conditional return
  const value: AuthContextType = useMemo(() => {
    // Company ownership is authoritative for farm companies, even if the user doc has a stale role.
    const effectiveRole = getEffectiveUserRole(user, company);
    const effectiveUser = user ? {
      ...user,
      role: effectiveRole,
    } : null;

    return {
      user: effectiveUser,
      company,
      loading: loading || initializing || (!!user?.companyId && !companyResolved),
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      completeRoleSelection,
      completeCompanySetup,
      updateUserProfile,
      inviteTeamMember,
      requestToJoinCompany,
      searchCompanies,
      getJoinRequests,
      approveJoinRequest,
      rejectJoinRequest,
      removeMember,
      getTeamMembers,
      acceptInvite,
      refreshUserData,
      refreshCompanyData,
      isAuthenticated: !!user,
      needsRoleSelection: !!user && !effectiveRole,
      needsSetup: !!effectiveUser && !!effectiveRole
        && !isUserOnboardingComplete(effectiveUser, company, companyResolved),
      isBuyer: effectiveRole === 'buyer',
      getCompanyLocationData,
      getCompanyLocationString,
    };
  }, [user, company, companyResolved, loading, initializing, updateUserProfile, inviteTeamMember, requestToJoinCompany, searchCompanies,
       getJoinRequests, approveJoinRequest, rejectJoinRequest, removeMember, getTeamMembers, acceptInvite,
       refreshUserData, refreshCompanyData, getCompanyLocationData, getCompanyLocationString]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
