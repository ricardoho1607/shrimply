import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  buildDailyFeedTotalsForPond,
  buildPondProfitabilityCostSnapshot,
  calculateHarvestProfitability,
  calculateRecordedDailyMortalityRate,
  type PriceTier,
} from '../shared/harvestProfitability';
import { calculatePondMetricsWithHarvest, type MortalityObservationType } from '../shared/pondCalculations';

const firebaseConfig = {
  apiKey: 'AIzaSyCNo5RXCHLOIXJM_meJWXNPUV7gjxXhZkc',
  authDomain: 'investashrimp-5d9e5.firebaseapp.com',
  projectId: 'investashrimp-5d9e5',
  storageBucket: 'investashrimp-5d9e5.firebasestorage.app',
  messagingSenderId: '496805431411',
  appId: '1:496805431411:web:9e497f6435a20466550206',
};

const TIME_ZONE = 'Australia/Melbourne';
const ANCHOR_DATE = process.env.SEED_ANCHOR_DATE || '2026-07-19';
const CYCLE_START_DATE = shiftDate(ANCHOR_DATE, -59);
const BASELINE_DATE = shiftDate(ANCHOR_DATE, -6);
const CYCLE_NAME = 'Financial Projection Demo Cycle';
const UNIT_FEED_COST = 1.2;
const UNIT_ADDITIVE_COST = 5;

const PRICE_LADDER: PriceTier[] = [
  { sizeCountPerKg: 100, pricePerKg: 4.2 },
  { sizeCountPerKg: 90, pricePerKg: 4.4 },
  { sizeCountPerKg: 80, pricePerKg: 4.6 },
  { sizeCountPerKg: 70, pricePerKg: 4.9 },
  { sizeCountPerKg: 60, pricePerKg: 5.4 },
  { sizeCountPerKg: 50, pricePerKg: 6.5 },
  { sizeCountPerKg: 40, pricePerKg: 6.1 },
  { sizeCountPerKg: 30, pricePerKg: 6.2 },
  { sizeCountPerKg: 20, pricePerKg: 6.3 },
];

interface PondSeedDefinition {
  key: 'keep-growing' | 'target-50' | 'harvest-now';
  name: string;
  latestMbw: number;
  previousMbw: number;
  earlierMbw: number;
  targetFcr: number;
  baselinePopulation: number;
  mortalityCounts: number[];
  recentFeed: number[];
  directAdditiveQuantity: number;
  expectedDecision: 'keep_growing' | 'harvest_now';
  expectedBestSize: number;
}

const pondDefinitions: PondSeedDefinition[] = [
  {
    key: 'keep-growing',
    name: 'Pond A - Keep Growing',
    latestMbw: 18,
    previousMbw: 14.5,
    earlierMbw: 8.2,
    targetFcr: 1.3,
    baselinePopulation: 95_070,
    mortalityCounts: [10, 10, 10, 10, 10, 10, 10],
    recentFeed: [65, 66, 67, 68, 69],
    directAdditiveQuantity: 30,
    expectedDecision: 'keep_growing',
    expectedBestSize: 30,
  },
  {
    key: 'target-50',
    name: 'Pond B - Target Size 50',
    latestMbw: 19,
    previousMbw: 16.5,
    earlierMbw: 9.4,
    targetFcr: 1.55,
    baselinePopulation: 90_126,
    mortalityCounts: [18, 18, 18, 18, 18, 18, 18],
    recentFeed: [72, 73, 74, 75, 76],
    directAdditiveQuantity: 60,
    expectedDecision: 'keep_growing',
    expectedBestSize: 50,
  },
  {
    key: 'harvest-now',
    name: 'Pond C - Harvest Now',
    latestMbw: 20,
    previousMbw: 18.8,
    earlierMbw: 14.1,
    targetFcr: 2.2,
    baselinePopulation: 77_720,
    mortalityCounts: [330, 350, 370, 390, 410, 430, 440],
    recentFeed: [110, 115, 120, 126, 132],
    directAdditiveQuantity: 120,
    expectedDecision: 'harvest_now',
    expectedBestSize: 50,
  },
];

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function asTimestamp(date: string): Timestamp {
  return Timestamp.fromDate(new Date(`${date}T12:00:00Z`));
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function distributeFeed(total: number, recentFeed: number[]): number[] {
  const olderDays = 60 - recentFeed.length;
  const remaining = total - recentFeed.reduce((sum, value) => sum + value, 0);
  const weights = Array.from({ length: olderDays }, (_, index) => 10 + (index * 45) / Math.max(1, olderDays - 1));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const older = weights.map((weight) => round((remaining * weight) / weightTotal));
  const correction = round(remaining - older.reduce((sum, value) => sum + value, 0));
  older[older.length - 1] = round(older[older.length - 1] + correction);
  return [...older, ...recentFeed];
}

function buildFixture() {
  const cycleId = `financial-demo-cycle-${ANCHOR_DATE.replaceAll('-', '')}`;
  const nowIso = `${ANCHOR_DATE}T12:00:00.000Z`;
  const ponds = pondDefinitions.map((definition, index) => {
    const id = `financial-demo-pond-${index + 1}`;
    const physicalPondId = `financial-demo-physical-${index + 1}`;
    const currentPopulation = definition.baselinePopulation - definition.mortalityCounts.reduce((sum, value) => sum + value, 0);
    const currentBiomassKg = (currentPopulation * definition.latestMbw) / 1000;
    const initialBiomassKg = (100_000 * 0.5) / 1000;
    const targetFeedKg = round(definition.targetFcr * (currentBiomassKg - initialBiomassKg));
    const dailyFeed = distributeFeed(targetFeedKg, definition.recentFeed);
    const samplingWeights = new Map<string, number>([
      [shiftDate(ANCHOR_DATE, -30), definition.earlierMbw],
      [shiftDate(ANCHOR_DATE, -10), definition.previousMbw],
      [ANCHOR_DATE, definition.latestMbw],
    ]);
    const samplings = dailyFeed.map((feed, dayIndex) => {
      const date = shiftDate(CYCLE_START_DATE, dayIndex);
      return {
        id: `${id}-sampling-${date}`,
        date,
        mbw: samplingWeights.get(date) || 0,
        mortality: 0,
        feed: 0,
        feedData: { totalDailyFeed: feed },
        source: samplingWeights.has(date) ? 'sampling_and_daily_feed' : 'daily_feed',
        createdAt: asTimestamp(date),
      };
    });
    const mortalityRecords = definition.mortalityCounts.map((count, dayIndex) => {
      const date = shiftDate(ANCHOR_DATE, dayIndex - 6);
      return {
        id: `${id}-mortality-${date}`,
        date,
        observationType: (count > 0 ? 'estimated_total' : 'none_observed') as MortalityObservationType,
        count,
        mbwAtRecord: round(definition.latestMbw - ((6 - dayIndex) * (definition.latestMbw - definition.previousMbw)) / 10, 2),
        notes: definition.key === 'harvest-now'
          ? 'Sustained elevated mortality.'
          : undefined,
        recordedAt: `${date}T12:00:00.000Z`,
        recordedBy: 'SEED_USER_UID',
        cycleId,
        cycleName: CYCLE_NAME,
        pondCycleId: id,
      };
    });
    return {
      definition,
      physicalPondId,
      data: {
        id,
        companyId: 'SEED_COMPANY_ID',
        pondName: definition.name,
        physicalPondId,
        pondArea: 1,
        density: 100_000,
        initialPopulation: 100_000,
        initialStock: 100_000,
        initialWeight: 0.5,
        docStart: CYCLE_START_DATE,
        supplier: 'Shrimply Demo Hatchery',
        plSupplier: 'Shrimply Demo Hatchery',
        cycleId,
        cycleName: CYCLE_NAME,
        pondCycleId: id,
        cycleStatus: 'active',
        cycleStartedAt: CYCLE_START_DATE,
        cycleStartMode: 'existing',
        baselineDate: BASELINE_DATE,
        baselineDoc: 53,
        baselineMbw: round(definition.latestMbw - 2.1, 2),
        baselineEstimatedPopulation: definition.baselinePopulation,
        baselineSurvivalRate: round((definition.baselinePopulation / 100_000) * 100, 3),
        baselineSource: 'demo_stocktake',
        samplings,
        mortalityRecords,
        totalHarvestedPopulation: 0,
        totalHarvestedBiomass: 0,
        totalHarvestedFeed: 0,
        partialHarvestCount: 0,
        latestLabStatus: 'normal',
        notes: `Projection fixture: ${definition.name}`,
        createdAt: asTimestamp(CYCLE_START_DATE),
        updatedAt: asTimestamp(ANCHOR_DATE),
        createdBy: 'SEED_USER_UID',
        updatedBy: 'SEED_USER_UID',
      },
      dailyFeed,
      targetFeedKg,
    };
  });

  const feedUsage = ponds.flatMap(({ data: pond, dailyFeed }) => dailyFeed.map((quantity, dayIndex) => {
    const date = shiftDate(CYCLE_START_DATE, dayIndex);
    return {
      id: `${pond.id}-feed-${date}`,
      date,
      quantity,
      unitPrice: UNIT_FEED_COST,
      totalCost: round(quantity * UNIT_FEED_COST, 2),
      pondId: pond.id,
      cycleId,
      cycleName: CYCLE_NAME,
      pondCycleId: pond.pondCycleId,
      source: 'daily_feed_record',
      feedRecordId: `daily-feed:${pond.id}:${date}`,
      notes: 'Consumed feed linked to the daily feeding record.',
      createdAt: asTimestamp(date),
    };
  }));
  const totalFeedUsed = round(feedUsage.reduce((sum, usage) => sum + usage.quantity, 0));
  const feedStocked = round(totalFeedUsed + 2_000);
  const feed = {
    id: 'financial-demo-feed',
    companyId: 'SEED_COMPANY_ID',
    feedName: 'Demo Premium Grower',
    brand: 'Shrimply Demo Feed',
    feedType: 'Grower',
    unit: 'kg',
    reorderLevel: 500,
    stockInHistory: [{
      id: 'financial-demo-feed-stock-in',
      date: CYCLE_START_DATE,
      quantity: feedStocked,
      price: UNIT_FEED_COST,
      notes: 'Opening stock for the financial projection demo.',
      batch: 'DEMO-FEED-2026',
      unit: 'kg',
      createdAt: asTimestamp(CYCLE_START_DATE),
    }],
    usageHistory: feedUsage,
    totalStock: 2_000,
    totalCost: round(2_000 * UNIT_FEED_COST, 2),
    lastUpdated: asTimestamp(ANCHOR_DATE),
    createdAt: asTimestamp(CYCLE_START_DATE),
  };

  const additiveUsage = [
    ...ponds.map(({ data: pond, definition }, index) => ({
      id: `${pond.id}-additive-direct`,
      date: shiftDate(ANCHOR_DATE, -20 + index),
      quantity: definition.directAdditiveQuantity,
      unitPrice: UNIT_ADDITIVE_COST,
      totalCost: definition.directAdditiveQuantity * UNIT_ADDITIVE_COST,
      pondId: pond.id,
      cycleId,
      cycleName: CYCLE_NAME,
      pondCycleId: pond.pondCycleId,
      notes: 'Additive consumed directly by this pond.',
      createdAt: asTimestamp(shiftDate(ANCHOR_DATE, -20 + index)),
    })),
    {
      id: 'financial-demo-additive-general',
      date: shiftDate(ANCHOR_DATE, -12),
      quantity: 60,
      unitPrice: UNIT_ADDITIVE_COST,
      totalCost: 300,
      notes: 'General farm additive usage with no pond selected; split across active ponds.',
      createdAt: asTimestamp(shiftDate(ANCHOR_DATE, -12)),
    },
  ];
  const totalAdditiveUsed = additiveUsage.reduce((sum, usage) => sum + usage.quantity, 0);
  const additiveStocked = totalAdditiveUsed + 200;
  const additive = {
    id: 'financial-demo-additive',
    companyId: 'SEED_COMPANY_ID',
    additiveName: 'Demo Pond Probiotic',
    category: 'Probiotic',
    unit: 'kg',
    reorderLevel: 40,
    stockInHistory: [{
      id: 'financial-demo-additive-stock-in',
      date: CYCLE_START_DATE,
      quantity: additiveStocked,
      price: UNIT_ADDITIVE_COST,
      notes: 'Opening additive stock for the financial projection demo.',
      batch: 'DEMO-ADDITIVE-2026',
      unit: 'kg',
      createdAt: asTimestamp(CYCLE_START_DATE),
    }],
    usageHistory: additiveUsage,
    totalStock: 200,
    totalCost: 200 * UNIT_ADDITIVE_COST,
    lastUpdated: asTimestamp(ANCHOR_DATE),
    createdAt: asTimestamp(CYCLE_START_DATE),
  };

  const expenses = [
    { id: 'general-salary', date: shiftDate(ANCHOR_DATE, -45), category: 'Labor', item: 'Farm salaries', amount: 3_000, paymentType: 'Bank Transfer', reference: 'DEMO-SALARY', notes: 'General expense; no pond selected.' },
    { id: 'general-electricity', date: shiftDate(ANCHOR_DATE, -28), category: 'Utilities', item: 'Electricity', amount: 900, paymentType: 'Bank Transfer', reference: 'DEMO-ELECTRICITY', notes: 'General expense; no pond selected.' },
    { id: 'general-oil', date: shiftDate(ANCHOR_DATE, -14), category: 'Operations', item: 'Generator oil', amount: 600, paymentType: 'Cash', reference: 'DEMO-OIL', notes: 'General expense; no pond selected.' },
    { id: 'inventory-feed-purchase', date: CYCLE_START_DATE, category: 'Feed', item: 'Demo Premium Grower stock-in', amount: round(feedStocked * UNIT_FEED_COST, 2), paymentType: 'Bank Transfer', reference: 'INVENTORY-financial-demo-feed', linkedInventory: 'financial-demo-feed', notes: 'Inventory purchase. Projection excludes this to prevent double counting consumed feed.' },
    { id: 'inventory-additive-purchase', date: CYCLE_START_DATE, category: 'Additives', item: 'Demo Pond Probiotic stock-in', amount: additiveStocked * UNIT_ADDITIVE_COST, paymentType: 'Bank Transfer', reference: 'INVENTORY-financial-demo-additive', linkedInventory: 'financial-demo-additive', notes: 'Inventory purchase. Projection excludes this to prevent double counting consumed additive.' },
  ];

  return { cycleId, nowIso, ponds, feed, additive, expenses };
}

function verifyProjectionFixture(fixture: ReturnType<typeof buildFixture>) {
  const pondList = fixture.ponds.map(({ data }) => data);
  return fixture.ponds.map(({ data: pond, definition, targetFeedKg }) => {
    const metrics = calculatePondMetricsWithHarvest(pond, TIME_ZONE);
    const costSnapshot = buildPondProfitabilityCostSnapshot({
      pond,
      ponds: pondList,
      feeds: [fixture.feed],
      additives: [fixture.additive],
      expenses: fixture.expenses,
      startDate: CYCLE_START_DATE,
      endDate: ANCHOR_DATE,
      timeZone: TIME_ZONE,
    });
    const mortality = calculateRecordedDailyMortalityRate({
      records: pond.mortalityRecords,
      currentPopulation: metrics.currentPopulation,
      now: new Date(fixture.nowIso),
      timeZone: TIME_ZONE,
    });
    const result = calculateHarvestProfitability({
      currentPopulation: metrics.currentPopulation,
      initialPopulation: pond.initialPopulation,
      currentMbwG: metrics.latestMbw,
      currentSurvivalRatePercent: metrics.adjustedSR,
      adgGPerDay: metrics.adg,
      historicalFcr: metrics.biomassGainFCR,
      dailyMortalityRatePercent: mortality.dailyRatePercent,
      recentDailyFeedTotals: buildDailyFeedTotalsForPond([fixture.feed], pond.id, TIME_ZONE),
      feedUnitCostPerKg: costSnapshot.feedUnitCostPerKg,
      priceLadder: PRICE_LADDER,
      costsToDate: costSnapshot.costsToDate,
      projectedDailyAdditiveCost: costSnapshot.projectedDailyAdditiveCost,
      projectedDailyGeneralExpense: costSnapshot.projectedDailyGeneralExpense,
      timeZone: TIME_ZONE,
      now: new Date(fixture.nowIso),
    });

    if (result.decision !== definition.expectedDecision || result.bestScenario.targetSizeCountPerKg !== definition.expectedBestSize) {
      throw new Error(`${pond.pondName} fixture mismatch: expected ${definition.expectedDecision} at size ${definition.expectedBestSize}, got ${result.decision} at size ${result.bestScenario.targetSizeCountPerKg}.`);
    }
    if (Math.abs(metrics.totalFeedConsumed - targetFeedKg) > 0.01) {
      throw new Error(`${pond.pondName} feed mismatch: ${metrics.totalFeedConsumed} vs ${targetFeedKg}.`);
    }

    return {
      pond: pond.pondName,
      currentSize: metrics.size,
      survivalRatePercent: round(metrics.adjustedSR, 2),
      adgGPerDay: round(metrics.adg, 3),
      biomassGainFcr: round(metrics.biomassGainFCR, 2),
      dailyMortalityRatePercent: mortality.dailyRatePercent,
      costsToDate: costSnapshot.costsToDate,
      decision: result.decision,
      bestTargetSize: result.bestScenario.targetSizeCountPerKg,
      bestTargetDays: result.bestScenario.daysFromNow,
      harvestTodayOperatingProfit: result.today.operatingProfit,
      bestOperatingProfit: result.bestScenario.operatingProfit,
    };
  });
}

async function seedFirebase(fixture: ReturnType<typeof buildFixture>) {
  const email = process.env.SEED_EMAIL?.trim();
  const password = process.env.SEED_PASSWORD;
  if (!email || !password) throw new Error('SEED_EMAIL and SEED_PASSWORD are required with --apply.');
  if (password.length < 12) throw new Error('Use a test password with at least 12 characters.');

  const app = initializeApp(firebaseConfig, `financial-demo-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;
  const companyRef = doc(collection(db, 'companies'));
  const companyId = companyRef.id;
  const replaceSeedIds = <T>(value: T): T => {
    if (typeof value === 'string') {
      return value
        .replaceAll('SEED_USER_UID', uid)
        .replaceAll('SEED_COMPANY_ID', companyId) as T;
    }
    if (value instanceof Timestamp) return value;
    if (Array.isArray(value)) return value.map((item) => replaceSeedIds(item)) as T;
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceSeedIds(item)]),
      ) as T;
    }
    return value;
  };

  await setDoc(doc(db, 'users', uid), {
    id: uid,
    uid,
    email,
    name: 'Financial Projection Demo Owner',
    role: 'owner',
    hasCompletedSetup: false,
    joinedDate: fixture.nowIso,
    lastActive: fixture.nowIso,
  });
  await setDoc(companyRef, {
    id: companyId,
    companyName: 'Shrimply Financial Projection Demo',
    businessType: 'Shrimp Farming',
    farmType: 'Intensive',
    businessSize: 'medium',
    description: 'Private test company containing three calibrated financial projection scenarios.',
    primaryLocation: { city: 'Melbourne', state: 'Victoria', country: 'Australia' },
    contactPhone: '',
    isPublicProfile: false,
    isSearchable: false,
    isVerified: false,
    currency: 'USD',
    timeZone: TIME_ZONE,
    harvestProjectionMarketPrices: Object.fromEntries(
      PRICE_LADDER.map((tier) => [String(tier.sizeCountPerKg), tier.pricePerKg]),
    ),
    harvestProjectionMarketPricesUpdatedAt: serverTimestamp(),
    harvestProjectionMarketPricesUpdatedBy: uid,
    ownerId: uid,
    teamMembers: [uid],
    pendingInvites: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', uid), {
    companyId,
    hasCompletedSetup: true,
    lastActive: serverTimestamp(),
  });

  const batch = writeBatch(db);
  batch.set(doc(db, 'companies', companyId, 'cycles', fixture.cycleId), {
    id: fixture.cycleId,
    cycleName: CYCLE_NAME,
    status: 'active',
    plannedStartDate: CYCLE_START_DATE,
    stockingStartDate: CYCLE_START_DATE,
    createdAt: asTimestamp(CYCLE_START_DATE),
    createdBy: uid,
    updatedAt: asTimestamp(ANCHOR_DATE),
    updatedBy: uid,
  });
  fixture.ponds.forEach(({ data: sourcePond, physicalPondId }) => {
    const pond = replaceSeedIds(sourcePond);
    batch.set(doc(db, 'companies', companyId, 'ponds', pond.id), pond);
    batch.set(doc(db, 'companies', companyId, 'physicalPonds', physicalPondId), {
      id: physicalPondId,
      pondName: pond.pondName,
      pondArea: pond.pondArea,
      status: 'active',
      activePondId: pond.id,
      createdAt: asTimestamp(CYCLE_START_DATE),
      createdBy: uid,
      updatedAt: asTimestamp(ANCHOR_DATE),
      updatedBy: uid,
    });
  });
  batch.set(doc(db, 'companies', companyId, 'feeds', fixture.feed.id), replaceSeedIds(fixture.feed));
  batch.set(doc(db, 'companies', companyId, 'additives', fixture.additive.id), replaceSeedIds(fixture.additive));
  fixture.expenses.forEach((expense) => {
    batch.set(doc(db, 'companies', companyId, 'expenses', expense.id), {
      ...expense,
      companyId,
      addedBy: uid,
      addedByName: 'Financial Projection Demo Owner',
      timestamp: asTimestamp(expense.date).toMillis(),
      createdAt: asTimestamp(expense.date),
      updatedAt: asTimestamp(expense.date),
    });
  });
  await batch.commit();

  const [userSnapshot, companySnapshot, pondSnapshot, feedSnapshot, additiveSnapshot, expenseSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(companyRef),
    getDocs(collection(db, 'companies', companyId, 'ponds')),
    getDocs(collection(db, 'companies', companyId, 'feeds')),
    getDocs(collection(db, 'companies', companyId, 'additives')),
    getDocs(collection(db, 'companies', companyId, 'expenses')),
  ]);
  if (!userSnapshot.exists() || !companySnapshot.exists() || pondSnapshot.size !== 3 || feedSnapshot.size !== 1 || additiveSnapshot.size !== 1 || expenseSnapshot.size !== fixture.expenses.length) {
    throw new Error('Post-write verification did not find the complete demo dataset.');
  }
  await signOut(auth);
  return { uid, companyId, ponds: pondSnapshot.size, feeds: feedSnapshot.size, additives: additiveSnapshot.size, expenses: expenseSnapshot.size };
}

async function main() {
  const fixture = buildFixture();
  const scenarios = verifyProjectionFixture(fixture);
  const apply = process.argv.includes('--apply');
  const firebase = apply ? await seedFirebase(fixture) : null;
  console.log(JSON.stringify({
    mode: apply ? 'applied' : 'dry-run',
    anchorDate: ANCHOR_DATE,
    cycleStartDate: CYCLE_START_DATE,
    priceLadder: PRICE_LADDER,
    scenarios,
    firebase,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
