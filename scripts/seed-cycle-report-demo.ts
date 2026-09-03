import { initializeApp, deleteApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { calculatePondMetricsWithHarvest } from '../shared/pondCalculations';
import { buildCycleReport } from '../app/services/cycleReportService';

const firebaseConfig = {
  apiKey: 'AIzaSyCNo5RXCHLOIXJM_meJWXNPUV7gjxXhZkc',
  authDomain: 'investashrimp-5d9e5.firebaseapp.com',
  projectId: 'investashrimp-5d9e5',
  storageBucket: 'investashrimp-5d9e5.firebasestorage.app',
  messagingSenderId: '496805431411',
  appId: '1:496805431411:web:9e497f6435a20466550206',
};

const EMAIL = process.env.SEED_EMAIL?.trim();
const PASSWORD = process.env.SEED_PASSWORD;
const APPLY = process.argv.includes('--apply');
const COMPANY_NAME = 'Shrimply Closed Cycle Report Demo';
const OWNER_NAME = 'Cycle Report Demo Owner';
const TIME_ZONE = 'Australia/Melbourne';
const CURRENCY = 'AUD';
const CYCLE_ID = 'cycle-report-demo-2026';
const CYCLE_NAME = 'Complete Harvest Cycle 2026';
const BLOCK_ID = 'cycle-report-block-a';
const BLOCK_NAME = 'Production Block A';
const START_DATE = '2026-04-01';
const PARTIAL_HARVEST_DATE = '2026-07-25';
const FINAL_HARVEST_DATE = '2026-08-15';

type PondDefinition = {
  id: string;
  physicalPondId: string;
  name: string;
  area: number;
  density: number;
  survivalRate: number;
  harvestSize: number;
  subGradeSize: number;
  fcr: number;
  price: number;
  subGradePrice: number;
  waterOffset: number;
};

const pondDefinitions: PondDefinition[] = [
  { id: 'cycle-report-pond-a1', physicalPondId: 'cycle-report-physical-a1', name: 'Pond A1', area: 5_000, density: 30, survivalRate: 86, harvestSize: 33, subGradeSize: 39, fcr: 1.42, price: 7.8, subGradePrice: 6.9, waterOffset: 0.00 },
  { id: 'cycle-report-pond-a2', physicalPondId: 'cycle-report-physical-a2', name: 'Pond A2', area: 5_200, density: 32, survivalRate: 84, harvestSize: 35, subGradeSize: 41, fcr: 1.49, price: 7.55, subGradePrice: 6.7, waterOffset: 0.08 },
  { id: 'cycle-report-pond-a3', physicalPondId: 'cycle-report-physical-a3', name: 'Pond A3', area: 4_800, density: 34, survivalRate: 82, harvestSize: 37, subGradeSize: 43, fcr: 1.56, price: 7.3, subGradePrice: 6.5, waterOffset: -0.06 },
  { id: 'cycle-report-pond-a4', physicalPondId: 'cycle-report-physical-a4', name: 'Pond A4', area: 5_500, density: 28, survivalRate: 88, harvestSize: 32, subGradeSize: 38, fcr: 1.38, price: 8.0, subGradePrice: 7.0, waterOffset: 0.04 },
];

const feedDefinitions = [
  { id: 'cycle-report-feed-starter', name: 'OceanStart Crumble', brand: 'Shrimply Nutrition', type: 'Starter', unitPrice: 2.35, endDay: 34 },
  { id: 'cycle-report-feed-grower', name: 'OceanGrow 2.0', brand: 'Shrimply Nutrition', type: 'Grower', unitPrice: 1.92, endDay: 91 },
  { id: 'cycle-report-feed-finisher', name: 'OceanFinish Pro', brand: 'Shrimply Nutrition', type: 'Finisher', unitPrice: 1.78, endDay: 999 },
] as const;

const additiveDefinitions = [
  { id: 'cycle-report-additive-probiotic', name: 'PondGuard Probiotic', category: 'Probiotic', unit: 'kg', unitPrice: 8.5, quantityPerUse: 6 },
  { id: 'cycle-report-additive-mineral', name: 'Mineral Balance Plus', category: 'Mineral', unit: 'kg', unitPrice: 3.9, quantityPerUse: 14 },
  { id: 'cycle-report-additive-conditioner', name: 'AquaClear Conditioner', category: 'Water Conditioner', unit: 'kg', unitPrice: 5.6, quantityPerUse: 9 },
] as const;

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end}T12:00:00.000Z`).getTime() - new Date(`${start}T12:00:00.000Z`).getTime()) / 86_400_000);
}

function asTimestamp(date: string): Timestamp {
  return Timestamp.fromDate(new Date(`${date}T12:00:00.000Z`));
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function distributeTotal(total: number, weights: number[], decimals = 3): number[] {
  const sum = weights.reduce((result, value) => result + value, 0);
  const values = weights.map((weight) => round((total * weight) / sum, decimals));
  values[values.length - 1] = round(values[values.length - 1] + total - values.reduce((result, value) => result + value, 0), decimals);
  return values;
}

function getFeedForDay(dayIndex: number) {
  return feedDefinitions.find((feed) => dayIndex <= feed.endDay) || feedDefinitions[feedDefinitions.length - 1];
}

function buildHarvestLine(definition: PondDefinition, population: number, harvestType: 'partial' | 'final') {
  const mainPopulation = population * 0.88;
  const subPopulation = population - mainPopulation;
  const biomass = mainPopulation / definition.harvestSize;
  const subBiomass = subPopulation / definition.subGradeSize;
  return {
    pondId: definition.id,
    pondName: definition.name,
    cycleId: CYCLE_ID,
    cycleName: CYCLE_NAME,
    pondCycleId: definition.id,
    blockId: BLOCK_ID,
    blockName: BLOCK_NAME,
    harvestType,
    ...(harvestType === 'partial' ? { partialHarvestNumber: 1 } : {}),
    harvestReferenceSamplingId: `${definition.id}-sampling-${FINAL_HARVEST_DATE}`,
    harvestReferenceSamplingDate: FINAL_HARVEST_DATE,
    harvestReferenceMbw: round(1000 / definition.harvestSize, 3),
    biomass: biomass.toFixed(6),
    size: String(definition.harvestSize),
    price: definition.price.toFixed(2),
    subBiomass: subBiomass.toFixed(6),
    subSize: String(definition.subGradeSize),
    subPrice: definition.subGradePrice.toFixed(2),
  };
}

function buildFixture() {
  const cycleDays = daysBetween(START_DATE, FINAL_HARVEST_DATE);
  const feedUsageById = new Map(feedDefinitions.map((feed) => [feed.id, [] as Record<string, unknown>[]]));

  const ponds = pondDefinitions.map((definition, pondIndex) => {
    const initialPopulation = definition.area * definition.density;
    const harvestedPopulation = initialPopulation * (definition.survivalRate / 100);
    const mortalityTotal = initialPopulation - harvestedPopulation;
    const partialPopulation = harvestedPopulation * 0.18;
    const finalPopulation = harvestedPopulation - partialPopulation;
    const partialLine = buildHarvestLine(definition, partialPopulation, 'partial');
    const finalLine = buildHarvestLine(definition, finalPopulation, 'final');
    const harvestedBiomass = Number(partialLine.biomass) + Number(partialLine.subBiomass) + Number(finalLine.biomass) + Number(finalLine.subBiomass);
    const initialBiomass = (initialPopulation * 0.5) / 1000;
    const totalFeed = round((harvestedBiomass - initialBiomass) * definition.fcr, 3);
    const feedWeights = Array.from({ length: cycleDays + 1 }, (_, day) => 0.2 + (1.8 * ((day + 1) / (cycleDays + 1)) ** 1.42));
    const mortalityWeights = Array.from({ length: cycleDays + 1 }, (_, day) => 0.65 + (day / cycleDays) * 0.7 + (day % 17 === 0 ? 0.25 : 0));
    const feeds = distributeTotal(totalFeed, feedWeights);
    const mortalities = distributeTotal(mortalityTotal, mortalityWeights, 0);

    const samplings = Array.from({ length: cycleDays + 1 }, (_, day) => {
      const date = shiftDate(START_DATE, day);
      const feed = feeds[day];
      const feedItem = getFeedForDay(day);
      const progress = day / cycleDays;
      const isMbwDay = day % 14 === 0 || day === cycleDays;
      const mbw = isMbwDay ? round(0.5 + ((1000 / definition.harvestSize) - 0.5) * progress ** 0.82, 2) : 0;
      const rainEvent = day === 58 || day === 59 || day === 104;
      const heavyRainEvent = day === 59;
      const phMorning = 7.65 + definition.waterOffset + Math.sin((day + pondIndex) / 8) * 0.16 - (heavyRainEvent ? 0.22 : 0);
      const phEvening = phMorning + 0.42 + Math.cos(day / 10) * 0.07;
      const doMorning = 5.25 + definition.waterOffset + Math.sin(day / 11) * 0.3 - (heavyRainEvent ? 0.65 : 0);
      const doEvening = doMorning + 1.05 + Math.cos(day / 13) * 0.14;
      const transparency = 35 + Math.round(Math.sin(day / 9) * 5) + (heavyRainEvent ? 9 : 0);
      const salinity = 18.5 + definition.waterOffset * 4 + Math.sin(day / 19) * 1.2 - (rainEvent ? 1.5 : 0);
      const temperature = 28.6 + Math.sin(day / 17) * 1.1;
      const ammonia = Math.max(0.04, 0.1 + progress * 0.12 + Math.sin(day / 15) * 0.04 + (heavyRainEvent ? 0.11 : 0));
      const usage = {
        id: `${definition.id}-feed-${date}`,
        date,
        quantity: feed,
        unitPrice: feedItem.unitPrice,
        totalCost: round(feed * feedItem.unitPrice, 2),
        pondId: definition.id,
        cycleId: CYCLE_ID,
        cycleName: CYCLE_NAME,
        pondCycleId: definition.id,
        source: 'daily_feed_record',
        feedRecordId: `daily-feed:${definition.id}:${date}`,
        notes: `Daily feed for ${definition.name}`,
        createdAt: asTimestamp(date),
      };
      feedUsageById.get(feedItem.id)?.push(usage);

      return {
        id: `${definition.id}-sampling-${date}`,
        date,
        mbw,
        mortality: 0,
        feed: 0,
        cycleId: CYCLE_ID,
        cycleName: CYCLE_NAME,
        pondCycleId: definition.id,
        phMorning: phMorning.toFixed(2),
        phEvening: phEvening.toFixed(2),
        doMorning: doMorning.toFixed(2),
        doEvening: doEvening.toFixed(2),
        transparency: String(transparency),
        salinity: salinity.toFixed(1),
        temperature: temperature.toFixed(1),
        ammonia: ammonia.toFixed(2),
        operationalNotes: heavyRainEvent
          ? 'Heavy rain response: extra aeration, alkalinity check, and reduced feeding observation window.'
          : day % 21 === 0
            ? 'Routine pond walk completed; inlet, outlet, trays, and aerators checked.'
            : '',
        weatherEvent: heavyRainEvent ? 'heavy_rain' : rainEvent ? 'rain' : null,
        waterExchangePercent: String(heavyRainEvent ? 12 : day % 7 === 0 ? 8 : 5),
        sludgeLoad: progress > 0.75 ? 'moderate' : 'low',
        surfaceScum: heavyRainEvent,
        shrimpBehaviour: heavyRainEvent ? 'abnormal' : 'normal',
        feedData: {
          totalDailyFeed: feed.toFixed(3),
          feedingResponse: heavyRainEvent ? 'weak' : 'normal',
          inventoryFeedId: feedItem.id,
          feedAllocations: [{ inventoryFeedId: feedItem.id, quantityKg: feed }],
          cycleId: CYCLE_ID,
          cycleName: CYCLE_NAME,
          pondCycleId: definition.id,
        },
        source: isMbwDay ? 'sampling_daily_feed_water_quality' : 'daily_feed_water_quality',
        createdAt: asTimestamp(date),
      };
    });

    const mortalityRecords = mortalities.map((count, day) => {
      const date = shiftDate(START_DATE, day);
      const latestMbw = [...samplings].slice(0, day + 1).reverse().find((sampling) => sampling.mbw > 0)?.mbw || 0.5;
      return {
        id: `${definition.id}-mortality-${date}`,
        date,
        observationType: count > 0 ? 'estimated_total' : 'none_observed',
        count,
        mbwAtRecord: latestMbw,
        notes: day === 59 ? 'Rain-event mortality estimate; aeration and water chemistry response completed.' : 'Daily mortality observation.',
        recordedAt: `${date}T12:00:00.000Z`,
        recordedBy: 'SEED_USER_UID',
        cycleId: CYCLE_ID,
        cycleName: CYCLE_NAME,
        pondCycleId: definition.id,
      };
    });

    return {
      definition,
      partialLine,
      finalLine,
      totalFeed,
      data: {
        id: definition.id,
        companyId: 'SEED_COMPANY_ID',
        pondName: definition.name,
        pondArea: definition.area,
        density: definition.density,
        initialPopulation,
        initialStock: initialPopulation,
        initialWeight: 0.5,
        docStart: START_DATE,
        supplier: 'BlueCoast SPF Hatchery',
        plSupplier: 'BlueCoast SPF Hatchery',
        physicalPondId: definition.physicalPondId,
        blockId: BLOCK_ID,
        blockName: BLOCK_NAME,
        cycleId: CYCLE_ID,
        cycleName: CYCLE_NAME,
        pondCycleId: definition.id,
        cycleStatus: 'active',
        cycleStartedAt: START_DATE,
        cycleStartMode: 'new',
        samplings,
        mortalityRecords,
        totalHarvestedBiomass: round(harvestedBiomass, 6),
        totalHarvestedPopulation: round(harvestedPopulation, 3),
        totalHarvestedFeed: totalFeed,
        partialHarvestCount: 1,
        postHarvestBaselineDate: FINAL_HARVEST_DATE,
        postHarvestRemainingBiomass: 0,
        postHarvestRemainingPopulation: 0,
        postHarvestReferenceSamplingId: `${definition.id}-sampling-${FINAL_HARVEST_DATE}`,
        postHarvestReferenceSamplingDate: FINAL_HARVEST_DATE,
        postHarvestReferenceMbw: round(1000 / definition.harvestSize, 3),
        notes: 'Complete production history with final harvest recorded. Pond cycle intentionally remains active for manual close-cycle testing.',
        createdAt: asTimestamp(START_DATE),
        createdBy: 'SEED_USER_UID',
        updatedAt: asTimestamp(FINAL_HARVEST_DATE),
        updatedBy: 'SEED_USER_UID',
      },
    };
  });

  const feeds = feedDefinitions.map((definition) => {
    const usageHistory = feedUsageById.get(definition.id) || [];
    const used = usageHistory.reduce((sum, usage) => sum + Number(usage.quantity), 0);
    const stocked = round(used + 1_000, 3);
    return {
      id: definition.id,
      companyId: 'SEED_COMPANY_ID',
      feedName: definition.name,
      brand: definition.brand,
      feedType: definition.type,
      unit: 'kg',
      reorderLevel: 600,
      stockInHistory: [{
        id: `${definition.id}-opening-stock`,
        date: START_DATE,
        quantity: stocked,
        price: definition.unitPrice,
        notes: 'Cycle opening stock.',
        batch: `${definition.id.toUpperCase()}-2026`,
        expiry: '2027-02-28',
        unit: 'kg',
        createdAt: asTimestamp(START_DATE),
      }],
      usageHistory,
      totalStock: 1_000,
      totalCost: round(1_000 * definition.unitPrice, 2),
      lastUpdated: asTimestamp(FINAL_HARVEST_DATE),
      createdAt: asTimestamp(START_DATE),
    };
  });

  const additives = additiveDefinitions.map((definition, additiveIndex) => {
    const usageHistory = ponds.flatMap(({ definition: pond }) => Array.from({ length: 15 }, (_, useIndex) => {
      const date = shiftDate(START_DATE, 7 + useIndex * 8 + additiveIndex * 2);
      const quantity = round(definition.quantityPerUse * (pond.area / 5_000), 3);
      return {
        id: `${definition.id}-${pond.id}-${date}`,
        date,
        quantity,
        unitPrice: definition.unitPrice,
        totalCost: round(quantity * definition.unitPrice, 2),
        pondId: pond.id,
        pondName: pond.name,
        cycleId: CYCLE_ID,
        cycleName: CYCLE_NAME,
        pondCycleId: pond.id,
        source: 'pond_treatment',
        notes: 'Scheduled pond treatment linked to this production cycle.',
        createdAt: asTimestamp(date),
      };
    }));
    const used = usageHistory.reduce((sum, usage) => sum + usage.quantity, 0);
    const stocked = round(used + 250, 3);
    return {
      id: definition.id,
      companyId: 'SEED_COMPANY_ID',
      additiveName: definition.name,
      category: definition.category,
      inventoryKind: 'additive',
      unit: definition.unit,
      reorderLevel: 100,
      stockInHistory: [{
        id: `${definition.id}-opening-stock`,
        date: START_DATE,
        quantity: stocked,
        price: definition.unitPrice,
        notes: 'Cycle opening stock.',
        batch: `${definition.id.toUpperCase()}-2026`,
        expiry: '2027-04-30',
        unit: definition.unit,
        createdAt: asTimestamp(START_DATE),
      }],
      usageHistory,
      totalStock: 250,
      totalCost: round(250 * definition.unitPrice, 2),
      lastUpdated: asTimestamp(FINAL_HARVEST_DATE),
      createdAt: asTimestamp(START_DATE),
    };
  });

  const partialHarvest = {
    id: 'cycle-report-harvest-partial',
    date: PARTIAL_HARVEST_DATE,
    cycleId: CYCLE_ID,
    cycleName: CYCLE_NAME,
    blockId: BLOCK_ID,
    blockName: BLOCK_NAME,
    ponds: ponds.map((pond) => pond.partialLine),
  };
  const finalHarvest = {
    id: 'cycle-report-harvest-final',
    date: FINAL_HARVEST_DATE,
    cycleId: CYCLE_ID,
    cycleName: CYCLE_NAME,
    blockId: BLOCK_ID,
    blockName: BLOCK_NAME,
    ponds: ponds.map((pond) => pond.finalLine),
  };

  const expenseDefinitions = [
    ['2026-04-01', 'Seed', 'SPF post-larvae purchase', 8_950, 'INV-PL-260401'],
    ['2026-04-04', 'Pond Preparation', 'Lime, disinfection, and pond preparation', 3_250, 'PREP-0404'],
    ['2026-04-30', 'Labor', 'April farm payroll', 4_800, 'PAY-APR'],
    ['2026-05-31', 'Labor', 'May farm payroll', 4_800, 'PAY-MAY'],
    ['2026-06-30', 'Labor', 'June farm payroll', 4_800, 'PAY-JUN'],
    ['2026-07-31', 'Labor', 'July farm payroll', 4_800, 'PAY-JUL'],
    ['2026-08-15', 'Labor', 'August payroll and harvest overtime', 4_100, 'PAY-AUG'],
    ['2026-05-15', 'Utilities', 'Electricity and aeration power', 3_600, 'ELEC-0515'],
    ['2026-06-15', 'Fuel', 'Generator diesel', 2_250, 'FUEL-0615'],
    ['2026-06-22', 'Lab Testing', 'Water, microbiology, and plankton analysis', 1_480, 'LAB-0622'],
    ['2026-07-08', 'Biosecurity', 'PPE, disinfectant, and bird net repairs', 1_260, 'BIO-0708'],
    ['2026-08-15', 'Harvest Logistics', 'Harvest crew, ice, packing, and transport', 5_750, 'HARVEST-LOGISTICS'],
    ['2026-04-10', 'Insurance', 'Cycle production insurance allocation', 1_900, 'INS-0410'],
    ['2026-05-05', 'Administration', 'Permits and farm administration', 950, 'ADMIN-0505'],
  ];
  const manualExpenses = expenseDefinitions.map(([date, category, item, amount, reference], index) => ({
    id: `cycle-report-expense-${String(index + 1).padStart(2, '0')}`,
    date: String(date),
    category: String(category),
    item: String(item),
    amount: Number(amount),
    cycleId: CYCLE_ID,
    cycleName: CYCLE_NAME,
    allocationMethod: 'equal_per_pond',
    pondAllocations: ponds.map((pond) => ({ pondId: pond.definition.id, pondName: pond.definition.name, amount: round(Number(amount) / ponds.length, 2) })),
    paymentType: index % 4 === 0 ? 'Cash' : 'Bank Transfer',
    reference: String(reference),
    notes: 'Direct cycle expense allocated equally across the four ponds.',
  }));
  const inventoryExpenses = [
    ...feeds.map((feed) => ({ id: `sync_INVENTORY-${feed.id}`, date: START_DATE, category: 'Feed', item: `${feed.feedName} opening stock`, amount: round(feed.stockInHistory[0].quantity * feed.stockInHistory[0].price, 2), paymentType: 'Bank Transfer', reference: `INVENTORY-feed-${feed.id}-${feed.stockInHistory[0].id}`, linkedInventory: feed.feedName, notes: 'Auto-synced inventory purchase; excluded from cycle report manual expenses to prevent double counting.' })),
    ...additives.map((additive) => ({ id: `sync_INVENTORY-${additive.id}`, date: START_DATE, category: 'Pond Additives', item: `${additive.additiveName} opening stock`, amount: round(additive.stockInHistory[0].quantity * additive.stockInHistory[0].price, 2), paymentType: 'Bank Transfer', reference: `INVENTORY-additive-${additive.id}-${additive.stockInHistory[0].id}`, linkedInventory: additive.additiveName, notes: 'Auto-synced inventory purchase; excluded from cycle report manual expenses to prevent double counting.' })),
  ];
  const maintenanceExpenses = [
    { id: 'cycle-report-maintenance-expense-1', date: '2026-05-18', category: 'Maintenance', item: 'Paddlewheel gearbox service', amount: 1_280, paymentType: 'Bank Transfer', reference: 'MAINT-PADDLE-0518', notes: 'Shown through asset maintenance in the cycle report to prevent double counting.' },
    { id: 'cycle-report-maintenance-expense-2', date: '2026-07-03', category: 'Maintenance', item: 'Generator preventive service', amount: 1_750, paymentType: 'Bank Transfer', reference: 'MAINT-GEN-0703', notes: 'Shown through asset maintenance in the cycle report to prevent double counting.' },
    { id: 'cycle-report-maintenance-expense-3', date: '2026-07-28', category: 'Maintenance', item: 'Pump seal replacement', amount: 860, paymentType: 'Cash', reference: 'MAINT-PUMP-0728', notes: 'Shown through asset maintenance in the cycle report to prevent double counting.' },
  ];
  const expenses = [...manualExpenses, ...inventoryExpenses, ...maintenanceExpenses];

  const harvests = [partialHarvest, finalHarvest];
  const revenues = harvests.map((harvest) => {
    const biomass = harvest.ponds.reduce((sum, pond) => sum + Number(pond.biomass) + Number(pond.subBiomass), 0);
    const amount = harvest.ponds.reduce((sum, pond) => sum + Number(pond.biomass) * Number(pond.price) + Number(pond.subBiomass) * Number(pond.subPrice), 0);
    return {
      id: `sync_HARVEST-${harvest.id}`,
      date: harvest.date,
      category: 'Shrimp Sales',
      item: `Harvest (${harvest.date}) - ${biomass.toFixed(1)} kg`,
      amount: round(amount, 2),
      cycleId: CYCLE_ID,
      cycleName: CYCLE_NAME,
      paymentType: 'Bank Transfer',
      reference: `HARVEST-${harvest.id}`,
      notes: 'Auto-synced from harvest records.',
    };
  });

  const assets = [
    { id: 'cycle-report-asset-paddlewheel', name: 'Paddlewheel Aerator Bank', description: 'Eight 2 HP paddlewheel aerators serving Production Block A.', category: 'Equipment', purchaseCost: 24_000, condition: 'Good', serialNumber: 'AER-2026-001', manufacturer: 'AquaMotion', model: 'PW-2HP', maintenance: { id: 'maint-paddle-0518', date: '2026-05-18', description: 'Gearbox oil change, belt tensioning, and bearing inspection.', technician: 'Coastal Farm Engineering', cost: 1_280, laborHours: 8, partsUsed: ['Gear oil', 'Drive belts'], severity: 'Medium', type: 'Preventive', conditionBefore: 'Fair', conditionAfter: 'Good' } },
    { id: 'cycle-report-asset-generator', name: 'Backup Diesel Generator', description: 'Farm backup generator for aeration and pumping.', category: 'Equipment', purchaseCost: 38_000, condition: 'Excellent', serialNumber: 'GEN-2025-044', manufacturer: 'PowerMarine', model: 'PM-80KVA', maintenance: { id: 'maint-generator-0703', date: '2026-07-03', description: 'Full preventive service and load test.', technician: 'TopEnd Power Services', cost: 1_750, laborHours: 6, partsUsed: ['Oil filter', 'Fuel filter', 'Engine oil'], severity: 'High', type: 'Preventive', conditionBefore: 'Good', conditionAfter: 'Excellent' } },
    { id: 'cycle-report-asset-pump', name: 'Main Water Exchange Pump', description: 'High-volume inlet and exchange pump for Production Block A.', category: 'Infrastructure', purchaseCost: 17_500, condition: 'Good', serialNumber: 'PUMP-2024-113', manufacturer: 'BlueFlow', model: 'BF-150', maintenance: { id: 'maint-pump-0728', date: '2026-07-28', description: 'Mechanical seal replacement and impeller inspection.', technician: 'Farm Maintenance Team', cost: 860, laborHours: 5, partsUsed: ['Mechanical seal'], severity: 'Medium', type: 'Repair', conditionBefore: 'Needs Repair', conditionAfter: 'Good' } },
  ].map((asset) => ({
    id: asset.id,
    companyId: 'SEED_COMPANY_ID',
    name: asset.name,
    description: asset.description,
    category: asset.category,
    purchaseDate: asTimestamp('2025-03-15'),
    purchaseCost: asset.purchaseCost,
    condition: asset.condition,
    currentHolder: null,
    photos: [],
    transferHistory: [],
    maintenanceHistory: [{ ...asset.maintenance, date: asTimestamp(asset.maintenance.date), cycleId: CYCLE_ID, cycleName: CYCLE_NAME, photos: [], notes: 'Maintenance cost linked to the production cycle.' }],
    lastMaintenanceDate: asTimestamp(asset.maintenance.date),
    nextMaintenanceDue: asTimestamp(shiftDate(asset.maintenance.date, 90)),
    totalMaintenanceCost: asset.maintenance.cost,
    qrCode: `SHRIMPLY-ASSET-${asset.id}`,
    serialNumber: asset.serialNumber,
    manufacturer: asset.manufacturer,
    model: asset.model,
    location: { address: 'Production Block A, Cycle Report Demo Farm' },
    createdAt: asTimestamp('2025-03-15'),
    updatedAt: asTimestamp(asset.maintenance.date),
  }));

  const buildLabRows = (reportIndex: number) => ponds.map(({ definition }, pondIndex) => ({
    pondId: definition.id,
    pondCode: definition.name,
    doc: daysBetween(START_DATE, reportIndex === 0 ? '2026-06-18' : '2026-07-30'),
    transparencyCm: 34 + pondIndex,
    waterQuality: { phCustomer: round(7.82 + pondIndex * 0.03, 2), phLab: round(7.88 + pondIndex * 0.02, 2), salinityCustomer: round(18.4 + pondIndex * 0.3, 1), salinityLab: round(18.6 + pondIndex * 0.3, 1), nh4: round(0.12 + pondIndex * 0.02, 2), no2: round(0.08 + pondIndex * 0.015, 3), alkalinityTotal: 142 + pondIndex * 4, tom: round(21 + pondIndex * 1.3, 1), hardnessCa: 320 + pondIndex * 8, hardnessMg: 940 + pondIndex * 12, hardnessTotal: 1_260 + pondIndex * 20 },
    microbiology: { vibrioYellow: 120 + pondIndex * 20, vibrioGreen: 15 + pondIndex * 4, vibrioTotal: 135 + pondIndex * 24, tbc: 8_200 + pondIndex * 350, tvcTbcRatioPercent: round(1.65 + pondIndex * 0.12, 2) },
    plankton: { totalCellPerMl: 520_000 + pondIndex * 20_000, beneficialCellPerMl: 425_000 + pondIndex * 16_000, harmfulCellPerMl: 95_000 + pondIndex * 4_000, chlorophytaCellPerMl: 210_000 + pondIndex * 9_000, chlorophytaPercent: 40.4, chlorophytaSpecies: 'Chlorella, Scenedesmus', cyanophytaCellPerMl: 55_000 + pondIndex * 3_000, cyanophytaPercent: 10.6, cyanophytaSpecies: 'Oscillatoria', diatomCellPerMl: 165_000 + pondIndex * 6_000, diatomPercent: 31.7, diatomSpecies: 'Navicula, Nitzschia', chrysophytaCellPerMl: 50_000 + pondIndex * 2_000, chrysophytaPercent: 9.6, chrysophytaSpecies: 'Chromulina', dinoflagellataCellPerMl: 22_000 + pondIndex * 1_000, dinoflagellataPercent: 4.2, dinoflagellataSpecies: 'Peridinium', protozoaCellPerMl: 18_000 + pondIndex * 1_000, protozoaPercent: 3.5, protozoaSpecies: 'Vorticella' },
  }));
  const labReports = [
    { id: 'cycle-report-lab-mineral', reportType: 'water_quality', sampleDate: '2026-06-18', labName: 'Northern Aquaculture Laboratory', farmName: COMPANY_NAME, pondResults: buildLabRows(0) },
    { id: 'cycle-report-lab-plankton', reportType: 'plankton', sampleDate: '2026-07-30', labName: 'Northern Aquaculture Laboratory', farmName: COMPANY_NAME, pondResults: buildLabRows(1) },
  ];

  const cycle = {
    id: CYCLE_ID,
    cycleName: CYCLE_NAME,
    status: 'active' as const,
    blockIds: [BLOCK_ID],
    blockNames: [BLOCK_NAME],
    blockId: BLOCK_ID,
    blockName: BLOCK_NAME,
    plannedPondIds: pondDefinitions.map((pond) => pond.physicalPondId),
    plannedStartDate: START_DATE,
    plannedStockingEndDate: START_DATE,
    stockingStartDate: START_DATE,
    stockingEndDate: START_DATE,
    createdAt: asTimestamp(START_DATE),
    updatedAt: asTimestamp(FINAL_HARVEST_DATE),
    createdBy: 'SEED_USER_UID',
    updatedBy: 'SEED_USER_UID',
  };

  return { cycleDays, ponds, feeds, additives, harvests, expenses, revenues, assets, labReports, cycle };
}

function verifyFixture(fixture: ReturnType<typeof buildFixture>) {
  const report = buildCycleReport({
    cycleId: CYCLE_ID,
    cycles: [fixture.cycle] as never[],
    ponds: fixture.ponds.map((pond) => pond.data) as never[],
    harvestRecords: fixture.harvests as never[],
    feeds: fixture.feeds as never[],
    additives: fixture.additives as never[],
    assets: fixture.assets as never[],
    expenses: fixture.expenses.map((expense) => ({ ...expense, companyId: 'SEED_COMPANY_ID', addedBy: 'SEED_USER_UID', addedByName: OWNER_NAME, timestamp: asTimestamp(expense.date).toMillis() })) as never[],
    calculatePondMetricsWithHarvest,
  });
  if (!report) throw new Error('Cycle report fixture could not be built.');
  if (report.totals.pondCount !== 4 || report.totals.activePondCount !== 4 || report.totals.endedPondCount !== 0) throw new Error('Cycle must contain four active pond cycles.');
  if (!report.ponds.every((pond) => pond.hasFinalHarvest && pond.actualFcr > 0 && pond.actualSurvivalRate > 0)) throw new Error('Every pond must have complete final-harvest performance.');
  if (report.totals.harvestedBiomass <= 0 || report.totals.harvestRevenue <= 0 || report.totals.grossProfit <= 0) throw new Error('Harvest and profitability totals must be populated.');
  if (Object.entries(report.totals.costs).some(([, value]) => value <= 0)) throw new Error('Every cycle report cost section must be populated.');
  if (report.notes.length !== 1 || report.notes[0].key !== 'cycleNotClosed') throw new Error('The only expected report note is that the cycle remains open.');
  const waterRecords = fixture.ponds.reduce((sum, pond) => sum + pond.data.samplings.filter((sampling) => sampling.phMorning && sampling.doMorning).length, 0);
  return { report, waterRecords };
}

function replaceSeedIds<T>(value: T, uid: string, companyId: string): T {
  if (typeof value === 'string') return value.replaceAll('SEED_USER_UID', uid).replaceAll('SEED_COMPANY_ID', companyId) as T;
  if (value instanceof Timestamp) return value;
  if (Array.isArray(value)) return value.map((item) => replaceSeedIds(item, uid, companyId)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceSeedIds(item, uid, companyId)])) as T;
  }
  return value;
}

async function authenticate() {
  if (!EMAIL || !PASSWORD) throw new Error('SEED_EMAIL and SEED_PASSWORD are required with --apply.');
  if (PASSWORD.length < 6) throw new Error('Firebase test passwords must contain at least 6 characters.');
  const app = initializeApp(firebaseConfig, `cycle-report-demo-${Date.now()}`);
  const auth = getAuth(app);
  try {
    const credential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    return { app, auth, uid: credential.user.uid, created: true };
  } catch (error: any) {
    if (error?.code !== 'auth/email-already-in-use') {
      await deleteApp(app);
      throw error;
    }
    const credential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    return { app, auth, uid: credential.user.uid, created: false };
  }
}

async function seedFirebase(fixture: ReturnType<typeof buildFixture>) {
  const session = await authenticate();
  const db = getFirestore(session.app);
  const userRef = doc(db, 'users', session.uid);
  let companyId: string;

  try {
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) {
      await setDoc(userRef, {
        id: session.uid,
        uid: session.uid,
        email: EMAIL,
        name: OWNER_NAME,
        role: 'owner',
        hasCompletedSetup: false,
        joinedDate: `${FINAL_HARVEST_DATE}T12:00:00.000Z`,
        lastActive: `${FINAL_HARVEST_DATE}T12:00:00.000Z`,
      });
    }

    const refreshedUser = await getDoc(userRef);
    const existingCompanyId = refreshedUser.data()?.companyId;
    if (typeof existingCompanyId === 'string' && existingCompanyId) {
      const existingCompany = await getDoc(doc(db, 'companies', existingCompanyId));
      if (!existingCompany.exists() || existingCompany.data().companyName !== COMPANY_NAME) {
        throw new Error('The requested email already belongs to another Shrimply company; no data was changed.');
      }
      companyId = existingCompanyId;
    } else {
      const companyRef = doc(collection(db, 'companies'));
      companyId = companyRef.id;
      await setDoc(companyRef, {
        id: companyId,
        companyName: COMPANY_NAME,
        businessType: 'Shrimp Farming',
        farmType: 'Intensive',
        businessSize: 'large',
        description: 'Private four-pond demo farm with a fully recorded, harvested production cycle ready for manual closing and closed-cycle report review.',
        primaryLocation: { address: 'Cycle Report Demo Farm, Melbourne, Victoria, Australia', city: 'Melbourne', state: 'Victoria', country: 'Australia' },
        contactPhone: '',
        isPublicProfile: false,
        isSearchable: false,
        isVerified: false,
        currency: CURRENCY,
        timeZone: TIME_ZONE,
        ownerId: session.uid,
        teamMembers: [session.uid],
        pendingInvites: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(userRef, { companyId, hasCompletedSetup: true, lastActive: serverTimestamp() });
    }

    const seeded = replaceSeedIds(fixture, session.uid, companyId);
    const writes: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];
    writes.push({ ref: doc(db, 'companies', companyId, 'blocks', BLOCK_ID), data: { companyId, name: BLOCK_NAME, assignedTechnicianId: null, assignedTechnicianName: null, assignedTechnicianEmail: null, createdAt: asTimestamp(START_DATE), createdBy: session.uid, updatedAt: asTimestamp(FINAL_HARVEST_DATE), updatedBy: session.uid } });
    writes.push({ ref: doc(db, 'companies', companyId, 'cycles', CYCLE_ID), data: seeded.cycle });
    seeded.ponds.forEach(({ definition, data }) => {
      writes.push({ ref: doc(db, 'companies', companyId, 'ponds', definition.id), data });
      writes.push({ ref: doc(db, 'companies', companyId, 'physicalPonds', definition.physicalPondId), data: { id: definition.physicalPondId, pondName: definition.name, pondArea: definition.area, blockId: BLOCK_ID, blockName: BLOCK_NAME, status: 'active', activePondId: definition.id, createdAt: asTimestamp(START_DATE), createdBy: session.uid, updatedAt: asTimestamp(FINAL_HARVEST_DATE), updatedBy: session.uid } });
    });
    seeded.harvests.forEach((harvest) => writes.push({ ref: doc(db, 'companies', companyId, 'harvestRecords', harvest.id), data: { ...harvest, createdAt: asTimestamp(harvest.date), createdBy: session.uid } }));
    seeded.feeds.forEach((feed) => writes.push({ ref: doc(db, 'companies', companyId, 'feeds', feed.id), data: feed }));
    seeded.additives.forEach((additive) => writes.push({ ref: doc(db, 'companies', companyId, 'additives', additive.id), data: additive }));
    seeded.expenses.forEach((expense) => writes.push({ ref: doc(db, 'companies', companyId, 'expenses', expense.id), data: { ...expense, companyId, cycleId: CYCLE_ID, cycleName: CYCLE_NAME, addedBy: session.uid, addedByName: OWNER_NAME, timestamp: asTimestamp(expense.date).toMillis(), createdAt: asTimestamp(expense.date), updatedAt: asTimestamp(expense.date) } }));
    seeded.revenues.forEach((revenue) => writes.push({ ref: doc(db, 'companies', companyId, 'revenues', revenue.id), data: { ...revenue, companyId, addedBy: session.uid, addedByName: OWNER_NAME, timestamp: asTimestamp(revenue.date).toMillis(), createdAt: asTimestamp(revenue.date), updatedAt: asTimestamp(revenue.date) } }));
    seeded.assets.forEach((asset) => writes.push({ ref: doc(db, 'assets', asset.id), data: asset }));
    for (const report of seeded.labReports) {
      const reportRef = doc(db, 'companies', companyId, 'labReports', report.id);
      if (!(await getDoc(reportRef)).exists()) {
        writes.push({ ref: reportRef, data: { ...report, companyId, entryMode: 'manual', status: 'confirmed', extraction: { status: 'not_required' }, insights: { status: 'pending' }, processing: { status: 'pending' }, createdAt: asTimestamp(report.sampleDate), createdBy: session.uid, confirmedAt: asTimestamp(report.sampleDate), confirmedBy: session.uid, updatedAt: asTimestamp(report.sampleDate) } });
      }
    }
    for (let start = 0; start < writes.length; start += 1) {
      const batch = writeBatch(db);
      const chunk = writes.slice(start, start + 1);
      chunk.forEach((write) => batch.set(write.ref, write.data));
      try {
        await batch.commit();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Seed write failed for ${chunk.map((write) => write.ref.path).join(', ')}: ${message}`);
      }
    }

    const [ponds, physicalPonds, cycles, harvests, feeds, additives, expenses, revenues, labReports, assets] = await Promise.all([
      getDocs(collection(db, 'companies', companyId, 'ponds')),
      getDocs(collection(db, 'companies', companyId, 'physicalPonds')),
      getDocs(collection(db, 'companies', companyId, 'cycles')),
      getDocs(collection(db, 'companies', companyId, 'harvestRecords')),
      getDocs(collection(db, 'companies', companyId, 'feeds')),
      getDocs(collection(db, 'companies', companyId, 'additives')),
      getDocs(collection(db, 'companies', companyId, 'expenses')),
      getDocs(collection(db, 'companies', companyId, 'revenues')),
      getDocs(collection(db, 'companies', companyId, 'labReports')),
      getDocs(query(collection(db, 'assets'), where('companyId', '==', companyId))),
    ]);
    const expected = { ponds: 4, physicalPonds: 4, cycles: 1, harvests: 2, feeds: 3, additives: 3, expenses: fixture.expenses.length, revenues: 2, labReports: 2, assets: 3 };
    const actual = { ponds: ponds.size, physicalPonds: physicalPonds.size, cycles: cycles.size, harvests: harvests.size, feeds: feeds.size, additives: additives.size, expenses: expenses.size, revenues: revenues.size, labReports: labReports.size, assets: assets.size };
    if (Object.entries(expected).some(([key, value]) => actual[key as keyof typeof actual] !== value)) throw new Error(`Post-write verification failed: ${JSON.stringify({ expected, actual })}`);
    const savedCycle = await getDoc(doc(db, 'companies', companyId, 'cycles', CYCLE_ID));
    if (savedCycle.data()?.status !== 'active' || savedCycle.data()?.closedAt) throw new Error('The cycle was unexpectedly closed.');
    return { uid: session.uid, companyId, accountCreated: session.created, ...actual };
  } finally {
    await signOut(session.auth).catch(() => undefined);
    await deleteApp(session.app);
  }
}

async function main() {
  const fixture = buildFixture();
  const verification = verifyFixture(fixture);
  const firebase = APPLY ? await seedFirebase(fixture) : null;
  console.log(JSON.stringify({
    mode: APPLY ? 'applied' : 'dry-run',
    account: APPLY ? EMAIL : '(set SEED_EMAIL when applying)',
    cycle: { id: CYCLE_ID, name: CYCLE_NAME, status: fixture.cycle.status, startDate: START_DATE, finalHarvestDate: FINAL_HARVEST_DATE },
    data: { ponds: fixture.ponds.length, dailyWaterRecords: verification.waterRecords, mortalityRecords: fixture.ponds.reduce((sum, pond) => sum + pond.data.mortalityRecords.length, 0), labReports: fixture.labReports.length, harvestRecords: fixture.harvests.length, feeds: fixture.feeds.length, additives: fixture.additives.length, expenses: fixture.expenses.length, revenues: fixture.revenues.length, assets: fixture.assets.length },
    report: { harvestedBiomass: round(verification.report.totals.harvestedBiomass, 2), revenue: round(verification.report.totals.harvestRevenue, 2), costs: verification.report.totals.costs, grossProfit: round(verification.report.totals.grossProfit, 2), notes: verification.report.notes.map((note) => note.key) },
    firebase,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
