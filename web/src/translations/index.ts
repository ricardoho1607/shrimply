// translations/index.ts
import { en } from './en';
import { id } from './id';
import { th } from './th';
import { zh } from './zh';
import { vi } from './vi';
import { cycleFeatureTranslations } from '../../../shared/cycleFeatureTranslations';
import { planktonOverwatchLocalizedCopy } from '../../../shared/planktonOverwatchI18n';
import { dailyOperationsTranslations } from '../../../shared/dailyOperationsI18n';
import { pondDetailTranslations } from '../../../shared/pondDetailI18n';
import { harvestGuardTranslations } from '../../../shared/harvestGuardI18n';

export const translations = {
  en: { ...en, ...cycleFeatureTranslations.en, harvest: { ...en.harvest, ...harvestGuardTranslations.en }, dailyOperationsReports: dailyOperationsTranslations.en, pondDetail: pondDetailTranslations.en, waterQuality: { ...en.waterQuality, ...planktonOverwatchLocalizedCopy.en } },
  id: { ...id, ...cycleFeatureTranslations.id, harvest: { ...id.harvest, ...harvestGuardTranslations.id }, dailyOperationsReports: dailyOperationsTranslations.id, pondDetail: pondDetailTranslations.id, waterQuality: { ...id.waterQuality, ...planktonOverwatchLocalizedCopy.id } },
  th: { ...th, ...cycleFeatureTranslations.th, harvest: { ...th.harvest, ...harvestGuardTranslations.th }, dailyOperationsReports: dailyOperationsTranslations.th, pondDetail: pondDetailTranslations.th, waterQuality: { ...th.waterQuality, ...planktonOverwatchLocalizedCopy.th } },
  zh: { ...zh, ...cycleFeatureTranslations.zh, harvest: { ...zh.harvest, ...harvestGuardTranslations.zh }, dailyOperationsReports: dailyOperationsTranslations.zh, pondDetail: pondDetailTranslations.zh, waterQuality: { ...zh.waterQuality, ...planktonOverwatchLocalizedCopy.zh } },
  vi: { ...vi, ...cycleFeatureTranslations.vi, harvest: { ...vi.harvest, ...harvestGuardTranslations.vi }, dailyOperationsReports: dailyOperationsTranslations.vi, pondDetail: pondDetailTranslations.vi, waterQuality: { ...vi.waterQuality, ...planktonOverwatchLocalizedCopy.vi } },
};

export type Language = keyof typeof translations;
export type Translations = typeof translations.en;
