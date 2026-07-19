"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc,
  arrayUnion, serverTimestamp, onSnapshot, addDoc, writeBatch, deleteField
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db } from '@/lib/firebase';
import { syncPublicCompanyProfile } from '@/lib/publicCompanyProfile';
import { getSystemTimeZone, isValidTimeZone, resolveFarmTimeZone } from '../../../shared/farmDate';

type UserRole = 'owner' | 'co-owner' | 'technician' | 'manager' | 'admin' | 'buyer' | 'mechanic';
type StaffRole = 'co-owner' | 'manager' | 'technician' | 'admin' | 'mechanic';

const OWNER_ROLES: UserRole[] = ['owner', 'co-owner'];
const isOwnerRole = (role?: UserRole | null) => !!role && OWNER_ROLES.includes(role);

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
  primaryLocation?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    placeId?: string;
  } | string;
  farmType: string;
  businessSize: 'small' | 'medium' | 'large';
  description: string;
  contactPhone: string;
  isPublicProfile: boolean;
  isSearchable?: boolean;
  ownerId: string;
  teamMembers: string[];
  pendingInvites: PendingInvite[];
  timeZone?: string;
  harvestProjectionMarketPrices?: Record<string, number>;
}

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
  primaryLocation?: { address?: string } | string;
  farmType?: string;
  businessSize?: string;
  memberCount: number;
}

interface CompanySetupData {
  companyName: string;
  primaryLocation: Company['primaryLocation'];
  farmType: string;
  businessSize: 'small' | 'medium' | 'large';
  description: string;
  contactPhone: string;
  isPublicProfile: boolean;
  isSearchable?: boolean;
  timeZone?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string, keepMeSignedIn?: boolean, inviteToken?: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, inviteToken?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeRoleSelection: (role: UserRole) => Promise<void>;
  resetRoleSelection: () => Promise<void>;
  completeCompanySetup: (companyData: CompanySetupData) => Promise<void>;
  requestToJoinCompany: (request: { companyId: string; requestedRole: StaffRole; message?: string }) => Promise<void>;
  searchCompanies: (searchTerm: string) => Promise<CompanySearchResult[]>;
  getJoinRequests: () => Promise<JoinRequest[]>;
  approveJoinRequest: (requestId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  refreshCompanyData: () => Promise<void>;
  isAuthenticated: boolean;
  needsRoleSelection: boolean;
  needsSetup: boolean;
  isBuyer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const firebaseFunctions = getFunctions(app);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const timeZoneMigrationRef = useRef<Set<string>>(new Set());
  const router = useRouter();

  const setupCompanyListener = useCallback((companyId: string) => {
    return onSnapshot(doc(db, 'companies', companyId), (companyDoc) => {
      if (companyDoc.exists()) {
        const companyData = companyDoc.data() as Company;
        setCompany({ ...companyData, id: companyData.id || companyDoc.id });
        if (!isValidTimeZone(companyData.timeZone)
          && companyData.ownerId === auth.currentUser?.uid
          && !timeZoneMigrationRef.current.has(companyId)) {
          timeZoneMigrationRef.current.add(companyId);
          void updateDoc(doc(db, 'companies', companyId), {
            timeZone: getSystemTimeZone(),
            updatedAt: serverTimestamp(),
          }).catch((error) => {
            timeZoneMigrationRef.current.delete(companyId);
            console.warn('Company timezone migration failed:', error);
          });
        }
      } else {
        setCompany(null);
      }
    });
  }, []);

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    let companyUnsubscribe: (() => void) | null = null;
    let currentCompanyId: string | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      // Clean up previous listeners
      if (userUnsubscribe) userUnsubscribe();
      if (companyUnsubscribe) companyUnsubscribe();
      userUnsubscribe = null;
      companyUnsubscribe = null;
      currentCompanyId = null;

      if (firebaseUser) {
        // Real-time listener for User Doc
        userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          if (uDoc.exists()) {
            const userData = uDoc.data() as User;
            setUser(userData);
            
            // Manage Company Listener
            if (userData.companyId && userData.companyId !== currentCompanyId) {
              if (companyUnsubscribe) companyUnsubscribe();
              currentCompanyId = userData.companyId;
              companyUnsubscribe = setupCompanyListener(userData.companyId);
            } else if (!userData.companyId) {
              if (companyUnsubscribe) companyUnsubscribe();
              currentCompanyId = null;
              setCompany(null);
            }
          } else {
            setUser(null);
            setCompany(null);
          }
          setInitializing(false);
        }, (error) => {
          console.error('User listener error:', error);
          setInitializing(false);
        });
      } else {
        setUser(null);
        setCompany(null);
        setInitializing(false);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsubscribe) userUnsubscribe();
      if (companyUnsubscribe) companyUnsubscribe();
    };
  }, [setupCompanyListener]);

  const acceptInviteAfterAuth = async (inviteToken?: string) => {
    if (!inviteToken) return;
    const acceptCompanyInvite = httpsCallable(firebaseFunctions, 'acceptCompanyInvite');
    await acceptCompanyInvite({ inviteToken });
  };

  const hydrateAuthenticatedUserState = async (firebaseUser: FirebaseUser, fallbackEmail: string) => {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      setUser(userData);

      if (userData.companyId) {
        const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
        setCompany(companyDoc.exists()
          ? { ...(companyDoc.data() as Company), id: companyDoc.id }
          : null);
      } else {
        setCompany(null);
      }
      return;
    }

    const newUser: User = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email || fallbackEmail,
      hasCompletedSetup: false,
      joinedDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
    setUser(newUser);
    setCompany(null);
  };

  const signIn = async (email: string, password: string, keepMeSignedIn: boolean = true, inviteToken?: string) => {
    setLoading(true);
    try {
      const persistence = keepMeSignedIn ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await acceptInviteAfterAuth(inviteToken);
      await hydrateAuthenticatedUserState(userCredential.user, email);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, inviteToken?: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser: User = {
        id: userCredential.user.uid,
        uid: userCredential.user.uid,
        email,
        name,
        hasCompletedSetup: false,
        joinedDate: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      await acceptInviteAfterAuth(inviteToken);
      if (inviteToken) {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        setUser(userDoc.exists() ? userDoc.data() as User : newUser);
      } else {
        setUser(newUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setCompany(null);
    router.push('/auth');
  };

  const completeRoleSelection = async (role: UserRole) => {
    if (!user) return;
    const updatedData = { role, lastActive: serverTimestamp() };
    await updateDoc(doc(db, 'users', user.uid), updatedData);
    setUser({ ...user, role, lastActive: new Date().toISOString() });
  };

  const resetRoleSelection = async () => {
    if (!user || user.companyId || user.hasCompletedSetup) return;
    await updateDoc(doc(db, 'users', user.uid), {
      role: deleteField(),
      lastActive: serverTimestamp(),
    });
    setUser({ ...user, role: undefined, lastActive: new Date().toISOString() });
  };

  const completeCompanySetup = async (companyData: CompanySetupData) => {
    if (!user) return;
    if (user.role !== 'owner') throw new Error('Only owners can set up a company');
    try {
      const companyRef = doc(collection(db, 'companies'));
      const newCompany = {
        ...companyData,
        timeZone: resolveFarmTimeZone(companyData.timeZone, getSystemTimeZone()),
        id: companyRef.id,
        ownerId: user.uid,
        teamMembers: [user.uid],
        isSearchable: companyData.isSearchable ?? companyData.isPublicProfile ?? true,
        createdAt: serverTimestamp(),
      };
      await setDoc(companyRef, newCompany);
      await syncPublicCompanyProfile(companyRef.id, newCompany);
      await updateDoc(doc(db, 'users', user.uid), {
        companyId: companyRef.id,
        hasCompletedSetup: true,
      });
      setUser({ ...user, companyId: companyRef.id, hasCompletedSetup: true });
    } catch (error) {
      console.error('Error in completeCompanySetup:', error);
      throw error;
    }
  };

  const refreshCompanyData = useCallback(async () => {
    const companyId = user?.companyId || company?.id;
    if (!companyId) return;
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    setCompany(companyDoc.exists() ? companyDoc.data() as Company : null);
  }, [company?.id, user?.companyId]);

  const requestToJoinCompany = useCallback(async (request: { companyId: string; requestedRole: StaffRole; message?: string }) => {
    if (!user) throw new Error('User must be authenticated to request joining a company');
    if (user.companyId) throw new Error('You are already part of a company');

    const existingRequestQuery = query(
      collection(db, 'joinRequests'),
      where('userId', '==', user.uid),
      where('companyId', '==', request.companyId),
      where('status', '==', 'pending')
    );
    const existingRequests = await getDocs(existingRequestQuery);
    if (!existingRequests.empty) throw new Error('You already have a pending request for this company');

    const joinRequest: Record<string, unknown> = {
      companyId: request.companyId,
      userId: user.uid,
      userName: user.name || user.email.split('@')[0],
      userEmail: user.email,
      requestedRole: request.requestedRole,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    if (request.message) joinRequest.message = request.message;
    await addDoc(collection(db, 'joinRequests'), joinRequest);
  }, [user]);

  const searchCompanies = useCallback(async (searchTerm: string): Promise<CompanySearchResult[]> => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return [];

    const publicSnapshot = await getDocs(query(collection(db, 'publicCompanyProfiles'), where('isPublicProfile', '==', true)));
    const farms: CompanySearchResult[] = [];
    const seenCompanyIds = new Set<string>();

    publicSnapshot.docs.forEach((companyDoc) => {
      if (seenCompanyIds.has(companyDoc.id)) return;
      seenCompanyIds.add(companyDoc.id);
      const data = companyDoc.data() as Partial<Company> & { companyId?: string; location?: string };
      if (!data.companyName?.toLowerCase().includes(normalizedSearch)) return;
      farms.push({
        id: data.companyId || companyDoc.id,
        companyName: data.companyName,
        primaryLocation: data.primaryLocation || data.location || undefined,
        farmType: data.farmType,
        businessSize: data.businessSize,
        memberCount: 0,
      });
    });
    return farms;
  }, []);

  const getJoinRequests = useCallback(async (): Promise<JoinRequest[]> => {
    if (!user || !isOwnerRole(user.role) || !company) return [];

    const requestsQuery = query(
      collection(db, 'joinRequests'),
      where('companyId', '==', company.id),
      where('status', '==', 'pending')
    );
    const requestsSnapshot = await getDocs(requestsQuery);
    return requestsSnapshot.docs.map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data(),
    } as JoinRequest));
  }, [company, user]);

  const approveJoinRequest = useCallback(async (requestId: string) => {
    if (!user || !isOwnerRole(user.role) || !company) throw new Error('Only company owners and co-owners can approve join requests');

    const requestRef = doc(db, 'joinRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    if (!requestDoc.exists()) throw new Error('Join request not found');

    const requestData = requestDoc.data() as JoinRequest;
    if (requestData.companyId !== company.id) throw new Error('Join request does not belong to this company');
    if (requestData.status !== 'pending') throw new Error('Join request has already been processed');

    const batch = writeBatch(db);
    batch.update(requestRef, {
      status: 'approved',
      processedBy: user.uid,
      processedAt: new Date().toISOString(),
    });
    batch.update(doc(db, 'companies', company.id), {
      teamMembers: arrayUnion(user.uid, requestData.userId),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', requestData.userId), {
      companyId: company.id,
      role: requestData.requestedRole,
      hasCompletedSetup: true,
      lastActive: serverTimestamp(),
    });
    await batch.commit();
    await refreshCompanyData();
  }, [company, refreshCompanyData, user]);

  const rejectJoinRequest = useCallback(async (requestId: string) => {
    if (!user || !isOwnerRole(user.role) || !company) throw new Error('Only company owners and co-owners can reject join requests');

    const requestRef = doc(db, 'joinRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    if (!requestDoc.exists()) throw new Error('Join request not found');

    const requestData = requestDoc.data() as JoinRequest;
    if (requestData.companyId !== company.id) throw new Error('Join request does not belong to this company');
    if (requestData.status !== 'pending') throw new Error('Join request has already been processed');

    await updateDoc(requestRef, {
      status: 'rejected',
      processedBy: user.uid,
      processedAt: new Date().toISOString(),
    });
  }, [company, user]);

  const value = useMemo(() => ({
    user,
    company,
    loading,
    signIn,
    signUp,
    resetPassword,
    signOut,
    completeRoleSelection,
    resetRoleSelection,
    completeCompanySetup,
    requestToJoinCompany,
    searchCompanies,
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    refreshCompanyData,
    isAuthenticated: !!user,
    needsRoleSelection: !!user && !user.role,
    needsSetup: !!user && !!user.role && !user.hasCompletedSetup,
    isBuyer: !!user && user.role === 'buyer',
  }), [user, company, loading, requestToJoinCompany, searchCompanies, getJoinRequests, approveJoinRequest, rejectJoinRequest, refreshCompanyData]);

  if (initializing) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
