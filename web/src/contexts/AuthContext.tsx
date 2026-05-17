"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc,
  arrayUnion, arrayRemove, serverTimestamp, onSnapshot, addDoc, writeBatch
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db } from '@/lib/firebase';

interface User {
  id: string;
  uid: string;
  email: string;
  name?: string;
  phone?: string;
  profileImage?: string;
  role?: 'owner' | 'technician' | 'manager' | 'admin' | 'buyer';
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
  primaryLocation: any;
  farmType: string;
  businessSize: 'small' | 'medium' | 'large';
  description: string;
  contactPhone: string;
  isPublicProfile: boolean;
  ownerId: string;
  teamMembers: string[];
  pendingInvites: any[];
}

type StaffRole = 'manager' | 'technician' | 'admin';

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

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string, keepMeSignedIn?: boolean, inviteToken?: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, inviteToken?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeRoleSelection: (role: 'owner' | 'technician' | 'manager' | 'admin' | 'buyer') => Promise<void>;
  completeCompanySetup: (companyData: any) => Promise<void>;
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
  const router = useRouter();

  const setupCompanyListener = useCallback((companyId: string) => {
    return onSnapshot(doc(db, 'companies', companyId), (companyDoc) => {
      if (companyDoc.exists()) {
        setCompany(companyDoc.data() as Company);
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

  const signIn = async (email: string, password: string, keepMeSignedIn: boolean = true, inviteToken?: string) => {
    setLoading(true);
    try {
      const persistence = keepMeSignedIn ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, email, password);
      await acceptInviteAfterAuth(inviteToken);
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

  const completeRoleSelection = async (role: User['role']) => {
    if (!user) return;
    const updatedData: any = { role, lastActive: serverTimestamp() };
    await updateDoc(doc(db, 'users', user.uid), updatedData);
    setUser({ ...user, ...updatedData });
  };

  const completeCompanySetup = async (companyData: any) => {
    if (!user) return;
    try {
      const companyRef = doc(collection(db, 'companies'));
      const newCompany = {
        ...companyData,
        id: companyRef.id,
        ownerId: user.uid,
        teamMembers: [user.uid],
        createdAt: serverTimestamp(),
      };
      await setDoc(companyRef, newCompany);
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

    const companiesQuery = query(collection(db, 'companies'), where('isSearchable', '==', true));
    const snapshot = await getDocs(companiesQuery);
    const farms: CompanySearchResult[] = [];
    snapshot.forEach((companyDoc) => {
      const data = companyDoc.data() as Company;
      if (!data.companyName?.toLowerCase().includes(normalizedSearch)) return;
      farms.push({
        id: companyDoc.id,
        companyName: data.companyName,
        primaryLocation: data.primaryLocation,
        farmType: data.farmType,
        businessSize: data.businessSize,
        memberCount: Array.isArray(data.teamMembers) ? data.teamMembers.length : 0,
      });
    });
    return farms;
  }, []);

  const getJoinRequests = useCallback(async (): Promise<JoinRequest[]> => {
    if (!user || user.role !== 'owner' || !company) return [];

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
    if (!user || user.role !== 'owner' || !company) throw new Error('Only company owners can approve join requests');

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
    if (!user || user.role !== 'owner' || !company) throw new Error('Only company owners can reject join requests');

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
