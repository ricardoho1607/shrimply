// translations/index.ts
import { en } from './en';
import { id } from './id';
import { th } from './th';
import { zh } from './zh';
import { vi } from './vi';
import { cycleFeatureTranslations } from '../../../shared/cycleFeatureTranslations';

export const translations = {
  en: { ...en, ...cycleFeatureTranslations.en },
  id: { ...id, ...cycleFeatureTranslations.id },
  th: { ...th, ...cycleFeatureTranslations.th },
  zh: { ...zh, ...cycleFeatureTranslations.zh },
  vi: { ...vi, ...cycleFeatureTranslations.vi },
};

export type Language = keyof typeof translations;
export type Translations = typeof translations.en;
