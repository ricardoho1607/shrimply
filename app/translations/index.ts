// translations/index.ts
import { en } from './en';
import { id } from './id';
import { th } from './th';
import { zh } from './zh';
import { vi } from './vi';
import { cycleFeatureTranslations } from '../../shared/cycleFeatureTranslations';
import { planktonOverwatchLocalizedCopy } from '../../shared/planktonOverwatchI18n';
import { dailyOperationsTranslations } from '../../shared/dailyOperationsI18n';

export const translations = {
  en: { ...en, ...cycleFeatureTranslations.en, dailyOperationsReports: dailyOperationsTranslations.en, waterQuality: { ...en.waterQuality, ...planktonOverwatchLocalizedCopy.en } },
  id: { ...id, ...cycleFeatureTranslations.id, dailyOperationsReports: dailyOperationsTranslations.id, waterQuality: { ...id.waterQuality, ...planktonOverwatchLocalizedCopy.id } },
  th: { ...th, ...cycleFeatureTranslations.th, dailyOperationsReports: dailyOperationsTranslations.th, waterQuality: { ...th.waterQuality, ...planktonOverwatchLocalizedCopy.th } },
  zh: { ...zh, ...cycleFeatureTranslations.zh, dailyOperationsReports: dailyOperationsTranslations.zh, waterQuality: { ...zh.waterQuality, ...planktonOverwatchLocalizedCopy.zh } },
  vi: { ...vi, ...cycleFeatureTranslations.vi, dailyOperationsReports: dailyOperationsTranslations.vi, waterQuality: { ...vi.waterQuality, ...planktonOverwatchLocalizedCopy.vi } },
};

export type Language = keyof typeof translations;
export type Translations = typeof translations.en;
