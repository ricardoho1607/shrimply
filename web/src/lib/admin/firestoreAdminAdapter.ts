import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getInitials, getLatestIsoTimestamp, maskEmail, maskPhone } from './adminCore';
import type {
  AccountIntelligence,
  AccountStatus,
  AdminDirectoryResponse,
  AdminEventType,
  AdminTimelineEvent,
  DataAvailability,
  FeatureAdoptionItem,
  HealthInput,
} from './types';
import type { DirectoryQuery } from './adminRepository';

type FirestoreDocument = QueryDocumentSnapshot<DocumentData>;
type LiveCollection = { docs: FirestoreDocument[]; available: boolean };
type DirectorySnapshotCache = {
  users: FirestoreDocument[];
  companies: FirestoreDocument[];
  expiresAt: number;
};
type AccountCacheEntry = { account: AccountIntelligence; expiresAt: number };

const DAY_MS = 86_400_000;
const DIRECTORY_CACHE_MS = 30_000;
let directorySnapshotCache: DirectorySnapshotCache | null = null;
const accountCache = new Map<string, AccountCacheEntry>();

export const clearFirestoreAdminCache = () => {
  directorySnapshotCache = null;
  accountCache.clear();
};

const readDirectorySnapshots = async () => {
  if (directorySnapshotCache && directorySnapshotCache.expiresAt > Date.now()) return directorySnapshotCache;
  const [usersSnapshot, companiesSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'companies')),
  ]);
  directorySnapshotCache = {
    users: usersSnapshot.docs,
    companies: companiesSnapshot.docs,
    expiresAt: Date.now() + DIRECTORY_CACHE_MS,
  };
  return directorySnapshotCache;
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    const result = value.toDate();
    return result instanceof Date && !Number.isNaN(result.getTime()) ? result : null;
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const result = new Date(value);
    return Number.isNaN(result.getTime()) ? null : result;
  }
  return null;
};

const toIso = (value: unknown) => toDate(value)?.toISOString() || null;
const asText = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : '';
const asNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const percentage = (count: number, target: number) => Math.min(100, Math.max(0, Math.round((count / target) * 100)));

const readCollection = async (...segments: string[]): Promise<LiveCollection> => {
  try {
    const snapshot = await getDocs(collection(db, segments.join('/')));
    return { docs: snapshot.docs, available: true };
  } catch {
    return { docs: [], available: false };
  }
};

const getLocation = (company: DocumentData) => {
  const location = company.primaryLocation;
  if (typeof location === 'string') {
    return { region: 'Unavailable', country: asText(company.country) || 'Unavailable', display: location };
  }
  const record = location && typeof location === 'object' ? location as Record<string, unknown> : {};
  const region = asText(record.state) || asText(record.region) || asText(record.city) || asText(company.region) || 'Unavailable';
  const country = asText(record.country) || asText(company.country) || 'Unavailable';
  const display = asText(record.address) || [asText(record.city), asText(record.state), country].filter((part) => part && part !== 'Unavailable').join(', ') || 'Unavailable';
  return { region, country, display };
};

const deriveStatus = (explicitStatus: unknown, lastActiveAt: string | null, billingStatus: unknown): AccountStatus => {
  if (['suspended', 'disabled', 'blocked'].includes(asText(explicitStatus).toLowerCase())) return 'Suspended';
  const activeDate = lastActiveAt ? new Date(lastActiveAt) : null;
  const inactiveDays = activeDate && !Number.isNaN(activeDate.getTime()) ? (Date.now() - activeDate.getTime()) / DAY_MS : Number.POSITIVE_INFINITY;
  if (inactiveDays > 90) return 'Inactive';
  if (inactiveDays > 30 || ['past_due', 'unpaid', 'canceled'].includes(asText(billingStatus).toLowerCase())) return 'At Risk';
  return 'Healthy';
};

const matchesAge = (value: string | null, filter: string, type: 'activity' | 'registered') => {
  if (filter === 'all') return true;
  const parsed = value ? new Date(value) : null;
  const days = parsed && !Number.isNaN(parsed.getTime()) ? (Date.now() - parsed.getTime()) / DAY_MS : Number.POSITIVE_INFINITY;
  if (type === 'activity' && filter === '90d+') return days > 90;
  return days <= Number.parseInt(filter, 10);
};

const readBilling = async (companyId: string) => {
  if (!companyId) return { data: {} as DocumentData, available: false };
  try {
    const snapshot = await getDoc(doc(db, 'companies', companyId, 'billing', 'current'));
    return { data: snapshot.exists() ? snapshot.data() : {}, available: true };
  } catch {
    return { data: {} as DocumentData, available: false };
  }
};

export const searchFirestoreAccounts = async (input: DirectoryQuery): Promise<AdminDirectoryResponse> => {
  const snapshots = await readDirectorySnapshots();
  const companiesById = new Map(snapshots.companies.map((item) => [item.id, item.data()]));
  const search = input.search.trim().toLowerCase();

  const allRows = snapshots.users.map((item) => {
    const user = item.data();
    const companyId = asText(user.companyId);
    const company = companiesById.get(companyId) || {};
    const billing: DocumentData = {};
    const location = getLocation(company);
    const name = asText(user.name) || asText(user.displayName) || 'Unnamed user';
    const joinedAt = toIso(user.joinedDate || user.createdAt);
    const lastActiveAt = toIso(user.lastActive || user.updatedAt || user.joinedDate || user.createdAt);
    const plan = asText(billing.planName) || asText(billing.planId) || asText(company.plan) || 'Unavailable';
    const farmName = asText(company.companyName) || asText(company.businessName) || null;
    return {
      id: item.id,
      name,
      initials: getInitials(name),
      email: asText(user.email) || null,
      maskedEmail: maskEmail(asText(user.email)),
      status: deriveStatus(user.status, lastActiveAt, billing.status),
      plan,
      country: location.country,
      joinedAt,
      lastActiveAt,
      farmName,
      searchText: [item.id, name, user.email, user.phone, farmName, location.country].filter(Boolean).join(' ').toLowerCase(),
    };
  });

  const rows = allRows.filter((row) => {
    if (search && !row.searchText.includes(search)) return false;
    if (input.filters.status !== 'all' && row.status !== input.filters.status) return false;
    if (input.filters.plan !== 'all' && row.plan.toLowerCase() !== input.filters.plan.toLowerCase()) return false;
    if (input.filters.country !== 'all' && row.country.toLowerCase() !== input.filters.country.toLowerCase()) return false;
    if (!matchesAge(row.lastActiveAt, input.filters.activity, 'activity')) return false;
    return matchesAge(row.joinedAt, input.filters.registered, 'registered');
  }).sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
  const start = (input.page - 1) * input.pageSize;
  const stripSearch = ({ searchText, ...row }: (typeof rows)[number]) => {
    void searchText;
    return row;
  };

  return {
    users: rows.slice(start, start + input.pageSize).map(stripSearch),
    total: rows.length,
    platformTotal: snapshots.users.length,
    page: input.page,
    pageSize: input.pageSize,
    source: 'live',
    filterOptions: {
      plans: ['all', ...Array.from(new Set(allRows.map((row) => row.plan))).sort()],
      countries: ['all', ...Array.from(new Set(allRows.map((row) => row.country))).sort()],
    },
  };
};

const samplingDate = (sampling: DocumentData) => toIso(sampling.timestamp || sampling.createdAt || sampling.date);
const hasBiology = (sampling: DocumentData) => Number(sampling.mbw) > 0 || Number(sampling.feed) > 0 || Number(sampling.mortality) > 0;
const hasWater = (sampling: DocumentData) => [sampling.phMorning, sampling.phEvening, sampling.doMorning, sampling.doEvening, sampling.salinity, sampling.transparency].some((value) => value !== undefined && value !== null && value !== '');

const makeEvent = (
  id: string,
  type: AdminEventType,
  title: string,
  detail: string,
  timestamp: string | null,
  tone: AdminTimelineEvent['tone'] = 'neutral',
  metadata?: string,
): AdminTimelineEvent | null => timestamp ? { id, type, title, detail, timestamp, tone, ...(metadata ? { metadata } : {}) } : null;

const adoptionItem = (key: string, label: string, count: number, target: number, availability: DataAvailability): FeatureAdoptionItem => ({
  key,
  label,
  eventCount: availability === 'live' ? count : null,
  percentage: availability === 'live' ? percentage(count, target) : 0,
  availability,
});

export const getFirestoreAccount = async (userId: string): Promise<AccountIntelligence> => {
  const cached = accountCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.account;
  const userSnapshot = await getDoc(doc(db, 'users', userId));
  if (!userSnapshot.exists()) throw new Error('User account not found.');
  const user = userSnapshot.data();
  let companyId = asText(user.companyId);
  let company: DocumentData = {};
  if (companyId) {
    const companySnapshot = await getDoc(doc(db, 'companies', companyId));
    if (companySnapshot.exists()) company = companySnapshot.data();
  } else {
    const owned = await getDocs(query(collection(db, 'companies'), where('ownerId', '==', userId), limit(1)));
    if (!owned.empty) {
      companyId = owned.docs[0].id;
      company = owned.docs[0].data();
    }
  }

  const billingResult = await readBilling(companyId);
  const billing = billingResult.data;
  const emptyUnavailable: LiveCollection = { docs: [], available: false };
  const [ponds, harvests, feeds, additives, expenses, revenues, activity, payments, labReports, diseaseReports, adminEvents, securityEvents] = await Promise.all([
    companyId ? readCollection('companies', companyId, 'ponds') : emptyUnavailable,
    companyId ? readCollection('companies', companyId, 'harvestRecords') : emptyUnavailable,
    companyId ? readCollection('companies', companyId, 'feeds') : emptyUnavailable,
    companyId ? readCollection('companies', companyId, 'additives') : emptyUnavailable,
    companyId ? readCollection('companies', companyId, 'expenses') : emptyUnavailable,
    companyId ? readCollection('companies', companyId, 'revenues') : emptyUnavailable,
    companyId ? (async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'companies', companyId, 'userActivitySessions'), where('userId', '==', userId), limit(100)));
        return { docs: snapshot.docs, available: true };
      } catch {
        return emptyUnavailable;
      }
    })() : emptyUnavailable,
    companyId ? readCollection('companies', companyId, 'billingPayments') : emptyUnavailable,
    companyId ? readCollection('companies', companyId, 'labReports') : emptyUnavailable,
    companyId ? (async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'diseaseReports'), where('companyId', '==', companyId), limit(50)));
        return { docs: snapshot.docs, available: true };
      } catch {
        return emptyUnavailable;
      }
    })() : emptyUnavailable,
    (async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'adminAuditEvents'), where('targetId', '==', userId), limit(100)));
        return { docs: snapshot.docs, available: true };
      } catch {
        return emptyUnavailable;
      }
    })(),
    (async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'securityEvents'), where('userId', '==', userId), limit(100)));
        return { docs: snapshot.docs, available: true };
      } catch {
        return emptyUnavailable;
      }
    })(),
  ]);

  const allSamplings: Array<DocumentData & { pondId: string; pondName: string }> = ponds.docs.flatMap((pondDocument) => {
    const pond = pondDocument.data();
    return Array.isArray(pond.samplings)
      ? pond.samplings.map((sampling: DocumentData) => ({ ...sampling, pondId: pondDocument.id, pondName: asText(pond.pondName) || 'Unnamed pond' }))
      : [];
  });
  const cutoff = Date.now() - 30 * DAY_MS;
  const recentSamplings = allSamplings.filter((item) => {
    const date = samplingDate(item);
    return date && new Date(date).getTime() >= cutoff && hasBiology(item);
  });
  const waterEntries = allSamplings.filter(hasWater);
  const feedEntries = allSamplings.filter((item) => item.feedData || Number(item.feed) > 0);
  const teamCount = new Set([company.ownerId, ...(Array.isArray(company.teamMembers) ? company.teamMembers : [])].filter(Boolean)).size;
  const adoption = [
    adoptionItem('sampling', 'Sampling', recentSamplings.length, 12, ponds.available ? 'live' : 'unavailable'),
    adoptionItem('water', 'Water Quality', waterEntries.length, 20, ponds.available ? 'live' : 'unavailable'),
    adoptionItem('feed', 'Feed Management', feedEntries.length, 20, ponds.available ? 'live' : 'unavailable'),
    adoptionItem('harvest', 'Harvest & Reports', harvests.docs.length + labReports.docs.length, 8, harvests.available || labReports.available ? 'live' : 'unavailable'),
    adoptionItem('disease', 'Disease Reports', diseaseReports.docs.length, 3, diseaseReports.available ? 'live' : 'unavailable'),
    adoptionItem('inventory', 'Inventory', feeds.docs.length + additives.docs.length, 15, feeds.available || additives.available ? 'live' : 'unavailable'),
    adoptionItem('finance', 'Finance', expenses.docs.length + revenues.docs.length, 16, expenses.available || revenues.available ? 'live' : 'unavailable'),
    adoptionItem('team', 'Team Collaboration', Math.max(0, teamCount - 1), 4, companyId ? 'live' : 'unavailable'),
  ];

  const timeline: AdminTimelineEvent[] = [];
  const addEvent = (event: AdminTimelineEvent | null) => { if (event) timeline.push(event); };
  const activityTimestamps: string[] = [];
  activity.docs.forEach((item) => {
    const data = item.data();
    const timestamp = getLatestIsoTimestamp([
      toIso(data.lastSeenAt),
      toIso(data.endedAt),
      toIso(data.updatedAt),
      toIso(data.startedAt),
      toIso(data.createdAt),
    ]);
    if (timestamp) activityTimestamps.push(timestamp);
    addEvent(makeEvent(`login-${item.id}`, 'login', 'User activity session', asText(data.platform) || 'Shrimply application', timestamp, 'positive'));
  });
  allSamplings.forEach((item, index) => {
    const timestamp = samplingDate(item);
    if (hasBiology(item)) addEvent(makeEvent(`sampling-${item.pondId}-${index}`, 'sampling', 'Sampling data uploaded', item.pondName, timestamp));
    if (hasWater(item)) addEvent(makeEvent(`water-${item.pondId}-${index}`, 'water_quality', 'Water quality recorded', item.pondName, timestamp));
  });
  harvests.docs.forEach((item) => { const data = item.data(); addEvent(makeEvent(`harvest-${item.id}`, 'report', 'Harvest recorded', asText(data.cycleName) || 'Harvest record', toIso(data.timestamp || data.createdAt || data.date), 'positive')); });
  labReports.docs.forEach((item) => { const data = item.data(); addEvent(makeEvent(`report-${item.id}`, 'report', 'Laboratory report recorded', asText(data.reportType) || asText(data.entryMode) || 'Laboratory report', toIso(data.generatedAt || data.confirmedAt || data.createdAt))); });
  payments.docs.forEach((item) => {
    const data = item.data();
    const paid = asText(data.status).toLowerCase() === 'paid';
    const amount = asNumber(data.amount);
    addEvent(makeEvent(`payment-${item.id}`, 'payment', paid ? 'Invoice paid' : 'Payment event', asText(data.invoiceNumber) || 'Billing payment', toIso(data.paidAt || data.createdAt), paid ? 'positive' : 'warning', amount === null ? undefined : `IDR ${amount.toLocaleString('en-US')}`));
  });
  adminEvents.docs.forEach((item) => { const data = item.data(); addEvent(makeEvent(`admin-${item.id}`, 'admin', asText(data.action) || 'Owner action', asText(data.reason) || 'Audited owner action', toIso(data.timestamp || data.createdAt), 'warning')); });
  securityEvents.docs.forEach((item) => { const data = item.data(); addEvent(makeEvent(`security-${item.id}`, 'security', asText(data.title) || asText(data.type) || 'Security event', asText(data.detail) || 'Recorded security event', toIso(data.timestamp || data.createdAt), asText(data.severity) === 'high' ? 'danger' : 'warning')); });
  if (companyId) addEvent(makeEvent(`farm-${companyId}`, 'farm', 'Farm created', asText(company.companyName) || asText(company.businessName) || 'Farm account', toIso(company.createdAt)));
  ponds.docs.forEach((item) => { const data = item.data(); addEvent(makeEvent(`pond-${item.id}`, 'farm', 'Pond created', asText(data.pondName) || 'Unnamed pond', toIso(data.createdAt || data.docStart))); });
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const location = getLocation(company);
  const joinedAt = toIso(user.joinedDate || user.createdAt);
  const lastActiveAt = getLatestIsoTimestamp([
    toIso(user.lastActive),
    toIso(user.updatedAt),
    ...activityTimestamps,
    joinedAt,
  ]);
  const plan = asText(billing.planName) || asText(billing.planId) || asText(company.plan) || 'Unavailable';
  const status = deriveStatus(user.status, lastActiveAt, billing.status);
  const activeDays = lastActiveAt ? (Date.now() - new Date(lastActiveAt).getTime()) / DAY_MS : null;
  const completenessFields = [user.name || user.displayName, user.email, user.phone, companyId, company.companyName || company.businessName, company.primaryLocation];
  const availableAdoption = adoption.filter((item) => item.availability === 'live');
  const adoptionAverage = availableAdoption.length ? Math.round(availableAdoption.reduce((sum, item) => sum + item.percentage, 0) / availableAdoption.length) : null;
  const subscriptionStatus = asText(billing.status).toLowerCase();
  const subscriptionScore = !billingResult.available || !Object.keys(billing).length
    ? null
    : ['active', 'enterprise', 'exempt'].includes(subscriptionStatus)
      ? 100
      : subscriptionStatus === 'past_due'
        ? 35
        : ['unpaid', 'canceled'].includes(subscriptionStatus) ? 10 : null;
  const healthInputs: HealthInput = {
    loginRecencyScore: activeDays === null ? null : activeDays <= 7 ? 100 : activeDays <= 30 ? 65 : activeDays <= 90 ? 35 : 5,
    samplingActivityScore: ponds.available ? adoption[0].percentage : null,
    dataCompletenessScore: Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100),
    featureAdoptionScore: adoptionAverage,
    subscriptionScore,
    syncReliabilityScore: null,
    supportScore: null,
    securityScore: securityEvents.available ? (securityEvents.docs.length ? 55 : 100) : null,
    suspended: status === 'Suspended',
  };
  const totalAreaSquareMetres = ponds.docs.reduce((sum, item) => sum + (asNumber(item.data().pondArea) || 0), 0);
  const missingBackendSignals = [
    !activity.available ? 'Login activity is unavailable because no readable activity-session source is connected.' : null,
    !adminEvents.available ? 'Owner audit events are unavailable until the admin audit collection and rules are deployed.' : null,
    !securityEvents.available ? 'Security events are unavailable until an Authentication log export is connected.' : null,
    'Support tickets are unavailable because no support-system collection is connected.',
    'Sync reliability is unavailable because failed-sync events are not persisted.',
    'Secure support sessions remain disabled until a scoped, expiring callable backend is deployed.',
  ].filter((item): item is string => Boolean(item));

  const account: AccountIntelligence = {
    id: userSnapshot.id,
    name: asText(user.name) || asText(user.displayName) || 'Unnamed user',
    initials: getInitials(asText(user.name) || asText(user.displayName)),
    maskedEmail: maskEmail(asText(user.email)),
    maskedPhone: maskPhone(asText(user.phone)),
    email: asText(user.email) || null,
    phone: asText(user.phone) || null,
    role: asText(user.role) || 'Unavailable',
    plan,
    country: location.country,
    region: location.region,
    joinedAt,
    lastActiveAt,
    status,
    farms: companyId ? [{
      id: companyId,
      name: asText(company.companyName) || asText(company.businessName) || 'Unnamed farm',
      location: location.display,
      pondCount: ponds.docs.length,
      totalAreaHa: totalAreaSquareMetres > 0 ? totalAreaSquareMetres / 10_000 : null,
    }] : [],
    healthInputs,
    adoption,
    subscription: {
      plan,
      status: asText(billing.status) || 'Unavailable',
      renewalAt: toIso(billing.renewsAt || billing.currentPeriodEndsAt || billing.expiresAt),
      billingInterval: asText(billing.interval) || null,
      paymentMethod: 'Unavailable',
      availability: billingResult.available && Object.keys(billing).length ? 'live' : 'unavailable',
    },
    support: {
      availability: 'unavailable',
      tickets: [],
      note: 'No support-ticket data source is connected.',
    },
    timeline: timeline.slice(0, 100),
    missingBackendSignals,
    source: 'live',
  };
  accountCache.set(userId, { account, expiresAt: Date.now() + DIRECTORY_CACHE_MS });
  return account;
};
