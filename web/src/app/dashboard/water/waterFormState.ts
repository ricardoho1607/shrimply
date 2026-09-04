type WaterRecord = {
  date: string; mbw: number; feed: number; mortality: number;
  isBaselineEstimate?: boolean; source?: string; feedData?: unknown; harvestData?: unknown;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  sludgeLoad?: 'low' | 'moderate' | 'high' | null;
  surfaceScum?: boolean | null; shrimpBehaviour?: 'normal' | 'abnormal' | null;
} & Partial<Record<typeof textFields[number], string | number>>;

const textFields = ['salinity', 'phMorning', 'phEvening', 'doMorning', 'doEvening', 'transparency', 'temperature', 'waterAppearance', 'waterDepthCm', 'alkalinity', 'ammonia', 'operationalNotes', 'waterExchangePercent'] as const;

export const isDailyWaterRecord = (record: WaterRecord, date: string) => (
  !record.isBaselineEstimate && record.source !== 'midcycle_onboarding' && !record.feedData && !record.harvestData
  && record.mbw === 0 && record.feed === 0 && record.mortality === 0 && record.date === date
);

export const initializeWaterDraft = (pondId: string, date: string, records: WaterRecord[]) => {
  const record = records.find(record => isDailyWaterRecord(record, date));
  const values = Object.fromEntries(textFields.map(field => [field, String(record?.[field] ?? '')])) as Record<typeof textFields[number], string>;
  return {
    pondId, date, ...values,
    weatherEvent: record?.weatherEvent ?? null,
    sludgeLoad: record?.sludgeLoad ?? null,
    surfaceScum: record?.surfaceScum ?? null,
    shrimpBehaviour: record?.shrimpBehaviour ?? null,
  };
};
