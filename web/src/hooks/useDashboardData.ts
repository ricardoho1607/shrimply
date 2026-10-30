"use client";

import { withFinalHarvestDates, type HarvestRecordForReadiness, type PondCycleIdentity } from '../../../shared/harvestCalculations';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  type DocumentData,
  doc,
  getDocs,
  limit as limitQuery,
  onSnapshot,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  type Query,
  QueryConstraint,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useScopedSnapshot } from './useScopedSnapshot';
import { isOperationalSummaryFresh } from '../../../shared/operationalSummary';

type SnapshotState<T> = {
  data: T[];
  loading: boolean;
  error: Error | null;
};

const EMPTY_CONSTRAINTS: QueryConstraint[] = [];
const HISTORY_PAGE_SIZE = 50;

const EMPTY_DOCUMENTS: QueryDocumentSnapshot<DocumentData>[] = [];
const EMPTY_DOCUMENT: DocumentData = {};

type MonitoredCompanyDocument = {
  id: string;
  avgDOC?: number;
  avgSize?: number;
  totalBiomass?: number;
  pondCount?: number;
  [key: string]: unknown;
};

const asFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function useCompanyId() {
  const { user, company } = useAuth();
  // Wait for matching company metadata so role/block filters cannot use the previous farm.
  const companyId = user?.uid && user.companyId && company?.id === user.companyId
    ? user.companyId : null;
  return {
    user,
    company: companyId ? company : null,
    companyId,
    scope: companyId && user ? JSON.stringify([user.uid, companyId]) : null,
  };
}

export function useDebouncedValue<T>(value: T, delay = 180) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

function useQueryDocuments(scope: string | null, reference: Query | null) {
  const subscribe = useCallback((next: (data: QueryDocumentSnapshot<DocumentData>[]) => void, fail: (error: Error) => void) => {
    if (!reference) return () => {};
    return onSnapshot(reference, snapshot => next(snapshot.docs), fail);
  }, [reference]);
  return useScopedSnapshot(reference ? scope : null, subscribe, EMPTY_DOCUMENTS);
}

function useCompanySubcollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = EMPTY_CONSTRAINTS,
  enabled = true,
): SnapshotState<T> & ReturnType<typeof useCompanyId> {
  const dashboardContext = useCompanyId();
  const { companyId, scope } = dashboardContext;
  const reference = useMemo(() => companyId && enabled
    ? query(collection(db, 'companies', companyId, collectionName), ...constraints)
    : null, [companyId, collectionName, constraints, enabled]);
  const state = useQueryDocuments(scope, reference);
  const data = useMemo(() => state.data.map(item => ({ ...item.data(), id: item.id } as T)), [state.data]);
  return { ...state, data, ...dashboardContext };
}

export function useCompanyPonds<T>(sort: 'asc' | 'desc' = 'desc') {
  const constraints = useMemo(() => [orderBy('createdAt', sort)], [sort]);
  const state = useCompanySubcollection<T>('ponds', constraints);
  const harvests = useCompanyHarvestRecords<HarvestRecordForReadiness>();
  const data = useMemo(() => state.data.map(pond => !harvests.loading && !harvests.error
    ? withFinalHarvestDates(pond as T & PondCycleIdentity, harvests.data)
    : pond), [state.data, harvests.data, harvests.loading, harvests.error]);
  return { ...state, data };
}

export function useCompanyPhysicalPonds<T>(sort: 'asc' | 'desc' = 'asc') {
  const constraints = useMemo(() => [orderBy('createdAt', sort)], [sort]);
  return useCompanySubcollection<T>('physicalPonds', constraints);
}

export function useCompanyBlocks<T>(sort: 'asc' | 'desc' = 'asc') {
  const constraints = useMemo(() => [orderBy('createdAt', sort)], [sort]);
  return useCompanySubcollection<T>('blocks', constraints);
}

export function useCompanyCycles<T>(sort: 'asc' | 'desc' = 'asc', enabled = true) {
  const constraints = useMemo(() => [orderBy('createdAt', sort)], [sort]);
  return useCompanySubcollection<T>('cycles', constraints, enabled);
}

export function useCompanyFeeds<T>() {
  return useCompanySubcollection<T>('feeds');
}

export function useCompanyAdditives<T>() {
  return useCompanySubcollection<T>('additives');
}

export function useCompanyHarvestRecords<T>(sort: 'asc' | 'desc' = 'desc') {
  const constraints = useMemo(() => [orderBy('date', sort)], [sort]);
  const state = useCompanySubcollection<T>('harvestRecords', constraints);
  const data = useMemo(() => state.data.filter(item => !(item as { voided?: boolean }).voided), [state.data]);
  return { ...state, data };
}

export function useCompanyLabReports<T>() {
  const constraints = useMemo(() => [orderBy('sampleDate', 'desc')], []);
  return useCompanySubcollection<T>('labReports', constraints);
}

export function useCompanyLabPdfUsage() {
  const { companyId, scope } = useCompanyId();
  const subscribe = useCallback((next: (data: DocumentData) => void, fail: (error: Error) => void) => {
    if (!companyId) return () => {};
    return onSnapshot(doc(db, 'companies', companyId, 'labUsage', 'pdfExtraction'),
      snapshot => next(snapshot.data() || EMPTY_DOCUMENT), fail);
  }, [companyId]);
  return useScopedSnapshot(scope, subscribe, EMPTY_DOCUMENT);
}

export function useCompanyAssets<T>() {
  const { companyId, scope } = useCompanyId();
  const reference = useMemo(() => companyId
    ? query(collection(db, 'assets'), where('companyId', '==', companyId)) : null, [companyId]);
  const state = useQueryDocuments(scope, reference);
  const data = useMemo(() => state.data.map(item => ({ ...item.data(), id: item.id } as T)), [state.data]);
  return { ...state, data, companyId };
}

export function useCompanyMembers<T>() {
  const { companyId, scope } = useCompanyId();
  const reference = useMemo(() => companyId
    ? query(collection(db, 'users'), where('companyId', '==', companyId)) : null, [companyId]);
  const state = useQueryDocuments(scope, reference);
  const data = useMemo(() => state.data.map(item => ({ ...item.data(), id: item.id } as T)), [state.data]);
  return { ...state, data, companyId };
}

function useFinanceCollection<T>(collectionName: string, type: 'expense' | 'income', includeVoided: boolean) {
  const state = useCompanySubcollection<DocumentData>(collectionName);
  const data = useMemo(() => state.data
    .filter(item => includeVoided || !item.voided)
    // Sort locally so legacy entries without timestamp are not silently omitted.
    .sort((a, b) => (Number(b.timestamp) || Date.parse(b.date) || 0) - (Number(a.timestamp) || Date.parse(a.date) || 0))
    .map(item => ({ ...item, type } as T)), [state.data, includeVoided, type]);
  return { ...state, data };
}

export function useFinanceRecords<TExpense, TRevenue>(includeVoided = false) {
  const expenses = useFinanceCollection<TExpense>('expenses', 'expense', includeVoided);
  const revenues = useFinanceCollection<TRevenue>('revenues', 'income', includeVoided);
  return {
    expenses: expenses.data, revenues: revenues.data,
    loading: expenses.loading || revenues.loading,
    error: expenses.error || revenues.error, companyId: expenses.companyId,
  };
}

export function useCompanyNotifications<T>() {
  const { companyId, scope } = useCompanyId();
  // Each subscription owns its pagination cursor and in-flight requests.
  const session = useMemo(() => ({
    scope, active: false, busy: false, loadedBeyondFirstPage: false,
    cursor: null as QueryDocumentSnapshot<DocumentData> | null,
    older: [] as T[],
  }), [scope]);
  const [state, setState] = useState<SnapshotState<T> & {
    session: typeof session; hasMore: boolean; loadingMore: boolean;
  } | null>(null);

  useEffect(() => {
    if (!companyId || !scope) return;
    session.active = true;
    let active = true;
    const unsubscribe = onSnapshot(query(
      collection(db, 'notifications'), where('companyId', '==', companyId),
      orderBy('timestamp', 'desc'), limitQuery(HISTORY_PAGE_SIZE),
    ), snapshot => {
      if (!active) return;
      const firstPage = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as T));
      const firstPageIds = new Set(snapshot.docs.map(item => item.id));
      if (!session.loadedBeyondFirstPage) session.cursor = snapshot.docs.at(-1) || null;
      setState(previous => ({
        session,
        data: [...firstPage, ...session.older.filter(item => !firstPageIds.has((item as { id: string }).id))],
        loading: false, error: null, loadingMore: session.busy,
        hasMore: session.loadedBeyondFirstPage && previous?.session === session
          ? previous.hasMore : snapshot.size === HISTORY_PAGE_SIZE,
      }));
    }, error => {
      if (!active) return;
      session.cursor = null;
      session.older = [];
      setState({ session, data: [], loading: false, error, hasMore: false, loadingMore: false });
    });
    return () => { active = false; session.active = false; unsubscribe(); };
  }, [companyId, scope, session]);

  const current = scope && state?.session === session ? state : {
    data: [] as T[], loading: Boolean(scope), error: null, hasMore: false, loadingMore: false,
  };
  const hasMore = current.hasMore;
  const loadMore = useCallback(async () => {
    if (!companyId || !session.active || !session.cursor || session.busy || !hasMore) return;
    session.busy = true;
    setState(previous => previous?.session === session ? { ...previous, loadingMore: true } : previous);
    try {
      const snapshot = await getDocs(query(
        collection(db, 'notifications'), where('companyId', '==', companyId),
        orderBy('timestamp', 'desc'), startAfter(session.cursor), limitQuery(HISTORY_PAGE_SIZE),
      ));
      if (!session.active || !session.cursor) return;
      const nextPage = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as T));
      session.loadedBeyondFirstPage = true;
      session.cursor = snapshot.docs.at(-1) || session.cursor;
      const olderIds = new Set(session.older.map(item => (item as { id: string }).id));
      session.older = [...session.older, ...nextPage.filter(item => !olderIds.has((item as { id: string }).id))];
      setState(previous => {
        if (previous?.session !== session) return previous;
        const ids = new Set(previous.data.map(item => (item as { id: string }).id));
        return { ...previous, data: [...previous.data, ...nextPage.filter(item => !ids.has((item as { id: string }).id))],
          hasMore: snapshot.size === HISTORY_PAGE_SIZE };
      });
    } catch (error) {
      if (session.active) setState(previous => previous?.session === session ? { ...previous, error: error as Error } : previous);
    } finally {
      session.busy = false;
      if (session.active) setState(previous => previous?.session === session ? { ...previous, loadingMore: false } : previous);
    }
  }, [companyId, hasMore, session]);

  const updateLocalItem = useCallback((id: string, updates: Partial<T>) => {
    if (!session.active) return;
    const update = (item: T) => (item as { id: string }).id === id ? { ...item, ...updates } : item;
    session.older = session.older.map(update);
    setState(previous => previous?.session === session ? { ...previous, data: previous.data.map(update) } : previous);
  }, [session]);
  const removeLocalItem = useCallback((id: string) => {
    if (!session.active) return;
    const keep = (item: T) => (item as { id: string }).id !== id;
    session.older = session.older.filter(keep);
    setState(previous => previous?.session === session ? { ...previous, data: previous.data.filter(keep) } : previous);
  }, [session]);
  const clearLocalItems = useCallback(() => {
    if (!session.active) return;
    session.older = [];
    session.cursor = null;
    setState(previous => previous?.session === session ? { ...previous, data: [], hasMore: false } : previous);
  }, [session]);

  return { ...current, companyId, loadMore, updateLocalItem, removeLocalItem, clearLocalItems };
}

export function useMarketplaceListings<T>() {
  const activeListingConstraints = useMemo(
    () => [where('status', '==', 'active')],
    [],
  );
  return useTopLevelCollection<T>('marketplace_listings', activeListingConstraints);
}

function useTopLevelCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = EMPTY_CONSTRAINTS,
): SnapshotState<T> {
  const reference = useMemo(() => query(collection(db, collectionName), ...constraints), [collectionName, constraints]);
  const state = useQueryDocuments(collectionName, reference);
  const data = useMemo(() => state.data.map(item => ({ ...item.data(), id: item.id } as T)), [state.data]);
  return { ...state, data };
}

export function useMonitoredCompanies<T>() {
  const { user } = useAuth();
  const uid = user?.uid || null;
  const reference = useMemo(() => uid ? query(collection(db, 'users', uid, 'monitoredCompanies')) : null, [uid]);
  const state = useQueryDocuments(uid, reference);
  const data = useMemo(() => state.data.map(item => {
    const company = { ...item.data(), id: item.id } as MonitoredCompanyDocument;
    return { ...company, avgDOC: asFiniteNumber(company.avgDOC), avgSize: asFiniteNumber(company.avgSize),
      totalBiomass: asFiniteNumber(company.totalBiomass), pondCount: asFiniteNumber(company.pondCount) } as T;
  }), [state.data]);
  return { ...state, data };
}

export function useInventoryFeeds<TFeed, TAdditive, TPond>() {
  const feeds = useCompanyFeeds<DocumentData>();
  const additives = useCompanyAdditives<DocumentData>();
  const constraints = useMemo(() => [orderBy('pondName', 'asc')], []);
  const ponds = useCompanySubcollection<TPond>('ponds', constraints);
  const feedData = useMemo(() => feeds.data.map(item => ({ ...item, itemName: item.feedName } as TFeed)), [feeds.data]);
  const additiveData = useMemo(() => additives.data.map(item => ({ ...item, itemName: item.additiveName } as TAdditive)), [additives.data]);
  return { feeds: feedData, additives: additiveData, ponds: ponds.data,
    loading: feeds.loading || additives.loading || ponds.loading,
    error: feeds.error || additives.error || ponds.error, companyId: feeds.companyId };
}

export function useUnreadNotificationsCount(options: { enabled?: boolean } = {}) {
  const { companyId, scope } = useCompanyId();
  const enabled = options.enabled ?? true;
  const subscribe = useCallback((next: (count: number) => void, fail: (error: Error) => void) => {
    if (!companyId) return () => {};
    let active = true;
    let legacyUnsubscribe: (() => void) | undefined;
    let legacyGeneration = 0;
    const startLegacyListener = () => {
      if (!active || legacyUnsubscribe) return;
      const generation = ++legacyGeneration;
      legacyUnsubscribe = onSnapshot(query(collection(db, 'notifications'),
        where('companyId', '==', companyId), where('read', '==', false)),
      snapshot => { if (active && generation === legacyGeneration) next(snapshot.size); },
      error => { if (active && generation === legacyGeneration) fail(error); });
    };
    const stopLegacyListener = () => { legacyGeneration += 1; legacyUnsubscribe?.(); legacyUnsubscribe = undefined; };
    const unsubscribeSummary = onSnapshot(doc(db, 'companies', companyId, 'summaries', 'dashboard'),
      { includeMetadataChanges: true }, snapshot => {
        if (!active) return;
        const data = snapshot.data() || {};
        if (snapshot.exists() && isOperationalSummaryFresh(data)) {
          stopLegacyListener();
          next(Math.max(0, Number(data.unreadNotificationCount) || 0));
        } else if (!snapshot.metadata.fromCache) startLegacyListener();
      }, startLegacyListener);
    return () => { active = false; unsubscribeSummary(); stopLegacyListener(); };
  }, [companyId]);
  return useScopedSnapshot(enabled ? scope : null, subscribe, 0).data;
}

export async function fetchCompanyPondCount(companyId: string) {
  const snapshot = await getDocs(collection(db, 'companies', companyId, 'ponds'));
  return snapshot.size;
}

export function companyDocRef(companyId: string, collectionName: string, documentId: string) {
  return doc(db, 'companies', companyId, collectionName, documentId);
}
