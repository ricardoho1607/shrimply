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
  signInWithCredential
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc,
  arrayUnion, arrayRemove, serverTimestamp, onSnapshot, addDoc, writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import firebaseApp, { auth, db } from '../config/firebase';
import { LocationData } from '../app/services/googlePlacesService'
import { useBuyerStore } from '../app/store/buyerStore';
import { usePondStore } from '../app/store/pondStore';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

type UserRole = 'owner' | 'technician' | 'manager' | 'admin' | 'buyer' | 'mechanic';
type StaffRole = 'manager' | 'technician' | 'admin' | 'mechanic';

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
  businessSize: 'small' | 'medium' | 'large';
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
}

const getEffectiveUserRole = (user: User | null, company: Company | null): User['role'] | undefined => {
  if (!user) return undefined;
  const ownsFarmCompany = company?.ownerId === user.uid && company?.farmType !== 'buyer';
  return ownsFarmCompany ? 'owner' : user.role;
};

interface PendingInvite {
  email: string;
  role: UserRole;
  invitedBy: string;
  inviteToken: string;
  inviteDate: string;
  message?: string;
  status: 'pending' | 'accepted' | 'expired';
  companyId?: string;
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
  businessSize: 'small' | 'medium' | 'large';
  description: string;
  contactPhone: string;
  isPublicProfile: boolean;
  serviceRadius?: number;
  locationData?: LocationData;
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
  inviteTeamMember?: (inviteData: { email: string; role: StaffRole; message?: string }) => Promise<void>;
  requestToJoinCompany: (request: { companyId: string; requestedRole: StaffRole; message?: string }) => Promise<void>;
  searchCompanies: (query: string) => Promise<CompanySearchResult[]>;
  getJoinRequests: () => Promise<JoinRequest[]>;
  approveJoinRequest: (requestId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  getTeamMembers: () => Promise<TeamMember[]>;
  acceptInvite: (inviteToken: string) => Promise<void>;
  checkInviteToken: (token: string) => Promise<PendingInvite | null>;
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

const generateInviteToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const previousCompanyRef = useRef<Company | null>(null);
  const clearPondData = usePondStore((state) => state.clearData);
  const clearBuyerData = useBuyerStore((state) => state.clearData);

  useEffect(() => {
    // Only need this on web to complete the redirect flow
    if (Platform.OS === 'web') {
      WebBrowser.maybeCompleteAuthSession();
    }
  }, []);

  const setupCompanyListener = useCallback((companyId: string) => {
    return onSnapshot(doc(db, 'companies', companyId), (companyDoc) => {
      if (companyDoc.exists()) {
        const companyData = companyDoc.data() as Company;
        
        if (JSON.stringify(previousCompanyRef.current) !== JSON.stringify(companyData)) {
          previousCompanyRef.current = companyData;
          setCompany(companyData);
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
    }, (error) => {
      console.error('Error listening to company data:', error);
      if (previousCompanyRef.current !== null) {
        previousCompanyRef.current = null;
        setCompany(null);
      }
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
                companyUnsubscribe = setupCompanyListener(userData.companyId);
              } else {
                previousCompanyRef.current = null;
                setCompany(null);
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
      } else {
        if (previousCompanyRef.current !== null) {
          previousCompanyRef.current = null;
          setCompany(null);
        }
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
    // Redirection is handled automatically by RootLayoutNav based on auth state
  };

  const completeRoleSelection = async (role: User['role']) => {
    if (!user) return;
    const updatedData: any = { role, lastActive: serverTimestamp() };
    if (role === 'technician' || role === 'manager' || role === 'admin' || role === 'mechanic') updatedData.hasCompletedSetup = false;
    await updateDoc(doc(db, 'users', user.uid), updatedData);
    setUser({ ...user, ...updatedData });
  };

  const completeCompanySetup = async (companyData: CompanySetupData) => {
  if (!user || user.role !== 'owner') {
    throw new Error('Only owners can set up a company');
  }

  try {
    const companyRef = doc(collection(db, 'companies'));
    
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
      teamMembers: [user.uid],
      pendingInvites: [],
      serviceRadius: companyData.serviceRadius || 50,
      isSearchable: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Add locationData if available
    if (locationData) {
      newCompany.locationData = locationData;
    }

    console.log('Creating company with data:', newCompany);

    // Save to Firestore
    await setDoc(companyRef, newCompany);

    // Update user document
    await updateDoc(doc(db, 'users', user.uid), {
      hasCompletedSetup: true,
      companyId: newCompany.id,
      lastActive: serverTimestamp()
    });

    console.log('Company created successfully with ID:', newCompany.id);

    // Update local state
    setUser({ ...user, hasCompletedSetup: true, companyId: newCompany.id });
    
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

    const existingRequestQuery = query(collection(db, 'joinRequests'),
      where('userId', '==', user.uid), where('companyId', '==', request.companyId), where('status', '==', 'pending')
    );
    const existingRequests = await getDocs(existingRequestQuery);
    if (!existingRequests.empty) throw new Error('You already have a pending request for this company');

    const joinRequest: any = {
      companyId: request.companyId, userId: user.uid,
      userName: user.name || user.email.split('@')[0], userEmail: user.email,
      requestedRole: request.requestedRole, requestedAt: new Date().toISOString(), status: 'pending',
    };
    if (request.message) joinRequest.message = request.message;
    await addDoc(collection(db, 'joinRequests'), joinRequest);
  }, [user]);

  const searchCompanies = useCallback(async (searchTerm: string): Promise<CompanySearchResult[]> => {
    if (!searchTerm.trim()) return [];
    try {
      const companiesQuery = query(collection(db, 'companies'), where('isSearchable', '==', true));
      const companiesSnapshot = await getDocs(companiesQuery);
      const results: CompanySearchResult[] = [];

      companiesSnapshot.forEach((doc) => {
        const companyData = doc.data() as Company;
        if (companyData.companyName.toLowerCase().includes(searchTerm.toLowerCase())) {
          let region = '', country = '';
          if (companyData.locationData) {
            region = companyData.locationData.state || companyData.locationData.city || '';
            country = companyData.locationData.country || '';
          } else if (typeof companyData.primaryLocation === 'string') {
            const parts = companyData.primaryLocation.split(',');
            region = parts[0]?.trim() || '';
            country = parts[parts.length - 1]?.trim() || '';
          }
          results.push({
            id: companyData.id, companyName: companyData.companyName, region, country,
            farmType: companyData.farmType, businessSize: companyData.businessSize,
            memberCount: companyData.teamMembers?.length || 0,
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
    if (!user || user.role !== 'owner' || !company) return [];
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
    if (!user || user.role !== 'owner' || !company) throw new Error('Only company owners can approve join requests');
    try {
      const requestDoc = await getDoc(doc(db, 'joinRequests', requestId));
      if (!requestDoc.exists()) throw new Error('Join request not found');
      const requestData = requestDoc.data() as JoinRequest;
      if (requestData.companyId !== company.id) throw new Error('Join request does not belong to this company');
      if (requestData.status !== 'pending') throw new Error('Join request has already been processed');

      const batch = writeBatch(db);
      batch.update(doc(db, 'joinRequests', requestId), {
        status: 'approved', processedBy: user.uid, processedAt: new Date().toISOString(),
      });
      batch.update(doc(db, 'companies', company.id), {
        teamMembers: arrayUnion(user.uid, requestData.userId),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', requestData.userId), {
        companyId: company.id, role: requestData.requestedRole, hasCompletedSetup: true, lastActive: serverTimestamp()
      });
      await batch.commit();
      await refreshCompanyData();
    } catch (error) {
      console.error('Error approving join request:', error);
      throw error;
    }
  }, [user, company, refreshCompanyData]);

  const rejectJoinRequest = useCallback(async (requestId: string) => {
    if (!user || user.role !== 'owner' || !company) throw new Error('Only company owners can reject join requests');
    try {
      const requestDoc = await getDoc(doc(db, 'joinRequests', requestId));
      if (!requestDoc.exists()) throw new Error('Join request not found');
      await updateDoc(doc(db, 'joinRequests', requestId), {
        status: 'rejected', processedBy: user.uid, processedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error rejecting join request:', error);
      throw error;
    }
  }, [user, company]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!user || user.role !== 'owner' || !company) throw new Error('Only company owners can remove members');
    if (memberId === user.uid) throw new Error('Cannot remove yourself');
    try {
      await updateDoc(doc(db, 'companies', company.id), { teamMembers: arrayRemove(memberId) });
      await updateDoc(doc(db, 'users', memberId), { companyId: null, role: null, hasCompletedSetup: false });
      await refreshCompanyData();
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }, [user, company, refreshCompanyData]);

  const inviteTeamMember = useCallback(async (inviteData: { email: string; role: StaffRole; message?: string }) => {
    if (!user || !company || user.role !== 'owner') throw new Error('Only company owners can send invitations');

    const existingInvite = company.pendingInvites.find(invite => invite.email === inviteData.email && invite.status === 'pending');
    if (existingInvite) throw new Error('This email already has a pending invitation');

    const existingUserQuery = query(collection(db, 'users'), where('email', '==', inviteData.email));
    const existingUserDocs = await getDocs(existingUserQuery);
    if (!existingUserDocs.empty) {
      const existingUser = existingUserDocs.docs[0].data() as User;
      if (existingUser.companyId === company.id) throw new Error('This user is already part of your company');
    }

    const inviteToken = generateInviteToken();
    const newInvite: PendingInvite = {
      email: inviteData.email, role: inviteData.role, invitedBy: user.uid, inviteToken,
      inviteDate: new Date().toISOString(), message: inviteData.message,
      status: 'pending', companyId: company.id
    };
    await updateDoc(doc(db, 'companies', company.id), { pendingInvites: arrayUnion(newInvite) });
    console.log(`Invite link: shrimply://invite?token=${inviteToken}`);
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

    if (company.pendingInvites && Array.isArray(company.pendingInvites)) {
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
    return members;
  }, [company]);

  const checkInviteToken = useCallback(async (token: string): Promise<(PendingInvite & { companyId: string }) | null> => {
    try {
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      for (const companyDoc of companiesSnapshot.docs) {
        const companyData = companyDoc.data() as Company;
        const invite = companyData.pendingInvites?.find(inv => inv.inviteToken === token && inv.status === 'pending');
        if (invite) return { ...invite, companyId: companyData.id };
      }
      return null;
    } catch (error) {
      console.error('Error checking invite token:', error);
      return null;
    }
  }, []);

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
      loading: loading || initializing,
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
      checkInviteToken,
      refreshUserData,
      refreshCompanyData,
      isAuthenticated: !!user,
      needsRoleSelection: !!user && !effectiveRole,
      needsSetup: !!user && !!effectiveRole && !user.hasCompletedSetup,
      isBuyer: effectiveRole === 'buyer',
      getCompanyLocationData,
      getCompanyLocationString,
    };
  }, [user, company, loading, initializing, updateUserProfile, inviteTeamMember, requestToJoinCompany, searchCompanies, 
       getJoinRequests, approveJoinRequest, rejectJoinRequest, removeMember, getTeamMembers, acceptInvite,
       checkInviteToken, refreshUserData, refreshCompanyData, getCompanyLocationData, getCompanyLocationString]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
