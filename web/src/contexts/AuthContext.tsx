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
  arrayUnion, arrayRemove, serverTimestamp, onSnapshot, addDoc
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
    isAuthenticated: !!user,
    needsRoleSelection: !!user && !user.role,
    needsSetup: !!user && !!user.role && !user.hasCompletedSetup,
    isBuyer: !!user && user.role === 'buyer',
  }), [user, company, loading]);

  if (initializing) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
