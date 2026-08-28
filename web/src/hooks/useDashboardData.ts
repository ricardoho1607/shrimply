"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  QueryConstraint,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { isOperationalSummaryFresh } from '../../../shared/operationalSummary';

type SnapshotState<T> = {
  data: T[];
  loading: boolean;
  error: Error | null;
};

const EMPTY_CONSTRAINTS: QueryConstraint[] = [];
const HISTORY_PAGE_SIZE = 50;

const deferStateUpdate = (callback: () => void) => {
  queueMicrotask(callback);
};

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
  return {
    user,
    company,
    companyId: user?.companyId || company?.id || null,
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

function useCompanySubcollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = EMPTY_CONSTRAINTS
): SnapshotState<T> & ReturnType<typeof useCompanyId> {
  const dashboardContext = useCompanyId();
  const { companyId } = dashboardContext;
  const [state, setState] = useState<SnapshotState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;
    const deferIfActive = (callback: () => void) => {
      deferStateUpdate(() => {
        if (isActive) callback();
      });
    };

    if (!companyId) {
      deferIfActive(() => setState({ data: [], loading: false, error: null }));
      return () => {
        isActive = false;
      };
    }

    deferIfActive(() => setState((previous) => ({ ...previous, loading: true, error: null })));

    const ref = collection(db, 'companies', companyId, collectionName);
    const q = constraints.length > 0 ? query(ref, ...constraints) : query(ref);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T)),
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error(`Error loading ${collectionName}:`, error);
        setState((previous) => ({ ...previous, loading: false, error }));
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [companyId, collectionName, constraints]);

  return { ...state, ...dashboardContext };
}

export function useCompanyPonds<T>(sort: 'asc' | 'desc' = 'desc') {
  const constraints = useMemo(() => [orderBy('createdAt', sort)], [sort]);
  return useCompanySubcollection<T>('ponds', constraints);
}

export function useCompanyPhysicalPonds<T>(sort: 'asc' | 'desc' = 'asc') {
  const constraints = useMemo(() => [orderBy('createdAt', sort)], [sort]);
  return useCompanySubcollection<T>('physicalPonds', constraints);
}

export function useCompanyBlocks<T>(sort: 'asc' | 'desc' = 'asc') {
  const constraints = useMemo(() => [orderBy('createdAt', sort)], [sort]);
  return useCompanySubcollection<T>('blocks', constraints);
}

export function useCompanyCycles<T>(sort: 'asc' | 'desc' = 'asc') {
  const constraints = useMemo(() => [orderBy('createdAt', sort)], [sort]);
  return useCompanySubcollection<T>('cycles', constraints);
}

export function useCompanyFeeds<T>() {
  return useCompanySubcollection<T>('feeds');
}

export function useCompanyAdditives<T>() {
  return useCompanySubcollection<T>('additives');
}

export function useCompanyHarvestRecords<T>(sort: 'asc' | 'desc' = 'desc') {
  const constraints = useMemo(() => [orderBy('date', sort)], [sort]);
  return useCompanySubcollection<T>('harvestRecords', constraints);
}

export function useCompanyMembers<T>() {
  const { companyId } = useCompanyId();
  const [state, setState] = useState<SnapshotState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;
    const deferIfActive = (callback: () => void) => {
      deferStateUpdate(() => {
        if (isActive) callback();
      });
    };

    if (!companyId) {
      deferIfActive(() => setState({ data: [], loading: false, error: null }));
      return () => {
        isActive = false;
      };
    }

    deferIfActive(() => setState((previous) => ({ ...previous, loading: true, error: null })));

    const membersQuery = query(collection(db, 'users'), where('companyId', '==', companyId));
    const unsubscribe = onSnapshot(
      membersQuery,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T)),
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error('Error loading company members:', error);
        setState((previous) => ({ ...previous, loading: false, error }));
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [companyId]);

  return { ...state, companyId };
}

export function useFinanceRecords<TExpense, TRevenue>() {
  const { companyId } = useCompanyId();
  const [expenses, setExpenses] = useState<TExpense[]>([]);
  const [revenues, setRevenues] = useState<TRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    const deferIfActive = (callback: () => void) => {
      deferStateUpdate(() => {
        if (isActive) callback();
      });
    };

    if (!companyId) {
      deferIfActive(() => {
        setExpenses([]);
        setRevenues([]);
        setLoading(false);
        setError(null);
      });
      return () => {
        isActive = false;
      };
    }

    let receivedExpenses = false;
    let receivedRevenues = false;
    deferIfActive(() => {
      setLoading(true);
      setError(null);
    });

    const expensesQuery = query(
      collection(db, 'companies', companyId, 'expenses'),
      orderBy('timestamp', 'desc')
    );
    const revenuesQuery = query(
      collection(db, 'companies', companyId, 'revenues'),
      orderBy('timestamp', 'desc')
    );

    const markReady = () => {
      if (receivedExpenses && receivedRevenues) setLoading(false);
    };

    const unsubExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        receivedExpenses = true;
        setExpenses(snapshot.docs.map((item) => ({ id: item.id, type: 'expense', ...item.data() } as TExpense)));
        markReady();
      },
      (snapshotError) => {
        receivedExpenses = true;
        console.error('Error loading expenses:', snapshotError);
        setError(snapshotError);
        markReady();
      }
    );

    const unsubRevenues = onSnapshot(
      revenuesQuery,
      (snapshot) => {
        receivedRevenues = true;
        setRevenues(snapshot.docs.map((item) => ({ id: item.id, type: 'income', ...item.data() } as TRevenue)));
        markReady();
      },
      (snapshotError) => {
        receivedRevenues = true;
        console.error('Error loading revenues:', snapshotError);
        setError(snapshotError);
        markReady();
      }
    );

    return () => {
      isActive = false;
      unsubExpenses();
      unsubRevenues();
    };
  }, [companyId]);

  return { expenses, revenues, loading, error, companyId };
}

export function useCompanyNotifications<T>() {
  const { companyId } = useCompanyId();
  const [state, setState] = useState<SnapshotState<T>>({
    data: [],
    loading: true,
    error: null,
  });
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const loadedBeyondFirstPageRef = useRef(false);
  const olderNotificationsRef = useRef<T[]>([]);

  useEffect(() => {
    let isActive = true;
    const deferIfActive = (callback: () => void) => {
      deferStateUpdate(() => {
        if (isActive) callback();
      });
    };

    if (!companyId) {
      deferIfActive(() => setState({ data: [], loading: false, error: null }));
      cursorRef.current = null;
      loadedBeyondFirstPageRef.current = false;
      olderNotificationsRef.current = [];
      setHasMore(false);
      return () => {
        isActive = false;
      };
    }

    cursorRef.current = null;
    loadedBeyondFirstPageRef.current = false;
    olderNotificationsRef.current = [];
    deferIfActive(() => {
      setState({ data: [], loading: true, error: null });
      setHasMore(false);
    });

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('companyId', '==', companyId),
      orderBy('timestamp', 'desc'),
      limitQuery(HISTORY_PAGE_SIZE),
    );
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const firstPage = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
        const firstPageIds = new Set(snapshot.docs.map((item) => item.id));
        setState({
          data: [
            ...firstPage,
            ...olderNotificationsRef.current.filter((item) => !firstPageIds.has((item as { id?: string }).id || '')),
          ],
          loading: false,
          error: null,
        });
        if (!loadedBeyondFirstPageRef.current) {
          cursorRef.current = snapshot.docs.at(-1) || null;
          setHasMore(snapshot.size === HISTORY_PAGE_SIZE);
        }
      },
      (error) => {
        console.error('Error loading notifications:', error);
        setState((previous) => ({ ...previous, loading: false, error }));
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [companyId]);

  const loadMore = useCallback(async () => {
    if (!companyId || !cursorRef.current || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPageQuery = query(
        collection(db, 'notifications'),
        where('companyId', '==', companyId),
        orderBy('timestamp', 'desc'),
        startAfter(cursorRef.current),
        limitQuery(HISTORY_PAGE_SIZE),
      );
      const snapshot = await getDocs(nextPageQuery);
      const nextPage = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
      setState((previous) => {
        const existingIds = new Set(previous.data.map((item) => (item as { id?: string }).id));
        const uniqueNextPage = nextPage.filter((item) => !existingIds.has((item as { id?: string }).id));
        olderNotificationsRef.current = [...olderNotificationsRef.current, ...uniqueNextPage];
        return {
          ...previous,
          data: [...previous.data, ...uniqueNextPage],
        };
      });
      loadedBeyondFirstPageRef.current = true;
      cursorRef.current = snapshot.docs.at(-1) || cursorRef.current;
      setHasMore(snapshot.size === HISTORY_PAGE_SIZE);
    } catch (error) {
      setState((previous) => ({ ...previous, error: error as Error }));
    } finally {
      setLoadingMore(false);
    }
  }, [companyId, hasMore, loadingMore]);

  const updateLocalItem = useCallback((id: string, updates: Partial<T>) => {
    olderNotificationsRef.current = olderNotificationsRef.current.map((item) => (
      (item as { id?: string }).id === id ? { ...item, ...updates } : item
    ));
    setState((previous) => ({
      ...previous,
      data: previous.data.map((item) => (item as { id?: string }).id === id ? { ...item, ...updates } : item),
    }));
  }, []);
  const removeLocalItem = useCallback((id: string) => {
    olderNotificationsRef.current = olderNotificationsRef.current.filter(
      (item) => (item as { id?: string }).id !== id,
    );
    setState((previous) => ({
      ...previous,
      data: previous.data.filter((item) => (item as { id?: string }).id !== id),
    }));
  }, []);
  const clearLocalItems = useCallback(() => {
    olderNotificationsRef.current = [];
    setHasMore(false);
    setState((previous) => ({ ...previous, data: [] }));
  }, []);

  return {
    ...state,
    companyId,
    hasMore,
    loadingMore,
    loadMore,
    updateLocalItem,
    removeLocalItem,
    clearLocalItems,
  };
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
  constraints: QueryConstraint[] = EMPTY_CONSTRAINTS
): SnapshotState<T> {
  const [state, setState] = useState<SnapshotState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;
    const deferIfActive = (callback: () => void) => {
      deferStateUpdate(() => {
        if (isActive) callback();
      });
    };

    deferIfActive(() => setState((previous) => ({ ...previous, loading: true, error: null })));

    const ref = collection(db, collectionName);
    const q = constraints.length > 0 ? query(ref, ...constraints) : query(ref);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T)),
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error(`Error loading ${collectionName}:`, error);
        setState((previous) => ({ ...previous, loading: false, error }));
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [collectionName, constraints]);

  return state;
}

export function useMonitoredCompanies<T>() {
  const { user } = useAuth();
  const [state, setState] = useState<SnapshotState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    const monitoredQuery = query(collection(db, 'users', user.uid, 'monitoredCompanies'));
    const unsubscribe = onSnapshot(
      monitoredQuery,
      async (snapshot) => {
        try {
          const companies = snapshot.docs.map((item) => {
            const company = { id: item.id, ...item.data() } as MonitoredCompanyDocument;
            return {
              ...company,
              avgDOC: asFiniteNumber(company.avgDOC),
              avgSize: asFiniteNumber(company.avgSize),
              totalBiomass: asFiniteNumber(company.totalBiomass),
              pondCount: asFiniteNumber(company.pondCount),
            } as T;
          });

          if (!cancelled) {
            setState({ data: companies, loading: false, error: null });
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Error loading monitored companies:', error);
            setState((previous) => ({ ...previous, loading: false, error: error as Error }));
          }
        }
      },
      (error) => {
        console.error('Error loading monitored companies:', error);
        setState((previous) => ({ ...previous, loading: false, error }));
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.uid]);

  return state;
}

export function useInventoryFeeds<TFeed, TAdditive, TPond>() {
  const { companyId } = useCompanyId();
  const [feeds, setFeeds] = useState<TFeed[]>([]);
  const [additives, setAdditives] = useState<TAdditive[]>([]);
  const [ponds, setPonds] = useState<TPond[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    const deferIfActive = (callback: () => void) => {
      deferStateUpdate(() => {
        if (isActive) callback();
      });
    };

    if (!companyId) {
      deferIfActive(() => {
        setFeeds([]);
        setAdditives([]);
        setPonds([]);
        setLoading(false);
        setError(null);
      });
      return () => {
        isActive = false;
      };
    }

    let receivedFeeds = false;
    let receivedAdditives = false;
    let receivedPonds = false;
    deferIfActive(() => {
      setLoading(true);
      setError(null);
    });

    const markReady = () => {
      if (receivedFeeds && receivedAdditives && receivedPonds) setLoading(false);
    };

    const unsubFeeds = onSnapshot(
      query(collection(db, 'companies', companyId, 'feeds')),
      (snapshot) => {
        receivedFeeds = true;
        setFeeds(snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          itemName: item.data().feedName,
        } as TFeed)));
        markReady();
      },
      (snapshotError) => {
        receivedFeeds = true;
        console.error('Error loading feeds:', snapshotError);
        setError(snapshotError);
        markReady();
      }
    );

    const unsubAdditives = onSnapshot(
      query(collection(db, 'companies', companyId, 'additives')),
      (snapshot) => {
        receivedAdditives = true;
        setAdditives(snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          itemName: item.data().additiveName,
        } as TAdditive)));
        markReady();
      },
      (snapshotError) => {
        receivedAdditives = true;
        console.error('Error loading additives:', snapshotError);
        setError(snapshotError);
        markReady();
      }
    );

    const unsubPonds = onSnapshot(
      query(collection(db, 'companies', companyId, 'ponds'), orderBy('pondName', 'asc')),
      (snapshot) => {
        receivedPonds = true;
        setPonds(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TPond)));
        markReady();
      },
      (snapshotError) => {
        receivedPonds = true;
        console.error('Error loading inventory ponds:', snapshotError);
        setError(snapshotError);
        markReady();
      }
    );

    return () => {
      isActive = false;
      unsubFeeds();
      unsubAdditives();
      unsubPonds();
    };
  }, [companyId]);

  return { feeds, additives, ponds, loading, error, companyId };
}

export function useUnreadNotificationsCount(options: { enabled?: boolean } = {}) {
  const { company } = useAuth();
  const [count, setCount] = useState(0);
  const enabled = options.enabled ?? true;

  useEffect(() => {
    let isActive = true;
    const deferIfActive = (callback: () => void) => {
      deferStateUpdate(() => {
        if (isActive) callback();
      });
    };

    if (!enabled || !company?.id) {
      deferIfActive(() => setCount(0));
      return () => {
        isActive = false;
      };
    }

    let legacyUnsubscribe: (() => void) | undefined;
    const startLegacyListener = () => {
      if (legacyUnsubscribe) return;
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('companyId', '==', company.id),
        where('read', '==', false)
      );
      legacyUnsubscribe = onSnapshot(
        unreadQuery,
        (snapshot) => setCount(snapshot.size),
        (error) => {
          console.error('Error loading unread notification count:', error);
          setCount(0);
        }
      );
    };
    const stopLegacyListener = () => {
      legacyUnsubscribe?.();
      legacyUnsubscribe = undefined;
    };
    const unsubscribeSummary = onSnapshot(
      doc(db, 'companies', company.id, 'summaries', 'dashboard'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const data = snapshot.data() || {};
        if (snapshot.exists() && isOperationalSummaryFresh(data)) {
          stopLegacyListener();
          setCount(Math.max(0, Number(data.unreadNotificationCount) || 0));
          return;
        }
        if (!snapshot.metadata.fromCache) startLegacyListener();
      },
      () => startLegacyListener(),
    );

    return () => {
      isActive = false;
      unsubscribeSummary();
      stopLegacyListener();
    };
  }, [enabled, company?.id]);

  return count;
}

export async function fetchCompanyPondCount(companyId: string) {
  const snapshot = await getDocs(collection(db, 'companies', companyId, 'ponds'));
  return snapshot.size;
}

export function companyDocRef(companyId: string, collectionName: string, documentId: string) {
  return doc(db, 'companies', companyId, collectionName, documentId);
}
