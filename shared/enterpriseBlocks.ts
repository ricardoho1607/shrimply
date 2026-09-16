import {
  calculatePondMetricsWithHarvest,
  getLatestValidMbwSampling,
  getPondCurrentDoc,
  getPondInitialWeight,
  toFiniteNumber,
  type SharedMortalityRecord,
  type SharedPond,
  type SharedSampling,
} from './pondCalculations';
import { calculatePondMetrics } from '../orson/metrics';
import { normalizePondData } from '../orson/normalizePondData';
import { analyzePondRisks } from '../orson/riskEngine';
import type { OrsonRiskFinding, OrsonRiskId } from '../orson/types';

export type EnterprisePondRisk = 'stable' | 'warning' | 'high-risk';

export interface FarmBlock {
  id: string;
  companyId: string;
  name: string;
  assignedTechnicianId?: string | null;
  assignedTechnicianName?: string | null;
  assignedTechnicianEmail?: string | null;
  createdAt?: unknown;
  createdBy?: string;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface EnterpriseTechnician {
  id: string;
  uid: string;
  name: string;
  email: string;
}

export const getEnterpriseTechnicianLabel = (
  name?: string | null,
  email?: string | null,
  fallback = 'Technician',
): string => {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (normalizedName) return normalizedName;

  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  return normalizedEmail || fallback;
};

export interface EnterpriseSampling extends SharedSampling {
  phMorning?: number | string | null;
  phEvening?: number | string | null;
  doMorning?: number | string | null;
  doEvening?: number | string | null;
  salinity?: number | string | null;
  transparency?: number | string | null;
  temperature?: number | string | null;
  ammonia?: number | string | null;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud' | null;
  waterExchangePercent?: number | string | null;
  sludgeLoad?: 'low' | 'moderate' | 'high' | null;
  surfaceScum?: boolean | null;
  shrimpBehaviour?: 'normal' | 'abnormal' | null;
}

export interface EnterprisePond extends SharedPond {
  id: string;
  pondName: string;
  pondArea?: number;
  density?: number;
  physicalPondId?: string | null;
  previousCyclePondId?: string | null;
  blockId?: string | null;
  blockName?: string | null;
  cycleId?: string | null;
  cycleName?: string | null;
  pondCycleId?: string | null;
  cycleStatus?: 'active' | 'ended';
  latestLabStatus?: Record<string, any> | null;
  samplings?: EnterpriseSampling[] | null;
  mortalityRecords?: SharedMortalityRecord[] | null;
}

export interface EnterpriseBlockLinkedRecord {
  blockId?: string | null;
}

export type EnterpriseWarningTranslationCode =
  | 'mortality'
  | 'missing_water_quality'
  | 'low_do'
  | 'unsafe_ph'
  | 'ph_swing'
  | 'low_salinity';

export interface EnterpriseWarning {
  code: EnterpriseWarningTranslationCode | OrsonRiskId | `cross_parameter_risk:${string}`;
  translationCode?: EnterpriseWarningTranslationCode;
  label: string;
  severity: 'warning' | 'critical';
  destination: 'water_quality' | 'pond_details';
  value?: number;
  unit?: string;
}

export interface EnterprisePondStatus {
  risk: EnterprisePondRisk;
  doc: number;
  warnings: EnterpriseWarning[];
  mortalityCount: number;
  mortalityPercent: number;
  mortalityBiomassKg: number;
  mortalityDate?: string;
  currentPopulation: number;
}

const hasRecordedNumber = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(String(value).replace(',', '.')));
};

const toOptionalNumber = (value: unknown): number | null => (
  hasRecordedNumber(value) ? Number(String(value).replace(',', '.')) : null
);

const getLatestWaterRecord = (pond: EnterprisePond): EnterpriseSampling | undefined => (
  [...(pond.samplings || [])]
    .filter((record) => [
      record.phMorning,
      record.phEvening,
      record.doMorning,
      record.doEvening,
      record.salinity,
      record.transparency,
      record.temperature,
    ].some(hasRecordedNumber))
    .sort((first, second) => new Date(second.date || 0).getTime() - new Date(first.date || 0).getTime())[0]
);

const getLatestMortalityRecord = (pond: EnterprisePond): SharedMortalityRecord | undefined => {
  const explicitRecords = [...(pond.mortalityRecords || [])]
    .filter((record) => record.observationType !== 'observed_recovered')
    .sort((first, second) => new Date(second.date || second.recordedAt || 0).getTime()
      - new Date(first.date || first.recordedAt || 0).getTime());
  if (explicitRecords.length > 0) return explicitRecords[0];

  const legacySampling = [...(pond.samplings || [])]
    .filter((record) => toFiniteNumber(record.mortality) > 0)
    .sort((first, second) => new Date(second.date || 0).getTime() - new Date(first.date || 0).getTime())[0];
  if (!legacySampling) return undefined;
  return {
    id: legacySampling.id,
    date: legacySampling.date,
    observationType: 'estimated_total',
    count: legacySampling.mortality,
  };
};

const getMbwAtDate = (pond: EnterprisePond, date?: string | null, explicitMbw?: unknown): number => {
  const recordedMbw = toFiniteNumber(explicitMbw);
  if (recordedMbw > 0) return recordedMbw;

  const relevantSampling = [...(pond.samplings || [])]
    .filter((sampling) => (!date || !sampling.date || sampling.date <= date))
    .filter((sampling) => toFiniteNumber(sampling.mbw ?? sampling.abw) > 0)
    .sort((first, second) => new Date(second.date || 0).getTime() - new Date(first.date || 0).getTime())[0];
  const samplingMbw = toFiniteNumber(relevantSampling?.mbw ?? relevantSampling?.abw);
  if (samplingMbw > 0) return samplingMbw;

  const latestValidMbw = toFiniteNumber(getLatestValidMbwSampling(pond)?.mbw);
  return latestValidMbw > 0 ? latestValidMbw : getPondInitialWeight(pond);
};

const WATER_RISK_IDS = new Set<OrsonRiskId>([
  'low_do',
  'ammonia_elevated',
  'abnormal_shrimp_behaviour',
  'heavy_rain_low_do',
  'high_sludge_load',
  'surface_scum_observed',
  'unsafe_ph',
  'low_do_high_temperature',
  'low_do_high_tan',
  'high_ph_high_tan',
  'nh3_elevated',
  'high_nitrite_low_do',
  'low_alkalinity_high_ph_swing',
  'do_decline',
  'ph_instability',
  'salinity_shock',
  'lab_report_risk',
]);

const ORSON_TRANSLATION_CODES: Partial<Record<OrsonRiskId, EnterpriseWarningTranslationCode>> = {
  low_do: 'low_do',
  unsafe_ph: 'unsafe_ph',
  ph_instability: 'ph_swing',
  mortality_spike: 'mortality',
};

const getOrsonEnterpriseWarningCode = (finding: OrsonRiskFinding): EnterpriseWarning['code'] => {
  if (finding.id === 'mortality_spike') return 'mortality';
  if (finding.id === 'ph_instability') return 'ph_swing';
  return finding.id === 'cross_parameter_risk'
    ? `cross_parameter_risk:${finding.title}`
    : finding.id;
};

const getOrsonWarningDestination = (finding: OrsonRiskFinding): EnterpriseWarning['destination'] => {
  if (WATER_RISK_IDS.has(finding.id)) return 'water_quality';
  if (finding.id === 'cross_parameter_risk' && /water|oxygen|pH|TAN|nitrite|alkalinity/i.test(finding.title)) {
    return 'water_quality';
  }
  return 'pond_details';
};

const mergeEnterpriseWarnings = (
  existing: EnterpriseWarning[],
  findings: OrsonRiskFinding[],
): EnterpriseWarning[] => {
  const merged = new Map<EnterpriseWarning['code'], EnterpriseWarning>();
  existing.forEach((warning) => merged.set(warning.code, warning));

  findings
    .filter((finding) => finding.severity === 'warning' || finding.severity === 'critical')
    .forEach((finding) => {
      const code = getOrsonEnterpriseWarningCode(finding);
      const current = merged.get(code);
      if (current) {
        if (finding.severity === 'critical') merged.set(code, { ...current, severity: 'critical' });
        return;
      }
      merged.set(code, {
        code,
        translationCode: ORSON_TRANSLATION_CODES[finding.id],
        label: finding.summary,
        severity: finding.severity === 'critical' ? 'critical' : 'warning',
        destination: getOrsonWarningDestination(finding),
      });
    });

  return Array.from(merged.values()).sort((first, second) => {
    if (first.severity === second.severity) return 0;
    return first.severity === 'critical' ? -1 : 1;
  });
};

export const getEnterprisePondStatus = (
  pond: EnterprisePond,
  timeZone?: string,
  asOf?: Date,
): EnterprisePondStatus => {
  const water = getLatestWaterRecord(pond);
  const warnings: EnterpriseWarning[] = [];
  if (!water) {
    warnings.push({
      code: 'missing_water_quality',
      translationCode: 'missing_water_quality',
      label: 'No water-quality record is available',
      severity: 'warning',
      destination: 'water_quality',
    });
  }
  const doValues = [water?.doMorning, water?.doEvening]
    .map(toOptionalNumber)
    .filter((value): value is number => value !== null && value >= 0);
  const minimumDo = doValues.length > 0 ? Math.min(...doValues) : null;
  if (minimumDo !== null && minimumDo < 4) {
    warnings.push({
      code: 'low_do',
      translationCode: 'low_do',
      label: 'Dissolved oxygen is low',
      severity: 'warning',
      destination: 'water_quality',
      value: minimumDo,
      unit: 'mg/L',
    });
  }

  const phMorning = toOptionalNumber(water?.phMorning);
  const phEvening = toOptionalNumber(water?.phEvening);
  const phValues = [phMorning, phEvening].filter((value): value is number => value !== null && value > 0);
  const unsafePh = phValues.find((value) => (
    value < 7
    || value > 9
    || (value >= 7 && value <= 7.4)
    || (value >= 8.6 && value <= 9)
  ));
  if (unsafePh !== undefined) {
    warnings.push({
      code: 'unsafe_ph',
      translationCode: 'unsafe_ph',
      label: 'pH is outside the preferred range',
      severity: 'warning',
      destination: 'water_quality',
      value: unsafePh,
    });
  }
  if (phMorning !== null && phEvening !== null && Math.abs(phEvening - phMorning) > 0.7) {
    warnings.push({
      code: 'ph_swing',
      translationCode: 'ph_swing',
      label: 'Morning-to-evening pH swing is high',
      severity: 'warning',
      destination: 'water_quality',
      value: Math.abs(phEvening - phMorning),
    });
  }

  const salinity = toOptionalNumber(water?.salinity);
  if (salinity !== null && salinity >= 0 && salinity < 5) {
    warnings.push({
      code: 'low_salinity',
      translationCode: 'low_salinity',
      label: 'Salinity is low',
      severity: 'warning',
      destination: 'water_quality',
      value: salinity,
      unit: 'ppt',
    });
  }

  const metrics = calculatePondMetricsWithHarvest(pond);
  const mortalityRecord = getLatestMortalityRecord(pond);
  const mortalityCount = mortalityRecord?.observationType === 'none_observed'
    ? 0
    : Math.max(0, toFiniteNumber(mortalityRecord?.count));
  const estimatedPopulationBeforeRecord = Math.max(0, metrics.currentPopulation + mortalityCount);
  const mortalityPercent = estimatedPopulationBeforeRecord > 0
    ? (mortalityCount / estimatedPopulationBeforeRecord) * 100
    : 0;
  const mortalityMbw = getMbwAtDate(pond, mortalityRecord?.date, mortalityRecord?.mbwAtRecord);
  const mortalityBiomassKg = (mortalityCount * mortalityMbw) / 1000;

  if (mortalityCount > 0) {
    warnings.unshift({
      code: 'mortality',
      translationCode: 'mortality',
      label: mortalityPercent >= 1 ? 'Mortality is at or above 1%' : 'Mortality has been recorded',
      severity: mortalityPercent >= 1 ? 'critical' : 'warning',
      destination: 'pond_details',
      value: mortalityPercent,
      unit: '%',
    });
  }

  const latestDate = water?.date || mortalityRecord?.date;
  const now = asOf ?? (latestDate && Math.abs(Date.now() - new Date(latestDate).getTime()) > 7 * 86400000 ? new Date(latestDate) : new Date());
  const normalizedPond = normalizePondData(pond as unknown as Record<string, any>, { now });
  const orsonMetrics = calculatePondMetrics(normalizedPond);
  const orsonReport = analyzePondRisks(orsonMetrics, now);
  const mergedWarnings = mergeEnterpriseWarnings(warnings, orsonReport.findings);

  return {
    risk: mergedWarnings.some((warning) => warning.severity === 'critical')
      ? 'high-risk'
      : mergedWarnings.length > 0
        ? 'warning'
        : 'stable',
    doc: getPondCurrentDoc(pond, timeZone),
    warnings: mergedWarnings,
    mortalityCount,
    mortalityPercent,
    mortalityBiomassKg,
    mortalityDate: mortalityRecord?.date || undefined,
    currentPopulation: metrics.currentPopulation,
  };
};

export const sortFarmBlocks = (blocks: FarmBlock[]): FarmBlock[] => (
  [...blocks].sort((first, second) => first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: 'base' }))
);

export const getAssignedEnterpriseBlockIds = (
  blocks: FarmBlock[],
  userId?: string | null,
): Set<string> => new Set(
  userId
    ? blocks
      .filter((block) => block.assignedTechnicianId === userId)
      .map((block) => block.id)
    : [],
);

export const filterEnterpriseRecordsForUser = <T extends EnterpriseBlockLinkedRecord>(
  records: T[],
  options: {
    businessSize?: string | null;
    role?: string | null;
    userId?: string | null;
    blocks: FarmBlock[];
  },
): T[] => {
  if (options.businessSize !== 'enterprise' || options.role !== 'technician') return records;

  const assignedBlockIds = getAssignedEnterpriseBlockIds(options.blocks, options.userId);
  if (assignedBlockIds.size === 0) return [];
  return records.filter((record) => (
    typeof record.blockId === 'string' && assignedBlockIds.has(record.blockId)
  ));
};

export const canManageEnterpriseFarmCycle = (
  businessSize?: string | null,
  role?: string | null,
): boolean => (
  businessSize !== 'enterprise'
  || role === 'owner'
  || role === 'co-owner'
);

export const isEnterpriseOwner = (businessSize?: string, role?: string): boolean => (
  businessSize === 'enterprise' && (role === 'owner' || role === 'co-owner')
);
