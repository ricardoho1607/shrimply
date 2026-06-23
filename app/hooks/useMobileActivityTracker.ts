import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  collection,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';

const HEARTBEAT_MS = 2 * 60 * 1000;

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getElapsedSeconds = (fromMs: number | null, toMs: number) => {
  if (!fromMs || toMs <= fromMs) return 0;
  return Math.floor((toMs - fromMs) / 1000);
};

export const useMobileActivityTracker = () => {
  const { user, company, isAuthenticated, needsRoleSelection, needsSetup, isBuyer } = useAuth();
  const sessionRef = useRef<DocumentReference | null>(null);
  const lastFlushMsRef = useRef<number | null>(null);
  const sessionDurationSecondsRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appIsActiveRef = useRef(AppState.currentState === 'active');

  const canTrack = Boolean(Platform.OS !== 'web'
    && isAuthenticated
    && !needsRoleSelection
    && !needsSetup
    && !isBuyer
    && user?.uid
    && company?.id
    && user.role !== 'buyer');

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const getDailySummaryRef = useCallback((date = new Date()) => {
    if (!company?.id || !user?.uid) return null;
    return doc(db, 'companies', company.id, 'userActivityDaily', `${getLocalDateKey(date)}_${user.uid}`);
  }, [company?.id, user?.uid]);

  const flushSession = useCallback(async (endSession = false) => {
    if (!sessionRef.current || !company?.id || !user?.uid) return;

    const nowMs = Date.now();
    const elapsedSeconds = getElapsedSeconds(lastFlushMsRef.current, nowMs);
    if (elapsedSeconds > 0) {
      sessionDurationSecondsRef.current += elapsedSeconds;
      lastFlushMsRef.current = nowMs;
    }

    const sessionUpdate = {
      lastSeenAt: serverTimestamp(),
      durationSeconds: sessionDurationSecondsRef.current,
      status: endSession ? 'ended' : 'active',
      updatedAt: serverTimestamp(),
      ...(endSession ? { endedAt: serverTimestamp() } : {}),
    };

    const writes = [
      setDoc(sessionRef.current, sessionUpdate, { merge: true }),
    ];

    const dailySummaryRef = getDailySummaryRef(new Date(nowMs));
    if (dailySummaryRef && elapsedSeconds > 0) {
      writes.push(setDoc(dailySummaryRef, {
        companyId: company.id,
        userId: user.uid,
        userName: user.name || user.email?.split('@')[0] || 'User',
        userEmail: user.email || '',
        role: user.role ?? null,
        platform: 'mobile',
        dateKey: getLocalDateKey(new Date(nowMs)),
        totalSeconds: increment(elapsedSeconds),
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true }));
    }

    try {
      await Promise.all(writes);
    } catch (error) {
      console.log('Activity tracking update failed:', error);
    }
  }, [company?.id, getDailySummaryRef, user?.email, user?.name, user?.role, user?.uid]);

  const endCurrentSession = useCallback(async () => {
    clearHeartbeat();
    const activeSessionRef = sessionRef.current;
    if (!activeSessionRef) return;

    await flushSession(true);
    if (sessionRef.current === activeSessionRef) {
      sessionRef.current = null;
      lastFlushMsRef.current = null;
      sessionDurationSecondsRef.current = 0;
    }
  }, [clearHeartbeat, flushSession]);

  const startSession = useCallback(async () => {
    if (!canTrack || !company?.id || !user?.uid || sessionRef.current) return;

    const now = new Date();
    const sessionDocRef = doc(collection(db, 'companies', company.id, 'userActivitySessions'));
    const dailySummaryRef = getDailySummaryRef(now);
    if (!dailySummaryRef) return;

    const userName = user.name || user.email?.split('@')[0] || 'User';
    const baseActivityData = {
      companyId: company.id,
      userId: user.uid,
      userName,
      userEmail: user.email || '',
      role: user.role ?? null,
      platform: 'mobile',
    };

    try {
      await Promise.all([
        setDoc(sessionDocRef, {
          ...baseActivityData,
          status: 'active',
          startedAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
          endedAt: null,
          durationSeconds: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        setDoc(dailySummaryRef, {
          ...baseActivityData,
          dateKey: getLocalDateKey(now),
          totalSeconds: increment(0),
          sessionCount: increment(1),
          lastSeenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true }),
      ]);

      sessionRef.current = sessionDocRef;
      lastFlushMsRef.current = Date.now();
      sessionDurationSecondsRef.current = 0;

      if (!appIsActiveRef.current) {
        await endCurrentSession();
        return;
      }

      clearHeartbeat();
      heartbeatRef.current = setInterval(() => {
        void flushSession(false);
      }, HEARTBEAT_MS);
    } catch (error) {
      console.log('Activity tracking start failed:', error);
    }
  }, [
    canTrack,
    clearHeartbeat,
    company?.id,
    endCurrentSession,
    flushSession,
    getDailySummaryRef,
    user?.email,
    user?.name,
    user?.role,
    user?.uid,
  ]);

  useEffect(() => {
    if (!canTrack) {
      void endCurrentSession();
      return;
    }

    appIsActiveRef.current = AppState.currentState === 'active';
    if (AppState.currentState === 'active') {
      void startSession();
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      appIsActiveRef.current = nextState === 'active';

      if (nextState === 'active') {
        void startSession();
        return;
      }

      if (nextState === 'background' || nextState === 'inactive') {
        void endCurrentSession();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      void endCurrentSession();
    };
  }, [canTrack, endCurrentSession, startSession]);
};
